import asyncio
import threading
import os
import time
from uuid import uuid4
from typing import List, Optional
from threading import Thread, Lock
from time import sleep

from iddb.event_loop import AsyncSSHLoop, GlobalRunningLoop
import pkg_resources
from iddb.counter import TSCounter
from iddb.data_struct import GdbMode, GdbSessionConfig, GdbCommand, StartMode, OnExitBehavior
from iddb.gdb_controller import RemoteGdbController
from iddb.gdbparser import GdbParser
from iddb.response_processor import ResponseProcessor, SessionResponse
from pygdbmi.gdbcontroller import GdbController

from iddb.state_manager import StateManager
from iddb.gdbserver_starter import RemoteServerConnection, SSHRemoteServerClient
from iddb.utils import parse_cmd
from iddb.logging import logger
from iddb.config import DevFlags, GlobalConfig
from iddb import globals

class SessionCounter:
    _sc: "SessionCounter" = None
    _lock = Lock()

    def __init__(self) -> None:
        self.counter = TSCounter()

    @staticmethod
    def inst() -> "SessionCounter":
        with SessionCounter._lock:
            if SessionCounter._sc:
                return SessionCounter._sc
            SessionCounter._sc = SessionCounter()
            return SessionCounter._sc

    def inc(self) -> int:
        return self.counter.increment()

    @staticmethod
    def get() -> int:
        return SessionCounter.inst().inc()

class SessionCreationTaskQueue:
    ''' Singleton class for managing session creation tasks
    Debugger session creation is a relative heavy task, so we need to manage it in a queue.
    Each creation may takes a few hundred milliseconds, we should avoid overload the asyncio loop.
    '''
    _instance = None
    _lock = Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(SessionCreationTaskQueue, cls).__new__(cls)
                cls._instance._initialized = False
            return cls._instance

    def __init__(self, max_workers=5):
        if not self._initialized:
            self.queue = asyncio.Queue()
            self.max_workers = max_workers
            self._initialized = True

    @staticmethod
    def inst():
        return SessionCreationTaskQueue()

    async def worker(self):
        while True:
            args, callback = await self.queue.get()
            try:
                if args:
                    await callback(args)
                else:
                    await callback()
            except Exception as e:
                logger.error(f"Error in worker: {e}")
            finally:
                self.queue.task_done()

    async def add_task(self, config, callback):
        asyncio.run_coroutine_threadsafe(self.queue.put((config, callback)), AsyncSSHLoop().get_loop())

    def start_workers(self):
        for _ in range(self.max_workers):
            asyncio.run_coroutine_threadsafe(self.worker(), AsyncSSHLoop().get_loop())

