import { PermitReward } from "@ubiquity-os/permit-generation";
import { decodePermits } from "@ubiquibot/permit-generation/handlers";
import { toaster } from "./toaster";

export function detectPermit() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("claim");
}

export function getActivePermit(): PermitReward | null {
  const base64encodedTxData = detectPermit();
  if (!base64encodedTxData) {
    console.error("No claim data found in URL.");
    return null;
  }

  try {
    const permit = decodeClaimDataFromUrl(base64encodedTxData);
    return permit[0];
  } catch (error) {
    console.error("Failed to decode claim data:", error);
    return null;
  }
}

function decodeClaimDataFromUrl(base64encodedTxData: string): PermitReward[] {
  try {
    return decodePermits(base64encodedTxData);
  } catch (error) {
    console.error(error);
    toaster.create("error", `Invalid claim data passed in URL`);
    throw error;
  }
}
