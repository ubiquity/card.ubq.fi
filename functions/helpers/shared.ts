import { RELOADLY_AUTH_URL, RELOADLY_PRODUCTION_API_URL, RELOADLY_SANDBOX_API_URL } from "../../shared/constants";
import { ReloadlyAuthResponse } from "../../shared/types/response-types";
import { AccessToken, Env } from "./types";

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
  if (res.ok) {
    const successResponse = (await res.json()) as ReloadlyAuthResponse;
    return {
      token: successResponse.access_token,
      isSandbox: env.USE_RELOADLY_SANDBOX !== "false",
    };
  }
  throw new Error(`Getting access token failed: ${JSON.stringify(await res.json())}`);
}
