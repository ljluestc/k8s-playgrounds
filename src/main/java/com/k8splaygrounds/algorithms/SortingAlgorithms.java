package com.k8splaygrounds.algorithms;

import java.util.Arrays;

public final class SortingAlgorithms {

    private SortingAlgorithms() {}

    public static int[] bubbleSort(int[] input) {
        int[] arr = Arrays.copyOf(input, input.length);
        boolean swapped;
        for (int i = 0; i < arr.length - 1; i++) {
            swapped = false;
            for (int j = 0; j < arr.length - i - 1; j++) {
                if (arr[j] > arr[j + 1]) {
                    int temp = arr[j];
                    arr[j] = arr[j + 1];
                    arr[j + 1] = temp;
                    swapped = true;
                }
            }
            if (!swapped) break;
        }
        return arr;
    }

    public static int[] insertionSort(int[] input) {
        int[] arr = Arrays.copyOf(input, input.length);
        for (int i = 1; i < arr.length; i++) {
            int key = arr[i];
            int j = i - 1;
            while (j >= 0 && arr[j] > key) {
                arr[j + 1] = arr[j];
                j--;
            }
            arr[j + 1] = key;
        }
        return arr;
    }

    public static int[] selectionSort(int[] input) {
        int[] arr = Arrays.copyOf(input, input.length);
        for (int i = 0; i < arr.length; i++) {
            int minIndex = i;
            for (int j = i + 1; j < arr.length; j++) {
                if (arr[j] < arr[minIndex]) minIndex = j;
            }
            int tmp = arr[i];
            arr[i] = arr[minIndex];
            arr[minIndex] = tmp;
        }
        return arr;
    }

    public static int[] mergeSort(int[] input) {
        int[] arr = Arrays.copyOf(input, input.length);
        mergeSortInPlace(arr, 0, arr.length - 1);
        return arr;
    }

    private static void mergeSortInPlace(int[] arr, int left, int right) {
        if (left >= right) return;
        int mid = left + (right - left) / 2;
        mergeSortInPlace(arr, left, mid);
        mergeSortInPlace(arr, mid + 1, right);
        merge(arr, left, mid, right);
    }

    private static void merge(int[] arr, int left, int mid, int right) {
        int n1 = mid - left + 1;
        int n2 = right - mid;
        int[] L = new int[n1];
        int[] R = new int[n2];
        for (int i = 0; i < n1; i++) L[i] = arr[left + i];
        for (int j = 0; j < n2; j++) R[j] = arr[mid + 1 + j];
        int i = 0, j = 0, k = left;
        while (i < n1 && j < n2) {
            if (L[i] <= R[j]) arr[k++] = L[i++];
            else arr[k++] = R[j++];
        }
        while (i < n1) arr[k++] = L[i++];
        while (j < n2) arr[k++] = R[j++];
    }

    public static int[] quickSort(int[] input) {
        int[] arr = Arrays.copyOf(input, input.length);
        quickSortInPlace(arr, 0, arr.length - 1);
        return arr;
    }

    private static void quickSortInPlace(int[] arr, int low, int high) {
        if (low >= high) return;
        int p = partition(arr, low, high);
        quickSortInPlace(arr, low, p - 1);
        quickSortInPlace(arr, p + 1, high);
    }

    private static int partition(int[] arr, int low, int high) {
        int pivot = arr[high];
        int i = low - 1;
        for (int j = low; j < high; j++) {
            if (arr[j] <= pivot) {
                i++;
                int tmp = arr[i];
                arr[i] = arr[j];
                arr[j] = tmp;
            }
        }
        int tmp = arr[i + 1];
        arr[i + 1] = arr[high];
        arr[high] = tmp;
        return i + 1;
    }

    public static int[] heapSort(int[] input) {
        int[] arr = Arrays.copyOf(input, input.length);
        int n = arr.length;
        for (int i = n / 2 - 1; i >= 0; i--) heapify(arr, n, i);
        for (int i = n - 1; i > 0; i--) {
            int temp = arr[0];
            arr[0] = arr[i];
            arr[i] = temp;
            heapify(arr, i, 0);
        }
        return arr;
    }

    private static void heapify(int[] arr, int n, int i) {
        int largest = i;
        int l = 2 * i + 1;
        int r = 2 * i + 2;
        if (l < n && arr[l] > arr[largest]) largest = l;
        if (r < n && arr[r] > arr[largest]) largest = r;
        if (largest != i) {
            int swap = arr[i];
            arr[i] = arr[largest];
            arr[largest] = swap;
            heapify(arr, n, largest);
        }
    }

    public static int[] countingSortNonNegative(int[] input) {
        int[] arr = Arrays.copyOf(input, input.length);
        int max = 0;
        for (int v : arr) {
            if (v < 0) throw new IllegalArgumentException("countingSortNonNegative only supports non-negative integers");
            if (v > max) max = v;
        }
        int[] count = new int[max + 1];
        for (int v : arr) count[v]++;
        int idx = 0;
        for (int i = 0; i < count.length; i++) {
            while (count[i]-- > 0) arr[idx++] = i;
        }
        return arr;
    }

    public static int[] radixSortBase10NonNegative(int[] input) {
        int[] arr = Arrays.copyOf(input, input.length);
        for (int v : arr) if (v < 0) throw new IllegalArgumentException("radixSort only supports non-negative integers");
        int max = 0;
        for (int v : arr) if (v > max) max = v;
        for (int exp = 1; max / exp > 0; exp *= 10) countSortByExp(arr, exp);
        return arr;
    }

    private static void countSortByExp(int[] arr, int exp) {
        int n = arr.length;
        int[] output = new int[n];
        int[] count = new int[10];
        for (int i = 0; i < n; i++) count[(arr[i] / exp) % 10]++;
        for (int i = 1; i < 10; i++) count[i] += count[i - 1];
        for (int i = n - 1; i >= 0; i--) {
            int digit = (arr[i] / exp) % 10;
            output[count[digit] - 1] = arr[i];
            count[digit]--;
        }
        System.arraycopy(output, 0, arr, 0, n);
    }
}


