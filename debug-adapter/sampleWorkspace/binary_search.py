# make an array of 100 random numbers

import random
arr = [random.randint(1, 100) for i in range(100)]
arr.sort()

# define a function to search for a number in the array
def binary_search(arr, x):
    l = 0
    r = len(arr) - 1
    while l <= r:
        mid = (l + r) // 2
        if arr[mid] == x:
            return mid
        elif arr[mid] < x:
            l = mid + 1
        else:
            r = mid - 1
    return -1

# search for a number in the array
x = 50
result = binary_search(arr, x)
if result != -1:
    print(f"Element is present at index {result}")
else:
    print("Element is not present in array")