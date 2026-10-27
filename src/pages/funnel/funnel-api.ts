import { baseApi } from "@/store/baseApi";

/**
 * The funnel and the weekly pulse (TradelyBackend modules/insights, admin and
 * country admin with the growth section).
 */
export interface FunnelWeek {
  /** Monday the sign-up week starts, YYYY-MM-DD (UTC) */
  weekStart: string;
  signups: number;
  sellers: number;
  kyc: number;
  requested: number;
  quoted: number;
  paid: number;
  released: number;
}

export type Money = { currency: string; amount: number };

export interface PulseNumbers {
  signups: number;
  signupBuyers: number;
  signupSellers: number;
  kycApproved: number;
  requests: number;
  quotes: number;
  paidOrders: number;
  paidValue: Money[];
  released: number;
  topCategories: { category: string; requests: number }[];
  unquotedRequests: number;
  emptySearches: { query: string; people: number }[];
}

export interface Pulse {
  week: string;
  startsAt: string;
  endsAt: string;
  current: PulseNumbers;
  previous: PulseNumbers;
  hotBuyers: number;
}

export const funnelApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getFunnel: builder.query<{ data: FunnelWeek[]; weeks: number }, number>({
      query: (weeks) => ({ url: "/insights/funnel", params: { weeks } }),
    }),
    getPulse: builder.query<{ data: Pulse }, void>({
      query: () => ({ url: "/insights/pulse" }),
    }),
  }),
});

export const { useGetFunnelQuery, useGetPulseQuery } = funnelApi;
