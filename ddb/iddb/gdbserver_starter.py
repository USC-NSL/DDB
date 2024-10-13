import queue
import select
import threading
from typing import List, Optional
import gevent.lock
import paramiko
from dataclasses import dataclass
from abc import ABC, abstractmethod
from iddb.logging import logger
from pssh.clients import SSHClient
from queue import Queue
from ssh2.error_codes import LIBSSH2_ERROR_EAGAIN
import gevent
from pssh.clients.base.single import Stdin
class RemoteServerConnection(ABC):
    @abstractmethod
    def start(self, command: str):
        pass

    @abstractmethod
    def write(self, command: str):
        pass

    @abstractmethod
    def readline(self) -> str:
        pass

    @abstractmethod
    def close(self):
        pass
    

@dataclass
class SSHRemoteServerCred:
    port: str
    # bin: str
    hostname: str
    username: str
    private_key_path: str


class SSHRemoteServerClient(RemoteServerConnection):
    def __init__(self, cred: SSHRemoteServerCred):
        """
        Initialize the RemoteCommandExecutor with SSH credentials.

        :param cred: An instance of SSHRemoteServerCred containing SSH connection details.
        """
        self.cred = cred
        self.private_key_path = '~/.ssh/id_rsa' if cred.private_key_path is None else cred.private_key_path
        self.client = SSHClient(self.cred.hostname, user=self.cred.username, pkey=self.private_key_path)
        self.message_queue = queue.Queue()
        self.stdin: Optional[object] = None
        self.thread: Optional[threading.Thread] = None
        self.stdin_ready = threading.Event()
        self.stop_event = threading.Event()
        self.mtx = threading.Lock()
        self.channel = None

    # def start_thread(self, command: str):
    #     """
    #     Thread target to run the remote command and enqueue the output.

    #     :param command: The command to execute on the remote host.
    #     """
    #     try:
    #         logger.debug(f"Starting remote command: {command}")
    #         # TODO: Setup remote environment first, such as copying extension scripts
    #         host_output = self.client.run_command(command,use_pty=True)
    #         self.stdin = host_output.stdin
    #         self.stdin_ready.set()
    #         stdout = host_output.stdout
    #         # Optionally handle stderr if needed
    #         # stderr = host_output.stderr

    #         logger.debug("Started reading stdout")
    #         for line in stdout:
    #             if self.stop_event.is_set():
    #                 logger.debug("Stop event set, terminating thread")
    #                 break
    #             if line == '&"\n"':
    #                 continue
    #             n_line=line.strip()+'\n'
    #             self.message_queue.put(n_line)
    #             logger.debug(f"Enqueued line: {line}")

    #     except Exception as e:
    #         logger.exception(f"Exception in start_thread: {e}")
    #         self.stdin_ready.set()  # Ensure the main thread isn't stuck waiting
    #         self.message_queue.put(f"Error: {e}")
    # _lock=gevent.lock.RLock()
    # _lock = threading.RLock()
    def start_thread(self, command: str):
        """
        Thread target to run the remote command and enqueue the output.

        :param command: The command to execute on the remote host.
        """
        # faulthandler.enable(sys.stderr)
        try:
            # logger.debug(f"Starting remote command: {command}")
            # TODO: Setup remote environment first, such as copying extension scripts
            self.channel = self.client.execute(command)
            # self.stdin = Stdin(channel, self.client)
            self.stdin_ready.set()

            # logger.debug("Started reading stdout")
            # logger.exception("Started reading stdout")
            while not self.stop_event.is_set():
                try:
                    with self.mtx:
                        numbytes, buffer= self.channel.read()
                        if numbytes == LIBSSH2_ERROR_EAGAIN:
                            self.client.poll()
                            continue

                        if numbytes > 0:
                            self.message_queue.put(bytes(buffer[:numbytes]))
                        elif numbytes == 0:
                            continue
                        else:
                            break
                        # gevent.sleep()
                        # logger.debug(f"Enqueued line: {bytes(buffer[:numbytes]).decode()}")
                except Exception as e:
                    logger.error(f"Exception in reading output: {e}")

        except Exception as e:
            logger.error(f"Exception in start_thread: {e}")
            self.stdin_ready.set()  # Ensure the main thread isn't stuck waiting
            self.message_queue.put(f"Error: {e}")

    def start(self, command: str) -> bool:
        """
        Start the remote command in a separate thread.

        :param command: The command to execute.
        :return: True if the thread started successfully, False otherwise.
        """
        if self.thread and self.thread.is_alive():
            logger.warning("Thread already running")
            return False

        self.thread = threading.Thread(target=self.start_thread, args=(command,), daemon=True)
        self.thread.start()
        logger.debug("Thread started, waiting for stdin to be ready")

        # Wait for stdin to be ready with a timeout to avoid indefinite blocking
        if not self.stdin_ready.wait(timeout=10):
            logger.error("Timeout waiting for stdin to be ready")
            return False

        logger.debug("stdin is ready")
        return True

    def readline(self, timeout: float = 1.0) -> Optional[str]:
        """
        Read a line from the message queue with a timeout.

        :param timeout: Time to wait for a line.
        :return: The line read or None if timeout occurs.
        """
        try:
            line = self.message_queue.get(timeout=timeout)
            # logger.debug(f"Read line: {line.strip()}")
            return line
        except queue.Empty:
            return None
        
    def write(self, command: str):
        with self.mtx:
            if self.channel:
                try:
                    self.channel.write(command)
                except Exception as e:
                    logger.error(f"Error writing to channel: {e}")
            else:
                logger.error("Channel not initialized")
                
        # with self._lock:
        # self.stdin.write(command)
        
    def close(self):
        self.client.disconnect()

# class KubeRemoteSeverClient(RemoteServerConnection):
#     from kubernetes import config as kubeconfig, client as kubeclient, stream

#     def __init__(self, pod_name: str, pod_namespace: str):
#         self.pod_name = pod_name
#         self.pod_namespace = pod_namespace

#     def connect(self):
#         pass

#     def execute_command(self, command):
#         self.clientset=KubeRemoteSeverClient.kubeclient.CoreV1Api()
#         output = KubeRemoteSeverClient.stream.stream(self.clientset.connect_get_namespaced_pod_exec, self.pod_name, self.pod_namespace,
#                                command=command, stderr=True, stdin=False,
#                                stdout=True, tty=False)
#         return output
#     def close(self):
#         pass
#     def start(self, args: Optional[List[str]] = None, attach_pid: Optional[int] = None, sudo: bool = False):
#         pass


# class LocalClient(RemoteServerConnection):
#     def __init__(self):
#         pass

#     def connect(self):
#         pass

#     def execute_command(self, command):
#         import subprocess
#         subprocess.run(command)

#     def close(self):
#         pass

#     def start(self, args: Optional[List[str]] = None, attach_pid: Optional[int] = None, sudo: bool = False):
#         pass