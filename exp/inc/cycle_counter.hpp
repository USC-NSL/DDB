#pragma once

#include <cstdint>
#include <cassert>
#include <cstdio>
#include <cstdlib>
#include <cstring>

#include <sys/time.h>
#include <xmmintrin.h>

/**
 * This class provides static methods that read the fine-grain CPU
 * cycle counter and translate between cycle-level times and absolute
 * times.
 */
class Cycles {
  public:
    static void init();

    /**
     * Return the current value of the fine-grain CPU cycle counter
     * (accessed via the RDTSC instruction).
     */
    static inline __attribute__((always_inline))
    uint64_t
    rdtsc()
    {
#if TESTING
        if (mockTscValue)
            return mockTscValue;
#endif
        uint32_t lo, hi;
        __asm__ __volatile__("rdtsc" : "=a" (lo), "=d" (hi));
        return (((uint64_t)hi << 32) | lo);
    }

#if TESTING
    /**
     * Return the current value of the fine-grain CPU cycle counter.
     * This function ignores mockTscValue set by test code.
     */
    static inline __attribute__((always_inline))
    uint64_t
    rdtsc_ignoreMockTsc()
    {
        uint32_t lo, hi;
        __asm__ __volatile__("rdtsc" : "=a" (lo), "=d" (hi));
        return (((uint64_t)hi << 32) | lo);
    }
#endif

    static double perSecond();
    static double toSeconds(uint64_t cycles, double cyclesPerSec = 0);
    static uint64_t fromSeconds(double seconds, double cyclesPerSec = 0);
    static uint64_t toMicroseconds(uint64_t cycles, double cyclesPerSec = 0);
    static uint64_t fromMicroseconds(uint64_t us, double cyclesPerSec = 0);
    static uint64_t toNanoseconds(uint64_t cycles, double cyclesPerSec = 0);
    static uint64_t fromNanoseconds(uint64_t ns, double cyclesPerSec = 0);
    static void sleep(uint64_t us);

  private:
    Cycles();

    /// Conversion factor between cycles and the seconds; computed by
    /// Cycles::init.
    static double cyclesPerSec;

    /// Used for testing: if nonzero then this will be returned as the result
    /// of the next call to rdtsc().
    static uint64_t mockTscValue;

    /// Used for testing: if nonzero, then this is used to convert from
    /// cycles to seconds, instead of cyclesPerSec above.
    static double mockCyclesPerSec;

    /**
     * Returns the conversion factor between cycles in seconds, using
     * a mock value for testing when appropriate.
     */
    static inline __attribute__((always_inline))
    double
    getCyclesPerSec()
    {
#if TESTING
        if (mockCyclesPerSec != 0.0) {
            return mockCyclesPerSec;
        }
#endif
        return cyclesPerSec;
    }
};
