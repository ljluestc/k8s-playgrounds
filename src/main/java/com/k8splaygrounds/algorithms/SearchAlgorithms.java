package com.k8splaygrounds.algorithms;

import java.util.Arrays;

public final class SearchAlgorithms {

    private SearchAlgorithms() {}

    public static int linearSearch(int[] arr, int target) {
        for (int i = 0; i < arr.length; i++) if (arr[i] == target) return i;
        return -1;
    }

    public static int binarySearch(int[] sortedArr, int target) {
        int left = 0, right = sortedArr.length - 1;
        while (left <= right) {
            int mid = left + (right - left) / 2;
            if (sortedArr[mid] == target) return mid;
            if (sortedArr[mid] < target) left = mid + 1; else right = mid - 1;
        }
        return -1;
    }

    public static int lowerBound(int[] sortedArr, int target) {
        int left = 0, right = sortedArr.length;
        while (left < right) {
            int mid = left + (right - left) / 2;
            if (sortedArr[mid] < target) left = mid + 1; else right = mid;
        }
        return left;
    }

    public static int upperBound(int[] sortedArr, int target) {
        int left = 0, right = sortedArr.length;
        while (left < right) {
            int mid = left + (right - left) / 2;
            if (sortedArr[mid] <= target) left = mid + 1; else right = mid;
        }
        return left;
    }

    public static int ternarySearch(int[] sortedArr, int target) {
        int left = 0, right = sortedArr.length - 1;
        while (left <= right) {
            int third = (right - left) / 3;
            int m1 = left + third;
            int m2 = right - third;
            if (sortedArr[m1] == target) return m1;
            if (sortedArr[m2] == target) return m2;
            if (target < sortedArr[m1]) right = m1 - 1;
            else if (target > sortedArr[m2]) left = m2 + 1;
            else {
                left = m1 + 1;
                right = m2 - 1;
            }
        }
        return -1;
    }

    public static int jumpSearch(int[] sortedArr, int target) {
        int n = sortedArr.length;
        int step = (int) Math.floor(Math.sqrt(n));
        int prev = 0;
        while (prev < n && sortedArr[Math.min(step, n) - 1] < target) {
            prev = step;
            step += (int) Math.floor(Math.sqrt(n));
            if (prev >= n) return -1;
        }
        while (prev < Math.min(step, n) && sortedArr[prev] < target) prev++;
        if (prev < n && sortedArr[prev] == target) return prev;
        return -1;
    }

    public static int exponentialSearch(int[] sortedArr, int target) {
        if (sortedArr.length == 0) return -1;
        int bound = 1;
        while (bound < sortedArr.length && sortedArr[bound] < target) bound *= 2;
        int left = bound / 2;
        int right = Math.min(bound, sortedArr.length - 1);
        return binarySearch(Arrays.copyOfRange(sortedArr, left, right + 1), target) + left;
    }
}


