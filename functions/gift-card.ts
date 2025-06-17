import { z } from "zod";
import { commonHeaders, getAccessToken, getReloadlyApiBaseUrl } from "./utils/shared";
import { Context, ReloadlyFailureResponse } from "./utils/types";
import { validateEnvVars, validateRequestMethod } from "./utils/validators";

export const getGiftCardParams = z.object({
  sku: z.coerce.number(),
});

export async function onRequest(ctx: Context): Promise<Response> {
  try {
    validateEnvVars(ctx);
    validateRequestMethod(ctx.request.method, "GET");

    const { searchParams } = new URL(ctx.request.url);
    const result = getGiftCardParams.safeParse({
      sku: searchParams.get("sku"),
    });
    if (!result.success) {
      throw new Error(`Invalid parameters: ${JSON.stringify(result.error.errors)}`);
    }
    const { sku } = result.data;

    const accessToken = await getAccessToken(ctx.env);

    const url = `${getReloadlyApiBaseUrl(accessToken.isSandbox)}/products/${sku}`; //&productCategoryId=1
    console.log(`Retrieving gift card from ${url}`);
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
    console.log("length", responseJson);

    if (responseJson) {
      return Response.json(responseJson, { status: 200 });
    }
    return Response.json({ message: "No gift card found with given SKU." }, { status: 404 });
  } catch (error) {
    console.error("There was an error while processing your request.", error);
    return Response.json({ message: "There was an error while processing your request." }, { status: 500 });
  }
}
