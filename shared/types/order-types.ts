import { MintParams } from "../../static/payment-card/types";

export type CompletedOrder = {
  txId: number;
  txHash: string;
  retryCount: number;
};
export type PendingOrder = MintParams & {
  price: number;
};
