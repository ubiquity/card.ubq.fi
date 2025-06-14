import { PermitReward } from "@ubiquity-os/permit-generation";
import { ethers } from "ethers";
import { app } from "../app-state";

export async function getConnectedWallet() {
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  return await signer.getAddress();
}

export function getActivePermit(): PermitReward | null {
  return app.claims[0];
}
