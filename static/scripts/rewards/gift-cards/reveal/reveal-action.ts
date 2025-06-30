import { getRevealMessageToSign } from "../../../../../shared/helpers";
import { RedeemCode } from "../../../../../shared/types";
import { app } from "../../app-state";
import { toaster } from "../../toaster";
import { getApiBaseUrl } from "../helpers";
import { CompletedOrder } from "../types";

export async function attachRevealAction(completedOrder: CompletedOrder) {
  if (!app?.signer) {
    toaster.create("error", "Connect your wallet to reveal the redeem code.");
    return;
  }

  try {
    const signedMessage = await app.signer.signMessage(getRevealMessageToSign(completedOrder));
    await revealRedeemCode(completedOrder, signedMessage);
  } catch (error) {
    toaster.create("error", "You did not sign the message to reveal redeem code.");
    return;
  }
}

async function revealRedeemCode(completedOrder: CompletedOrder, signedMessage: string) {
  const requestInit = {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  };

  const response = await fetch(
    `${getApiBaseUrl()}/get-redeem-code?txId=${completedOrder.txId}&txHash=${completedOrder.txHash}&signedMessage=${signedMessage}&wallet=${await app.signer?.getAddress()}&retryCount=${completedOrder.retryCount}`,
    requestInit
  );

  if (response.status != 200) {
    toaster.create("error", `Redeem code can't be revealed to the connected wallet.`);
    return;
  }

  const responseJson = (await response.json()) as RedeemCode[];

  const detailsElement = document.getElementById("details");
  if (detailsElement) {
    let codesHtml = "<h3>Redeem code</h3>";
    responseJson.forEach((code) => {
      const keys = Object.keys(code);
      keys.forEach((key) => {
        codesHtml += `<p>${key}: ${code[key as keyof RedeemCode]}</p>`;
      });
    });
    detailsElement.innerHTML = codesHtml;
  }
}
