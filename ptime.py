import time

def check_resolution(timer_func, name, iterations=1000000):
    results = []
    for _ in range(iterations):
        results.append(timer_func())
    
    if len(set(results)) == 1:
        print(f"{name} didn't change in {iterations} iterations")
    else:
        sorted_results = sorted(results)
        differences = [sorted_results[i+1] - sorted_results[i] for i in range(len(sorted_results)-1)]
        min_diff = min(diff for diff in differences if diff > 0)
        print(f"Minimum time difference for {name}: {min_diff:.9f} seconds")

print("Checking time.time() resolution:")
check_resolution(time.time, "time.time()")

print("\nChecking time.perf_counter() resolution:")
check_resolution(time.perf_counter, "time.perf_counter()")