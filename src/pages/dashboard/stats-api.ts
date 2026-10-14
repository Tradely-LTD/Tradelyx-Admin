import { baseApi } from "@/store/baseApi";
import { Methods } from "@/utils/enums";

interface AgentStatsResponse {
  success: boolean;
  data?: {
    totalReferredUser: number;
    totalSellers: number;
    sellersWithoutKyc: number;
    verifiedReferrals: number;
    referalCode: string | null;
  };
  message?: string;
  error?: string;
}

/** GET /stats/countries: people per country ("Not set": none given), biggest first */
export interface CountryCount {
  country: string;
  users: number;
  buyers: number;
  sellers: number;
  joinedLast30: number;
}

export const statsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getStats: builder.query({
      query: () => {
        return {
          url: `stats`,
          method: Methods.Get,
        };
      },
    }),
    getAgentStats: builder.query<AgentStatsResponse, void>({
      query: () => ({
        url: `referrals/stats`,
      }),
    }),
    getStatsChart: builder.query({
      query: () => {
        return {
          url: `stats/chart`,
          method: Methods.Get,
        };
      },
    }),
    getUsersByCountry: builder.query<CountryCount[], void>({
      query: () => ({ url: `stats/countries` }),
      transformResponse: (r: { data: CountryCount[] }) => r.data,
      providesTags: ["USERS"],
    }),
  }),
});

export const { useGetStatsQuery, useGetAgentStatsQuery, useGetStatsChartQuery, useGetUsersByCountryQuery } = statsApi;
