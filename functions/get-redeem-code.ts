import { verifyMessage } from "ethers/lib/utils";
import { getCardOrderId } from "../shared/abis/helpers";
import { getRevealMessageToSign } from "../shared/message-signer";
import { OrderTransaction, RedeemCode } from "../shared/types/entity-types";
import { getRedeemCodeParamsSchema } from "../shared/types/params-types";
import { ReloadlyFailureResponse, ReloadlyRedeemCodeResponse } from "../shared/types/response-types";
import { getAccessToken, getReloadlyApiBaseUrl } from "./helpers/shared";
import { AccessToken, commonHeaders, Context } from "./helpers/types";
import { validateEnvVars, validateRequestMethod } from "./helpers/validators";

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

    if (verifyMessage(getRevealMessageToSign({ txId, txHash, retryCount }), signedMessage) !== wallet) {
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

    const transaction = await getOrderTransaction(txId, accessToken);

    if (transaction.customIdentifier !== getCardOrderId(wallet, txHash, retryCount)) {
      console.error(
        `Order details couldn't pass integrity check. Make sure given info is correct.: ${JSON.stringify({
          wallet,
          txHash,
          retryCount,
          customIdentifier: transaction.customIdentifier,
          customIdentifierCreated: getCardOrderId(wallet, txHash, retryCount),
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

  if (!response.ok) {
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

export async function getOrderTransaction(transactionId: number, accessToken: AccessToken): Promise<OrderTransaction> {
  console.log(`Attempting to retrieve individual cards for ID: ${transactionId} from Reloadly API`);

  const url = `${getReloadlyApiBaseUrl(accessToken.isSandbox)}/reports/transactions/${transactionId}`;
  console.log(`Fetching transaction ${transactionId} from ${url}`);
  const response = await fetch(url, {
    method: "GET",
    headers: {
      ...commonHeaders,
      Authorization: `Bearer ${accessToken.token}`,
    },
  });

  if (!response.ok) {
    const errorResponse = await response.json();
    throw new Error(
      `Failed to fetch transactions: ${JSON.stringify({
        status: response.status,
        message: (errorResponse as ReloadlyFailureResponse).message,
      })}`
    );
  }

  return (await response.json()) as OrderTransaction;
}
