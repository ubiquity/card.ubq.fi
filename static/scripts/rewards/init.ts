import { hideLoader } from "../shared/loader";
import { app } from "./app-state";
import { addOptions, showCatalog } from "./gift-cards/catalog";
import { addGiftCardEvents, getGiftCardHtml } from "./gift-cards/gift-card";
import { showMyCards } from "./gift-cards/my-cards";
import { displayCommitHash } from "./render-transaction/display-commit-hash";
import { readClaimDataFromUrl } from "./render-transaction/read-claim-data-from-url.ts";
import { grid } from "./the-grid";

//initializeAuth();
displayCommitHash();
grid(document.getElementById("grid") as HTMLElement, gridLoadedCallback); // @DEV: display grid background

const footer = document.querySelector(".footer") as Element;
footer.classList.add("ready");

// cSpell:ignore llback
function gridLoadedCallback() {
  document.body.classList.add("grid-loaded");
}
readClaimDataFromUrl(app).catch(console.error); // @DEV: read

init().catch(console.error);
window.addEventListener("hashchange", () => {
  init().catch(console.error);
});

export async function init() {
  await addOptions();
  const cardsSection = document.getElementById("gift-cards");
  if (!cardsSection) {
    console.error("Missing gift cards section #gift-cards");
    return;
  }
  cardsSection.innerHTML = "Loading...";

  const hash = window.location.hash.replace("#/", "");
  if (hash == "my-cards") {
    await showMyCards(cardsSection);
  } else if (hash.indexOf("sku") === 0) {
    const sku = Number(window.location.hash.replace("#/sku/", ""));
    const html = await getGiftCardHtml(sku);
    cardsSection.innerHTML = html;
    await addGiftCardEvents(sku);
  } else {
    await showCatalog().catch(console.error);
  }
  hideLoader();
}
