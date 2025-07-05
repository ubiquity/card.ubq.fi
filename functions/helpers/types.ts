export const commonHeaders = {
  "Content-Type": "application/json",
  Accept: "application/com.reloadly.giftcards-v1+json",
};

export interface Env {
  USE_RELOADLY_SANDBOX: string;
  RELOADLY_API_CLIENT_ID: string;
  RELOADLY_API_CLIENT_SECRET: string;
}

export interface AccessToken {
  token: string;
  isSandbox: boolean;
}

export type Context = EventContext<Env, string, Record<string, string>>;
