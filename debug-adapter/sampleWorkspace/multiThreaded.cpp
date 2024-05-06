#include <stdio.h>
#include <stdlib.h>
#include <pthread.h>

// Shared variable accessible to all threads
int shared_data = 0;
pthread_mutex_t mutex = PTHREAD_MUTEX_INITIALIZER; 

// Function executed by each thread
void *thread_routine(void *arg) {
    int thread_num = *(int *)arg;

    // Acquire the lock to ensure exclusive access
    pthread_mutex_lock(&mutex);

    // Critical section - Modify shared data
    shared_data += thread_num;
    printf("Thread %d: Updated shared data to %d\n", thread_num, shared_data);

    // Release the lock
    pthread_mutex_unlock(&mutex);

    pthread_exit(NULL);
}

int main() {
    pthread_t threads[3];
    int thread_args[3];

    // Create three threads
    for (int i = 0; i < 3; i++) {
        thread_args[i] = i + 1; // Assign thread numbers
        if (pthread_create(&threads[i], NULL, thread_routine, &thread_args[i]) != 0) {
            perror("Error creating thread");
            exit(1);
        }
    }

    // Wait for all threads to complete
    for (int i = 0; i < 3; i++) {
        if (pthread_join(threads[i], NULL) != 0) {
            perror("Error joining thread");
            exit(1);
        }
    }

    printf("Final value of shared data: %d\n", shared_data);
    return 0;
}
