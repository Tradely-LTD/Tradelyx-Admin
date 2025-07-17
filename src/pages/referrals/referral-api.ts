import { toast } from "react-toastify";
import { baseApi } from "@/store/baseApi";
import { Methods } from "@/utils/enums";

interface ReferredUser {
  id: string;
  referalCode: string;
  firstName: string;
  lastName: string;
  email: string;
  isVerified: boolean;
  createdAt: string;
}

interface ReferralResponse {
  success: boolean;
  referralCode: string;
}

interface ReferralStatsResponse {
  success: boolean;
  data: {
    totalReferredUser: number;
    verifiedReferrals: number;
    referalCode: string;
    sellersWithoutKyc: number;
    totalSellers: number;
  };
}

interface ReferralsResponse {
  data: ReferredUser[];
  pagination: {
    total: number;
    currentPage: number;
    totalPages: number;
    hasMore: boolean;
  };
}

interface GetReferralsQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export const referralApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getUserReferralCode: builder.query<ReferralResponse, void>({
      query: () => ({
        url: "/referrals/code",
        method: Methods.Get,
      }),
      providesTags: ["REFERRALS"],
    }),

    getReferralStats: builder.query<ReferralStatsResponse, void>({
      query: () => ({
        url: "/referrals/dashboard/stats",
        method: Methods.Get,
      }),
      providesTags: ["REFERRALS"],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await queryFulfilled;
        } catch (err: any) {
          const errorMessage = err?.error?.data?.error || "Failed to fetch referral stats";
          toast.error(errorMessage, {
            position: "top-right",
          });
        }
      },
    }),

    getReferrals: builder.query<ReferralsResponse, GetReferralsQueryParams>({
      query: (params) => ({
        url: "/referrals/dashboard",
        method: Methods.Get,
        params,
      }),
      providesTags: ["REFERRALS"],
    }),

    getReferral: builder.query<ReferredUser, { id: string }>({
      query: ({ id }) => ({
        url: `/referrals/${id}`,
        method: Methods.Get,
      }),
      providesTags: ["REFERRALS"],
    }),
  }),
});

export const {
  useGetUserReferralCodeQuery,
  useGetReferralStatsQuery,
  useGetReferralsQuery,
  useGetReferralQuery,
} = referralApi;
