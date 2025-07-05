import { CompletedOrder } from "./types/order-types";

export function getRevealMessageToSign(order: CompletedOrder) {
  return JSON.stringify({
    from: "giftcards.ubq.fi",
    transactionId: order.txId,
    txHash: order.txHash,
    retryCount: order.retryCount,
  });
}

export function getMintMessageToSign(chainId: number, txHash: string, productId: number, country: string) {
  return JSON.stringify({
    from: "pay.ubq.fi",
    chainId,
    txHash,
    productId,
    country,
  });
}
