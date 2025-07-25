import { decodePermits } from "@ubiquibot/permit-generation/handlers";
import { ethers } from "ethers";
import { AppState } from "../app-state";
import { toaster } from "../common-ui/toaster";
import { connectWallet } from "../web3/connect-wallet";
import { switchNetwork } from "../web3/switch-network";
import { createProvider } from "./use-rpc-handler";
import { getNetworkInfo } from "../../../shared/chains";

const urlParams = new URLSearchParams(window.location.search);
const base64encodedTxData = urlParams.get("claim");

export async function readClaimDataFromUrl(app: AppState) {
  app.signer = await connectWallet();

  if (!base64encodedTxData) {
    throw new Error("Missing permit in the URL.");
  }

  try {
    app.claims = decodePermits(base64encodedTxData);
  } catch (e) {
    console.error(e);
    throw new Error("Invalid permit in the URL.");
  }

  app.provider = await createProvider(app.networkId ?? app.reward.networkId);
  await checkNetwork(app);
}

export async function checkNetwork(app: AppState) {
  try {
    const currentNetworkId = parseInt(await window.ethereum.request({ method: "eth_chainId" }), 16);

    const appId = app.networkId ?? app.reward.networkId;

    if (currentNetworkId !== appId) {
      console.warn(`Incorrect network. Expected ${appId}, but got ${currentNetworkId}.`);
      toaster.create("error", `This dApp currently does not support payouts for network ID ${currentNetworkId}`);

      // Try switching to the proper network id
      switchNetwork(new ethers.providers.Web3Provider(window.ethereum), appId).catch((error) => {
        console.error(error);
        if (app.networkId !== null) {
          toaster.create("error", `Please switch to the ${getNetworkInfo(appId).chainName} network to claim this reward.`);
        }
      });

      return; // Stop further checks if the network is incorrect
    }
  } catch (error) {
    console.error(error);
  }
}
