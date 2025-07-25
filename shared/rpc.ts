import { ethers } from "ethers";

export async function createProvider(networkId: number) {
  return new ethers.providers.JsonRpcProvider({ url: getRpcUrl(networkId), skipFetchSetup: true });
}

export function getRpcUrl(networkId: number): string {
  return networkId === 31337 ? "http://127.0.0.1:8545" : `https://card.ubq.fi/rpc/${networkId}`;
}
