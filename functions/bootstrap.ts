import { GiftCardsResponse } from "../shared/types";
import { commonHeaders, getAccessToken, getEnvVars, getReloadlyApiBaseUrl } from "./utils/shared";
import { AccessToken, Context, ReloadlyFailureResponse } from "./utils/types";
import { validateEnvVars, validateRequestMethod } from "./utils/validators";

export async function onRequest(ctx: Context): Promise<Response> {
  try {
    validateEnvVars(ctx);
    validateRequestMethod(ctx.request.method, "GET");

    const accessToken = await getAccessToken(ctx.env);
    const cards = await getAllCards(accessToken);

    return Response.json({ cards: cards, ...getEnvVars(ctx) }, { status: 200 });
  } catch (error) {
    console.error("There was an error while processing your request.", error);
    return Response.json(
      {
        message: "There was an error while processing your request.",
        ...getEnvVars(ctx),
      },
      { status: 500 }
    );
  }
}

async function getAllCards(accessToken: AccessToken) {
  const mastercardUrl = `${getReloadlyApiBaseUrl(accessToken.isSandbox)}/products?includeFixed=false&productCategoryId=1&productName=mastercard`;
  const visaUrl = `${getReloadlyApiBaseUrl(accessToken.isSandbox)}/products?includeFixed=false&productCategoryId=1&productName=visa`;

  console.log(`Retrieving from ${{ mastercardUrl: mastercardUrl, visaUrl: visaUrl }}`);
  const options = {
    method: "GET",
    headers: {
      ...commonHeaders,
      Authorization: `Bearer ${accessToken.token}`,
    },
  };

  const [mastercardResponse, visaResponse] = await Promise.all([fetch(mastercardUrl, options), fetch(visaUrl, options)]);
  const [mastercardJson, visaJson] = await Promise.all([mastercardResponse.json(), visaResponse.json()]);

  if (mastercardResponse.status != 200) {
    throw new Error(
      `Error from Reloadly API for mastercard: ${JSON.stringify({
        status: mastercardResponse.status,
        message: (mastercardJson as ReloadlyFailureResponse).message,
      })}`
    );
  }

  if (visaResponse.status != 200) {
    throw new Error(
      `Error from Reloadly API for mastercard: ${JSON.stringify({
        status: visaResponse.status,
        message: (visaJson as ReloadlyFailureResponse).message,
      })}`
    );
  }

  console.log("mastercardResponse.status", mastercardResponse.status);
  console.log(`Response from ${mastercardUrl}`, mastercardJson);
  console.log("visaResponse.status", visaResponse.status);
  console.log(`Response from ${visaUrl}`, visaJson);

  const masterCards = (mastercardJson as GiftCardsResponse).content;
  const visaCards = (visaJson as GiftCardsResponse).content;

  return masterCards.concat(visaCards);
}
