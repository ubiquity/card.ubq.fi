import { MintParams } from "../types";
import { CompletedOrder, PendingOrder } from "../../../shared/types/order-types";
import { getConnectedWallet } from "../utils";

export async function updatePendingOrder(permitNonce: string, mintArgs: MintParams) {
  try {
    const wallet = await getConnectedWallet();

    const pendingOrders = localStorage.getItem("pendingOrders");
    if (pendingOrders) {
      const pendingOrdersParsed = JSON.parse(pendingOrders);

      pendingOrdersParsed[wallet][permitNonce] = { ...mintArgs };
      localStorage.setItem("pendingOrders", JSON.stringify(pendingOrdersParsed));
    } else {
      localStorage.setItem(
        "pendingOrders",
        JSON.stringify({
          [wallet]: {
            [permitNonce]: { ...mintArgs },
          },
        })
      );
    }
  } catch (error) {
    console.error(error);
  }
}

export async function getPendingOrder(permitNonce: string): Promise<PendingOrder | null> {
  try {
    const wallet = await getConnectedWallet();
    const pendingOrders = localStorage.getItem("pendingOrders");
    if (!pendingOrders) return null;
    const pendingOrdersParsed = JSON.parse(pendingOrders);
    return pendingOrdersParsed[wallet][permitNonce] || null;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function completeOrder(permitNonce: string, txId: number) {
  try {
    const wallet = await getConnectedWallet();
    const pendingOrders = localStorage.getItem("pendingOrders");
    const pendingOrdersParsed = pendingOrders ? JSON.parse(pendingOrders) : {};
    const currentOrder = pendingOrdersParsed[wallet]?.[permitNonce];

    const completedOrders = localStorage.getItem("completedOrders");
    let completedOrdersParsed = completedOrders ? JSON.parse(completedOrders) : {};
    const currentCompletedOrder = {
      txId,
      txHash: currentOrder.txHash,
      retryCount: currentOrder.retryCount,
    };
    if (completedOrdersParsed[wallet]) {
      completedOrdersParsed[wallet][permitNonce] = currentCompletedOrder;
    } else {
      completedOrdersParsed = { [wallet]: { [permitNonce]: currentCompletedOrder } };
    }

    localStorage.setItem("completedOrders", JSON.stringify(completedOrdersParsed));

    delete pendingOrdersParsed[wallet][permitNonce];
    localStorage.setItem("pendingOrders", JSON.stringify(pendingOrdersParsed));
  } catch (error) {
    console.error(error);
  }
}

export async function getCompletedOrder(permitNonce: string) {
  const wallet = await getConnectedWallet();
  const completedOrdersString = localStorage.getItem("completedOrders");
  const completedOrdersParsed = completedOrdersString ? JSON.parse(completedOrdersString) : {};
  return (completedOrdersParsed[wallet][permitNonce] as CompletedOrder) || null;
}
