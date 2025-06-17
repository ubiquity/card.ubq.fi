import { BigNumberish, ethers } from "ethers";
import { formatEther } from "ethers/lib/utils";
import { giftCardTreasuryAddress, ubiquityDollarChainAddresses } from "../../../../shared/constants";
import { isGiftCardAvailable } from "../../../../shared/helpers";
import { getFixedPriceToValueMap, getGiftCardValue, getTotalPriceOfValue, isRangePriceGiftCardClaimable } from "../../../../shared/pricing";
import { GiftCard, Product } from "../../../../shared/types";
import { postOrder } from "../../shared/api";
import { app } from "../app-state";
import { toaster } from "../toaster";
import { getGiftCardActivateInfoHtml } from "./activate/activate-html";
import { getUserCountryCode } from "./helpers";
import { mintWithPermit } from "./mint/mint-action";
import { getActivePermit, getConnectedWallet } from "./utils";

const html = String.raw;

export function getGiftCardHtml(giftCard: GiftCard, rewardAmount: BigNumberish) {
  return html`
    <div class="card-section" id="offered-card" data-product-id="${giftCard.productId}">
      <div>
        <img src="${giftCard.logoUrls}" alt="${giftCard.productName}" />
      </div>
      <div class="details">
        <h3>${giftCard.productName}</h3>

        <div class="pricing ${giftCard.denominationType}">
          ${giftCard.denominationType == "FIXED" ? getFixedPricesHtml(giftCard, rewardAmount) : getRangePricesHtml(giftCard, rewardAmount)}
        </div>
        <div>SKU: ${giftCard.productId}</div>
        <button id="mint" class="btn" data-loading="false">
          <div class="action">Mint</div>
          <div class="icon"
            ><svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" id="claim-icon">
              <path
                d="M252.309-180.001q-30.308 0-51.308-21t-21-51.308V-360H240v107.691q0 4.616 3.846 8.463 3.847 3.846 8.463 3.846h455.382q4.616 0 8.463-3.846 3.846-3.847 3.846-8.463V-360h59.999v107.691q0 30.308-21 51.308t-51.308 21H252.309ZM480-335.386 309.233-506.153l42.153-43.383 98.615 98.615v-336.001h59.998v336.001l98.615-98.615 42.153 43.383L480-335.386Z"
              ></path></svg
          ></div>
          <div class="loader">
            <svg
              version="1.1"
              id="L9"
              xmlns="http://www.w3.org/2000/svg"
              xmlns:xlink="http://www.w3.org/1999/xlink"
              width="33.33"
              height="33.33"
              viewBox="0 0 100 100"
              enable-background="new 0 0 0 0"
              xml:space="preserve"
            >
              <path fill="#fff" d="M73,50c0-12.7-10.3-23-23-23S27,37.3,27,50 M30.9,50c0-10.5,8.5-19.1,19.1-19.1S69.1,39.5,69.1,50"></path></svg
          ></div>
        </button>
      </div>
    </div>
    ${getGiftCardActivateInfoHtml(giftCard)}
  `;
}

function getFixedPricesHtml(giftCard: GiftCard, rewardAmount: BigNumberish) {
  const _html = html` <div>
    <div>Price</div>
    <div>Value</div>
  </div>`;

  const priceToValueMap = getFixedPriceToValueMap(giftCard);
  const priceAsKey = Number(formatEther(rewardAmount)).toFixed(2).toString();

  let matchingCardHtml = "";
  let otherCardsHtml = "";
  Object.keys(priceToValueMap).forEach((price) => {
    if (price == priceAsKey) {
      matchingCardHtml += html`<div class="available">
          <div title="${Number(price).toFixed(2)}${giftCard.senderCurrencyCode}">${Number(price).toFixed(0)}${giftCard.senderCurrencyCode}</div>
          <div title="${priceToValueMap[price].toFixed(2)}${giftCard.recipientCurrencyCode}"
            >${priceToValueMap[price].toFixed(0)}${giftCard.recipientCurrencyCode}</div
          > </div
        ><br /><p>Also available in</p>`;
    } else {
      otherCardsHtml += html`<div>
        <div title="${Number(price).toFixed(2)}${giftCard.senderCurrencyCode}">${Number(price).toFixed(0)}${giftCard.senderCurrencyCode}</div>
        <div title="${priceToValueMap[price].toFixed(2)}${giftCard.recipientCurrencyCode}"
          >${priceToValueMap[price].toFixed(0)}${giftCard.recipientCurrencyCode}</div
        >
      </div>`;
    }
  });

  return `${_html}${matchingCardHtml}${otherCardsHtml}`;
}

function getRangePricesHtml(giftCard: GiftCard, rewardAmount: BigNumberish) {
  let _html = ``;
  const giftCardValue = getGiftCardValue(giftCard, rewardAmount);
  const isAvailable = isRangePriceGiftCardClaimable(giftCard, rewardAmount);
  if (isAvailable) {
    _html += html`<div class="available">
      <div>
        <div class="amount">${giftCardValue.toFixed(2)} ${giftCard.recipientCurrencyCode}</div>
        <div class="currency">
          <div>Value inside</div>
        </div>
      </div>
    </div>`;
  }

  return _html;
}

