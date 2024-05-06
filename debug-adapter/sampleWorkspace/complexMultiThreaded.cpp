#include <stdio.h>
#include <stdlib.h>
#include <string>
#include <vector>
#include <random>
#include <pthread.h>

// Shared variable accessible to all threads
int shared_data = 0;
pthread_mutex_t mutex = PTHREAD_MUTEX_INITIALIZER;

int getRandomIndex(int size)
{
  // Seed the random number generator (do this only once in your program)
  static std::random_device rd;
  static std::mt19937 generator(rd());

  // Create a distribution that produces numbers from 0 to the size of the names list - 1
  std::uniform_int_distribution<int> distribution(0, size - 1);

  // Generate a random index and return the name at that position
  return distribution(generator);
}

std::vector<std::string> getAllNames()
{
  const std::vector<std::string> names = {
      "Liam", "Olivia", "Noah", "Emma", "Oliver", "Ava", "Elijah", "Charlotte", "William", "Sophia",
      "James", "Amelia", "Benjamin", "Isabella", "Lucas", "Mia", "Henry", "Evelyn", "Alexander", "Harper",
      "Mason", "Emily", "Michael", "Abigail", "Ethan", "Elizabeth"};
  return names;
}

std::string getRandomName()
{
  printf("Getting random name\n");
  auto names = getAllNames();

  int randomIndex = getRandomIndex(names.size());

  return names[randomIndex];
}

// Function executed by each thread
void *thread_routine(void *arg)
{
  int thread_num = *(int *)arg;
  if (thread_num == 1)
  {
    std::string name = getRandomName();
    printf("Thread %d: Name: %s\n", thread_num, name.c_str());
  }
  else if (thread_num == 2) {
    // get current time
    time_t now = time(0);
    char *dt = ctime(&now);
    printf("Thread %d: Current time: %s\n", thread_num, dt);
  }
  return NULL;
}

int main()
{
  pthread_t threads[3];
  int thread_args[3];

  // Create three threads
  for (int i = 0; i < 2; i++)
  {
    thread_args[i] = i + 1; // Assign thread numbers
    if (pthread_create(&threads[i], NULL, thread_routine, &thread_args[i]) != 0)
    {
      perror("Error creating thread");
      exit(1);
    }
  }

  // Wait for all threads to complete
  for (int i = 0; i < 2; i++)
  {
    if (pthread_join(threads[i], NULL) != 0)
    {
      perror("Error joining thread");
      exit(1);
    }
  }

  printf("Final value of shared data: %d\n", shared_data);
  return 0;
}
