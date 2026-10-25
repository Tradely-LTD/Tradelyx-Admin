import { toast } from "react-toastify";

import { baseApi } from "@/store/baseApi";
import { Methods } from "@/utils/enums";

/**
 * The Referrer reward for staff (TradelyBackend modules/referralRewards):
 * ₦500 when someone a referrer brought in passes KYC. Growth reviews each
 * reward; finance pays referrers by bank transfer once they're owed the
 * minimum. Not Agent commission (pages/agents).
 */
export type RewardStatus = "pending" | "held" | "approved" | "rejected" | "paid";
export type RewardFilter = "review" | RewardStatus;

export interface Reward {
  id: string;
  status: RewardStatus;
  amount: number;
  currency: string;
  holdReason: string | null;
  rejectionReason: string | null;
  createdAt: string | null;
  paidAt: string | null;
  referrer: { id: string; name: string | null; phone: string | null };
  referred: { id: string; name: string | null; joinedAt: string | null };
}

export interface PayoutDue {
  referrerId: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  amount: number;
  rewards: number;
  bank: { bankCode: string | null; accountName: string | null; accountNumber: string | null } | null;
}

type ApiFailure = { error?: { data?: { message?: string; error?: string } } };

const fail = (err: unknown, fallback: string) => {
  const body = (err as ApiFailure)?.error?.data;
  toast.error(body?.message || body?.error || fallback, { position: "top-right" });
};

const action = (success: string, fallback: string) =>
  async function onQueryStarted(_: unknown, { queryFulfilled }: { queryFulfilled: Promise<unknown> }) {
    try {
      await queryFulfilled;
      toast.success(success, { position: "top-right" });
    } catch (err) {
      fail(err, fallback);
    }
  };

export const rewardsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getRewards: builder.query<{ data: Reward[]; pagination: { total: number; totalPages: number } }, { status: RewardFilter; page: number }>({
      query: ({ status, page }) => ({ url: "/referrals/admin/rewards", params: { status, page, limit: 25 } }),
      providesTags: ["REFERRALS"],
    }),
    approveReward: builder.mutation<unknown, string>({
      query: (id) => ({ url: `/referrals/admin/rewards/${id}/approve`, method: Methods.Post }),
      invalidatesTags: ["REFERRALS", "ACTIVITY"],
      onQueryStarted: action("Reward approved", "Could not approve"),
    }),
    rejectReward: builder.mutation<unknown, { id: string; reason: string }>({
      query: ({ id, reason }) => ({ url: `/referrals/admin/rewards/${id}/reject`, method: Methods.Post, body: { reason } }),
      invalidatesTags: ["REFERRALS", "ACTIVITY"],
      onQueryStarted: action("Reward rejected", "Could not reject"),
    }),
    getPayoutsDue: builder.query<{ data: PayoutDue[]; minimumPayout: number }, void>({
      query: () => ({ url: "/referrals/admin/payouts/due" }),
      providesTags: ["REFERRALS"],
    }),
    payReferrer: builder.mutation<unknown, { referrerId: string; reference: string; note?: string }>({
      query: (body) => ({ url: "/referrals/admin/payouts", method: Methods.Post, body }),
      invalidatesTags: ["REFERRALS", "ACTIVITY"],
      onQueryStarted: action("Payout recorded", "Could not record the payout"),
    }),
  }),
});

export const { useGetRewardsQuery, useApproveRewardMutation, useRejectRewardMutation, useGetPayoutsDueQuery, usePayReferrerMutation } = rewardsApi;
