import { GiftCard } from "../../../shared/types";
import { getApiBaseUrl } from "./utils";

const html = String.raw;

export async function getCardDetailsHtml(productId: number) {
  const giftCard = await loadCard(productId);
  if (!giftCard) {
    return `<div>Invalid SKU or the card is not available anymore.</div>`;
  }
  const imageUrl = giftCard.logoUrls.length > 0 ? giftCard.logoUrls[0] : "https://via.placeholder.com/250x150?text=No+Image";
  const imageAltText = giftCard.productName ? `${giftCard.productName} logo` : "Payment card logo";

  // Pre-calculate content using helper functions
  const recipientDenominationsContent = renderRecipientDenominations(giftCard);

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
          </div>
        </div>
      </div>

      <div class="redeem-instructions-section card-section">
        <h3>Redeem Instructions</h3>
        <div class="instructions">${giftCard.redeemInstruction.concise}</div>
        ${giftCard.redeemInstruction.concise !== giftCard.redeemInstruction.verbose
          ? `<div class="instructions">${giftCard.redeemInstruction.verbose}</div>
      `
          : ""}
      </div>
    </div>
  `;
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

export async function loadCard(productId: number): Promise<GiftCard | null> {
  const apiUrl = `${getApiBaseUrl()}/gift-card?sku=${productId}`;

  const response = await fetch(apiUrl);

  if (response.ok) {
    return (await response.json()) as GiftCard;
  }

  return null;
}
