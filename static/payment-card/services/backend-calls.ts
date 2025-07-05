import { Card } from "../../../shared/types/entity-types";
import { PostOrderParams } from "../../../shared/types/params-types";
import { ReloadlyOrderResponse } from "../../../shared/types/response-types";
import { getApiBaseUrl, requestInit } from "../utils";

export async function postOrder(params: PostOrderParams) {
  const url = `${getApiBaseUrl()}/post-order`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  if (response.status != 200) {
    return null;
  }

  return (await response.json()) as ReloadlyOrderResponse;
}
export async function getCards() {
  const retrieveCardsUrl = `${getApiBaseUrl()}/get-cards`;
  const cardsResponse = await fetch(retrieveCardsUrl, requestInit);
  const responseJson = await cardsResponse.json();

  if (cardsResponse.status == 200) {
    return responseJson.cards as Card[];
  }
  return [];
}
