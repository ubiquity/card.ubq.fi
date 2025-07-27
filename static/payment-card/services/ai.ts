import ct from "countries-and-timezones";
import { BigNumberish } from "ethers";
import { isCardAvailable } from "../../../shared/abis/helpers";
import { Card } from "../../../shared/types/entity-types";
import { OpenRouterCardPromptResponse } from "../types";
import { retry } from "@ubiquity-os/plugin-sdk/helpers";

declare const OPENROUTER_API_KEY: string;

export async function pickSuitableCards(cards: Card[], countryCode: string, amount: BigNumberish): Promise<Card | null> {
  const countryName = ct.getCountry(countryCode)?.name;
  if (!countryName) {
    throw new Error("Unable to detect your location to pick a suitable card.");
  }

  const filteredCards = cards.filter((card) => {
    return card.status === "ACTIVE" && isCardAvailable(card, amount);
  });

  if (filteredCards.length === 0) {
    throw new Error(`No cards are available for your permit amount.`);
  }

  const oldSuitableCards = localStorage.getItem("suitableCards");
  if (oldSuitableCards) {
    const oldCards: number[] = JSON.parse(oldSuitableCards);
    const pickedCard = filteredCards.find((card) => oldCards.includes(card.productId));
    if (pickedCard) {
      return pickedCard;
    }
  }

  const minInfoCards = filteredCards.map((card) => {
    return {
      productId: card.productId,
      productName: card.productName,
      global: card.global,
      brand: card.brand,
      country: card.country,
      redeemInstruction: card.redeemInstruction,
    };
  });

  console.log("filteredCards.length: ", filteredCards.length);
  console.log("country: ", countryName);
  console.log("minInfoCards.length", minInfoCards.length);

  const prompt = `Find a list of suitable payment cards offered by Reloadly (reloadly.com) from the JSON stringified array given below. It contains redeem instruction, supported locations and brand info about the card. Pick one mastercard or visa card for a User in country ${countryName}. The card must be allowed to be issued to their country and should be usable there. Prefer tokenized card over non-tokenized card. Ignore all other cards that are not visa or mastercard.\nMust reply with json type {productIds: number[]} that contains only the product IDs. Put the most suitable card first, and next suitable after that. If there is no suitable card for the user, just reply with an empty array {productIds: []}. Do not write anything extra in the response.\n${JSON.stringify(minInfoCards)}`;

  let suitableCards: number[] = [];
  try {
    suitableCards = await retry<number[]>(
      async () => {
        const aiResponse = await fetchAiResponse(prompt);
        try {
          const aiResponseJson = (await aiResponse.json()) as OpenRouterCardPromptResponse;
          console.log("aiResponseJson:", aiResponseJson);
          const content = JSON.parse(aiResponseJson.choices[0].message.content);
          suitableCards = content.productIds as number[];
          console.log("suitableCards:", suitableCards);
          return suitableCards;
        } catch (e) {
          console.error("Failed to get the expected response from AI:", e);
          throw new Error("Failed to get the expected response from AI. Please retry later.");
        }
      },
      {
        maxRetries: 5,
      }
    );
  } catch (e) {
    console.error("All AI model requests failed:", e);
    throw new Error("Failed to find a suitable card as AI rejected all requests. Please retry later.");
  }

  if (suitableCards && suitableCards.length) {
    localStorage.setItem("suitableCards", JSON.stringify(suitableCards));
    return cards.find((card) => card.productId === suitableCards[0]) || null;
  }

  return null;
}

async function fetchAiResponse(prompt: string): Promise<Response> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "deepseek/deepseek-r1-0528:free",
      models: ["deepseek/deepseek-r1:free", "deepseek/deepseek-v3-base:free", "google/gemini-2.0-flash-exp:free"],
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    console.error(`OpenRouterAI API request failed with status ${response.status}:`, await response.text());
    throw new Error(`OpenRouterAI API request failed with status ${response.status}`);
  }

  return response;
}
