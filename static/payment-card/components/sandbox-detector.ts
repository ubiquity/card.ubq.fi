import { toaster } from "../common-ui/toaster";
import { getApiBaseUrl } from "../utils";

export async function notifySandboxCardEnv() {
  const usingSandbox = isSandbox();
  if (!usingSandbox) {
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
  const apiUrl = `${getApiBaseUrl()}/get-cards-env`;

  const response = await fetch(apiUrl);

  if (response.ok) {
    const responseJson = (await response.json()) as { USE_RELOADLY_SANDBOX: boolean };
    return responseJson.USE_RELOADLY_SANDBOX;
  }

  toaster.create("error", "Unable to detect backend environment.");
  console.error("Unable to detect backend environment.");

  return false;
}
