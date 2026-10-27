import { toast } from "react-toastify";

import { baseApi } from "@/store/baseApi";
import { Methods } from "@/utils/enums";

/**
 * Unfinished signups and website visits (TradelyBackend modules/signups and
 * modules/visits; admin and country admin with the growth section).
 */
export type SignupStage = "form" | "email";

export interface UnfinishedSignup {
  stage: SignupStage;
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: string;
  startedAt: string;
  remindersSent: number;
  codesSent: number | null;
  unsubscribed: boolean;
  expiresAt: string | null;
  prospectId: string | null;
}

export interface SignupWeek {
  weekStart: string;
  started: number;
  form: number;
  completed: number;
}

export interface VisitWeek {
  weekStart: string;
  visitors: number;
  newVisitors: number;
  signedIn: number;
  started: number;
  completed: number;
}

export type Breakdown = { key: string; visitors: number }[];

export interface VisitSummary {
  totals: { visitors: number; visits: number };
  weekly: VisitWeek[];
  sources: Breakdown;
  devices: Breakdown;
  pages: Breakdown;
  campaigns: Breakdown;
}

type ApiFailure = { error?: { data?: { message?: string; error?: string } } };

export const growthApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getUnfinishedSignups: builder.query<{ data: UnfinishedSignup[]; counts: Record<SignupStage, number>; weekly: SignupWeek[] }, void>({
      query: () => ({ url: "/signups/admin/unfinished" }),
      providesTags: ["PROSPECTS"],
    }),
    addSignupToProspects: builder.mutation<unknown, { stage: SignupStage; id: string }>({
      query: ({ stage, id }) => ({ url: `/signups/admin/unfinished/${stage}/${id}/prospect`, method: Methods.Post }),
      invalidatesTags: ["PROSPECTS"],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await queryFulfilled;
          toast.success("Added to Prospects", { position: "top-right" });
        } catch (err) {
          const body = (err as ApiFailure)?.error?.data;
          toast.error(body?.message || body?.error || "Could not add to Prospects", { position: "top-right" });
        }
      },
    }),
    getVisitSummary: builder.query<{ data: VisitSummary; days: number }, number>({
      query: (days) => ({ url: "/visits/admin/summary", params: { days } }),
    }),
  }),
});

export const { useGetUnfinishedSignupsQuery, useAddSignupToProspectsMutation, useGetVisitSummaryQuery } = growthApi;
