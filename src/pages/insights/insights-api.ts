import { toast } from "react-toastify";

import { baseApi } from "@/store/baseApi";
import { Methods } from "@/utils/enums";

/**
 * Sales insights (TradelyBackend modules/insights, admin and country admin
 * with the growth section): buyers scored by what they did in the last 30
 * days, and what's wanted on the marketplace that nobody is supplying.
 */
export type IntentLabel = "hot" | "warm" | "cold";

export interface LikelyBuyer {
  userId: string;
  name: string;
  company: string | null;
  phone: string | null;
  email: string | null;
  lastActiveAt: string | null;
  lookingFor: string | null;
  score: number;
  label: IntentLabel;
  /** Plain-language reasons behind the score, e.g. "Has quotes waiting, not paid" */
  reasons: string[];
}

export interface Demand {
  categories: { category: string; requests: number; buyers: number; quoted: number; unquoted: number }[];
  countries: { country: string; requests: number }[];
  emptySearches: { query: string; people: number }[];
  unquotedRequests: { id: string; title: string; category: string; createdAt: string }[];
}

type ApiFailure = { error?: { data?: { message?: string; error?: string } } };

export const insightsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getLikelyBuyers: builder.query<{ data: LikelyBuyer[]; counts: Record<IntentLabel, number> }, IntentLabel>({
      query: (label) => ({ url: "/insights/buyers", params: { label } }),
      providesTags: ["PROSPECTS"],
    }),
    getDemand: builder.query<{ data: Demand; days: number }, number>({
      query: (days) => ({ url: "/insights/demand", params: { days } }),
    }),
    // Same call list as the Calls page (TradelyBackend modules/salesTasks)
    addBuyerCall: builder.mutation<unknown, { subjectUserId: string; title: string; context?: string }>({
      query: (body) => ({ url: "/sales-tasks", method: Methods.Post, body }),
      invalidatesTags: ["PROSPECTS"],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await queryFulfilled;
          toast.success("Added to today's calls", { position: "top-right" });
        } catch (err) {
          const body = (err as ApiFailure)?.error?.data;
          toast.error(body?.message || body?.error || "Could not add the call", { position: "top-right" });
        }
      },
    }),
  }),
});

export const { useGetLikelyBuyersQuery, useGetDemandQuery, useAddBuyerCallMutation } = insightsApi;
