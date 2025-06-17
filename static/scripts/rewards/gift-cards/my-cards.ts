import { OrderTransaction } from "../../../../shared/types";
import { CompletedOrder } from "./gift-card";
import { getApiBaseUrl } from "./helpers";
import { showRedeemCode } from "./reveal/reveal-action";
import { getConnectedWallet } from "./utils";

export async function showMyCards(cardsSection: HTMLElement): Promise<void> {
  cardsSection.innerHTML = "<p class='card-error'>Loading your gift cards...</p>";

  try {
    const wallet = await getConnectedWallet(); // Get the current user's wallet
    const completedOrdersString = localStorage.getItem("completedOrders");
    const completedOrdersParsed: CompletedOrder = completedOrdersString ? JSON.parse(completedOrdersString) : {};

    const transactions = completedOrdersParsed[wallet] || [];

    if (transactions.length === 0) {
      cardsSection.innerHTML = "<p class='card-error'>You don't own any gift cards yet. Complete an order to see your cards here.</p>";
      return;
    }
    const transactionIds = transactions.map((transaction) => transaction.txId);

    // Format transaction IDs for the GET request query parameter
    // Assuming the API expects a comma-separated list, e.g., /my-cards?transactionIds=1,2,3
    const queryParams = new URLSearchParams();
    queryParams.append("transactionIds", transactionIds.join(","));

    const apiUrl = `${getApiBaseUrl()}/my-cards?${queryParams.toString()}`;

    const response = await fetch(apiUrl);

    if (response.ok) {
      const transactions: OrderTransaction[] = await response.json();

      if (transactions.length === 0) {
        cardsSection.innerHTML = "<p class='card-error'>No gift card details found for your transactions.</p>";
        return;
      }
      const cardsHtml: string[] = [];
      transactions.forEach((transaction) => {
        cardsHtml.push(`
            <div class="card-section my-card">
              <div class="details">
                <h3>${transaction.product.productName}</h3>
                <p><strong>Value: </strong>${transaction.product.currencyCode}${transaction.product.totalPrice.toFixed(2)}</p>
                <p><strong>Price: </strong>${transaction.currencyCode}${transaction.amount.toFixed(2)}</p>
                <p><strong>Transaction ID:</strong> ${transaction.transactionId}</p>
                <p><strong>SKU:</strong><a href="/#/${transaction.product.productId}">${transaction.product.productId}</a></p>
                <div id="redeem-code-${transaction.transactionId}" class="redeem-info">
                  <div class="card-number">
                    <p>xxxxxxxxxxxxxxxxx</p>
                    <p>xxxxxxxxxxxxxxxxx</p>
                  </div>
                  <button class="btn reveal-button" data-transaction-id="${transaction.transactionId}">
                    <span class="action">Show Redeem Code</span>
                  </button>
                </div>
              </div>
            </div>
          `);
      });

      cardsSection.innerHTML = cardsHtml.join("");
      // Attach event listeners to all "Reveal" buttons
      document.querySelectorAll(".reveal-button").forEach((button) => {
        button.addEventListener("click", async (event) => {
          const clickedButton = event.currentTarget as HTMLButtonElement;
          const transactionId = clickedButton.dataset.transactionId;
          if (!transactionId) {
            console.error("Transaction ID is missing for reveal button.");
            return;
          }

          const redeemCodeJson = await showRedeemCode(Number(transactionId));

          const redeemCodeElement = document.getElementById(`redeem-code-${transactionId}`);
          if (!redeemCodeElement) {
            console.error(`Redeem code element not found for transaction ID ${transactionId}.`);
            return;
          }
          redeemCodeElement.innerHTML = JSON.stringify(redeemCodeJson, null, 2);
        });
      });
    } else if (response.status === 401) {
      cardsSection.innerHTML = "<p class='card-error'>You are not authenticated. Please log in to view your cards.</p>";
      console.error("Authentication required to access gift cards.");
    } else if (response.status === 404) {
      cardsSection.innerHTML = "<p class='card-error'>No gift cards found for your account.</p>";
      console.warn("No gift cards found (404 response).");
    } else {
      const errorData = await response.json();
      cardsSection.innerHTML = `<p class='card-error'>Failed to load gift cards: ${errorData.message || response.statusText}</p>`;
      console.error("Error loading gift cards:", response.status, errorData);
    }
  } catch (error) {
    cardsSection.innerHTML = "<p class='card-error'>A network error occurred or the server is unreachable. Please try again later.</p>";
    console.error("Network or unexpected error fetching gift cards:", error);
  }
}
