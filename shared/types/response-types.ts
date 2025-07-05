import { Card, Order, OrderTransaction, RedeemCode } from "./entity-types";

export interface ReloadlyAuthResponse {
  access_token: string;
  scope: string;
  expires_in: number;
  token_type: string;
}

export interface ReloadlyListCardResponse {
  content: Card[];
  pageable: {
    sort: {
      sorted: boolean;
      unsorted: boolean;
      empty: boolean;
    };
    pageNumber: number;
    pageSize: number;
    offset: number;
    unpaged: boolean;
    paged: boolean;
  };
  totalElements: number;
  totalPages: number;
  last: boolean;
  first: boolean;
  sort: {
    sorted: boolean;
    unsorted: boolean;
    empty: boolean;
  };
  numberOfElements: number;
  size: number;
  number: number;
  empty: boolean;
}

export interface CardsResponse {
  content: Card[];
}

export interface ReloadlyOrderResponse extends Order {}
export interface ReloadlyGetTransactionResponse {
  content: OrderTransaction[];
  pageable: {
    sort: { sorted: boolean; unsorted: boolean; empty: boolean };
    pageNumber: number;
    pageSize: number;
    offset: number;
    unpaged: boolean;
    paged: boolean;
  };
  totalElements: number;
  totalPages: number;
  last: boolean;
  first: boolean;
  sort: { sorted: boolean; unsorted: boolean; empty: boolean };
  numberOfElements: number;
  size: number;
  number: number;
  empty: boolean;
}

export type ReloadlyRedeemCodeResponse = RedeemCode[];

export interface ReloadlyFailureResponse {
  timeStamp: string;
  message: string;
  path: string;
  errorCode: string;
  infoLink?: string;
  details: [];
}
