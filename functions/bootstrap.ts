import { z } from "zod";
import { GiftCard, GiftCardsResponse } from "../shared/types";
import { commonHeaders, getAccessToken, getReloadlyApiBaseUrl } from "./utils/shared";
import { AccessToken, Context, OpenRouterCardPromptResponse, ReloadlyFailureResponse } from "./utils/types";
import { validateEnvVars, validateRequestMethod } from "./utils/validators";

export const getPaginationSchema = z.object({
  countryCode: z.string(),
  amount: z.coerce.number(),
});

export async function onRequest(ctx: Context): Promise<Response> {
  const envVars = getEnvVars(ctx);

  try {
    validateEnvVars(ctx);
    validateRequestMethod(ctx.request.method, "GET");

    const { searchParams } = new URL(ctx.request.url);
    const result = getPaginationSchema.safeParse({
      countryCode: searchParams.get("countryCode"),
      amount: searchParams.get("amount"),
    });
    if (!result.success) {
      throw new Error(`Invalid parameters: ${JSON.stringify(result.error.errors)}`);
    }
    const { countryCode, amount } = result.data;
    const accessToken = await getAccessToken(ctx.env);

    const suitableCard = await getSuitableCard(accessToken, countryCode, amount);

    if (suitableCard) {
      return Response.json({ card: suitableCard, ...envVars }, { status: 200 });
    }

    return Response.json({ message: "No suitable payment card is available for the user.", ...envVars }, { status: 404 });
  } catch (error) {
    console.error("There was an error while processing your request.", error);
    return Response.json({ message: "There was an error while processing your request.", ...envVars }, { status: 500 });
  }
}

export async function getSuitableCard(accessToken: AccessToken, countryCode: string, amount: number): Promise<GiftCard | null> {
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

  const allCards = masterCards.concat(visaCards);

  const prompt = `Find a list of suitable payment cards offered by Reloadly (reloadly.com) from the JSON stringified array given below. It contains details about the card, pricing, information about its supported locations and other info. Pick one mastercard or visa card for a User from ISO 3166-1 alpha-2 country code ${countryCode}. The card must be allowed to be issued to their country and should be usable there. It must have status as ACTIVE. The exact amount they are going to pay is exactly ${amount} USD, not more or not less. Make sure the card is also available in this price range after checking all fees and discounts. Prefer tokenized card over non-tokenized card. Ignore all other cards that are not visa or mastercard.\nMust reply with an array [] that contains only the product IDs. Put the most suitable card first, and next suitable after that. If there is no suitable card for the user, just reply with an empty array. Do not write anything extra in the response.\n${JSON.stringify(allCards)}`;

  const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: "Bearer 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",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "deepseek/deepseek-r1:free",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!aiResponse.ok) {
    throw new Error(
      `Error from OpenRouterAI API: ${JSON.stringify({
        status: aiResponse.status,
        message: await aiResponse.json(),
      })}`
    );
  }

  const aiResponseJson = (await aiResponse.json()) as OpenRouterCardPromptResponse;
  console.log("aiResponseJson:", aiResponseJson);
  const suitableCards = await JSON.parse(aiResponseJson.choices[0].message.content);
  console.log("suitableCards:", suitableCards);

  if (suitableCards.length) {
    return allCards.find((card) => card.productId == suitableCards[0]);
  }

  return null;
}

function getEnvVars(ctx: Context) {
  return { isSandbox: { USE_RELOADLY_SANDBOX: ctx.env.USE_RELOADLY_SANDBOX } };
}
