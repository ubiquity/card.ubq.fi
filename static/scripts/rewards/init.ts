import { getCardDetailsHtml } from "../payment-card/card-details";
import { presentPaymentCard } from "../payment-card/payment-card";
import { hideLoader } from "../shared/loader";
import { app } from "./app-state";
import { displayCommitHash } from "./render-transaction/display-commit-hash";
import { readClaimDataFromUrl } from "./render-transaction/read-claim-data-from-url.ts";
import { grid } from "./the-grid";

displayCommitHash();
grid(document.getElementById("grid") as HTMLElement, gridLoadedCallback); // @DEV: display grid background

const footer = document.querySelector(".footer") as Element;
footer.classList.add("ready");

// cSpell:ignore llback
function gridLoadedCallback() {
  document.body.classList.add("grid-loaded");
}
readClaimDataFromUrl(app).then(init).catch(console.error);
window.addEventListener("hashchange", () => {
  init().catch(console.error);
});

export async function init() {
  const contentElement = document.getElementById("content");
  if (!contentElement) {
    console.error("Missing content section #content");
    return;
  }

  const hash = window.location.hash.replace("#/", "");
  if (hash.indexOf("sku") === 0) {
    const sku = Number(window.location.hash.replace("#/sku/", ""));
    const html = await getCardDetailsHtml(sku);
    contentElement.innerHTML = html;
  } else {
    await presentPaymentCard(contentElement);
  }

  hideLoader();
}
