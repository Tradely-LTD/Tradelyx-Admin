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
  }),
});

export const { useGetStatsQuery, useGetAgentStatsQuery, useGetStatsChartQuery } = statsApi;
