export const RELOADLY_AUTH_URL = "https://auth.reloadly.com/oauth/token";
export const RELOADLY_SANDBOX_API_URL = "https://giftcards-sandbox.reloadly.com";
export const RELOADLY_PRODUCTION_API_URL = "https://web3-gateway-test.com/proxy/reloadly/production";

export const ubiquityDollarAllowedChainIds = [1, 100, 31337];

export const permit2Address = "0xd635918A75356D133d5840eE5c9ED070302C9C60";
export const cardTreasuryAddress = "0xb85275a03D07e1ed1e19Bc329C95dFD12645792D";

export const ubiquityDollarChainAddresses: Record<number, string> = {
  1: "0xb6919Ef2ee4aFC163BC954C5678e2BB570c2D103",
  100: "0xC6ed4f520f6A4e4DC27273509239b7F8A68d2068",
  31337: "0xC6ed4f520f6A4e4DC27273509239b7F8A68d2068",
};

export const networkRpcs: Record<number, string> = {
  1: "https://gateway.tenderly.co/public/mainnet",
  5: "https://eth-goerli.public.blastapi.io",
  100: "https://rpc.gnosischain.com",
  31337: "http://127.0.0.1:8545",
};
