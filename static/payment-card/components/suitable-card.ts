import ct from "countries-and-timezones";
import { BigNumberish } from "ethers";
import { getCardValue } from "../../../shared/pricing";
import { Card } from "../../../shared/types/entity-types";
import { app } from "../app-state";
import { pickSuitableCards } from "../services/ai";
import { getCards } from "../services/backend-calls";
import { getUserCountryCode } from "../utils";
import { mint } from "./mint-action";

const html = String.raw;

export async function getSuitableCard(): Promise<Card> {
  const [cards, countryCode] = await Promise.all([getCards(), getUserCountryCode()]);

  if (!countryCode) {
    throw new Error(`Unable to detect your location. Disable your ad-blocker.`);
  }

  if (cards.length === 0) {
    throw new Error(`No cards available at the moment. Check later.`);
  }

  const card = await pickSuitableCards(cards, countryCode, app.reward.amount);

  if (!card) {
    throw new Error(`No cards available for your permit in the ${ct.getCountry(countryCode)?.name}.`);
  }

  return card;
}

export function createCardHtml(card: Card, price: BigNumberish): string {
  const urlParams = new URLSearchParams(window.location.search);

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

      <div id="card-name"><a href="/?claim=${urlParams.get("claim")}#/sku/${card.productId}" target="_blank">${card.brand.brandName}</a></div>
      <div id="mint" class="mint" data-product-id="${card.productId}">
        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor">
          <path
            d="M252.309-180.001q-30.308 0-51.308-21t-21-51.308V-360H240v107.691q0 4.616 3.846 8.463 3.847 3.846 8.463 3.846h455.382q4.616 0 8.463-3.846 3.846-3.847 3.846-8.463V-360h59.999v107.691q0 30.308-21 51.308t-51.308 21H252.309ZM480-335.386 309.233-506.153l42.153-43.383 98.615 98.615v-336.001h59.998v336.001l98.615-98.615 42.153 43.383L480-335.386Z"
          ></path>
        </svg>
        <span id="card-value">${getCardValue(card, price)} ${card.recipientCurrencyCode}</span>
      </div>
    </div>
  `;
}

export function addCardEvents(card: Card) {
  document.getElementById("mint")?.addEventListener("click", () => {
    mint(card).catch(console.error);
  });
}
