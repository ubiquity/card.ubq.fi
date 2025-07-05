import { BigNumberish, ethers } from "ethers";
import { ReloadlyAuthResponse } from "../../shared/types/response-types";
import { AccessToken, Env } from "./types";
import { RELOADLY_AUTH_URL, RELOADLY_PRODUCTION_API_URL, RELOADLY_SANDBOX_API_URL } from "../../shared/constants";
import { isRangePriceGiftCardClaimable } from "../../shared/pricing";
import { Card } from "../../shared/types/entity-types";

export function getReloadlyApiBaseUrl(isSandbox: boolean): string {
  if (isSandbox === false) {
    return RELOADLY_PRODUCTION_API_URL;
  }
  return RELOADLY_SANDBOX_API_URL;
}

export async function getAccessToken(env: Env): Promise<AccessToken> {
  console.log("Using Reloadly Sandbox:", env.USE_RELOADLY_SANDBOX !== "false");
  const options = {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: env.RELOADLY_API_CLIENT_ID,
      client_secret: env.RELOADLY_API_CLIENT_SECRET,
      grant_type: "client_credentials",
      audience: env.USE_RELOADLY_SANDBOX === "false" ? "https://giftcards.reloadly.com" : "https://giftcards-sandbox.reloadly.com",
    }),
  };

  const res = await fetch(RELOADLY_AUTH_URL, options);
  if (res.status == 200) {
    const successResponse = (await res.json()) as ReloadlyAuthResponse;
    return {
      token: successResponse.access_token,
      isSandbox: env.USE_RELOADLY_SANDBOX !== "false",
    };
  }
  throw `Getting access token failed: ${JSON.stringify(await res.json())}`;
}
export function getGiftCardOrderId(wallet: string, txHash: string, retryCount: number) {
  const checksumAddress = ethers.utils.getAddress(wallet);
  const integrityString = checksumAddress + ":" + txHash + ":" + retryCount;
  const integrityBytes = ethers.utils.toUtf8Bytes(integrityString);
  return ethers.utils.keccak256(integrityBytes);
}
export function isGiftCardAvailable(giftCard: Card, reward: BigNumberish): boolean {
  return giftCard.denominationType == "RANGE" && isRangePriceGiftCardClaimable(giftCard, reward);
}
