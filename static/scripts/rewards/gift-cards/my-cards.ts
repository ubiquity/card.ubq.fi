import { OrderTransaction, RedeemCode } from "../../../../shared/types";
import { getApiBaseUrl } from "./helpers";
import { getConnectedWallet } from "./utils";

export async function showMyCards(cardsSection: HTMLElement): Promise<void> {
  cardsSection.innerHTML = "<p class='card-error'>Loading your gift cards...</p>";

  try {
    const wallet = await getConnectedWallet(); // Get the current user's wallet
    const completedOrdersString = localStorage.getItem("completedOrders");
    const completedOrdersParsed: { [key: string]: number[] } = completedOrdersString ? JSON.parse(completedOrdersString) : {};

    const transactionIds = completedOrdersParsed[wallet] || [];

    if (transactionIds.length === 0) {
      cardsSection.innerHTML = "<p class='card-error'>You don't own any gift cards yet. Complete an order to see your cards here.</p>";
      return;
    }

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

      transactions.forEach((transaction) => {
        const cardHtml = `
            <div class="card-section">
              <div class="card-heading">
                <img src="${transaction.product.brand.logoUrls?.[0] || "https://placehold.co/200x150/00bfff/ffffff?text=No+Image"}" 
                     alt="${transaction.product.productName} Logo" class="detailed-card-image"
                     onerror="this.onerror=null; this.src='https://placehold.co/200x150/00bfff/ffffff?text=No+Image';">
              </div>
              <div class="details">
                <h3>${transaction.product.productName}</h3>
                <p class="brand-name">${transaction.product.brand.brandName}</p>
                <div class="pricing">
                  <div class="available">
                    <div class="amount-option">
                      <div class="currency">${transaction.product.currencyCode}</div>
                      <div class="amount">${transaction.product.totalPrice.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
                <p><strong>Transaction ID:</strong> ${transaction.transactionId}</p>
                <p><strong>Status:</strong> ${transaction.status}</p>
                <div id="redeem-code-${transaction.transactionId}" class="redeem-info">
                  <p><strong>Card Number:</strong> <span id="card-number-${transaction.transactionId}">XXXXXXXXXX</span></p>
                  <p><strong>PIN:</strong> <span id="pin-code-${transaction.transactionId}">XXXXXXXXXX</span></p>
                  <button class="btn reveal-button" data-transaction-id="${transaction.transactionId}">
                    <span class="action">Reveal</span>
                    <span class="loader hidden">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path>
                      </svg>
                    </span>
                  </button>
                </div>
              </div>
            </div>
          `;
        cardsSection.insertAdjacentHTML("beforeend", cardHtml);
      });

      // Attach event listeners to all "Reveal" buttons
      document.querySelectorAll(".reveal-button").forEach((button) => {
        button.addEventListener("click", async (event) => {
          const clickedButton = event.currentTarget as HTMLButtonElement;
          const transactionId = clickedButton.dataset.transactionId;
          const cardNumberSpan = document.getElementById(`card-number-${transactionId}`);
          const pinCodeSpan = document.getElementById(`pin-code-${transactionId}`);
          const loader = clickedButton.querySelector(".loader") as HTMLElement;
          const action = clickedButton.querySelector(".action") as HTMLElement;

          if (!transactionId || !cardNumberSpan || !pinCodeSpan) {
            console.error("Missing elements or transaction ID for reveal button.");
            return;
          }

          clickedButton.setAttribute("data-loading", "true");
          action.classList.add("hidden");
          loader.classList.remove("hidden");
          clickedButton.disabled = true;

          try {
            // Assume an API endpoint exists to get redeem code by transactionId
            const revealResponse = await fetch(`/api/redeem-code/${transactionId}`);

            if (revealResponse.ok) {
              const redeemCode: RedeemCode = await revealResponse.json();
              cardNumberSpan.textContent = redeemCode.cardNumber;
              pinCodeSpan.textContent = redeemCode.pinCode;
              clickedButton.textContent = "Revealed";
            } else {
              const errorData = await revealResponse.json();
              cardNumberSpan.textContent = `Error: ${errorData.message || "Failed to reveal"}`;
              pinCodeSpan.textContent = `Error: ${errorData.message || "Failed to reveal"}`;
              console.error(`Failed to reveal card ${transactionId}:`, errorData);
              clickedButton.textContent = "Error";
            }
          } catch (revealError) {
            console.error(`Network or unexpected error revealing card ${transactionId}:`, revealError);
            cardNumberSpan.textContent = "Error loading";
            pinCodeSpan.textContent = "Error loading";
            clickedButton.textContent = "Error";
          } finally {
            clickedButton.setAttribute("data-loading", "false");
            action.classList.remove("hidden");
            loader.classList.add("hidden");
            if (clickedButton.textContent === "Error") {
              clickedButton.disabled = false;
            }
          }
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
