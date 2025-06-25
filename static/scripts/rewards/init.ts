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
readClaimDataFromUrl(app).catch(console.error); // @DEV: read

init().catch(console.error);
window.addEventListener("hashchange", () => {
  init().catch(console.error);
});

export async function init() {
  const contentElement = document.getElementById("content");
  if (!contentElement) {
    console.error("Missing content section #content");
    return;
  }

  await presentPaymentCard(contentElement);
  hideLoader();
}
