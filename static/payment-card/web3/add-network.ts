import { ethers } from "ethers";
import { getNetworkInfo } from "../../../shared/chains";

export async function addNetwork(provider: ethers.providers.Web3Provider, networkId: number): Promise<boolean> {
  try {
    await provider.send("wallet_addEthereumChain", [getNetworkInfo(networkId)]);
    return true;
  } catch (error: unknown) {
    return false;
  }
}
