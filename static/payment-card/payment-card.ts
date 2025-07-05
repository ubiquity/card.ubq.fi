import { app } from "./app-state";
import { hideLoader } from "./common-ui/loader";
import { grid } from "./common-ui/the-grid";
import { getCardDetailsHtml } from "./components/card-details";
import { displayCommitHash } from "./components/display-commit-hash";
import { handleClaim } from "./components/payment-card";
import { notifySandboxCardEnv } from "./components/sandbox-detector";
import { readClaimDataFromUrl } from "./services/read-claim-data-from-url.ts";

displayCommitHash();
grid(document.getElementById("grid") as HTMLElement, gridLoadedCallback); // @DEV: display grid background

const footer = document.querySelector(".footer") as Element;
footer.classList.add("ready");

// cSpell:ignore llback
function gridLoadedCallback() {
  document.body.classList.add("grid-loaded");
}

notifySandboxCardEnv().catch(console.error);
readClaimDataFromUrl(app)
  .then(init)
  .catch((e) => {
    console.error(e);
    const contentElement = document.getElementById("content");
    if (!contentElement) {
      console.error("Missing content section #content");
      return;
    }
    let errMessage;

    if (e instanceof Error) {
      errMessage = e.message;
    } else {
      errMessage = JSON.stringify(e);
    }

    contentElement.innerHTML = `ERROR: ${errMessage}`;
    hideLoader();
  });
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
    await handleClaim(contentElement);
  }

  hideLoader();
}
