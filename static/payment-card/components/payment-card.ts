import { app } from "../app-state";
import { getCompletedOrder } from "../services/order-storage";
import { addOrderEvents, getOrderHtml } from "./order";
import { addCardEvents, createCardHtml, getSuitableCard } from "./suitable-card";

export async function handleClaim(contentElement: HTMLElement) {
  const completedOrder = await getCompletedOrder(app.reward.nonce);
  if (completedOrder) {
    contentElement.innerHTML = await getOrderHtml(completedOrder);
    addOrderEvents(completedOrder);
  } else {
    const suitableCard = await getSuitableCard();
    contentElement.innerHTML = createCardHtml(suitableCard, app.reward.amount);
    addCardEvents(suitableCard);
  }
}
