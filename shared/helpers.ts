import { BigNumberish, ethers } from "ethers";
import { isRangePriceGiftCardClaimable } from "./pricing";
import { GiftCard } from "./types";
import { CompletedOrder } from "../static/scripts/rewards/gift-cards/types";

export function getGiftCardOrderId(wallet: string, txHash: string, retryCount: number) {
  const checksumAddress = ethers.utils.getAddress(wallet);
  const integrityString = checksumAddress + ":" + txHash + ":" + retryCount;
  const integrityBytes = ethers.utils.toUtf8Bytes(integrityString);
  return ethers.utils.keccak256(integrityBytes);
}

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

export function isGiftCardAvailable(giftCard: GiftCard, reward: BigNumberish): boolean {
  return giftCard.denominationType == "RANGE" && isRangePriceGiftCardClaimable(giftCard, reward);
}
