export interface OrderedProduct {
  productId: number;
  productName: string;
  countryCode: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  currencyCode: string;
  brand: {
    brandId: number;
    brandName: string;
  };
}

export interface Order {
  transactionId: number;
  amount: number;
  discount: number;
  currencyCode: string;
  fee: number;
  recipientEmail: string;
  customIdentifier: string;
  status: string;
  product: OrderedProduct;
  smsFee: number;
  recipientPhone: number;
  transactionCreatedTime: string; //"2022-02-28 13:46:00",
  preOrdered: boolean;
}

export interface OrderTransaction {
  transactionId: number;
  amount: number;
  discount: number;
  currencyCode: string;
  fee: number;
  recipientEmail: string;
  customIdentifier: string;
  status: string;
  product: OrderedProduct;
  smsFee: number;
  recipientPhone: number;
  transactionCreatedTime: string; //"2022-02-28 13:46:00",
  preOrdered: boolean;
}

export interface RedeemCode {
  cardNumber: string;
  pinCode: string;
}

export interface ExchangeRate {
  senderCurrency: string;
  senderAmount: number;
  recipientCurrency: string;
  recipientAmount: number;
}

export interface PriceToValueMap {
  [key: string]: number;
}
export interface ValueToPriceMap {
  [key: string]: number;
}

export interface ProductsResponse {
  content: GiftCard[];
}

export interface GiftCard {
  productId: number;
  productName: string;
  global: boolean;
  status: "ACTIVE" | "INACTIVE"; // Assuming status can be 'ACTIVE' or 'INACTIVE'
  supportsPreOrder: boolean;
  senderFee: number;
  senderFeePercentage: number;
  discountPercentage: number;
  denominationType: "FIXED" | "RANGE"; // Assuming denominationType can be 'FIXED' or 'RANGE'
  recipientCurrencyCode: string;
  minRecipientDenomination: number | null;
  maxRecipientDenomination: number | null;
  senderCurrencyCode: string;
  minSenderDenomination: number | null;
  maxSenderDenomination: number | null;
  fixedRecipientDenominations: number[];
  fixedSenderDenominations: number[];
  fixedRecipientToSenderDenominationsMap: {
    [key: string]: number;
  };
  metadata: Record<string, never>; // Assuming metadata is an empty object
  logoUrls: string[];
  brand: Brand;
  category: Category;
  country: Country;
  redeemInstruction: RedeemInstruction;
  additionalRequirements: AdditionalRequirements;
}

export interface Brand {
  brandId: number;
  brandName: string;
}

export interface Category {
  id: number;
  name: string;
}

export interface Country {
  isoName: string;
  name: string;
  flagUrl: string;
}

export interface RedeemInstruction {
  concise: string;
  verbose: string;
}

export interface AdditionalRequirements {
  userIdRequired: boolean;
}
