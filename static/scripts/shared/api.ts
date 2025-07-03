import { ReloadlyOrderResponse } from "../../../functions/utils/types";
import { PostOrderParams } from "../../../shared/api-types";
import { getApiBaseUrl } from "../rewards/gift-cards/helpers";

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
