import { CardsResponse, ReloadlyFailureResponse } from "../shared/types/response-types";
import { getAccessToken, getReloadlyApiBaseUrl } from "./helpers/shared";
import { AccessToken, commonHeaders, Context } from "./helpers/types";
import { validateEnvVars, validateRequestMethod } from "./helpers/validators";

export async function onRequest(ctx: Context): Promise<Response> {
  try {
    validateEnvVars(ctx);
    validateRequestMethod(ctx.request.method, "GET");

    const accessToken = await getAccessToken(ctx.env);
    const cards = await getAllCards(accessToken);

    return Response.json({ cards: cards }, { status: 200 });
  } catch (error) {
    console.error("There was an error while processing your request.", error);
    return Response.json(
      {
        message: "There was an error while processing your request.",
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

  const masterCards = (mastercardJson as CardsResponse).content;
  const visaCards = (visaJson as CardsResponse).content;

  return masterCards.concat(visaCards);
}
