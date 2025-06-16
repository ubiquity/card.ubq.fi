import { z } from "zod";
import { Context, ReloadlyFailureResponse } from "./utils/types";
import { validateEnvVars, validateRequestMethod } from "./utils/validators";
import { commonHeaders, getAccessToken, getReloadlyApiBaseUrl } from "./utils/shared";
import { OrderTransaction } from "../shared/types";

export const getMyCardsParams = z.object({
  transactionIds: z.string().transform((str) =>
    str
      .split(",")
      .map(Number)
      .filter((id) => !isNaN(id))
  ), // Converts "1,2,3" to [1, 2, 3]
});
export interface AccessTokenResponse {
  token: string;
  isSandbox: boolean;
}

export async function onRequest(ctx: Context): Promise<Response> {
  try {
    const transactionIds = await validateAndExtractTransactionIds(ctx);
    const accessToken = await authenticateReloadly(ctx.env);
    const reloadlyApiBaseUrl = getReloadlyApiBaseUrl(accessToken.isSandbox);

    const { foundTransactions, failedFetches } = await fetchIndividualTransactions(transactionIds, accessToken, reloadlyApiBaseUrl);

    return buildFinalResponse(foundTransactions, failedFetches);
  } catch (error) {
    console.error("There was an error while processing your request:", error);
    // Handle specific error messages based on what's thrown by helper functions
    let status = 500;
    let message = "There was an error while processing your request.";
    let errorCode: string | null = null;

    if (error.message.includes("Invalid parameters")) {
      status = 400;
      message = error.message;
    } else if (error.message.includes("No valid transaction IDs provided")) {
      status = 404; // Consistent with prior behavior for no IDs
      message = error.message;
    } else if (error.message.includes("Full authentication is required")) {
      status = 401;
      message = error.message;
      errorCode = "INVALID_TOKEN";
    }

    return Response.json({ message: message, errorCode: errorCode, details: error.message || String(error) }, { status: status });
  }
}

async function validateAndExtractTransactionIds(ctx: Context): Promise<number[]> {
  validateEnvVars(ctx);
  validateRequestMethod(ctx.request.method, "GET");

  const { searchParams } = new URL(ctx.request.url);
  const result = getMyCardsParams.safeParse({
    transactionIds: searchParams.get("transactionIds"),
  });

  if (!result.success) {
    throw new Error(`Invalid parameters: ${JSON.stringify(result.error.errors)}`);
  }

  const { transactionIds } = result.data;
  if (transactionIds.length === 0) {
    throw new Error("No valid transaction IDs provided.");
  }
  return transactionIds;
}

/**
 * Authenticates with Reloadly and returns the access token.
 * Throws an error if authentication fails.
 */
async function authenticateReloadly(env: Context["env"]): Promise<AccessTokenResponse> {
  const accessToken = await getAccessToken(env);
  if (!accessToken || !accessToken.token) {
    throw new Error("Full authentication is required to access this resource");
  }
  return accessToken;
}

/**
 * Fetches individual transactions from Reloadly API using Promise.allSettled.
 * Returns an object containing successfully found transactions and any failed fetches.
 */
async function fetchIndividualTransactions(
  transactionIds: number[],
  accessToken: AccessTokenResponse,
  reloadlyApiBaseUrl: string
): Promise<{ foundTransactions: OrderTransaction[]; failedFetches: { id: number; status: string; message: string }[] }> {
  console.log(`Attempting to retrieve individual gift cards for IDs: ${transactionIds.join(", ")} from Reloadly API`);

  const fetchPromises = transactionIds.map((id) => {
    const url = `${reloadlyApiBaseUrl}/reports/transactions/${id}`;
    console.log(`Fetching transaction ${id} from ${url}`);
    return fetch(url, {
      method: "GET",
      headers: {
        ...commonHeaders,
        Authorization: `Bearer ${accessToken.token}`,
      },
    });
  });

  const results = await Promise.allSettled(fetchPromises);

  const foundTransactions: OrderTransaction[] = [];
  const failedFetches: { id: number; status: string; message: string }[] = [];

  for (let i = 0; i < results.length; i++) {
    const transactionId = transactionIds[i];
    const result = results[i];

    if (result.status === "fulfilled") {
      const response = result.value;
      const responseJson = await response.json();

      if (response.ok) {
        foundTransactions.push(responseJson as OrderTransaction);
      } else {
        const errorMessage = (responseJson as ReloadlyFailureResponse).message || "Unknown error";
        failedFetches.push({ id: transactionId, status: response.status.toString(), message: errorMessage });
        console.warn(`Failed to retrieve transaction ${transactionId} (Status: ${response.status}): ${errorMessage}`);
      }
    } else {
      failedFetches.push({ id: transactionId, status: "Network Error", message: result.reason.message || "Unknown network error" });
      console.error(`Network error for transaction ${transactionId}:`, result.reason);
    }
  }
  return { foundTransactions, failedFetches };
}

/**
 * Handles the final response based on the fetched transactions and any failures.
 * Returns a Response object with appropriate status and body.
 */
function buildFinalResponse(foundTransactions: OrderTransaction[], failedFetches: { id: number; status: string; message: string }[]): Response {
  if (foundTransactions.length === 0) {
    let message = "No gift cards found with the given transaction IDs in Reloadly API response.";
    if (failedFetches.length > 0) {
      message += ` (Failed to retrieve ${failedFetches.length} transactions)`;
    }
    return Response.json({ message: message, timeStamp: new Date().toISOString(), failedTransactions: failedFetches }, { status: 404 });
  }

  console.log("Successfully retrieved and aggregated transactions:", foundTransactions);
  if (failedFetches.length > 0) {
    console.warn("Some transactions could not be retrieved:", failedFetches);
  }

  return Response.json(foundTransactions, { status: 200 });
}
