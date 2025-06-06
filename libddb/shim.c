#define _GNU_SOURCE
#include <stdbool.h>
#include <pthread.h>
#include <stdio.h>
#include <stdint.h>
#include <stdlib.h>
#include <string.h>
#include <sys/ipc.h>
#include <sys/shm.h>
#include <syscall.h>
#include <unistd.h>
#include <bits/pthreadtypes.h>
#include <dlfcn.h>

#include "ddb/common.h"
#include "ddb/lock.h"
#include "ddb/logger.h"

extern ddb_shmseg *ddb_shared;
extern pthread_key_t ddb_tls_key;

typedef struct {   
  void *(*worker_func)(void *param);
  void *param;
} pthread_param_t;

static inline int get_lowner_idx() {
  ddb_lowner_t *lowners = &ddb_shared->ddb_lowners;
  // find reusable slot
  if (lowners->n != lowners->max_n) {
    for (int i = 0; i < lowners->max_n; ++i) {
      if (!lowners->lowner_entries[i].valid) {
        lowners->n++;
        return i;
      }
    }
  }

  // new slot
  lowners->max_n++;
  lowners->n++;

  return (lowners->max_n - 1);
}

static inline void put_lowner_idx(int idx) {
  ddb_lowner_t *lowners = &ddb_shared->ddb_lowners;
  memset(&lowners->lowner_entries[idx], 0, sizeof(ddb_lowner_entry_t));
  lowners->lowner_entries[idx].valid = false;

  // This is the last slot
  if (idx == lowners->max_n - 1) {
    lowners->max_n--;
  }
  lowners->n--;
}

static inline int get_wait_idx(ddb_wait_buffer_t *wbuf) {
  if (wbuf->n != wbuf->max_n) {
    for (int i = 0; i < wbuf->max_n; ++i) {
      if (!wbuf->wait_entries[i].valid) {
        wbuf->n++;
        return i;
      }
    }
  }

  // new slot
  wbuf->max_n++;
  wbuf->n++;

  return (wbuf->max_n - 1);
}

static inline void put_wait_idx(ddb_wait_buffer_t *wbuf, int idx) {
  memset(&wbuf->wait_entries[idx], 0, sizeof(ddb_wait_entry_t));
  wbuf->wait_entries[idx].valid = false;

  // This is the last slot
  if (idx == wbuf->max_n - 1) {
    wbuf->max_n--;
  }
  wbuf->n--;
}

static inline int get_tidx() {
  // find reusable slot
  if (ddb_shared->ddb_nthread != ddb_shared->ddb_max_idx) {
    for (int i = 0; i < ddb_shared->ddb_max_idx; ++i) {
      if (ddb_shared->ddb_thread_infos[i].fsbase == NULL) {
        ddb_shared->ddb_nthread++;
        return i;
      }
    }
  }

  // new slot
  ddb_shared->ddb_max_idx++;
  ddb_shared->ddb_nthread++;

  return (ddb_shared->ddb_max_idx - 1);
}

static inline void put_tidx(int tidx) {
  memset(&ddb_shared->ddb_thread_infos[tidx], 0, sizeof(ddb_thread_info_t));

  // This is the last slot
  if (tidx == ddb_shared->ddb_max_idx - 1) {
    ddb_shared->ddb_max_idx--;
  }
  ddb_shared->ddb_nthread--;
}

static inline uint64_t timespec_diff_ns(struct timespec t1, struct timespec t2) {
  return (t1.tv_sec - t2.tv_sec) * 1000000000 + (t1.tv_nsec - t2.tv_nsec);
}

static void event_record_mutex(pthread_mutex_t *mutex) {
  if (unlikely(!ddb_shared)) {
    return;
  }

  struct timespec now;
  int tinfo_idx = get_thread_info_idx();
  ddb_thread_info_t *tinfo = &ddb_shared->ddb_thread_infos[tinfo_idx];

  clock_gettime(CLOCK_MONOTONIC_RAW, &now);
}

