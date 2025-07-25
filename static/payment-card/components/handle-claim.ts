import { isClaimableForToken } from "../../../shared/pricing";
import { app } from "../app-state";
import { getCompletedOrder } from "../services/order-storage";
import { addOrderEvents, getOrderHtml } from "./order";
import { addCardEvents, createCardHtml, getSuitableCard } from "./suitable-card";

export async function handleClaim(contentElement: HTMLElement) {
  if (!isClaimableForToken(app.reward.tokenAddress, app.reward.networkId)) {
    throw new Error("The permit is for an unsupported token to mint a payment card.");
  }

  const completedOrder = await getCompletedOrder(app.reward.signature);
  if (completedOrder) {
    contentElement.innerHTML = await getOrderHtml(completedOrder);
    addOrderEvents(completedOrder);
  } else {
    const suitableCard = await getSuitableCard();
    contentElement.innerHTML = createCardHtml(suitableCard, app.reward.amount);
    addCardEvents(suitableCard);
  }
}
