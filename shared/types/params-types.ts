import { z } from "zod";

export const getBestCardParamsSchema = z.object({
  country: z.string(),
  amount: z.string(),
});

export type GetBestCardParams = z.infer<typeof getBestCardParamsSchema>;

export const getOrderParamsSchema = z.object({
  orderId: z.string(),
});

export type GetOrderParams = z.infer<typeof getOrderParamsSchema>;

export const getRedeemCodeParamsSchema = z.object({
  txId: z.coerce.number(),
  signedMessage: z.string(),
  wallet: z.string(),
  txHash: z.string(),
  retryCount: z.coerce.number(),
});

export type GetRedeemCodeParams = z.infer<typeof getRedeemCodeParamsSchema>;

export const postOrderParamsSchema = z.object({
  productId: z.coerce.number(),
  txHash: z.string(),
  chainId: z.coerce.number(),
  country: z.string(),
  signedMessage: z.optional(z.string()),
  retryCount: z.coerce.number(),
});

export type PostOrderParams = z.infer<typeof postOrderParamsSchema>;
