import { BigNumberish } from "ethers";
import { CompletedOrder, PendingOrder } from "../../../shared/types/order-types";
import { MintParams } from "../types";
import { getConnectedWallet } from "../utils";

export async function updatePendingOrder(permitNonce: BigNumberish, mintArgs: MintParams) {
  try {
    const wallet = await getConnectedWallet();

    const pendingOrders = localStorage.getItem("pendingOrders");
    if (pendingOrders) {
      const pendingOrdersParsed = JSON.parse(pendingOrders);

      pendingOrdersParsed[wallet][permitNonce.toString()] = { ...mintArgs };
      localStorage.setItem("pendingOrders", JSON.stringify(pendingOrdersParsed));
    } else {
      localStorage.setItem(
        "pendingOrders",
        JSON.stringify({
          [wallet]: {
            [permitNonce.toString()]: { ...mintArgs },
          },
        })
      );
    }
  } catch (error) {
    console.error(error);
  }
}

export async function getPendingOrder(permitNonce: BigNumberish): Promise<PendingOrder | null> {
  const wallet = await getConnectedWallet();
  const pendingOrders = localStorage.getItem("pendingOrders");
  if (!pendingOrders) return null;
  const pendingOrdersParsed = JSON.parse(pendingOrders);
  if (pendingOrdersParsed[wallet] && pendingOrdersParsed[wallet][permitNonce.toString()]) {
    return pendingOrdersParsed[wallet][permitNonce.toString()];
  }
  return null;
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

export async function getCompletedOrder(permitNonce: BigNumberish) {
  const wallet = await getConnectedWallet();
  const completedOrdersString = localStorage.getItem("completedOrders");
  const completedOrdersParsed = completedOrdersString ? JSON.parse(completedOrdersString) : {};
  if (completedOrdersParsed[wallet] && completedOrdersParsed[wallet][permitNonce.toString()]) {
    return completedOrdersParsed[wallet][permitNonce.toString()] as CompletedOrder;
  }
  return null;
}
