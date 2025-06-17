import { ethers } from "ethers";
import { GiftCard } from "../../../../shared/types";
import { hideLoader, showLoader } from "../../shared/loader";
import { countryList, countryListDropdown } from "./country-list";
import { detectCardsEnv, getApiBaseUrl, getUserCountryCode } from "./helpers";
import { getActivePermit } from "./utils";

const html = String.raw;

export let loadedGiftCards: GiftCard[] = [];
let searchElement: HTMLInputElement;
let countryElement: HTMLSelectElement;
let categoryElement: HTMLSelectElement;

const requestInit = {
  method: "GET",
  headers: {
    Accept: "application/json",
  },
};

export async function showCatalog() {
  const catalogElement = document.getElementById("gift-cards");
  if (!catalogElement) {
    console.error("Missing gift cards section #gift-cards");
    return;
  }
  catalogElement.innerHTML = "Loading...";

  const activePermit = getActivePermit();
  if (activePermit) {
    const permitElement = document.getElementById("permit");
    if (permitElement) {
      permitElement.innerHTML = `Claim Gift Card for Permit: ${ethers.utils.formatEther(activePermit.amount)} UUSD`;
    }
  }

  if (loadedGiftCards.length === 0) {
    void detectCardsEnv();
    const userCountryCode = countryElement?.value || (await getUserCountryCode());
    loadedGiftCards = await loadGiftCards(userCountryCode);

    if (loadedGiftCards.length === 0) {
      const category = categoryElement?.selectedOptions[0]?.textContent;
      const categoryMessage = category ? `in category ${category}` : "";
      catalogElement.innerHTML = `<p class="card-error">No gift cards available ${categoryMessage} for ${countryList[userCountryCode]}.</p>`;
      return;
    }
  }

  addProductsHtml(loadedGiftCards, catalogElement);
}

function addProductsHtml(giftCards: GiftCard[], giftCardsSection: HTMLElement) {
  const htmlParts: string[] = [];

  giftCards.forEach((giftCard: GiftCard) => {
    if (giftCard.status === "ACTIVE") {
      htmlParts.push(getSingleGiftCardHtml(giftCard));
    }
  });

  giftCardsSection.innerHTML = htmlParts.join("");
}

export async function loadGiftCards(countryCode: string) {
  const search = searchElement?.value || "";
  const category = categoryElement?.value || 1;

  const retrieveProductsUrl = `${getApiBaseUrl()}/bootstrap?page=1&countryCode=${countryCode}&productCategoryId=${category}&productName=${search}`;
  const productsResponse = await fetch(retrieveProductsUrl, requestInit);

  if (productsResponse.status == 200) {
    return (await productsResponse.json()).products as GiftCard[];
  }
  return [];
}

export async function addOptions() {
  const country = await getUserCountryCode();
  const categories = `<select id="categories" class="block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 transition duration-150 ease-in-out">
  <option disabled>Select Category</option>
  <option value="1">Payment Cards</option>
  <option value="2">Software</option>
  <option value="3">Gaming</option>
  <option value="4">Food and Entertainment</option>
  <option value="5">Shopping</option>
  <option value="6">Crypto</option>
  <option value="7">Environmental</option>
  <option value="8">Learning</option>
  <option value="9">Tourism</option>
  <option value="10">Home and Utilities</option>
  <option value="11">HealthCare</option>
</select>`;
  const options = `<div>${countryListDropdown(country)}</div><div>${categories}</div><div><input type="text" id="search" placeholder="Search gift card"></div>`;

  const optionsElement = document.getElementById("options");
  if (!optionsElement) {
    console.error("Options element missing");
    return;
  }
  optionsElement.innerHTML = options;
  searchElement = searchElement ?? (document.getElementById("search") as HTMLInputElement);
  countryElement = countryElement ?? (document.getElementById("countries") as HTMLSelectElement);
  categoryElement = categoryElement ?? (document.getElementById("categories") as HTMLSelectElement);

  [searchElement, countryElement, categoryElement].forEach((element) => {
    element.addEventListener("change", () => {
      showLoader();
      loadedGiftCards = [];
      showCatalog().then(hideLoader).catch(console.error);
    });
  });
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
