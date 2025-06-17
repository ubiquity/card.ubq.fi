import { z } from "zod";
import { commonHeaders, getAccessToken, getReloadlyApiBaseUrl } from "./utils/shared";
import { Context, ReloadlyFailureResponse } from "./utils/types";
import { validateEnvVars, validateRequestMethod } from "./utils/validators";
import { ProductsResponse } from "../shared/types";

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
    console.log("length", (responseJson as ProductsResponse).content.length);

    if (responseJson) {
      return Response.json({ products: (responseJson as ProductsResponse).content }, { status: 200 });
    }
    return Response.json({ message: "There are no gift cards available." }, { status: 404 });
  } catch (error) {
    console.error("There was an error while processing your request.", error);
    return Response.json({ message: "There was an error while processing your request." }, { status: 500 });
  }
}