export function getSingleGiftCardHtml(product: Product) {
  // Changed type from GiftCard to Product
  return html`
    <a href="#/${product.productId}">
      <div class="card-section" id="offered-card" data-product-id="${product.productId}">
        <div class="card-image-container">
          <img src="${product.logoUrls[0]}" alt="${product.productName}" />
        </div>
        <div class="details">
          <h3>${product.productName}</h3>
          <div class="pricing">
            <div class="available">
              ${product.denominationType === "FIXED"
                ? html`
                    <div class="fixed-denominations">
                      ${product.fixedRecipientDenominations
                        .map(
                          (amount) => html`
                            <div class="amount-option">
                              <span class="currency">${product.recipientCurrencyCode}</span>
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
                        <span class="currency">${product.recipientCurrencyCode}</span>
                        <span class="amount">${product.minRecipientDenomination}</span>
                        -
                        <span class="currency">${product.recipientCurrencyCode}</span>
                        <span class="amount">${product.maxRecipientDenomination}</span>
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

// Utility function for currency formatting (this was already present and remains unchanged)
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

/**
 * Renders the recipient denominations block (fixed or range).
 */
function renderRecipientDenominations(product: Product): string {
  if (product.denominationType === "FIXED") {
    return html`
      <div class="fixed-denominations">
        ${product.fixedRecipientDenominations
          .map(
            (amount) => html`
              <div class="amount-option">
                <span class="currency">${product.recipientCurrencyCode}</span>
                <span class="amount">${formatCurrency(amount, product.recipientCurrencyCode)}</span>
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
          <span class="currency">${product.recipientCurrencyCode}</span>
          <span class="amount">${formatCurrency(product.minRecipientDenomination, product.recipientCurrencyCode)}</span>
          -
          <span class="currency">${product.recipientCurrencyCode}</span>
          <span class="amount">${formatCurrency(product.maxRecipientDenomination, product.recipientCurrencyCode)}</span>
        </div>
      </div>
    `;
  }
}

// --- The Refactored getSingleGiftCardHtmlDetailed Function ---

export async function getSingleGiftCardHtmlDetailed(product: Product) {
  const imageUrl = product.logoUrls.length > 0 ? product.logoUrls[0] : "https://via.placeholder.com/250x150?text=No+Image";
  const imageAltText = product.productName ? `${product.productName} logo` : "Gift card logo";

  // Pre-calculate content using helper functions
  const recipientDenominationsContent = renderRecipientDenominations(product);
  const pendingOrders = await getPendingOrder(product.productId);
  console.log("Pending order of product:", pendingOrders);
  let value;
  const activePermit = getActivePermit();
  console.log("activePermit", activePermit);
  if (pendingOrders) {
    // If there's a pending order, we can show the amount and price
    value = getGiftCardValue(product as GiftCard, ethers.utils.parseEther(pendingOrders.price.toString()));
  } else if (activePermit) {
    value = getGiftCardValue(product as GiftCard, activePermit.amount);
  }

  return html`
    <div class="product-detailed-card" data-product-id="${product.productId}">
      <div class="product-header">
        <img src="${imageUrl}" alt="${imageAltText}" class="detailed-card-image" />
        <div class="header-text">
          <h2>${product.productName}</h2>
          <p class="product-sku">SKU: ${product.productId}</p>
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
        <div class="instructions">${product.redeemInstruction.concise}</div>
        ${product.redeemInstruction.concise !== product.redeemInstruction.verbose
          ? `<div class="instructions">${product.redeemInstruction.concise !== product.redeemInstruction.verbose}</div>
      `
          : ""}
      </div>
    </div>
  `;
}

export async function addGiftCardEvents(giftCard: GiftCard) {
  console.log("app", app);
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

export type MintArgs = {
  type: "ubiquity-dollar" | "permit";
  chainId: number;
  txHash: string;
  productId: number;
  country: string;
  retryCount: number;
};

export type PendingOrder = MintArgs & {
  price: number;
};

export type CompletedOrder = {
  [wallet: string]: {
    txId: number;
    txHash: string;
    retryCount: number;
  }[];
};

export async function mint(giftCard: GiftCard) {
  const country = await getUserCountryCode();
  if (!country) {
    toaster.create("error", "Failed to detect your location to pick a suitable card for you.");
    return;
  }

  const value = (document.getElementById("value") as HTMLInputElement).value;
  const price = getTotalPriceOfValue(Number(value), giftCard);
  const activePermit = getActivePermit();

  if (!isGiftCardAvailable(giftCard, ethers.utils.parseEther(price.toString()))) {
    if (activePermit) {
      toaster.create("error", "This gift card is not available in your permit amount.");
    } else {
      toaster.create("error", "This gift card is not available in the given amount.");
    }
    return;
  }

  console.log(`Minting gift card with amount: ${value}, price: ${price} for product ID: ${giftCard.productId}`);

  if (typeof window.ethereum === "undefined") {
    throw new Error("MetaMask is not installed. Please install it to proceed.");
  }

  try {
    await window.ethereum.request({ method: "eth_requestAccounts" });
    // ethers.js v5 way to get provider and signer from window.ethereum
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();

    const network = await provider.getNetwork();
    const chainId = Number(network.chainId); // Ensure chainId is a number

    console.log(`Connected to chainId: ${chainId}`);

    if (activePermit) {
      console.log("Using active permit for minting gift card.", activePermit);

      await mintWithPermit(giftCard, activePermit);

      toaster.create("success", `Success. Your gift card will be available for redeem in your cards in a few minutes.`);

      return;
    }

    const ubiquityDollarAddress = ubiquityDollarChainAddresses[chainId];
    if (!ubiquityDollarAddress) {
      toaster.create("error", "You are not on the correct network to mint the card.");
      return;
    }
    console.log(`Ubiquity Dollar contract address: ${ubiquityDollarAddress}`);

    const ubiquityDollarAbi = ["function transfer(address recipient, uint256 amount) returns (bool)"];

    const ubiquityDollarContract = new ethers.Contract(ubiquityDollarAddress, ubiquityDollarAbi, signer);

    const amountToTransfer = ethers.utils.parseEther(price.toString());

    console.log(`Attempting to transfer ${ethers.utils.formatEther(amountToTransfer)} UUSD to ${giftCardTreasuryAddress}`);

    const pendingOrder = await getPendingOrder(giftCard.productId);

    console.log("Pending order of product:", pendingOrder);
    let tx, txHash;
    if (pendingOrder) {
      txHash = pendingOrder.txHash;
      console.log(`Using existing transaction hash: ${txHash}`);
    } else {
      tx = await ubiquityDollarContract.transfer(giftCardTreasuryAddress, amountToTransfer);
      txHash = tx.hash;
    }

    const mintArgs: MintArgs = {
      type: "ubiquity-dollar",
      chainId: provider.network.chainId,
      txHash: txHash,
      productId: giftCard.productId,
      country,
      retryCount: pendingOrder && pendingOrder.retryCount ? pendingOrder.retryCount + 1 : 1,
    };

    await updatePendingOrder(mintArgs, price);

    if (tx) {
      await tx.wait();
      console.log("Transaction successful:", tx.hash);
    }

    const order = await postOrder(mintArgs);
    if (!order) {
      toaster.create("error", "Order failed. Try again later.");
      return;
    }

    toaster.create("success", `Success. Your gift card will be available for redeem in your cards in a few minutes.`);

    await completeOrder(giftCard.productId, order.transactionId);
  } catch (error) {
    console.error("Error minting gift card:", error);
    throw error; // Re-throw the error for further handling
  }
}

export async function updatePendingOrder(mintArgs: MintArgs, price: number) {
  try {
    const wallet = await getConnectedWallet();
    console.log("wallet", wallet);

    const pendingOrders = localStorage.getItem("pendingOrders");
    if (pendingOrders) {
      const pendingOrdersParsed = JSON.parse(pendingOrders);
      pendingOrdersParsed[wallet][mintArgs.productId] = { price: price, ...mintArgs };
      localStorage.setItem("pendingOrders", JSON.stringify(pendingOrdersParsed));
    } else {
      localStorage.setItem(
        "pendingOrders",
        JSON.stringify({
          [wallet]: {
            [mintArgs.productId]: { price: price, ...mintArgs },
          },
        })
      );
    }
  } catch (error) {
    console.error(error);
  }
}

export async function getPendingOrder(productId: number): Promise<PendingOrder | null> {
  try {
    const wallet = await getConnectedWallet();
    const pendingOrders = localStorage.getItem("pendingOrders");
    if (!pendingOrders) return null;
    const pendingOrdersParsed = JSON.parse(pendingOrders);
    return pendingOrdersParsed[wallet][productId] || null;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function completeOrder(giftCardId: number, txId: number) {
  try {
    const wallet = await getConnectedWallet();
    const pendingOrders = localStorage.getItem("pendingOrders");
    const pendingOrdersParsed = pendingOrders ? JSON.parse(pendingOrders) : {};
    const currentOrder = pendingOrdersParsed[wallet]?.[giftCardId];

    const completedOrders = localStorage.getItem("completedOrders");
    const completedOrdersParsed = completedOrders ? JSON.parse(completedOrders) : {};
    const currentCompletedOrder = {
      txId,
      txHash: currentOrder.txHash,
      retryCount: currentOrder.retryCount,
    };
    if (completedOrdersParsed[wallet]) completedOrdersParsed[wallet].unshift(currentCompletedOrder);
    else completedOrdersParsed[wallet] = [currentCompletedOrder];
    localStorage.setItem("completedOrders", JSON.stringify(completedOrdersParsed));

    delete pendingOrdersParsed[wallet][giftCardId];
    localStorage.setItem("pendingOrders", JSON.stringify(pendingOrdersParsed));
  } catch (error) {
    console.error(error);
  }
}
