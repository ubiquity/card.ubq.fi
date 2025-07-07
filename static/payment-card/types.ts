export interface OpenRouterCardPromptResponse {
  id: string;
  provider: string;
  model: string;
  object: string;
  created: number;
  choices: Array<{
    // cSpell:ignore logprobs
    logprobs: null;
    finish_reason: string;
    native_finish_reason: string;
    index: number;
    message: {
      role: string;
      content: string;
      refusal: null;
      reasoning: string;
    };
  }>;
}

export type MintParams = {
  chainId: number;
  txHash: string;
  productId: number;
  country: string;
  retryCount: number;
};
