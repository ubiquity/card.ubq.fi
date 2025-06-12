import { ethers } from "ethers";

export async function getConnectedWallet() {
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  return await signer.getAddress();
}
