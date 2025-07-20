import { createClient } from "@supabase/supabase-js";
import { decodePermits } from "@ubiquibot/permit-generation/handlers";
import { AppState } from "../app-state";
import { useRpcHandler } from "./use-rpc-handler";
import { connectWallet } from "../web3/connect-wallet";
import { toaster } from "../common-ui/toaster";
import { getNetworkName, NetworkId } from "@ubiquity-dao/rpc-handler";
import { switchNetwork } from "../web3/switch-network";
import { ethers } from "ethers";

declare const SUPABASE_URL: string;
declare const SUPABASE_ANON_KEY: string;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
  app.claimTxs = await getClaimedTxs(app);

  app.provider = await useRpcHandler(app.networkId ?? app.reward.networkId);
  await checkNetwork(app);
}

async function getClaimedTxs(app: AppState): Promise<Record<string, string>> {
  const txs: Record<string, string> = Object.create(null);
  for (const claim of app.claims) {
    const { data } = await supabase.from("permits").select("transaction").eq("nonce", claim.nonce.toString());

    if (data?.length === 1 && data[0].transaction !== null) {
      txs[claim.nonce.toString()] = data[0].transaction as string;
    }
  }
  return txs;
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
          toaster.create("error", `Please switch to the ${getNetworkName(String(appId) as NetworkId)} network to claim this reward.`);
        }
      });

      return; // Stop further checks if the network is incorrect
    }
  } catch (error) {
    console.error(error);
  }
}
