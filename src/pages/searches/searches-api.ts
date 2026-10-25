import { baseApi } from "@/store/baseApi";

/**
 * What people search for on the marketplace (TradelyBackend modules/search,
 * admin with the "growth" section): the top searches, and the ones whose
 * latest attempt still found nothing.
 */
export interface SearchTerm {
  query: string;
  visitors: number;
  signedIn: number;
  lastResultCount: number;
  lastSearchedAt: string | null;
}

export interface SearchInsights {
  days: number;
  since: string;
  totals: { searches: number; visitors: number; noResults: number };
  top: SearchTerm[];
  noResults: SearchTerm[];
}

export const searchesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSearchInsights: builder.query<{ data: SearchInsights }, number>({
      query: (days) => ({ url: "/search/insights", params: { days } }),
    }),
  }),
});

export const { useGetSearchInsightsQuery } = searchesApi;
