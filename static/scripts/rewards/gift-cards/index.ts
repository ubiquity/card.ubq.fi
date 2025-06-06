import { getGiftCardOrderId } from "../../../../shared/helpers";
import { GiftCard, OrderTransaction, Product } from "../../../../shared/types";
import { AppState } from "../app-state";
import { addGiftCardEvents, getGiftCardHtml, getSingleGiftCardHtml, getSingleGiftCardHtmlDetailed } from "./gift-card";
import { detectCardsEnv, getApiBaseUrl, getUserCountryCode } from "./helpers";
import { getRedeemCodeHtml } from "./reveal/redeem-code-html";
import { attachRevealAction } from "./reveal/reveal-action";

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
      giftCardsSection.innerHTML = getSingleGiftCardHtmlDetailed(product);
      await addGiftCardEvents();
    } else {
      giftCardsSection.innerHTML = "<p class='card-error'>Unable to find a gift card.</p>";
    }
    return;
  }

  addProductsHtml(loadedProducts, app, giftCardsSection);

  const retrieveOrderUrl = `${getApiBaseUrl()}/get-order?orderId=${getGiftCardOrderId(app.reward.beneficiary, app.reward.signature)}`;

  const [orderResponse] = await Promise.all([fetch(retrieveOrderUrl, requestInit)]);

  if (orderResponse.status == 200) {
    const { transaction, product } = (await orderResponse.json()) as {
      transaction: OrderTransaction;
      product: GiftCard | null;
    };

    addPurchasedCardHtml(product, transaction, app, giftCardsSection);
  } else {
    giftCardsSection.innerHTML = "<p class='card-error'>There was a problem in fetching gift cards. Please try again later.</p>";
  }
}

function addPurchasedCardHtml(giftCard: GiftCard | null, transaction: OrderTransaction, app: AppState, giftCardsSection: HTMLElement) {
  const htmlParts: string[] = [];
  htmlParts.push(`<h2 class="card-heading">Your virtual card</h2>`);
  htmlParts.push(getRedeemCodeHtml(transaction));
  if (giftCard) {
    htmlParts.push(getGiftCardHtml(giftCard, app.reward.amount));
  }
  giftCardsSection.innerHTML = htmlParts.join("");
  attachRevealAction(transaction, app);
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
