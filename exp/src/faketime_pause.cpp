#include <array>
#include <atomic>
#include <bits/types/struct_timeval.h>
#include <chrono>
#include <cstddef>
#include <cstdint>
#include <cstring>
#include <iostream>
#include <sys/time.h>
#include <sys/types.h>
#include <thread>
#include <dlfcn.h>

#include "real_timer.hpp"
#include "ddb/integration.hpp"

constexpr size_t kVectorSize = 100 * 1000;
std::atomic<bool> g_done(false);

struct __attribute__((packed, aligned(64))) TS {
  long long faketime;
  uint64_t realtime;
};

template <typename T, size_t Capacity> class RingBuffer {
public:
  RingBuffer() : head_(0), tail_(0), size_(0) {}

  // Add an element to the buffer
  bool push(const T &value) {
    size_t head = head_.load(std::memory_order_relaxed);
    size_t next_head = (head + 1) % Capacity;

    if (next_head == tail_.load(std::memory_order_acquire)) {
      return false;
    }

    data_[head] = value;
    head_.store(next_head, std::memory_order_release);
    size_.fetch_add(1, std::memory_order_relaxed);
    return true;
  }

  // Remove the oldest element from the buffer
  bool pop(T &value) {
    size_t tail = tail_.load(std::memory_order_relaxed);

    if (tail == head_.load(std::memory_order_acquire)) {
      return false;
    }

    value = data_[tail];
    tail_.store((tail + 1) % Capacity, std::memory_order_release);
    size_.fetch_sub(1, std::memory_order_relaxed);
    return true;
  }

  // return the size (for performance sake, it doesn't guarantee the exact
  // up-to-date size)
  size_t size() const { return size_.load(std::memory_order_relaxed); }

private:
  alignas(64) T data_[Capacity];
  alignas(64) std::atomic<size_t> head_;
  alignas(64) std::atomic<size_t> tail_;
  alignas(64) std::atomic<size_t> size_;
};

inline long long get_unix_timestamp() {
    auto now = std::chrono::system_clock::now();
    return std::chrono::duration_cast<std::chrono::microseconds>(
        now.time_since_epoch()
    ).count();
}

void computation(std::array<uint64_t, kVectorSize> &buffer) {
  for (size_t i = 0; i < kVectorSize; ++i) {
    uint64_t sum = 0;
    sum += (buffer[i] / 2) * buffer[i];
    // for (size_t j = 0; j < kVectorSize / 10; ++j) {
    //     sum += buffer[j];
    // }
    buffer[i] = sum;
  }
//   std::cout << "Computation complete." << std::endl;
}

template <typename T, size_t Capacity>
void do_work(RingBuffer<T, Capacity> &rb) {
  std::array<uint64_t, kVectorSize> values;
  for (size_t i = 0; i < kVectorSize; ++i) {
    values[i] = i;
  }

//   auto current_time = std::chrono::system_clock::now();
  uint64_t counter = 0;

  while (true) {
    // auto start = std::chrono::system_clock::now();
    computation(values);
    // auto end = std::chrono::system_clock::now();
    // auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(end - start).count();
    // std::cout << duration << "ms" << std::endl;

    if (!rb.push({ get_unix_timestamp(), RealTimer::elapsed() })) {
      std::cout << "[ERROR] Ring buffer full. Dropping data." << std::endl;
    }

    counter++;
    if (counter == 400000) {
        break;
    }
  }
  g_done.store(true, std::memory_order_release);
//   auto end_time = std::chrono::system_clock::now();
//   auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(end_time - current_time).count();
//   std::cout << "Duration: " << duration << "ms" << std::endl;
}

template <typename T, size_t Capacity>
void log_data(RingBuffer<T, Capacity> &rb) {
    while (true) {
        if (g_done.load(std::memory_order_relaxed)) {
            break;
        }
        T value;
        // if (rb.size() >= 512) {
            while (rb.pop(value)) {
                if constexpr (std::is_same_v<T, TS>) {
                  std::cout << value.faketime << "," << value.realtime << std::endl;
                } else {
                  std::cout << value << std::endl;
                }
            } 
        // } 
        // else {
        //     std::this_thread::sleep_for(std::chrono::milliseconds(512));
        // }
    }
    T value;
    while (rb.pop(value)) {
      if constexpr (std::is_same_v<T, TS>) {
        std::cout << value.faketime << "," << value.realtime << std::endl;
      } else {
        std::cout << value << std::endl;
      }
    } 
}

int main() {
  auto ddb_config = DDB::Config::get_default("127.0.0.1");
  auto connector = DDB::DDBConnector(ddb_config);
  connector.init();

  RealTimer::init();

  constexpr size_t kRingBufferSize = 8192;
  RingBuffer<TS, kRingBufferSize> rb;

  std::thread worker(do_work<TS, kRingBufferSize>, std::ref(rb));
  std::thread logger(log_data<TS, kRingBufferSize>, std::ref(rb));

  worker.join();
  logger.join();

  return 0;
}