import { getApiBaseUrl } from "../utils";

export async function notifySandboxCardEnv() {
  const isUsingSandbox = await isSandbox();
  if (!isUsingSandbox) {
    return;
  }
  const cardEnvElement = document.createElement("div");
  cardEnvElement.classList.add("cards-env");
  cardEnvElement.textContent = "You are using Reloadly Sandbox.";
  const footer = document.getElementsByTagName("footer");
  if (footer.length) {
    footer[0].parentNode?.insertBefore(cardEnvElement, footer[0].nextSibling);
  }
}

export async function isSandbox(): Promise<boolean> {
  const apiUrl = `${getApiBaseUrl()}/get-env`;

  const response = await fetch(apiUrl);
  console.log("response.ok", !!response.ok);

  if (response.ok) {
    const responseJson = (await response.json()) as { USE_RELOADLY_SANDBOX: boolean };
    return responseJson.USE_RELOADLY_SANDBOX;
  }
  throw new Error(`Failed to detect backend environment.`);
}
