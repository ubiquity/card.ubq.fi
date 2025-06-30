import { BigNumberish } from "ethers";
import { allCountries } from "../../../shared/allowed-country-list";
import { getGiftCardValue } from "../../../shared/pricing";
import { GiftCard } from "../../../shared/types";
//import { getSuitableCard } from "./ai";
import { getGiftCardOrderId } from "../../../shared/helpers";
import { app } from "../rewards/app-state";
import { detectCardsEnv } from "../rewards/gift-cards/helpers";
import { mint } from "../rewards/gift-cards/mint/mint-action";
import { getCompletedOrder } from "../rewards/gift-cards/order-storage";
import { toaster } from "../rewards/toaster";
import { dummyCardSandbox } from "./dummy-card";
import { getOrder, getOrderHtml } from "./order";
import { getApiBaseUrl, getUserCountryCode, requestInit } from "./utils";

const html = String.raw;

export async function presentPaymentCard(contentElement: HTMLElement) {
  const address = await app.signer?.getAddress();
  if (!address) {
    toaster.create("error", "Missing signer.");
    return;
  }

  const completedOrder = await getCompletedOrder(app.reward.nonce.toString());
  if (completedOrder) {
    const orderId = getGiftCardOrderId(address, completedOrder.txHash, completedOrder.retryCount);
    const order = await getOrder(orderId);
    console.log("order", order);
    if (!order) {
      toaster.create("error", "Unable to load the order. Please refresh in a few minutes.");
      return;
    }

    const orderHtml = getOrderHtml(order);
    contentElement.innerHTML = orderHtml;
    // addOrderEvents(order);
    return;
  }

  const [cards, countryCode] = await Promise.all([loadCards(), getUserCountryCode()]);

  console.log("cards", JSON.stringify(cards));

  if (!countryCode) {
    contentElement.innerHTML = `<p class="card-error">Unable to detect your location. Disable your ad-blocker.</p>`;
    return;
  }

  if (cards.length === 0) {
    contentElement.innerHTML = `<p class="card-error">No Visa or Mastercard is available at the moment. Check later.</p>`;
    return;
  }

  const suitableCard = dummyCardSandbox as unknown as GiftCard; //await getSuitableCard(cards, countryCode, reward);

  console.log("suitableCard", suitableCard);

  if (suitableCard) {
    const cardHtml = getSingleGiftCardHtml(suitableCard, app.reward.amount);
    contentElement.innerHTML = cardHtml;
    addCardEvents(suitableCard);
  } else {
    contentElement.innerHTML = `<p class="card-error">No gift cards available for your permit for ${allCountries[countryCode]}.</p>`;
  }
}

async function loadCards() {
  const retrieveCardsUrl = `${getApiBaseUrl()}/bootstrap`;
  const cardsResponse = await fetch(retrieveCardsUrl, requestInit);
  const responseJson = await cardsResponse.json();

  if (responseJson.isSandbox) {
    detectCardsEnv(responseJson.isSandbox).catch(console.error);
  }

  if (cardsResponse.status == 200) {
    return responseJson.cards as GiftCard[];
  }
  return [];
}

export function getSingleGiftCardHtml(card: GiftCard, amount: BigNumberish): string {
  return html`
    <div class="summary">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="4" width="20" height="16" rx="2" fill="url(#cardGradient)" />
        <rect x="2" y="4" width="20" height="16" rx="2" stroke="#A1A1AA" stroke-width="1.5" />
        <rect x="5" y="7" width="3" height="2" rx="0.5" fill="currentColor" />
        <path d="M5 12 H19" stroke="currentColor" stroke-width="1.5" />
        <defs>
          <linearGradient id="cardGradient" x1="2" y1="4" x2="22" y2="20" gradientUnits="userSpaceOnUse">
            <stop stop-color="currentColor" />
            <stop offset="1" stop-color="#27272A" />
          </linearGradient>
        </defs>
      </svg>

      <div id="card-name"> ${card.brand.brandName} </div>
      <div id="mint" class="mint" data-product-id="${card.productId}">
        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor">
          <path
            d="M252.309-180.001q-30.308 0-51.308-21t-21-51.308V-360H240v107.691q0 4.616 3.846 8.463 3.847 3.846 8.463 3.846h455.382q4.616 0 8.463-3.846 3.846-3.847 3.846-8.463V-360h59.999v107.691q0 30.308-21 51.308t-51.308 21H252.309ZM480-335.386 309.233-506.153l42.153-43.383 98.615 98.615v-336.001h59.998v336.001l98.615-98.615 42.153 43.383L480-335.386Z"
          ></path>
        </svg>
        <span id="card-value">${getGiftCardValue(card, amount)} ${card.recipientCurrencyCode}</span>
      </div>

      <svg id="card-details" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="2" width="20" height="20" rx="4" fill="url(#infoGradient)" />
        <rect x="2" y="2" width="20" height="20" rx="4" stroke="#A1A1AA" stroke-width="1.5" />
        <circle cx="12" cy="7" r="1.5" fill="currentColor" />
        <path d="M12 10 V16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        <defs>
          <linearGradient id="infoGradient" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
            <stop stop-color="#3F3F46" />
            <stop offset="1" stop-color="#27272A" />
          </linearGradient>
        </defs>
      </svg>
    </div>
    <div class="details" id="details">
      <h2>Redeem instructions SKU:${card.productId}</h2>
      <div id="redeem-instructions"
        >${card.redeemInstruction.concise} ${card.redeemInstruction.concise != card.redeemInstruction.verbose ? card.redeemInstruction.verbose : ""}</div
      >
    </div>
  `;
}

function addCardEvents(card: GiftCard) {
  document.getElementById("card-details")?.addEventListener("click", () => {
    const detailsElement = document.getElementById("details");
    if (detailsElement) {
      detailsElement.style.display = detailsElement.style.display == "block" ? "none" : "block";
    }
  });

  document.getElementById("mint")?.addEventListener("click", () => {
    mint(card).catch(console.error);
  });
}