/* pthread-related functions */
void *__ddb_thread_start(void *arg) {
  void *ret;
  int tidx;
  pthread_param_t real_thread_params;

  memcpy(&real_thread_params, arg, sizeof(pthread_param_t));

  free(arg);

  // initialize stack
  char *rbp = get_rbp(); // this is the rbp of thread main
  
  printf("New interposed thread is starting... thread ID = %ld\n", syscall(SYS_gettid));

  if (unlikely(!ddb_shared)) {
    printf("ddb shared memory is not properly initialized\n");
    exit(1);
  }

  // allocate & initialize event buffer
  ddb_wait_buffer_t *wbuf = (ddb_wait_buffer_t *)malloc(sizeof(ddb_wait_buffer_t));
  memset(wbuf, 0, sizeof(ddb_wait_buffer_t));
  wbuf->wait_entries = (ddb_wait_entry_t *)malloc(sizeof(ddb_wait_entry_t) * DDB_MAX_NWAIT);
  if (wbuf->wait_entries == 0) {
    fprintf(stderr, "\tmalloc() failed\n");
  }

  struct timespec now;
  clock_gettime(CLOCK_MONOTONIC_RAW, &now);

  // start tracking
  pthread_spin_lock(&(ddb_shared->ddb_tlock));
  tidx = get_tidx();
  pid_t id = syscall(SYS_gettid);
  ddb_shared->ddb_thread_infos[tidx].valid = true;
  ddb_shared->ddb_thread_infos[tidx].id = id;
  ddb_shared->ddb_thread_infos[tidx].fsbase = (char **)(rdfsbase());
  ddb_shared->ddb_thread_infos[tidx].stackbase = rbp;
  ddb_shared->ddb_thread_infos[tidx].wbuf = wbuf;
  pthread_spin_unlock(&(ddb_shared->ddb_tlock));

  register_thread_info(tidx);

  // execute real thread
  ret = real_thread_params.worker_func(real_thread_params.param);

  // stop tracking
  pthread_spin_lock(&(ddb_shared->ddb_tlock));
  ddb_shared->ddb_thread_infos[tidx].valid = false;
  put_tidx(tidx);
  pthread_spin_unlock(&(ddb_shared->ddb_tlock));

  printf("Application thread is exitting... \n");

  free(wbuf->wait_entries);
  free(wbuf);

  return ret;
}

int pthread_create(pthread_t *thread, const pthread_attr_t *attr,
                          void *(*start_routine) (void *), void *arg) {
    char *error;
    static int (*real_pthread_create)(pthread_t *thread, const pthread_attr_t *attr,
        void *(*start_routine) (void *), void *arg);

    if (unlikely(!real_pthread_create)) {
      real_pthread_create = dlsym(RTLD_NEXT, "pthread_create");
      if( (error = dlerror()) != NULL) {
          fputs(error, stderr);
          return -1;
      }
    }

    pthread_param_t *worker_params;

    worker_params = malloc(sizeof(pthread_param_t));

    worker_params->worker_func  = start_routine;
    worker_params->param        = arg;

    /* Call the real pthread_create function and return the value like a normal
        call to pthread_create*/
    return real_pthread_create(thread, attr, &__ddb_thread_start, worker_params);
}

int pthread_join(pthread_t thread, void **retval) {
  char *error;
  static int (*real_pthread_join)(pthread_t, void **);
  int ret;

  if (unlikely(!real_pthread_join)) {
    real_pthread_join = dlsym(RTLD_NEXT, "pthread_join");
    if ((error = dlerror()) != NULL) {
      fputs(error, stderr);
      return -1;
    }
  }

  ret = real_pthread_join(thread, retval);
  if (likely(ret == 0)) {
    // event_record_now(LDB_EVENT_JOIN_JOINED, (uint64_t)thread, 0, 0);
  }

  return ret;
}

