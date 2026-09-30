import { baseApi } from "@/store/baseApi";
import { Methods } from "@/utils/enums";
import type { SegmentKey } from "../outreach/outreach-api";

/**
 * Staff broadcasts (TradelyBackend notifications/broadcast.ts): an inbox
 * notification plus a phone push, to one audience, optionally opening a
 * TradelyX page when tapped.
 */
export interface Broadcast {
  title: string | null;
  message: string | null;
  thumbnail: string | null;
  path: string | null;
  sentAt: string | null;
  recipients: number;
  read: number;
}

export interface BroadcastDraft {
  title: string;
  message: string;
  segment: SegmentKey;
  path?: string | null;
}

export const LIMITS = { title: 80, message: 240 } as const;

export const notificationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getBroadcasts: builder.query<{ data: Broadcast[]; pagination: { total: number; totalPages: number } }, { page: number; limit: number }>({
      query: (params) => ({ url: "/notifications/broadcasts", params }),
      providesTags: ["NOTIFICATIONS"],
    }),
    getBroadcastAudience: builder.query<{ people: number; withApp: number }, SegmentKey>({
      query: (segment) => ({ url: "/notifications/broadcast/audience", params: { segment } }),
      transformResponse: (r: { data: { people: number; withApp: number } }) => r.data,
    }),
    // Errors are shown by the caller, next to the form
    sendBroadcast: builder.mutation<{ message: string; data: { people: number; pushed: number } }, BroadcastDraft>({
      query: (body) => ({ url: "/notifications/broadcast", method: Methods.Post, body }),
      invalidatesTags: ["NOTIFICATIONS", "ACTIVITY"],
    }),
  }),
});

export const { useGetBroadcastsQuery, useGetBroadcastAudienceQuery, useSendBroadcastMutation } = notificationApi;
