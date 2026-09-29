import { baseApi } from "@/store/baseApi";

/**
 * The staff activity log (TradelyBackend modules/activity, admin only):
 * who verified, approved, edited, removed or sent what, and when.
 */
export interface StaffAction {
  id: string;
  action: string;
  targetType: "product" | "sell_offer" | "user" | "certification" | "campaign" | "notification";
  targetId: string | null;
  summary: string;
  details: Record<string, unknown> | null;
  createdAt: string;
  actorId: string;
  actorRole: string | null;
  actorName: string | null;
}

export type ActivityQuery = { page?: number; limit?: number; targetType?: string; targetId?: string; actorId?: string; action?: string };

export const activityApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getActivity: builder.query<{ data: StaffAction[]; pagination: { total: number; totalPages: number } }, ActivityQuery>({
      query: (params) => ({ url: "/admin/activity", params }),
      providesTags: ["ACTIVITY"],
    }),
  }),
});

export const { useGetActivityQuery } = activityApi;
