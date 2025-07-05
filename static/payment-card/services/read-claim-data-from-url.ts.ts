import { createClient } from "@supabase/supabase-js";
import { decodePermits } from "@ubiquibot/permit-generation/handlers";
import { AppState } from "../app-state";
import { useRpcHandler } from "./use-rpc-handler";
import { connectWallet } from "../web3/connect-wallet";

declare const SUPABASE_URL: string;
declare const SUPABASE_ANON_KEY: string;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const table = document.getElementsByTagName(`table`)[0];
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
}

async function getClaimedTxs(app: AppState): Promise<Record<string, string>> {
  const txs: Record<string, string> = Object.create(null);
  for (const claim of app.claims) {
    const { data } = await supabase.from("permits").select("transaction").eq("nonce", claim.nonce.toString());

    if (data?.length == 1 && data[0].transaction !== null) {
      txs[claim.nonce.toString()] = data[0].transaction as string;
    }
  }
  return txs;
}
