import { ethers } from "ethers";
import { getGiftCardValue, getTotalPriceOfValue } from "../../../../shared/pricing";
import { GiftCard } from "../../../../shared/types";
import { loadedGiftCards } from "./catalog";
import { getPendingOrder } from "./order-storage";
import { getActivePermit } from "./utils";
import { mint } from "./mint/mint-action";
import { getApiBaseUrl } from "./helpers";

const html = String.raw;

export async function getGiftCardHtml(sku: number): Promise<string> {
  const giftCard = await getGiftCard(sku);
  if (!giftCard) {
    return "<p class='card-error'>Unable to find the gift card.</p>";
  }

  return await createHtml(giftCard);
}

export async function getGiftCard(sku: number): Promise<GiftCard | null> {
  let giftCard = loadedGiftCards.find((p) => p.productId === sku);
  if (!giftCard) {
    const apiUrl = `${getApiBaseUrl()}/gift-card?sku=${sku}`;

    const response = await fetch(apiUrl);

    if (response.ok) {
      giftCard = await response.json();
    }
  }

  return giftCard || null;
}

async function createHtml(giftCard: GiftCard) {
  const imageUrl = giftCard.logoUrls.length > 0 ? giftCard.logoUrls[0] : "https://via.placeholder.com/250x150?text=No+Image";
  const imageAltText = giftCard.productName ? `${giftCard.productName} logo` : "Gift card logo";

  // Pre-calculate content using helper functions
  const recipientDenominationsContent = renderRecipientDenominations(giftCard);
  const pendingOrders = await getPendingOrder(giftCard.productId);
  console.log("Pending order of product:", pendingOrders);
  let value;
  const activePermit = getActivePermit();
  console.log("activePermit", activePermit);
  if (pendingOrders) {
    // If there's a pending order, we can show the amount and price
    value = getGiftCardValue(giftCard, ethers.utils.parseEther(pendingOrders.price.toString()));
  } else if (activePermit) {
    value = getGiftCardValue(giftCard, activePermit.amount);
  }

  return html`
    <div class="product-detailed-card" data-product-id="${giftCard.productId}">
      <div class="product-header">
        <img src="${imageUrl}" alt="${imageAltText}" class="detailed-card-image" />
        <div class="header-text">
          <h2>${giftCard.productName}</h2>
          <p class="product-sku">SKU: ${giftCard.productId}</p>
          <div class="pricing-details-section card-section">
            <div class="pricing">
              <div class="available"> ${recipientDenominationsContent} </div>
            </div>
            <h3>Amount: <input type="number" id="value" value="${value ?? ""}" ${value !== undefined ? "disabled" : ""} /></h3>
            <h3 id="price"></h3>
            <button type="button" id="mint-btn">Mint</button>
          </div>
        </div>
      </div>

      <div class="redeem-instructions-section card-section">
        <h3>Redeem Instructions</h3>
        <div class="instructions">${giftCard.redeemInstruction.concise}</div>
        ${giftCard.redeemInstruction.concise !== giftCard.redeemInstruction.verbose
          ? `<div class="instructions">${giftCard.redeemInstruction.concise !== giftCard.redeemInstruction.verbose}</div>
      `
          : ""}
      </div>
    </div>
  `;
}

export async function addGiftCardEvents(sku: number) {
  const giftCard = loadedGiftCards.find((p) => p.productId === sku);
  if (!giftCard) {
    return;
  }

  document.getElementById("mint-btn")?.addEventListener("click", async (event) => {
    const button = event.currentTarget as HTMLButtonElement;
    if (button.dataset.loading === "true") return; // Prevent double clicks
    button.dataset.loading = "true";
    button.innerText = "Minting...";

    try {
      await mint(giftCard);
    } catch (error) {
      console.error("Error during minting:", error);
    } finally {
      button.innerText = "Mint";
      button.dataset.loading = "false";
      button.classList.remove("loading");
    }
  });

  document.getElementById("value")?.addEventListener("input", async () => {
    const priceElement = document.getElementById("price") as HTMLElement;
    const value = Number((document.getElementById("value") as HTMLInputElement).value);
    if (!value) {
      priceElement.innerText = "";
      return;
    }
    const price = getTotalPriceOfValue(Number(value), giftCard);
    if (price) {
      priceElement.innerText = `Price: ${formatCurrency(price, giftCard.senderCurrencyCode)}`;
    }
  });
}

function formatCurrency(amount: number | null | undefined, currencyCode: string): string {
  if (amount === null || amount === undefined) {
    return "N/A";
  }
  try {
    return new Intl.NumberFormat(navigator.language, {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (error) {
    console.error("Error formatting currency:", error);
    return `${amount} ${currencyCode}`;
  }
}

function renderRecipientDenominations(giftCard: GiftCard): string {
  if (giftCard.denominationType === "FIXED") {
    return html`
      <div class="fixed-denominations">
        ${giftCard.fixedRecipientDenominations
          .map(
            (amount) => html`
              <div class="amount-option">
                <span class="currency">${giftCard.recipientCurrencyCode}</span>
                <span class="amount">${formatCurrency(amount, giftCard.recipientCurrencyCode)}</span>
              </div>
            `
          )
          .join("")}
      </div>
    `;
  } else {
    // denominationType === "RANGE"
    return html`
      <div class="range-denominations">
        <div class="amount-range">
          <span class="currency">${giftCard.recipientCurrencyCode}</span>
          <span class="amount">${formatCurrency(giftCard.minRecipientDenomination, giftCard.recipientCurrencyCode)}</span>
          -
          <span class="currency">${giftCard.recipientCurrencyCode}</span>
          <span class="amount">${formatCurrency(giftCard.maxRecipientDenomination, giftCard.recipientCurrencyCode)}</span>
        </div>
      </div>
    `;
  }
}
