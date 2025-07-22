import { BigNumber, BigNumberish } from "ethers";
import { formatEther, parseEther } from "ethers/lib/utils";
import { ubiquityDollarChainAddresses } from "./constants";
import { Card } from "./types/entity-types";

interface PriceToValueMap {
  [key: string]: number;
}
/**
 * PRICE OF A GIFT CARD
 * ====================
 * Price of a gift card is the amount that a user must pay to get the gift card.
 * It includes fees and discounts. It is always in USD. No field in the Reloadly API
 * provides exact price of gift card. It must be calculated manually from value of card, fees, and discount.
 * price = value + percent discount of value - senderFee - percentFee of value
 *
 * VALUE OF A GIFT CARD
 * ====================
 * Value of a gift is the amount that is available within the gift card.
 * It can be in any currency.
 *
 * For fixed price gift cards, the value is provided by following fields.
 * Elements of GiftCard.fixedRecipientDenominations[]
 * Keys of GiftCard.fixedRecipientToSenderDenominationsMap {}[]
 * value = price - percent discount of value + senderFee + percentFee of value
 *
 * For ranged price gift cards, the value is any amount between the following fields.
 * GiftCard.minRecipientDenomination
 * GiftCard.maxRecipientDenomination
 *
 * Following fields are the equivalent of available values range in our account currency (USD).
 * GiftCard.minSenderDenomination
 * GiftCard.maxSenderDenomination
 * Values of GiftCard.fixedRecipientToSenderDenominationsMap{}[]
 */

export function isClaimableForAmount(card: Card, rewardAmount: BigNumberish) {
  if (card.senderCurrencyCode !== "USD") {
    throw new Error(`Failed to validate price because gift card's senderCurrencyCode is not USD: ${JSON.stringify({ rewardAmount, card })}`);
  }

  if (card.denominationType === "RANGE") {
    return isRangePriceCardClaimable(card, rewardAmount);
  } else if (card.denominationType === "FIXED") {
    return isFixedPriceCardClaimable(card, rewardAmount);
  }
}

export function getEstimatedExchangeRate(card: Card) {
  let exchangeRate = 1;
  if (card.recipientCurrencyCode !== "USD") {
    if (card.denominationType === "FIXED") {
      const key = Object.keys(card.fixedRecipientToSenderDenominationsMap)[0];
      exchangeRate = card.fixedRecipientToSenderDenominationsMap[key] / Number(key);
    } else {
      exchangeRate = card.minSenderDenomination / card.minRecipientDenomination;
    }
  }
  return exchangeRate;
}

export function getTotalPriceOfValue(value: number, card: Card) {
  const exchangeRate = getEstimatedExchangeRate(card);
  const usdValue = parseEther((exchangeRate * value).toString());

  // multiply by extra 100 to support minimum upto 0.01%
  // because we are using BigNumbers
  const feePercentage = BigNumber.from((card.senderFeePercentage * 100).toString());
  const fee = usdValue.mul(feePercentage).div(100 * 100);
  const totalFee = fee.add(parseEther(card.senderFee.toString()));
  const discountPercent = BigNumber.from(Math.trunc(card.discountPercentage * 100).toString());
  const discount = usdValue.mul(discountPercent).div(100 * 100);

  return Number(formatEther(usdValue.add(totalFee).sub(discount)));
}

export function getUsdValueForRangePrice(card: Card, price: BigNumberish) {
  // price = value + senderFee + feePercent - discountPercent
  const priceWei = BigNumber.from(price.toString());
  const priceAfterFee = priceWei.sub(parseEther(card.senderFee.toString()));

  const feeDiscountPercentDiff = card.senderFeePercentage - card.discountPercentage;
  // multiply by extra 100 to support minimum upto 0.01%
  // because we are using BigNumbers
  const feeDiscountPercentDiffWei = parseEther(Math.trunc(feeDiscountPercentDiff * 100).toString());
  const hundredPercent = parseEther((100 * 100).toString());
  const priceWithAddedPercentFromFees = hundredPercent.add(feeDiscountPercentDiffWei);
  const usdValue = hundredPercent.mul(priceAfterFee).div(priceWithAddedPercentFromFees);
  return Number(formatEther(usdValue));
}

export function isRangePriceCardClaimable(card: Card, rewardAmount: BigNumberish) {
  const value = getCardValue(card, rewardAmount);
  return value >= card.minRecipientDenomination && value <= card.maxRecipientDenomination;
}

export function getFixedPriceToValueMap(card: Card) {
  const valueToPriceMap = card.fixedRecipientToSenderDenominationsMap;

  const priceToValueMap: PriceToValueMap = {};
  Object.keys(valueToPriceMap).forEach((value) => {
    const totalPrice = getTotalPriceOfValue(Number(value), card);
    priceToValueMap[totalPrice.toFixed(2).toString()] = Number(value);
  });

  return priceToValueMap;
}

export function isFixedPriceCardClaimable(card: Card, rewardAmount: BigNumberish) {
  const priceToValueMap = getFixedPriceToValueMap(card);
  const priceAsKey = Number(formatEther(rewardAmount)).toFixed(2).toString();
  return !!priceToValueMap[priceAsKey];
}

export function getCardValue(card: Card, reward: BigNumberish, exchangeRate?: number) {
  let cardValue;
  const amountDaiEth = Number(formatEther(reward)).toFixed(2);
  if (card.denominationType === "FIXED") {
    const priceToValueMap = getFixedPriceToValueMap(card);
    cardValue = priceToValueMap[amountDaiEth];
  } else if (card.denominationType === "RANGE") {
    const usdValue = getUsdValueForRangePrice(card, reward);
    if (!exchangeRate) {
      exchangeRate = getEstimatedExchangeRate(card);
    }
    cardValue = usdValue / exchangeRate;
  } else {
    throw new Error(
      `Unknown denomination type of gift card: ${JSON.stringify({
        denominationType: card.denominationType,
      })}`
    );
  }
  const value = Math.floor(cardValue * 100) / 100;
  return value < 0 ? 0 : value;
}

export function isClaimableForToken(tokenAddress: string, chainId: number): boolean {
  return tokenAddress.toLowerCase() === ubiquityDollarChainAddresses[chainId].toLowerCase();
}
