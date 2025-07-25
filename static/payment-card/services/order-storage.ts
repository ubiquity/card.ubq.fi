import { CompletedOrder, PendingOrder } from "../../../shared/types/order-types";
import { MintParams } from "../types";
import { getConnectedWallet } from "../utils";

export async function updatePendingOrder(permitSig: string, mintArgs: MintParams) {
  try {
    const wallet = await getConnectedWallet();

    const pendingOrders = localStorage.getItem("pendingOrders");
    if (pendingOrders) {
      const pendingOrdersParsed = JSON.parse(pendingOrders);

      pendingOrdersParsed[wallet][permitSig] = { ...mintArgs };
      localStorage.setItem("pendingOrders", JSON.stringify(pendingOrdersParsed));
    } else {
      localStorage.setItem(
        "pendingOrders",
        JSON.stringify({
          [wallet]: {
            [permitSig]: { ...mintArgs },
          },
        })
      );
    }
  } catch (error) {
    console.error(error);
  }
}

export async function getPendingOrder(signature: string): Promise<PendingOrder | null> {
  const wallet = await getConnectedWallet();
  const pendingOrders = localStorage.getItem("pendingOrders");
  if (!pendingOrders) return null;
  const pendingOrdersParsed = JSON.parse(pendingOrders);
  if (pendingOrdersParsed[wallet] && pendingOrdersParsed[wallet][signature]) {
    return pendingOrdersParsed[wallet][signature];
  }
  return null;
}

export async function completeOrder(permitSig: string, txId: number) {
  try {
    const wallet = await getConnectedWallet();
    const pendingOrders = localStorage.getItem("pendingOrders");
    const pendingOrdersParsed = pendingOrders ? JSON.parse(pendingOrders) : {};
    const currentOrder = pendingOrdersParsed[wallet]?.[permitSig];

    const completedOrders = localStorage.getItem("completedOrders");
    let completedOrdersParsed = completedOrders ? JSON.parse(completedOrders) : {};
    const currentCompletedOrder = {
      txId,
      txHash: currentOrder.txHash,
      retryCount: currentOrder.retryCount,
    };
    if (completedOrdersParsed[wallet]) {
      completedOrdersParsed[wallet][permitSig] = currentCompletedOrder;
    } else {
      completedOrdersParsed = { [wallet]: { [permitSig]: currentCompletedOrder } };
    }

    localStorage.setItem("completedOrders", JSON.stringify(completedOrdersParsed));

    delete pendingOrdersParsed[wallet][permitSig];
    localStorage.setItem("pendingOrders", JSON.stringify(pendingOrdersParsed));
  } catch (error) {
    console.error(error);
  }
}

export async function getCompletedOrder(permitSig: string) {
  const wallet = await getConnectedWallet();
  const completedOrdersString = localStorage.getItem("completedOrders");
  const completedOrdersParsed = completedOrdersString ? JSON.parse(completedOrdersString) : {};
  if (completedOrdersParsed[wallet] && completedOrdersParsed[wallet][permitSig]) {
    return completedOrdersParsed[wallet][permitSig] as CompletedOrder;
  }
  return null;
}
