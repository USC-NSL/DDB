from cpython.thread cimport PyThreadState, PyEval_SaveThread, PyEval_RestoreThread
from queue import Queue, Empty
import asyncio
import asyncssh
import threading

cdef class SSHWorker:
    """
    A worker that manages multiple persistent SSH connections.
    Each connection can handle interactive input and output.
    """
    cdef int worker_id
    cdef Queue task_queue
    cdef Queue output_queue
    cdef dict connections  # Maps connection_id to asyncssh.SSHClientConnection
    cdef bint running
    cdef threading.Thread worker_thread

    def __init__(self, int worker_id):
        self.worker_id = worker_id
        self.task_queue = Queue()
        self.output_queue = Queue()
        self.connections = {}
        self.running = True

        self.worker_thread = threading.Thread(target=self._start_worker)
        self.worker_thread.start()

    def add_task(self, dict params, Queue iq, Queue oq):
        """
        Add a task to the worker's queue.
        - params: Additional parameters (e.g., host, username, command)
        """
        self.task_queue.put((params, iq, oq))

    def fetch_output(self):
        """
        Fetch the next piece of output from the output queue.
        Returns None if no output is available.
        """
        try:
            return self.output_queue.get_nowait()
        except Empty:
            return None

    def stop(self):
        """
        Signal the worker to stop and wait for it to finish.
        """
        self.running = False
        self.task_queue.put(None)  # Stop signal
        self.worker_thread.join()

    cdef void _start_worker(self):
        """
        Start the worker's asyncio event loop in a thread.
        """
        cdef PyThreadState* _save
        _save = PyEval_SaveThread()  # Release the GIL for true parallelism
        try:
            asyncio.run(self._worker_loop())
        finally:
            PyEval_RestoreThread(_save)  # Reacquire the GIL

    async def _worker_loop(self):
        """
        Async event loop to manage multiple SSH connections.
        """
        print(f"Worker {self.worker_id} started")

        while self.running:
            task = await asyncio.to_thread(self.task_queue.get)
            if task is None:  # Stop signal
                break

            params, iq, oq = task
            try:
                # await self._connect(params, iq, oq)
                asyncio.create_task(self._connect(params, iq, oq))
                # if task_type == "connect":
                #     await self._connect(connection_id, params["host"], params["username"])
                # elif task_type == "command":
                #     await self._send_command(connection_id, params["command"])
                # elif task_type == "disconnect":
                #     await self._disconnect(connection_id)
            except Exception as e:
                self.output_queue.put(f"[Worker {self.worker_id}] Error handling task {task_type}: {e}")

        # Disconnect all sessions
        for connection_id in list(self.connections.keys()):
            await self._disconnect(connection_id)

        print(f"Worker {self.worker_id} shutting down")

    async def _connect(self, str connection_id, str host, str username):
        """
        Establish a new SSH connection.
        """
        if connection_id in self.connections:
            raise ValueError(f"Connection {connection_id} already exists")

        conn = await asyncssh.connect(host, username=username)
        self.connections[connection_id] = conn
        self.output_queue.put(f"[Worker {self.worker_id}] Connected to {connection_id}")

        async def __write(iq):
            while True:
                try:
                    data = await  iq.get()
                    conn.write(data)
                except asyncssh.ChannelOpenError:
                    break


    async def _send_command(self, str connection_id, str command):
        """
        Send a command to an existing SSH connection.
        """
        conn = self.connections.get(connection_id)
        if not conn:
            raise ValueError(f"Connection {connection_id} does not exist")

        result = await conn.run(command, check=True)
        self.output_queue.put(f"[Worker {self.worker_id}] Output from {connection_id}: {result.stdout.strip()}")

    async def _disconnect(self, str connection_id):
        """
        Disconnect an existing SSH connection.
        """
        conn = self.connections.pop(connection_id, None)
        if conn:
            conn.close()
            self.output_queue.put(f"[Worker {self.worker_id}] Disconnected from {connection_id}")