int pthread_mutex_lock(pthread_mutex_t *mutex) {
  char *error;
  static int (*real_pthread_mutex_lock)(pthread_mutex_t *m);
  int ret;
  int thread_info_idx = get_thread_info_idx();

  if (unlikely(!real_pthread_mutex_lock)) {
    real_pthread_mutex_lock = dlsym(RTLD_NEXT, "pthread_mutex_lock");
    printf("found pthread_mutex_lock %p\n", real_pthread_mutex_lock);
    if ((error = dlerror()) != NULL) {
      fputs(error, stderr);
      return -1;
    }
  }

  ddb_wait_buffer_t* wbuf = NULL;
  pid_t tid = -1;
  int widx = -1;
  if (likely(ddb_shared)) {
    tid = ddb_shared->ddb_thread_infos[thread_info_idx].id;
    wbuf = ddb_shared->ddb_thread_infos[thread_info_idx].wbuf;
    get_wlock(&wbuf->lock);
    widx = get_wait_idx(wbuf);
    wbuf->wait_entries[widx].valid = true; // mark as valid (waiting the lock)
    wbuf->wait_entries[widx].type = DDB_WAIT_MUTEX;
    wbuf->wait_entries[widx].identifier = (uintptr_t)mutex;
    rel_wlock(&wbuf->lock);
  }

  // dump_shared_memory();

  ret = real_pthread_mutex_lock(mutex);

  if (likely(ddb_shared && tid != -1)) {
    get_wlock(&wbuf->lock);
    wbuf->wait_entries[widx].valid = false; // mark as invalid (accquired, no longer wait)
    put_wait_idx(wbuf, widx);
    rel_wlock(&wbuf->lock);

    // Register the owner of the lock
    get_wlock(&ddb_shared->ddb_lowners.lock);
    int lidx = get_lowner_idx();
    ddb_shared->ddb_lowners.lowner_entries[lidx].valid = true;
    ddb_shared->ddb_lowners.lowner_entries[lidx].lid = (uintptr_t)mutex;
    ddb_shared->ddb_lowners.lowner_entries[lidx].owner_tid = tid;
    rel_wlock(&ddb_shared->ddb_lowners.lock);
  }
  // printf("Have the mutex lock\n");
  // dump_shared_memory();

  return ret;
}

int pthread_mutex_unlock(pthread_mutex_t *mutex) {
  char *error;
  static int (*real_pthread_mutex_unlock)(pthread_mutex_t *m);
  int ret;

  if (unlikely(!real_pthread_mutex_unlock)) {
    real_pthread_mutex_unlock = dlsym(RTLD_NEXT, "pthread_mutex_unlock");
    printf("found pthread_mutex_unlock %p\n", real_pthread_mutex_unlock);
    if ((error = dlerror()) != NULL) {
      fputs(error, stderr);
      return -1;
    }
  }

  ret = real_pthread_mutex_unlock(mutex);

  if (likely(ddb_shared)) {
    // printf("unlocking the mutex\n");
    // dump_shared_memory();
    // Unregister the owner of the lock
    get_wlock(&ddb_shared->ddb_lowners.lock);
    for (int i = 0; i < ddb_shared->ddb_lowners.max_n; i++) {
      ddb_lowner_entry_t *lowner_ent = &ddb_shared->ddb_lowners.lowner_entries[i];
      if (lowner_ent->valid && lowner_ent->lid == (uintptr_t)mutex) {
        lowner_ent->valid = false;
        lowner_ent->lid = (uintptr_t)NULL;
        lowner_ent->owner_tid = -1;
        put_lowner_idx(i);
        break;
      }
    }
    rel_wlock(&ddb_shared->ddb_lowners.lock);
    // printf("unlocked the mutex\n");
    // dump_shared_memory();
  }

  return ret;
}

int pthread_mutex_trylock(pthread_mutex_t *mutex) {
  char *error;
  static int (*real_pthread_mutex_trylock)(pthread_mutex_t *m);
  int ret;
  int thread_info_idx = get_thread_info_idx();

  if (unlikely(!real_pthread_mutex_trylock)) {
    real_pthread_mutex_trylock = dlsym(RTLD_NEXT, "pthread_mutex_trylock");
    if ((error = dlerror()) != NULL) {
      fputs(error, stderr);
      return -1;
    }
  }
  ret = real_pthread_mutex_trylock(mutex);
  return ret;
}

int pthread_spin_lock(pthread_spinlock_t *lock) {
  char *error;
  static int (*real_pthread_spin_lock)(pthread_spinlock_t *);

  if (unlikely(!real_pthread_spin_lock)) {
    real_pthread_spin_lock = dlsym(RTLD_NEXT, "pthread_spin_lock");
    if ((error = dlerror()) != NULL) {
      fputs(error, stderr);
      return -1;
    }
  }

  return real_pthread_spin_lock(lock);
}

