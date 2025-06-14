import { ethers } from "ethers";
import { GiftCard, Product } from "../../../../shared/types";
import { AppState } from "../app-state";
import { addGiftCardEvents, getSingleGiftCardHtml, getSingleGiftCardHtmlDetailed } from "./gift-card";
import { detectCardsEnv, getApiBaseUrl, getUserCountryCode } from "./helpers";
import { getActivePermit } from "./utils";

let loadedProducts: Product[] = [];

const requestInit = {
  method: "GET",
  headers: {
    Accept: "application/json",
  },
};

export async function initClaimGiftCard(app: AppState) {
  const giftCardsSection = document.getElementById("gift-cards");
  if (!giftCardsSection) {
    console.error("Missing gift cards section #gift-cards");
    return;
  }
  giftCardsSection.innerHTML = "Loading...";
  const activePermit = getActivePermit();
  if (activePermit) {
    const permitElement = document.getElementById("permit");
    if (permitElement) {
      permitElement.innerHTML = `Claim Gift Card for Permit: ${ethers.utils.formatEther(activePermit.amount)} UUSD`;
    }
  }

  if (loadedProducts.length === 0) {
    void detectCardsEnv();

    const countryCode = await getUserCountryCode();

    if (!countryCode) {
      giftCardsSection.innerHTML = `<p class="card-error">Failed to load suitable virtual cards for you. Refresh or try disabling adblocker.</p>`;
      return;
    }
    loadedProducts = await loadProducts();
  }

  const productSku = Number(window.location.hash.replace("#/", ""));
  if (productSku) {
    const product = loadedProducts.find((p) => p.productId === productSku);
    if (product) {
      console.log("product", product);
      giftCardsSection.innerHTML = await getSingleGiftCardHtmlDetailed(product);
      await addGiftCardEvents(product as GiftCard);
    } else {
      giftCardsSection.innerHTML = "<p class='card-error'>Unable to find a gift card.</p>";
    }
    return;
  }

  addProductsHtml(loadedProducts, app, giftCardsSection);
}

function addProductsHtml(products: Product[], app: AppState, giftCardsSection: HTMLElement) {
  console.log("giftCardsSection", giftCardsSection);

  const htmlParts: string[] = [];

  if (products.length > 0) {
    products.forEach((product: Product) => {
      if (product.status === "ACTIVE") {
        htmlParts.push(getSingleGiftCardHtml(product));
      }
    });
  } else {
    htmlParts.push(`<p class="card-error">There are no gift cards available at the moment.</p>`);
  }
  console.log(htmlParts);
  giftCardsSection.innerHTML = htmlParts.join("");
}

export async function loadProducts() {
  const retrieveProductsUrl = `${getApiBaseUrl()}/bootstrap?page=1`;
  const productsResponse = await fetch(retrieveProductsUrl, requestInit);

  if (productsResponse.status == 200) {
    return (await productsResponse.json()).products as Product[];
  }
  return [];
}
