import { verifyMessage } from "@ethersproject/wallet";
import { getRedeemCodeParamsSchema } from "../shared/api-types";
import { getGiftCardOrderId, getRevealMessageToSign } from "../shared/helpers";
import { RedeemCode } from "../shared/types";
import { fetchIndividualTransactions } from "./my-cards";
import { commonHeaders, getAccessToken, getReloadlyApiBaseUrl } from "./utils/shared";
import { AccessToken, Context, ReloadlyFailureResponse, ReloadlyRedeemCodeResponse } from "./utils/types";
import { validateEnvVars, validateRequestMethod } from "./utils/validators";

export async function onRequest(ctx: Context): Promise<Response> {
  try {
    validateRequestMethod(ctx.request.method, "GET");
    validateEnvVars(ctx);

    const accessToken = await getAccessToken(ctx.env);

    const { searchParams } = new URL(ctx.request.url);

    const result = getRedeemCodeParamsSchema.safeParse({
      txId: searchParams.get("txId"),
      signedMessage: searchParams.get("signedMessage"),
      wallet: searchParams.get("wallet"),
      txHash: searchParams.get("txHash"),
      retryCount: searchParams.get("retryCount"),
    });
    if (!result.success) {
      throw new Error(`Invalid parameters: ${JSON.stringify(result.error.errors)}`);
    }
    const { txId, signedMessage, wallet, txHash, retryCount } = result.data;

    const errorResponse = Response.json({ message: "Given details are not valid to redeem code." }, { status: 403 });

    if (verifyMessage(getRevealMessageToSign({ txId, txHash, retryCount }), signedMessage) != wallet) {
      console.error(
        `Signed message verification failed: ${JSON.stringify({
          signedMessage,
          txId,
          txHash,
          retryCount,
        })}`
      );
      return errorResponse;
    }

    const transactions = await fetchIndividualTransactions([txId], accessToken);
    if (transactions.failedFetches.length > 0) {
      console.error(`Failed to fetch transaction details: ${JSON.stringify(transactions.failedFetches)}`);
      return errorResponse;
    }
    const transaction = transactions.foundTransactions[0];
    if (transaction.customIdentifier !== getGiftCardOrderId(wallet, txHash, retryCount)) {
      console.error(
        `Order details couldn't pass integrity check. Make sure given info is correct.: ${JSON.stringify({
          wallet,
          txHash,
          retryCount,
          customIdentifier: transaction.customIdentifier,
          customIdentifierCreated: getGiftCardOrderId(wallet, txHash, retryCount),
        })}`
      );
      return errorResponse;
    }

    const redeemCode = await getRedeemCode(txId, accessToken);
    return Response.json(redeemCode, { status: 200 });
  } catch (error) {
    console.error("There was an error while processing your request.", error);
    return Response.json({ message: "There was an error while processing your request." }, { status: 500 });
  }
}

export async function getRedeemCode(transactionId: number, accessToken: AccessToken): Promise<RedeemCode[]> {
  const url = `${getReloadlyApiBaseUrl(accessToken.isSandbox)}/orders/transactions/${transactionId}/cards`;
  console.log(`Retrieving redeem codes from ${url}`);
  const options = {
    method: "GET",
    headers: {
      ...commonHeaders,
      Authorization: `Bearer ${accessToken.token}`,
    },
  };

  const response = await fetch(url, options);
  const responseJson = await response.json();

  if (response.status != 200) {
    throw new Error(
      `Error from Reloadly API: ${JSON.stringify({
        status: response.status,
        message: (responseJson as ReloadlyFailureResponse).message,
      })}`
    );
  }
  console.log("Response status", response.status);
  console.log(`Response from ${url}`, responseJson);

  return responseJson as ReloadlyRedeemCodeResponse;
}
