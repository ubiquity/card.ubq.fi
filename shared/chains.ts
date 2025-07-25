import { getRpcUrl } from "./rpc";

export function getNetworkInfo(networkId: number): ChainInfo {
  if (networkInfo[networkId]) {
    return networkInfo[networkId];
  }

  throw new Error(`Network ID ${networkId} is not supported.`);
}

interface ChainInfo {
  chainId: string;
  chainName: string;
  rpcUrls: string[];
  blockExplorerUrls: string[];
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

const networkInfo: { [key: number]: ChainInfo } = {
  1: {
    chainId: "0x1",
    chainName: "Ethereum Mainnet",
    rpcUrls: [getRpcUrl(1), "https://eth.drpc.org", "https://rpc.ankr.com/eth"], // Free public RPCs
    blockExplorerUrls: ["https://etherscan.io"],
    nativeCurrency: {
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18,
    },
  },
  100: {
    chainId: "0x64",
    chainName: "Gnosis Chain",
    rpcUrls: [getRpcUrl(100), "https://rpc.gnosischain.com", "https://gnosis.drpc.org"], // Free public RPCs
    blockExplorerUrls: ["https://gnosisscan.io"],
    nativeCurrency: {
      name: "xDAI",
      symbol: "XDAI",
      decimals: 18,
    },
  },
  31337: {
    chainId: "0x7a69",
    chainName: "Anvil Localhost",
    rpcUrls: [getRpcUrl(31337)], // Anvil runs locally, no external API key needed
    blockExplorerUrls: [], // Anvil usually doesn't have a public block explorer
    nativeCurrency: {
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18,
    },
  },
};
