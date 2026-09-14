package arrays;

public class TicketKiosk {
    public static int minCoinsGreedy(int amount) {
        // Array of denominations in descending order
        int[] denominations = {1, 5, 10, 25, 100};
        int totalCoins = 0;

        for (int coin : denominations) {
            if (amount == 0) {
                break;
            }
            // Add the number of coins of this denomination
            totalCoins += amount / coin;
            // Update the remaining amount using modulo
            amount %= coin;
        }

        return totalCoins;
    }
}
