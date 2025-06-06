import { BigNumberish, ethers } from "ethers";
import { formatEther } from "ethers/lib/utils";
import { giftCardTreasuryAddress, ubiquityDollarChainAddresses } from "../../../../shared/constants";
import { getFixedPriceToValueMap, getGiftCardValue, getTotalPriceOfValue, isRangePriceGiftCardClaimable } from "../../../../shared/pricing";
import { GiftCard, Product } from "../../../../shared/types";
import { postOrder } from "../../shared/api";
import { toaster } from "../toaster";
import { getGiftCardActivateInfoHtml } from "./activate/activate-html";
import { getUserCountryCode } from "./helpers";

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

// --- NEW HELPER FUNCTIONS (required for getSingleGiftCardHtmlDetailed to work) ---

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

export function getSingleGiftCardHtmlDetailed(product: Product) {
  const imageUrl = product.logoUrls.length > 0 ? product.logoUrls[0] : "https://via.placeholder.com/250x150?text=No+Image";
  const imageAltText = product.productName ? `${product.productName} logo` : "Gift card logo";

  // Pre-calculate content using helper functions
  const recipientDenominationsContent = renderRecipientDenominations(product);

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
            <h3>Amount: <input type="number" id="value" /></h3>
            <h3 id="price"></h3>
            <button type="button" id="mint-btn">Mint</button>
          </div>
        </div>
      </div>

      <div class="redeem-instructions-section card-section">
        <h3>Redeem Instructions</h3>
        <div class="instructions">${product.redeemInstruction.concise}</div>
        <div class="instructions">${product.redeemInstruction.verbose}</div>
      </div>
    </div>
  `;
}

export async function addGiftCardEvents(giftCard: GiftCard) {
  document.getElementById("mint-btn")?.addEventListener("click", async (event) => {
    const button = event.currentTarget as HTMLButtonElement;
    if (button.dataset.loading === "true") return; // Prevent double clicks
    button.dataset.loading = "true";
    button.innerText = "Minting...";

    try {
      await mint(giftCard);
    } catch (error) {
      console.error("Error during minting:", error);
      alert("An error occurred while minting the gift card. Please try again.");
    } finally {
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
export async function mint(giftCard: GiftCard) {
  const value = (document.getElementById("value") as HTMLInputElement).value;
  const price = getTotalPriceOfValue(Number(value), giftCard);
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

    const ubiquityDollarAddress = ubiquityDollarChainAddresses[chainId];
    if (!ubiquityDollarAddress) {
      throw new Error(`Ubiquity Dollar contract address not found for chainId: ${chainId}`);
    }
    console.log(`Ubiquity Dollar contract address: ${ubiquityDollarAddress}`);

    const ubiquityDollarAbi = [
      // ERC-20 standard functions, at least 'transfer'
      "function transfer(address recipient, uint256 amount) returns (bool)",
      "function decimals() view returns (uint8)",
    ];

    const ubiquityDollarContract = new ethers.Contract(ubiquityDollarAddress, ubiquityDollarAbi, signer);

    // Get the number of decimals for uAD
    const decimals = await ubiquityDollarContract.decimals();
    // ethers.js v5 uses BigNumber for amounts. parseUnits returns a BigNumber.
    const amountToTransfer = ethers.utils.parseUnits(price.toString(), decimals);

    console.log(`Attempting to transfer ${ethers.utils.formatUnits(amountToTransfer, decimals)} uAD to ${giftCardTreasuryAddress}`);

    const tx = await ubiquityDollarContract.transfer(giftCardTreasuryAddress, amountToTransfer);
    await tx.wait(); // Wait for the transaction to be mined

    console.log("Transaction successful:", tx.hash);

    const order = await postOrder({
      type: "ubiquity-dollar",
      chainId: provider.network.chainId,
      txHash: tx.hash,
      productId: giftCard.productId,
      country: await getUserCountryCode(),
    });
    if (!order) {
      toaster.create("error", "Order failed. Try again later.");
      return;
    }

    toaster.create("success", `Success. Your gift card will be available for redeem in your cards in a few minutes.`);
  } catch (error) {
    console.error("Error minting gift card:", error);
    throw error; // Re-throw the error for further handling
  }
}
