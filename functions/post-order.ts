import { Interface, TransactionDescription } from "@ethersproject/abi";
import { TransactionReceipt, TransactionResponse } from "@ethersproject/providers";
import { verifyMessage } from "@ethersproject/wallet";
import { BigNumber } from "ethers";
import { getCardOrderId } from "../shared/abis/helpers";
import { permit2Abi } from "../shared/abis/permit2-abi";
import { cardTreasuryAddress, permit2Address, ubiquityDollarAllowedChainIds, ubiquityDollarChainAddresses } from "../shared/constants";
import { getMintMessageToSign } from "../shared/message-signer";
import { getCardValue, isClaimableForAmount } from "../shared/pricing";
import { Card, ExchangeRate } from "../shared/types/entity-types";
import { PostOrderParams, postOrderParamsSchema } from "../shared/types/params-types";
import { ReloadlyFailureResponse, ReloadlyOrderResponse } from "../shared/types/response-types";
import { useRpcHandler } from "../static/payment-card/services/use-rpc-handler";
import { getAccessToken, getReloadlyApiBaseUrl } from "./helpers/shared";
import { AccessToken, commonHeaders, Context } from "./helpers/types";
import { validateEnvVars, validateRequestMethod } from "./helpers/validators";

export async function onRequest(ctx: Context): Promise<Response> {
  try {
    validateRequestMethod(ctx.request.method, "POST");
    validateEnvVars(ctx);

    const accessToken = await getAccessToken(ctx.env);

    const result = postOrderParamsSchema.safeParse(await ctx.request.json());
    if (!result.success) {
      throw new Error(`Invalid post parameters: ${JSON.stringify(result.error.errors)}`);
    }
    const { productId, txHash, chainId, retryCount } = result.data;

    const provider = await useRpcHandler(chainId);

    const [txReceipt, tx, card]: [TransactionReceipt, TransactionResponse, Card] = await Promise.all([
      provider.getTransactionReceipt(txHash),
      provider.getTransaction(txHash),
      getCardById(productId, accessToken),
    ]);

    if (!txReceipt) {
      throw new Error(`Given transaction has not been mined yet. Please wait for it to be mined.`);
    }

    const iface = new Interface(permit2Abi);

    const txParsed = iface.parseTransaction({ data: tx.data });
    console.log("Parsed transaction data: ", JSON.stringify(txParsed));

    const validationErr = validatePermitTransaction(txParsed, txReceipt, result.data, card);
    if (validationErr) {
      return Response.json({ message: validationErr }, { status: 403 });
    }

    const amountDaiWei = txParsed.args.transferDetails.requestedAmount;
    const orderId = getCardOrderId(txReceipt.from, txHash, retryCount);

    let exchangeRate = 1;
    if (card.recipientCurrencyCode != "USD") {
      const exchangeRateResponse = await getExchangeRate(1, card.recipientCurrencyCode, accessToken);
      exchangeRate = exchangeRateResponse.senderAmount;
    }

    const cardValue = getCardValue(card, amountDaiWei, exchangeRate);

    const isDuplicate = await isDuplicateOrder(txHash, ctx);
    console.log("isDuplicate:", isDuplicate);
    if (isDuplicate) {
      return Response.json({ message: "The transaction has already claimed a gift card." }, { status: 400 });
    }

    const order = await orderCard(txReceipt.from.toLowerCase(), productId, cardValue, orderId, accessToken);

    if (order.status != "REFUNDED" && order.status != "FAILED") {
      await ctx.env.KV_CONSUMED_TX_HASHES.put(txHash.toLowerCase(), order.transactionId.toString());
      return Response.json(order, { status: 200 });
    } else {
      throw new Error(`Order failed: ${JSON.stringify(order)}`);
    }
  } catch (error) {
    console.error("There was an error while processing your request.", error);
    return Response.json({ message: "There was an error while processing your request." }, { status: 500 });
  }
}

export async function getCardById(productId: number, accessToken: AccessToken): Promise<Card> {
  const url = `${getReloadlyApiBaseUrl(accessToken.isSandbox)}/products/${productId}`;
  console.log(`Retrieving gift cards from ${url}`);
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
  console.log("response.status", response.status);
  console.log(`Response from ${url}`, responseJson);

  return responseJson as Card;
}