int pthread_cond_broadcast(pthread_cond_t *cond) {
  char *error;
  static int (*real_pthread_cond_broadcast)(pthread_cond_t *);

  if (unlikely(!real_pthread_cond_broadcast)) {
    real_pthread_cond_broadcast = dlsym(RTLD_NEXT, "pthread_cond_broadcast");
    if ((error = dlerror()) != NULL) {
       fputs(error, stderr);
       return -1;
    }
  }

  return real_pthread_cond_broadcast(cond);
}

int pthread_cond_signal(pthread_cond_t *cond) {
  char *error;
  static int (*real_pthread_cond_signal)(pthread_cond_t *);

  if (unlikely(!real_pthread_cond_signal)) {
    real_pthread_cond_signal = dlsym(RTLD_NEXT, "pthread_cond_signal");
    if ((error = dlerror()) != NULL) {
      fputs(error, stderr);
      return -1;
    }
  }

  return real_pthread_cond_signal(cond);
}

int pthread_cond_wait(pthread_cond_t *cond, pthread_mutex_t *mutex) {
  char *error;
  static int (*real_pthread_cond_wait)(pthread_cond_t *, pthread_mutex_t *);

  if (unlikely(!real_pthread_cond_wait)) {
    real_pthread_cond_wait = dlsym(RTLD_NEXT, "pthread_cond_wait");
    if ((error = dlerror()) != NULL) {
      fputs(error, stderr);
      return -1;
    }
  }

  return real_pthread_cond_wait(cond, mutex);
}

int pthread_cond_timedwait(pthread_cond_t *cond,
                           pthread_mutex_t *mutex,
                           const struct timespec *abstime) {
  char *error;
  static int (*real_pthread_cond_timedwait)(pthread_cond_t *, pthread_mutex_t *,
      const struct timespec *);

  if (unlikely(!real_pthread_cond_timedwait)) {
    real_pthread_cond_timedwait = dlsym(RTLD_NEXT, "pthread_cond_timedwait");
    if ((error = dlerror()) != NULL) {
      fputs(error, stderr);
      return -1;
    }
  }

  return real_pthread_cond_timedwait(cond, mutex, abstime);
}

/* memory-related functions */
void *memset(void *str, int c, size_t n) {
  char *error;
  static void *(*real_memset)(void *, int, size_t);

  if (unlikely(!real_memset)) {
    real_memset = dlsym(RTLD_NEXT, "memset");
    if ((error = dlerror()) != NULL) {
      fputs(error, stderr);
      return NULL;
    }
  }

  return real_memset(str, c, n);
}

void *memcpy(void *dest, const void *src, size_t len) {
  char *error;
  static void *(*real_memcpy)(void *, const void *, size_t);

  if (unlikely(!real_memcpy)) {
    real_memcpy = dlsym(RTLD_NEXT, "memcpy");
    if ((error = dlerror()) != NULL) {
      fputs(error, stderr);
      return NULL;
    }
  }

  return real_memcpy(dest, src, len);
}

void *malloc(size_t size) {
  char *error;
  static void *(*real_malloc)(size_t);

  if (unlikely(!real_malloc)) {
    real_malloc = dlsym(RTLD_NEXT, "malloc");
    if ((error = dlerror()) != NULL) {
      fputs(error, stderr);
      return NULL;
    }
  }

  return real_malloc(size);
}

void free(void *ptr) {
  char *error;
  static void (*real_free)(void *);

  if (unlikely(!real_free)) {
    real_free = dlsym(RTLD_NEXT, "free");
    if ((error = dlerror()) != NULL) {
      fputs(error, stderr);
      return;
    }
  }

  return real_free(ptr); 
}

/* other useful functions */
int rand(void) {
  char *error;
  static int (*real_rand)(void);

  if (unlikely(!real_rand)) {
    real_rand = dlsym(RTLD_NEXT, "rand");
    if ((error = dlerror()) != NULL) {
      fputs(error, stderr);
      return 0;
    }
  }

  return real_rand();
}
