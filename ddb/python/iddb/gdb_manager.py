import asyncio
from concurrent.futures import ThreadPoolExecutor
from threading import Lock, Thread
from typing import List
from iddb.cmd_processor import CommandProcessor
from iddb.gdbserver_starter import SSHRemoteServerCred
from iddb.state_manager import StateManager
from iddb.status_server import FlaskApp
from iddb.utils import *
from iddb.cmd_router import CmdRouter
from iddb.service_mgr import ServiceManager
from iddb.gdb_session import GdbMode, GdbSession, GdbSessionConfig, StartMode, SessionCreationTaskQueue
from iddb.logging import logger
from iddb.data_struct import GdbCommand, ServiceInfo
from iddb.config import GlobalConfig
from iddb.event_loop import AsyncSSHLoop, GlobalRunningLoop
from iddb.gdb_controller import SSHAttachController
from iddb.global_handler import GlobalHandler
from iddb import globals

import asyncio
from viztracer import log_sparse


class GdbManager:
    def __init__(self) -> None:
        self.lock = Lock()
        self.sessions: List[GdbSession] = []

    async def start_async(self) -> None:
        global_config = GlobalConfig.get()
        if global_config.broker:
            logger.debug("Broker is enabled. Starting ServiceManager.")
            self.service_mgr: ServiceManager = ServiceManager()
            self.service_mgr.set_callback_on_new_service(self.__discover_new_session_async)

        for config in global_config.gdb_sessions_configs:
            self.sessions.append(GdbSession(config))

        GlobalHandler.GDB_SESSION_CLEAN_HANDLE = lambda x: self.remove_session(x)

        self.router = CmdRouter(self.sessions)
        ddbapiserver = FlaskApp(router=self.router)
        
        # Convert Flask app to run in background
        await asyncio.to_thread(lambda: Thread(target=ddbapiserver.app.run).start())
        
        self.processor = CommandProcessor(self.router, GlobalConfig.get().adapter)
        self.state_mgr = StateManager.inst()
        
        # Start sessions concurrently
        startup_results = await asyncio.gather(*[ s.start_async() for s in self.sessions ], return_exceptions=True)
        for i, result in enumerate(startup_results):
            if isinstance(result, Exception):
                logger.error(f"Failed to start session {i}: {result}. Proceed to session cleanup.")
                self.remove_session(self.sessions[i].sid)
            else:
                logger.debug(f"Session {i} started successfully.")
        
        ddbapiserver.DDB_up_and_running = True

    def write(self, cmd: str):
        lp=GlobalRunningLoop().get_loop()
        asyncio.run_coroutine_threadsafe(self.processor.send_command(cmd), GlobalRunningLoop().get_loop())

    async def write_async(self, cmd: str):
        ''' write_async is non-blocking
        '''
        asyncio.run_coroutine_threadsafe(self.processor.send_command(cmd), GlobalRunningLoop().get_loop())

    @log_sparse
    def __discover_new_session_async(self, session_info: ServiceInfo):
        # port = PortManager.reserve_port(session_info.ip)
        hostname = session_info.ip
        pid = session_info.pid
        tag = f"{hostname}:-{pid}"
        ddb_conf = GlobalConfig.get()
        prerun_cmds = [
            GdbCommand("async mode", "set mi-async on")
        ]
        prerun_cmds.extend(ddb_conf.prerun_cmds)
        logger.debug(f"New session discovered: hostname={hostname}, pid={pid}, tag={tag}")
        config = GdbSessionConfig(
            # remote_port=port,
            remote_host=hostname,
            gdb_controller=SSHAttachController(
                pid=pid,
                cred=SSHRemoteServerCred(
                    port=ddb_conf.ssh.port,
                    hostname=hostname,
                    username=ddb_conf.ssh.user
                ),
                verbose=True
            ),
            attach_pid=pid,
            tag=tag,
            gdb_mode=GdbMode.REMOTE,
            start_mode=StartMode.ATTACH,
            sudo=ddb_conf.conf.sudo,
            prerun_cmds=prerun_cmds,
            postrun_cmds=ddb_conf.postrun_cmds
        )

        @log_sparse
        async def start_session():
            gdb_session = GdbSession(config)

            # 1. add the new session to the session list
            # 2. register router with the new session
            with self.lock:
                self.sessions.append(gdb_session)
            self.router.add_session(gdb_session)

            try:
                await gdb_session.start_async()
            except Exception as e:
                logger.error(f"Failed to start debugger session: {e}. Cleaning up.")
                self.remove_session(gdb_session.sid)

        # start the session in the main event loop
        if globals.MAIN_LOOP.is_running():
            asyncio.run_coroutine_threadsafe(start_session(), globals.MAIN_LOOP)
        else:
            logger.error("Main event loop is not running.")
            return

    def remove_session(self, sid: int):
        with self.lock:
            for s in self.sessions:
                if s.sid == sid:
                    s.cleanup()
                    self.sessions.remove(s)
                    del self.router.sessions[s.sid]
                    StateManager.inst().remove_session(sid)
                    break
            if len(self.sessions) == 0:
                logger.info("No more sessions. Cleaning up.")
                GlobalHandler.exit_ddb()

    # async def remove_session_async(self, sid: int):
    #     for s in self.sessions:
    #         if s.sid == sid:
    #             s.cleanup()
    #             self.sessions.remove(s)
    #             del self.router.sessions[s.sid]
    #             StateManager.inst().remove_session(sid)
    #             break
    #         if len(self.sessions) == 0:
    #             logger.info("No more sessions. Cleaning up.")
    #             GlobalHandler.exit_ddb()

    async def __cleanup_async(self):
        print("Cleaning up GdbManager resource")
        if self.service_mgr:
            self.service_mgr.cleanup()
        await asyncio.gather(*[s.cleanup_async() for s in self.sessions], return_exceptions=True)
        
    async def cleanup_async(self):
        fut = asyncio.run_coroutine_threadsafe(self.__cleanup_async(), AsyncSSHLoop().get_loop())
        await asyncio.wrap_future(fut)

    def cleanup(self):
        loop = AsyncSSHLoop().get_loop()
        if asyncio.get_event_loop() != loop:
            fut = asyncio.run_coroutine_threadsafe(self.cleanup_async(), loop)
            fut.result()
        else:
            asyncio.create_task(self.cleanup_async())
