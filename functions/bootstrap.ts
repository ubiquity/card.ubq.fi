import { z } from "zod";
import { commonHeaders, getAccessToken, getReloadlyApiBaseUrl } from "./utils/shared";
import { AccessToken, Context, ReloadlyFailureResponse } from "./utils/types";
import { validateEnvVars, validateRequestMethod } from "./utils/validators";
import { GiftCard, GiftCardsResponse } from "../shared/types";
import { intlPaymentCardsList, isGeoRestricted } from "../shared/allowed-country-list";

export const getPaginationSchema = z.object({
  page: z.string(),
  productName: z.string().optional(),
  countryCode: z.string(),
  productCategoryId: z.coerce.number(),
});

export async function onRequest(ctx: Context): Promise<Response> {
  try {
    validateEnvVars(ctx);
    validateRequestMethod(ctx.request.method, "GET");

    const { searchParams } = new URL(ctx.request.url);
    const result = getPaginationSchema.safeParse({
      page: searchParams.get("page"),
      productName: searchParams.get("productName"),
      countryCode: searchParams.get("countryCode"),
      productCategoryId: searchParams.get("productCategoryId"),
    });
    if (!result.success) {
      throw new Error(`Invalid parameters: ${JSON.stringify(result.error.errors)}`);
    }
    const { productName, countryCode, productCategoryId } = result.data;
    const accessToken = await getAccessToken(ctx.env);

    const giftCardsResponse = await getCards(accessToken, productCategoryId, countryCode, productName);
    const cards = (giftCardsResponse as GiftCardsResponse).content;

    //load international cards for non US countries
    let intlCards: GiftCard[] = [];
    if (countryCode != "US" && productCategoryId == 1) {
      const usCardsResponse = await getCards(accessToken, 1, "US", productName);
      const usCards = (usCardsResponse as GiftCardsResponse).content;
      const intlCardsIds = Object.keys(intlPaymentCardsList);
      intlCards = usCards.filter((usCard) => {
        return intlCardsIds.includes(usCard.productId.toString()) && !isGeoRestricted(usCard.productId, countryCode);
      });
    }

    const availableCards = mergeGiftCardArrays(cards, intlCards);
    console.log("availableCards", availableCards);

    if (giftCardsResponse) {
      return Response.json({ products: availableCards }, { status: 200 });
    }
    return Response.json({ message: "There are no gift cards available." }, { status: 404 });
  } catch (error) {
    console.error("There was an error while processing your request.", error);
    return Response.json({ message: "There was an error while processing your request." }, { status: 500 });
  }
}

export async function getCards(accessToken: AccessToken, productCategoryId: number, countryCode: string, productName: string) {
  const url = `${getReloadlyApiBaseUrl(accessToken.isSandbox)}/products?includeFixed=false&productCategoryId=${productCategoryId}&countryCode=${countryCode}&productName=${productName}`;
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
  console.log("length", (responseJson as GiftCardsResponse).content.length);
  return responseJson;
}

function mergeGiftCardArrays(cards: GiftCard[], intlCards: GiftCard[]): GiftCard[] {
  // Create a Set to store productIds from the 'cards' array for efficient lookup
  const cardProductIds = new Set<number>();
  cards.forEach((card) => cardProductIds.add(card.productId));

  // Start with all items from the 'cards' array
  const mergedCards: GiftCard[] = [...cards];

  // Iterate through intlCards and add only those not present in 'cards'
  intlCards.forEach((intlCard) => {
    if (!cardProductIds.has(intlCard.productId)) {
      mergedCards.push(intlCard);
    }
  });

  return mergedCards;
}
