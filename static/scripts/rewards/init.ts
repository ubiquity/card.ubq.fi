import { app } from "./app-state";
import { initClaimGiftCard } from "./gift-cards/index";
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

initClaimGiftCard(app).catch(console.error);

window.addEventListener("hashchange", () => {
  initClaimGiftCard(app).catch(console.error);
});