async function orderCard(userId: string, productId: number, cardValue: number, identifier: string, accessToken: AccessToken): Promise<ReloadlyOrderResponse> {
  const url = `${getReloadlyApiBaseUrl(accessToken.isSandbox)}/orders`;
  console.log(`Placing order at url: ${url}`);

  const requestBody = JSON.stringify({
    productId: productId,
    quantity: 1,
    unitPrice: cardValue,
    customIdentifier: identifier,
    preOrder: false,
    productAdditionalRequirements: {
      userId: userId,
    },
    senderName: "Ubiquity",
  });

  console.log(`Placing order at url: ${url}`);
  console.log(`Request body: ${requestBody}`);

  const options = {
    method: "POST",
    headers: {
      ...commonHeaders,
      Authorization: `Bearer ${accessToken.token}`,
    },
    body: requestBody,
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

  return responseJson as ReloadlyOrderResponse;
}

async function isDuplicateOrder(txHash: string, ctx: Context): Promise<boolean> {
  return !!(await ctx.env.KV_CONSUMED_TX_HASHES.get(txHash.toLowerCase()));
}

async function getExchangeRate(usdAmount: number, fromCurrency: string, accessToken: AccessToken): Promise<ExchangeRate> {
  const url = `${getReloadlyApiBaseUrl(accessToken.isSandbox)}/fx-rate?currencyCode=${fromCurrency}&amount=${usdAmount}`;
  console.log(`Retrieving url ${url}`);
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

  return responseJson as ExchangeRate;
}

function validatePermitTransaction(
  txParsed: TransactionDescription,
  txReceipt: TransactionReceipt,
  postOrderParams: PostOrderParams,
  card: Card
): string | null {
  if (!ubiquityDollarAllowedChainIds.includes(postOrderParams.chainId)) {
    return "Unsupported chain";
  }

  if (BigNumber.from(txParsed.args.permit.deadline).lt(Math.floor(Date.now() / 1000))) {
    return "The reward has expired.";
  }

  const { productId, txHash, chainId, country, signedMessage } = postOrderParams;
  if (!signedMessage) {
    console.error(`Signed message is empty. ${JSON.stringify({ signedMessage })}`);
    return "Signed message is missing in the request.";
  }
  const mintMessageToSign = getMintMessageToSign(chainId, txHash, productId, country);
  const signingWallet = verifyMessage(mintMessageToSign, signedMessage).toLocaleLowerCase();
  if (signingWallet != txReceipt.from.toLowerCase()) {
    console.error(
      `Signed message verification failed: ${JSON.stringify({
        wallet: txReceipt.from.toLowerCase(),
        signedMessage,

        chainId,
        txHash,
        productId,
        country,
      })}`
    );
    return "You have provided invalid signed message.";
  }

  const rewardAmount = txParsed.args.transferDetails.requestedAmount;

  if (!isClaimableForAmount(card, rewardAmount)) {
    return "Your reward amount is either too high or too low to buy this card.";
  }

  const wrongContractErr = "Transaction is not authorized to purchase gift card.";

  if (txReceipt.to.toLowerCase() != permit2Address.toLowerCase()) {
    console.error("Given transaction hash is not an interaction with permit2Address", `txReceipt.to=${txReceipt.to}`, `permit2Address=${permit2Address}`);
    return wrongContractErr;
  }

  if (txParsed.args.transferDetails.to.toLowerCase() != cardTreasuryAddress.toLowerCase()) {
    console.error(
      "Given transaction hash is not a token transfer to cardTreasuryAddress",
      `txParsed.args.transferDetails.to=${txParsed.args.transferDetails.to}`,
      `cardTreasuryAddress=${cardTreasuryAddress}`
    );
    return wrongContractErr;
  }

  if (txParsed.functionFragment.name != "permitTransferFrom") {
    console.error(
      "Given transaction hash is not call to contract function permitTransferFrom",
      `txParsed.functionFragment.name=${txParsed.functionFragment.name}`
    );
    return wrongContractErr;
  }

  if (txParsed.args.permit[0].token.toLowerCase() != ubiquityDollarChainAddresses[postOrderParams.chainId].toLowerCase()) {
    console.error(
      "Given transaction hash is not transferring the required ERC20 token.",
      JSON.stringify({
        transferredToken: txParsed.args.permit[0].token,
        requiredToken: ubiquityDollarChainAddresses[postOrderParams.chainId],
      })
    );
    return wrongContractErr;
  }

  return null;
}
