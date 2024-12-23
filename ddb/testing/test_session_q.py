import asyncio
from dataclasses import dataclass
from multiprocessing import Lock
import multiprocessing
from threading import Thread
import time
from typing import Dict, List, Optional
import logging

# import dill as pickle
import cloudpickle
# from multiprocessing import Queue

# class CallableQueue:
#     """A multiprocessing queue that supports callables using dill."""
    
#     def __init__(self):
#         self._queue = multiprocessing.Queue()

#     def put(self, callable_with_args):
#         """Put a callable and its arguments into the queue."""
#         serialized = pickle.dumps(callable_with_args)
#         self._queue.put(serialized)

#     def get(self):
#         """Retrieve and deserialize a callable and its arguments from the queue."""
#         serialized = self._queue.get()
#         return pickle.loads(serialized)

#     # def task_done(self):
#     #     """Indicate that a previously enqueued task is complete."""
#     #     self._queue.task_done()

#     def join(self):
#         """Wait for all tasks to be completed."""
#         self._queue.join()


logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)
handler = logging.StreamHandler()
handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
logger.addHandler(handler)

logging.basicConfig(filename="worker.log", level=logging.DEBUG)

class SessionCreationTaskQueue:
    '''Singleton class for managing session creation tasks with multi-process support.'''

    _instance = None
    _lock = Lock()

    @dataclass
    class WorkerMeta:
        task_queue: asyncio.Queue
        event_loop: Optional[asyncio.AbstractEventLoop] = None

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(SessionCreationTaskQueue, cls).__new__(cls)
                cls._instance._initialized = False
            return cls._instance

    def __init__(self, max_proc_wrks=1, max_async_wrks=5):
        if not self._initialized:
            self.task_queue = multiprocessing.Queue()
            # self.task_queue = CallableQueue()
            self.max_proc_wrks = max_proc_wrks
            self.max_async_wrks = max_async_wrks
            self.wrk_procs: List[multiprocessing.Process] = []
            # self.async_wrk_queues: Dict[int, asyncio.Queue] = {}
            self.wrk_meta: Dict[int, SessionCreationTaskQueue.WorkerMeta] = {}
            self._initialized = True

    @staticmethod
    def inst():
        return SessionCreationTaskQueue()

    def proc_worker(self, index: int):
        """Worker function to process tasks in a separate process."""
        try:
            wrk_meta = self.wrk_meta[index]

            async def process_tasks(meta: SessionCreationTaskQueue.WorkerMeta):
                logger.info(f"Started async worker")
                while True:
                    try:
                        logger.debug("Processing task")
                        callable = await meta.task_queue.get()
                        # logger.debug(f"get callable: {callable}")
                        callback, args, kwargs = cloudpickle.loads(callable)
                        logger.debug(f"Processed task: {args}")
                        await callback(*args, **kwargs)
                        logger.debug(f"Task completed: {args}")
                    except Exception as e:
                        logger.error(f"Error in async worker: {e}")
                    finally:
                        meta.task_queue.task_done()

            async def spawn_async_wrk(meta: SessionCreationTaskQueue.WorkerMeta, wrker_num: int):
                meta.event_loop = asyncio.get_event_loop()
                for _ in range(wrker_num):
                    asyncio.create_task(process_tasks(meta))

            def dispatcher(task_queue: multiprocessing.Queue, meta: SessionCreationTaskQueue.WorkerMeta):
                while True:
                    if meta.event_loop == None or not meta.event_loop.is_running():
                        logger.info(f"Event loop is not running.")
                        time.sleep(1)
                    try:
                        callable = task_queue.get()
                        logger.info(f"dispatch")
                        asyncio.run_coroutine_threadsafe(
                            meta.task_queue.put(callable), 
                            meta.event_loop 
                        )
                    except Exception as e:
                        logger.error(f"Error in dispatcher: {e}")
        
            async def start_dispatcher(
                task_queue: multiprocessing.Queue, 
                meta: SessionCreationTaskQueue.WorkerMeta, 
                wrker_num: int = 5
            ):
                await spawn_async_wrk(meta, wrker_num)
                await asyncio.to_thread(
                    lambda: Thread(target=dispatcher, args=(task_queue, meta), daemon=True).start()
                )
                await asyncio.Event().wait()

            asyncio.run(
                start_dispatcher(self.task_queue, wrk_meta, self.max_async_wrks), 
                debug=True,
            )

        except Exception as e:
            logger.error(f"Error in worker proc: {e}")

    def add_task(self, callback, args=(), kwargs={}):
        """Add a task to the queue."""
        # logger.debug(f"Adding task: {args}")
        callable = cloudpickle.dumps((callback, args, kwargs))
        self.task_queue.put(callable)

    def start_workers(self):
        """Start multiple worker processes."""
        for i in range(self.max_proc_wrks):
            # self.async_wrk_queues[i] = asyncio.Queue()
            self.wrk_meta[i] = SessionCreationTaskQueue.WorkerMeta(asyncio.Queue())
            process = multiprocessing.Process(target=self.proc_worker, args=(i,))
            process.start()
            self.wrk_procs.append(process)
        logger.info(f"Started {self.max_proc_wrks} worker processes.")

    def stop_workers(self):
        """Stop all worker processes."""
        def clean_event_loop(i):
            el = self.wrk_meta[i].event_loop
            if el and el.is_running():
                for task in asyncio.all_tasks(el):
                    el.call_soon_threadsafe(task.cancel)
                el.call_soon_threadsafe(el.stop)

        for i, process in enumerate(self.wrk_procs):
            clean_event_loop(i)
            process.terminate()
            process.join()
        logger.info("All worker processes have been terminated.")

s = SessionCreationTaskQueue()
s.start_workers()

def main():
    import time

    async def callback(args):
        try:
            logger.debug(f"Executing task: {args}")
            await asyncio.sleep(1)
        except Exception as e:
            logger.error(f"Error in callback: {e}")

    for i in range(10):
        s.add_task(callback, (i,))

    time.sleep(10)
    s.stop_workers()

if __name__ == '__main__':
    main()