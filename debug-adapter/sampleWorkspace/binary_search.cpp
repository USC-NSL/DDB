// write a program for binary search
#include <iostream>
using namespace std;

int binarySearch(int arr[], int n, int key)
{
  int s = 0;
  int e = n;
  while (s <= e)
  {
    int mid = (s + e) / 2;
    if (arr[mid] == key)
      return mid;
    else if (arr[mid] > key)
      e = mid - 1;
    else
      s = mid + 1;
  }
  return -1;
}

int main()
{
  int arr[] = { 2, 3, 4, 10, 40 };
	int x = 10;
	int n = sizeof(arr) / sizeof(arr[0]);
	int result = binarySearch(arr, n - 1, x);
	(result == -1)
		? cout << "Element is not present in array"
		: cout << "Element is present at index " << result;
	return 0;
}