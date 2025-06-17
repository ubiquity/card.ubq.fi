import { ethers } from "ethers";
import { GiftCard, Product } from "../../../../shared/types";
import { countryListDropdown } from "./country-list";
import { addGiftCardEvents, getSingleGiftCardHtml, getSingleGiftCardHtmlDetailed } from "./gift-card";
import { detectCardsEnv, getApiBaseUrl, getUserCountryCode } from "./helpers";
import { getActivePermit } from "./utils";
import { hideLoader, showLoader } from "../../shared/loader";

let loadedProducts: Product[] = [];
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

  const countryCode = await getUserCountryCode();

  if (loadedProducts.length === 0) {
    void detectCardsEnv();

    if (!countryCode) {
      catalogElement.innerHTML = `<p class="card-error">Failed to load suitable virtual cards for you. Refresh or try disabling adblocker.</p>`;
      return;
    }
    loadedProducts = await loadProducts(countryCode);
  }

  const productSku = Number(window.location.hash.replace("#/", ""));
  if (productSku) {
    const product = loadedProducts.find((p) => p.productId === productSku);
    if (product) {
      console.log("product", product);
      catalogElement.innerHTML = await getSingleGiftCardHtmlDetailed(product);
      await addGiftCardEvents(product as GiftCard);
    } else {
      catalogElement.innerHTML = "<p class='card-error'>Unable to find a gift card.</p>";
    }
    return;
  }

  addProductsHtml(loadedProducts, countryCode, catalogElement);
}

function addProductsHtml(products: Product[], country: string, giftCardsSection: HTMLElement) {
  const htmlParts: string[] = [];

  if (products.length > 0) {
    products.forEach((product: Product) => {
      if (product.status === "ACTIVE") {
        htmlParts.push(getSingleGiftCardHtml(product));
      }
    });
  } else {
    htmlParts.push(`<p class="card-error">There are no gift cards available for your location.</p>`);
  }

  giftCardsSection.innerHTML = htmlParts.join("");
}

export async function loadProducts(countryCode: string) {
  const search = searchElement?.value || "";
  const country = countryElement?.value || countryCode;
  const category = categoryElement?.value || 1;

  const retrieveProductsUrl = `${getApiBaseUrl()}/bootstrap?page=1&countryCode=${country}&productCategoryId=${category}&productName=${search}`;
  const productsResponse = await fetch(retrieveProductsUrl, requestInit);

  if (productsResponse.status == 200) {
    return (await productsResponse.json()).products as Product[];
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
      loadedProducts = [];
      showCatalog().then(hideLoader).catch(console.error);
    });
  });
}