class GdbSession:
    def __init__(self, config: GdbSessionConfig, mi_version: str = None) -> None:
        # Basic information
        self.mi_version: str = mi_version if mi_version else "mi3"
        self.tag: str = config.tag
        self.args: List[str] = config.args

        # bin will be the binary path combined with cwd
        self.cwd: str = config.cwd
        self.bin: str = os.path.join(self.cwd, config.binary)

        # Prepare for the remote mode
        self.remote_host: str = config.remote_host
        self.remote_port: str = str(config.remote_port)
        # self.remote_gdbserver: RemoteServerConnection = config.remote_gdbserver
        self.gdb_controller:RemoteGdbController=config.gdb_controller
        self.gdb_response_parser=GdbParser()
        self.mode: GdbMode = config.gdb_mode
        self.startMode: StartMode = config.start_mode
        self.attach_pid = config.attach_pid
        self.prerun_cmds: List[GdbCommand] = config.prerun_cmds
        self.postrun_cmds: List[GdbCommand] = config.postrun_cmds
        self.initialize_commands = config.initialize_commands
        self.sudo = config.sudo

        # Session metadata
        # self.suid = uuid4()
        self.sid = SessionCounter.get()
        self.state_mgr = StateManager.inst()

        self.run_delay = config.run_delay

        self.session_ctrl: Optional[GdbController] = None
        self.processor = ResponseProcessor.inst()
        self.mi_output_t_handle = None
        self._stop_event = threading.Event()

    def get_mi_version_arg(self) -> str:
        return f"--interpreter={self.mi_version}"

    def __prepare_gdb_start_cmd(self) -> List[str]:
        return [ f"{'sudo' if self.sudo else ''}", "gdb", self.get_mi_version_arg(), "-q" ]

    def local_start(self):
        full_args = self.__prepare_gdb_start_cmd()
        full_args.append("--args")
        full_args.append(self.bin)
        full_args.extend(self.args)
        logger.debug(f"start gdb with: {' '.join(gdb_cmd)}")
        self.session_ctrl = GdbController(full_args)

        for prerun_cmd in self.prerun_cmds:
            self.write(f'-interpreter-exec console "{prerun_cmd.command}"')

        self.write("-gdb-set mi-async on")
        self.write("-gdb-set non-stop off")

        for postrun_cmd in self.postrun_cmds:
            self.gdb_controller.write_input(postrun_cmd.command)

    def remote_attach(self):
        logger.debug("start remote attach")
        if not self.gdb_controller:
            logger.warning("Remote gdbcontroller not initialized")
            return
        
        full_args = self.__prepare_gdb_start_cmd()
        gdb_cmd = " ".join(full_args)
        logger.debug(f"start gdb with: {gdb_cmd}")
        self.gdb_controller.start(gdb_cmd)

        self.gdb_controller.write_input("-gdb-set logging enabled on")
        self.gdb_controller.write_input("-gdb-set mi-async on")

        extension_filepath = pkg_resources.resource_filename('iddb', 'gdb_ext/runtime-gdb-grpc.py')

        self.gdb_controller.write_input(f'-interpreter-exec console "source {extension_filepath}"')
        # self.gdb_controller.write_input(f'-interpreter-exec console "source {extension_filepath}"')

        for prerun_cmd in self.prerun_cmds:
            self.gdb_controller.write_input(f'-interpreter-exec console "{prerun_cmd.command}"')

        for init_cmd in self.initialize_commands:
            self.write(init_cmd)
        self.write(f"-target-attach {self.attach_pid}")

        if GlobalConfig.get().broker:
            self.gdb_controller.write_input(
                f'-interpreter-exec console "signal SIG40"'
            )

        for postrun_cmd in self.postrun_cmds:
            self.gdb_controller.write_input(postrun_cmd.command)
        # self.write(f"-file-exec-and-symbols /proc/{self.attach_pid}/root{self.bin}")
            
    def remote_start(self):
        self.gdb_controller.start()
        # self.remote_gdbserver.start(self.args, sudo=self.sudo)
        gdb_cmd = self.__prepare_gdb_start_cmd()
        logger.debug(f"start gdb with: {' '.join(gdb_cmd)}")
        self.session_ctrl = GdbController(gdb_cmd)

        self.write("-gdb-set mi-async on")
        
        for prerun_cmd in self.prerun_cmds:
            self.write(prerun_cmd.command)

        self.write(f"-file-exec-and-symbols {self.bin}")
        self.write(f"-exec-arguments {' '.join(self.args)}")

        for postrun_cmd in self.postrun_cmds:
            self.gdb_controller.write_input(postrun_cmd.command)

    async def local_start_async(self):
        full_args = self.__prepare_gdb_start_cmd()
        full_args.append("--args")
        full_args.append(self.bin)
        full_args.extend(self.args)
        logger.debug(f"start gdb with: {' '.join(gdb_cmd)}")
        self.session_ctrl = GdbController(full_args)

        for prerun_cmd in self.prerun_cmds:
            self.write(f'-interpreter-exec console "{prerun_cmd.command}"')

        self.write("-gdb-set mi-async on")
        self.write("-gdb-set non-stop off")

        for postrun_cmd in self.postrun_cmds:
            self.write(postrun_cmd.command)

    async def remote_attach_async(self):
        logger.debug("start remote attach")
        if not self.gdb_controller:
            logger.warning("Remote gdbcontroller not initialized")
            return
        
        full_args = self.__prepare_gdb_start_cmd()
        gdb_cmd = " ".join(full_args)
        logger.debug(f"start gdb with: {gdb_cmd}")
        await self.gdb_controller.start(gdb_cmd)

        commands_to_send = [
            "-gdb-set logging enabled on",
            "-gdb-set mi-async on",
        ]
        extension_filepath = pkg_resources.resource_filename('iddb', 'gdb_ext/runtime-gdb-grpc.py')
        commands_to_send.append(f'-interpreter-exec console "source {extension_filepath}"')

        for prerun_cmd in self.prerun_cmds:
            commands_to_send.append(f'-interpreter-exec console "{prerun_cmd.command}"')

        for init_cmd in self.initialize_commands:
            commands_to_send.append(init_cmd)
        commands_to_send.append(f"-target-attach {self.attach_pid}")

        if GlobalConfig.get().broker:
            commands_to_send.append(
                f'-interpreter-exec console "signal SIG40"'
            )

        for postrun_cmd in self.postrun_cmds:
            # self.gdb_controller.write_input(postrun_cmd.command)
            commands_to_send.append(postrun_cmd.command)
        self.gdb_controller.write_input("\n".join(commands_to_send))

    async def remote_start_async(self):
        await self.gdb_controller.start()
        # self.remote_gdbserver.start(self.args, sudo=self.sudo)
        gdb_cmd = self.__prepare_gdb_start_cmd()
        logger.debug(f"start gdb with: {' '.join(gdb_cmd)}")
        self.session_ctrl = GdbController(gdb_cmd)

        self.write("-gdb-set mi-async on")
        
        for prerun_cmd in self.prerun_cmds:
            self.write(prerun_cmd.command)

        self.write(f"-file-exec-and-symbols {self.bin}")
        self.write(f"-exec-arguments {' '.join(self.args)}")

        for postrun_cmd in self.postrun_cmds:
            self.gdb_controller.write_input(postrun_cmd.command)

    def start(self) -> None:
        ''' start a gdbsessoin
        '''
        if self.mode == GdbMode.LOCAL:
            self.local_start()
        elif self.mode == GdbMode.REMOTE:
            if self.startMode == StartMode.ATTACH:
                self.remote_attach()
            elif self.startMode == StartMode.BINARY:
                self.remote_start()
        else:
            logger.error("Invalid mode")
            return

        # logger.debug(
        #     f"Started debugging process - \n\ttag: {self.tag}, \n\tbin: {self.bin}, \n\tstartup command: {self.session_ctrl.command}"
        # )

        self.state_mgr.register_session(self.sid, self.tag,self)

        self.mi_output_t_handle = Thread(
            target=self.fetch_mi_output, args=()
        )
        self.mi_output_t_handle.start()

    async def __start_async(self):
        if self.mode == GdbMode.LOCAL:
            await self.local_start_async()
        elif self.mode == GdbMode.REMOTE:
            if self.startMode == StartMode.ATTACH:
                await self.remote_attach_async()
            elif self.startMode == StartMode.BINARY:
                await self.remote_start_async()
        else:
            logger.error("Invalid mode")
            return

        self.state_mgr.register_session(self.sid, self.tag, self)
        
        # Start output fetching as a background task
        # self.mi_output_task = asyncio.run_coroutine_threadsafe(self.fetch_mi_output_async(), AsyncSSHLoop().get_loop())
        
        # currently this runs in the main loop
        self.mi_output_task = asyncio.create_task(self.fetch_mi_output_async())
        
    async def start_async(self) -> None:
        await SessionCreationTaskQueue.inst().add_task(None, self.__start_async)

    async def fetch_mi_output_async(self):
        # currently this runs in the main loop
        while True:
            try:
                response = await self.gdb_controller.fetch_output()
                # logger.debug(f"raw response from session [{self.sid}] ,{response}")
                responses=self.gdb_response_parser.get_responses_list(response, "stdout")
                # logger.debug(f"parsed response from gdb,${responses}")
                if responses:
                    payload = ""
                    for r in responses:
                        if r["type"] == "console":
                            payload += r["payload"]
                        else:
                            asyncio.run_coroutine_threadsafe(
                                self.processor.put(
                                    SessionResponse(self.sid, self.get_meta_str(), r)
                                ), GlobalRunningLoop().get_loop()
                            )
                            # await self.processor.put(
                            #     SessionResponse(self.sid, self.get_meta_str(), r)
                            # )

                    console_out = {
                        "type": "console",
                        "message": None,
                        "stream": "stdout",
                        "payload": None
                    }
                    payload = payload.strip()
                    if payload:
                        console_out["payload"] = payload
                        asyncio.run_coroutine_threadsafe(
                            self.processor.put(
                                SessionResponse(
                                    self.sid, self.get_meta_str(), console_out)
                            ), GlobalRunningLoop().get_loop()
                        )
                        # await self.processor.put(
                        #     SessionResponse(
                        #         self.sid, self.get_meta_str(), console_out)
                        # )
            except Exception as e:
                logger.error(f"Error in fetch_mi_output: {e}")
                break

    def fetch_mi_output(self):
        try:
            while self.gdb_controller.is_open():
                response = self.gdb_controller.fetch_output(
                    timeout=1)
                # logger.debug(f"raw response from session [{self.sid}] ,{response}")
                responses=self.gdb_response_parser.get_responses_list(response,"stdout")
                # logger.debug(f"parsed response from gdb,${responses}")
                if responses:
                    payload = ""
                    for r in responses:
                        if r["type"] == "console":
                            payload += r["payload"]
                        else:
                            self.processor.put(
                                SessionResponse(self.sid, self.get_meta_str(), r)
                            )

                    console_out = {
                        "type": "console",
                        "message": None,
                        "stream": "stdout",
                        "payload": None
                    }
                    payload = payload.strip()
                    if payload:
                        console_out["payload"] = payload
                        self.processor.put(
                            SessionResponse(
                                self.sid, self.get_meta_str(), console_out)
                        )
        except Exception as e:
            logger.exception(f"Error in fetch_mi_output: {e}")

    def write(self, cmd: str):
        _, cmd_no_token, _, cmd = parse_cmd(cmd)

        # TODO: check if removing support of a list of commands is okay?
        # if isinstance(cmd, list):
            # cmd=" ".join(cmd)
        logger.debug(f"send command to session {self.sid}:\n{cmd}")
        if (cmd_no_token.strip() in [ "run", "r", "-exec-run" ]) and self.run_delay:
            asyncio.sleep(self.run_delay)
        
        # FIXME: check if this special handling is actually needed?
        # Special case for handling interruption when child process is spawned.
        # `exec-interrupt` won't work in this case. Need manually send kill signal.
        # TODO: how to handle this elegantly?
        # if ("-exec-interrupt" == cmd_no_token.strip()) and self.startMode == StartMode.ATTACH:
        #     logger.debug(f"session {self.sid} sending kill to {self.attach_pid}")
        #     self.remote_gdbserver.execute_command(["kill", "-5", str(self.attach_pid)])
        #     return

        self.gdb_controller.write_input(cmd)

    def get_meta_str(self) -> str:
        return f"[ {self.tag}, {self.bin}, {self.sid} ]"

    async def cleanup_async(self):
        # self._stop_event.set()
        # sleep(1) # wait to let fetch thread to stop should be larger than timeout
        # await asyncio.sleep(1)
        try:
            self.mi_output_task.cancel()
            logger.debug(
                f"Exiting gdb/mi controller - \n\ttag: {self.tag}, \n\tbin: {self.bin}"
            )
            if self.gdb_controller and self.gdb_controller.is_open():
                on_exit = GlobalConfig.get().conf.on_exit
                if on_exit == OnExitBehavior.KILL:
                    self.gdb_controller.write_input("kill")
                elif on_exit == OnExitBehavior.DETACH:
                    self.gdb_controller.write_input("detach")
                else:
                    logger.error("Undefined on_exit behavior, maybe parse error or logic error. Please report. Using detach as fallback.")
                    self.gdb_controller.write_input("detach")
                self.gdb_controller.write_input("exit")
                await self.gdb_controller.close()
        except Exception as e:
            logger.error(f"Error in cleanup: {e}")

    def cleanup(self):
        loop = AsyncSSHLoop().get_loop()
        if asyncio.get_event_loop() != loop:
            future = asyncio.run_coroutine_threadsafe(self.cleanup_async(), loop)
            future.result()
        else:
            asyncio.create_task(self.cleanup_async())
    
    # def __del__(self):
    #     self.cleanup()
