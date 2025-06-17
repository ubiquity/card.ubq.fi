import { CompletedOrder, MintParams, PendingOrder } from "./types";
import { getConnectedWallet } from "./utils";

export async function updatePendingOrder(mintArgs: MintParams, price: number) {
  try {
    const wallet = await getConnectedWallet();
    console.log("wallet", wallet);

    const pendingOrders = localStorage.getItem("pendingOrders");
    if (pendingOrders) {
      const pendingOrdersParsed = JSON.parse(pendingOrders);
      pendingOrdersParsed[wallet][mintArgs.productId] = { price: price, ...mintArgs };
      localStorage.setItem("pendingOrders", JSON.stringify(pendingOrdersParsed));
    } else {
      localStorage.setItem(
        "pendingOrders",
        JSON.stringify({
          [wallet]: {
            [mintArgs.productId]: { price: price, ...mintArgs },
          },
        })
      );
    }
  } catch (error) {
    console.error(error);
  }
}

export async function getPendingOrder(productId: number): Promise<PendingOrder | null> {
  try {
    const wallet = await getConnectedWallet();
    const pendingOrders = localStorage.getItem("pendingOrders");
    if (!pendingOrders) return null;
    const pendingOrdersParsed = JSON.parse(pendingOrders);
    return pendingOrdersParsed[wallet][productId] || null;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function completeOrder(giftCardId: number, txId: number) {
  try {
    const wallet = await getConnectedWallet();
    const pendingOrders = localStorage.getItem("pendingOrders");
    const pendingOrdersParsed = pendingOrders ? JSON.parse(pendingOrders) : {};
    const currentOrder = pendingOrdersParsed[wallet]?.[giftCardId];

    const completedOrders = localStorage.getItem("completedOrders");
    const completedOrdersParsed = completedOrders ? JSON.parse(completedOrders) : {};
    const currentCompletedOrder = {
      txId,
      txHash: currentOrder.txHash,
      retryCount: currentOrder.retryCount,
    };
    if (completedOrdersParsed[wallet]) completedOrdersParsed[wallet].unshift(currentCompletedOrder);
    else completedOrdersParsed[wallet] = [currentCompletedOrder];
    localStorage.setItem("completedOrders", JSON.stringify(completedOrdersParsed));

    delete pendingOrdersParsed[wallet][giftCardId];
    localStorage.setItem("pendingOrders", JSON.stringify(pendingOrdersParsed));
  } catch (error) {
    console.error(error);
  }
}

export async function getCompletedOrders() {
  const wallet = await getConnectedWallet();
  const completedOrdersString = localStorage.getItem("completedOrders");
  const completedOrdersParsed = completedOrdersString ? JSON.parse(completedOrdersString) : {};
  return completedOrdersParsed[wallet] as CompletedOrder[] | [];
}
