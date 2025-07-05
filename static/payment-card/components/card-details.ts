import { Card } from "../../../shared/types/entity-types";
import { getApiBaseUrl } from "../utils";

const html = String.raw;

export async function getCardDetailsHtml(productId: number) {
  const card = await loadCard(productId);
  if (!card) {
    return `<div>Invalid SKU or the card is not available anymore.</div>`;
  }
  const imageUrl = card.logoUrls.length > 0 ? card.logoUrls[0] : "https://via.placeholder.com/250x150?text=No+Image";
  const imageAltText = card.productName ? `${card.productName} logo` : "Payment card logo";

  // Pre-calculate content using helper functions
  const recipientDenominationsContent = renderRecipientDenominations(card);

  return html`
    <div class="product-detailed-card" data-product-id="${card.productId}">
      <div class="product-header">
        <img src="${imageUrl}" alt="${imageAltText}" class="detailed-card-image" />
        <div class="header-text">
          <h2>${card.productName}</h2>
          <p class="product-sku">SKU: ${card.productId}</p>
          <div class="pricing-details-section card-section">
            <div class="pricing">
              <div class="available"> ${recipientDenominationsContent} </div>
            </div>
          </div>
        </div>
      </div>

      <div class="redeem-instructions-section card-section">
        <h3>Redeem Instructions</h3>
        <div class="instructions">${card.redeemInstruction.concise}</div>
        ${card.redeemInstruction.concise !== card.redeemInstruction.verbose
          ? `<div class="instructions">${card.redeemInstruction.verbose}</div>
      `
          : ""}
      </div>
    </div>
  `;
}

function renderRecipientDenominations(card: Card): string {
  if (card.denominationType === "FIXED") {
    return html`
      <div class="fixed-denominations">
        ${card.fixedRecipientDenominations
          .map(
            (amount) => html`
              <div class="amount-option">
                <span class="currency">${card.recipientCurrencyCode}</span>
                <span class="amount">${formatCurrency(amount, card.recipientCurrencyCode)}</span>
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
          <span class="currency">${card.recipientCurrencyCode}</span>
          <span class="amount">${formatCurrency(card.minRecipientDenomination, card.recipientCurrencyCode)}</span>
          -
          <span class="currency">${card.recipientCurrencyCode}</span>
          <span class="amount">${formatCurrency(card.maxRecipientDenomination, card.recipientCurrencyCode)}</span>
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

export async function loadCard(productId: number): Promise<Card | null> {
  const apiUrl = `${getApiBaseUrl()}/get-card?sku=${productId}`;

  const response = await fetch(apiUrl);

  if (response.ok) {
    return (await response.json()) as Card;
  }

  return null;
}
