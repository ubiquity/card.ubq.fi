import { z } from "zod";

export const getOrderParamsSchema = z.object({
  orderId: z.string(),
});

export const getRedeemCodeParamsSchema = z.object({
  txId: z.coerce.number(),
  signedMessage: z.string(),
  wallet: z.string(),
  txHash: z.string(),
  retryCount: z.coerce.number(),
});

export const postOrderParamsSchema = z.object({
  productId: z.coerce.number(),
  txHash: z.string(),
  chainId: z.coerce.number(),
  country: z.string(),
  signedMessage: z.optional(z.string()),
  retryCount: z.coerce.number(),
});

export type PostOrderParams = z.infer<typeof postOrderParamsSchema>;
