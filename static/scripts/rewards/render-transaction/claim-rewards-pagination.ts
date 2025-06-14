import { app } from "../app-state";
import { initClaimGiftCard } from "../gift-cards/index";

import { toaster } from "../toaster";
import { table, updateButtonVisibility } from "./read-claim-data-from-url.ts";
import { renderTransaction } from "./render-transaction";

const nextTxButton = document.getElementById("nextTx");
const prevTxButton = document.getElementById("prevTx");

export function claimRewardsPagination(rewardsCount: HTMLElement) {
  rewardsCount.innerHTML = `${app.rewardIndex + 1}/${app.claims.length} reward`;
  const attributeKey = "data-listener";

  if (nextTxButton && !nextTxButton.hasAttribute(attributeKey)) {
    nextTxButton.addEventListener("click", () => transactionHandler("next"));
    nextTxButton.setAttribute(attributeKey, "true");
  }

  if (prevTxButton && !prevTxButton.hasAttribute(attributeKey)) {
    prevTxButton.addEventListener("click", () => transactionHandler("previous"));
    prevTxButton.setAttribute(attributeKey, "true");
  }
}

function transactionHandler(direction: "next" | "previous") {
  if (app.isClaiming) {
    toaster.create("error", "Please wait for the current transaction to complete.");
    return;
  }

  direction === "next" ? app.nextPermit() : app.previousPermit();
  table.setAttribute(`data-make-claim`, "error");

  updateButtonVisibility(app).catch(console.error);
  initClaimGiftCard(app).catch(console.error);
  renderTransaction().catch(console.error);
}
