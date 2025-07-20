import { BigNumberish, ethers } from "ethers";
import { isRangePriceCardClaimable } from "../pricing";
import { Card } from "../types/entity-types";

export function getCardOrderId(wallet: string, txHash: string, retryCount: number) {
  const checksumAddress = ethers.utils.getAddress(wallet);
  const integrityString = checksumAddress + ":" + txHash + ":" + retryCount;
  const integrityBytes = ethers.utils.toUtf8Bytes(integrityString);
  return ethers.utils.keccak256(integrityBytes);
}
export function isCardAvailable(card: Card, reward: BigNumberish): boolean {
  return card.denominationType === "RANGE" && isRangePriceCardClaimable(card, reward);
}
