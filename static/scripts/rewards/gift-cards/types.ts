export type MintParams = {
  chainId: number;
  txHash: string;
  productId: number;
  country: string;
  retryCount: number;
};

export type PendingOrder = MintParams & {
  price: number;
};

export type CompletedOrder = {
  txId: number;
  txHash: string;
  retryCount: number;
};
