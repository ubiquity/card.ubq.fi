import { ethers } from "ethers";
import { allCountries } from "../../../shared/allowed-country-list";
import { getSuitableCard } from "./ai";
import { getApiBaseUrl, getUserCountryCode, requestInit } from "./utils";
import { GiftCard } from "../../../shared/types";

const html = String.raw;

export async function presentPaymentCard(contentElement: HTMLElement) {
  // const activePermit = getActivePermit();
  // if (activePermit) {
  //   const permitElement = document.getElementById("permit");
  //   if (permitElement) {
  //     permitElement.innerHTML = `Claim Gift Card for Permit: ${ethers.utils.formatEther(activePermit.amount)} UUSD`;
  //   }
  // }

  const [cards, countryCode] = await Promise.all([loadCards(), getUserCountryCode()]);

  if (!countryCode) {
    contentElement.innerHTML = `<p class="card-error">Unable to detect your location. Disable your ad-blocker.</p>`;
    return;
  }

  if (cards.length === 0) {
    contentElement.innerHTML = `<p class="card-error">No Visa or Mastercard is available at the moment. Check later.</p>`;
    return;
  }

  const suitableCard = await getSuitableCard(cards, countryCode, ethers.utils.parseEther("100"));

  if (suitableCard) {
    const cardHtml = getSingleGiftCardHtml(suitableCard);
    contentElement.innerHTML = cardHtml;
  } else {
    contentElement.innerHTML = `<p class="card-error">No gift cards available for your permit for ${allCountries[countryCode]}.</p>`;
  }
}

async function loadCards() {
  const retrieveCardsUrl = `${getApiBaseUrl()}/bootstrap`;
  const cardsResponse = await fetch(retrieveCardsUrl, requestInit);

  if (cardsResponse.status == 200) {
    return (await cardsResponse.json()).cards as GiftCard[];
  }
  return [];
}

export function getSingleGiftCardHtml(giftCard: GiftCard): string {
  return html`
    <a href="#/sku/${giftCard.productId}">
      <div class="card-section" id="offered-card" data-product-id="${giftCard.productId}">
        <div class="card-image-container">
          <img src="${giftCard.logoUrls[0]}" alt="${giftCard.productName}" />
        </div>
        <div class="details">
          <h3>${giftCard.productName}</h3>
          <div class="pricing">
            <div class="available">
              ${giftCard.denominationType === "FIXED"
                ? html`
                    <div class="fixed-denominations">
                      ${giftCard.fixedRecipientDenominations
                        .map(
                          (amount: number) => html`
                            <div class="amount-option">
                              <span class="currency">${giftCard.recipientCurrencyCode}</span>
                              <span class="amount">${amount}</span>
                            </div>
                          `
                        )
                        .join("")}
                    </div>
                  `
                : html`
                    <div class="range-denominations">
                      <div class="amount-range">
                        <span class="currency">${giftCard.recipientCurrencyCode}</span>
                        <span class="amount">${giftCard.minRecipientDenomination}</span>
                        -
                        <span class="currency">${giftCard.recipientCurrencyCode}</span>
                        <span class="amount">${giftCard.maxRecipientDenomination}</span>
                      </div>
                    </div>
                  `}
            </div>
          </div>
        </div>
      </div>
    </a>
  `;
}
