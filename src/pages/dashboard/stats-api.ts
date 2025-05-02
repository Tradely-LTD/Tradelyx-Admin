import { baseApi } from "@/store/baseApi";
import { Methods } from "@/utils/enums";

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

export const { useGetStatsQuery, useGetStatsChartQuery } = statsApi;
