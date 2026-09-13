import java.util.*;
public class FindPairsWithGivenSum {
    public static int[][] findAllPairs(int[] arr, int target) {
        // Frequency map to handle duplicates and matching numbers
        Map<Integer, Integer> frequencyMap = new HashMap<>();
        List<int[]> pairsList = new ArrayList<>();

        for (int num : arr) {
            int complement = target - num;

            // If the complement exists in our map, we have found a pair (or pairs)
            if (frequencyMap.containsKey(complement)) {
                int count = frequencyMap.get(complement);

                // Form pairs based on how many times the complement has appeared so far
                for (int i = 0; i < count; i++) {
                    // Enforce constraint: Each pair must have the smaller number first
                    int smaller = Math.min(num, complement);
                    int larger = Math.max(num, complement);
                    pairsList.add(new int[]{smaller, larger});
                }
            }

            // Record the current number in the frequency map
            frequencyMap.put(num, frequencyMap.getOrDefault(num, 0) + 1);
        }

        // Convert the dynamic list to a 2D array and return
        return pairsList.toArray(new int[pairsList.size()][]);
    }
}