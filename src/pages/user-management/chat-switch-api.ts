import { toast } from "react-toastify";

import { baseApi } from "@/store/baseApi";
import { Methods } from "@/utils/enums";

/**
 * The per-person chat switch (TradelyBackend chat/restrictions.ts, staff with
 * the People section). Off: the person can't send messages and nobody can
 * message them; their conversations stay readable.
 */
export interface ChatState {
  disabled: boolean;
  reason: string | null;
  at: string | null;
  by: string | null;
}

type ApiFailure = { error?: { data?: { message?: string; error?: string } } };
const toastResult = (success: string, fallback: string) =>
  async function onQueryStarted(_: unknown, { queryFulfilled }: { queryFulfilled: Promise<unknown> }) {
    try {
      await queryFulfilled;
      toast.success(success, { position: "top-right" });
    } catch (err) {
      const body = (err as ApiFailure)?.error?.data;
      toast.error(body?.message || body?.error || fallback, { position: "top-right" });
    }
  };

export const chatSwitchApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getChatState: builder.query<{ data: ChatState }, string>({
      query: (id) => ({ url: `/chat/admin/users/${id}` }),
      providesTags: (_r, _e, id) => [{ type: "USERS", id: `chat-${id}` }],
    }),
    disableChat: builder.mutation<{ data: ChatState }, { id: string; reason: string }>({
      query: ({ id, reason }) => ({ url: `/chat/admin/users/${id}/disable`, method: Methods.Post, body: { reason } }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "USERS", id: `chat-${id}` }, "ACTIVITY"],
      onQueryStarted: toastResult("Messaging turned off", "Could not turn off messaging"),
    }),
    enableChat: builder.mutation<{ data: ChatState }, { id: string }>({
      query: ({ id }) => ({ url: `/chat/admin/users/${id}/enable`, method: Methods.Post }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "USERS", id: `chat-${id}` }, "ACTIVITY"],
      onQueryStarted: toastResult("Messaging is back on", "Could not turn messaging back on"),
    }),
  }),
});

export const { useGetChatStateQuery, useDisableChatMutation, useEnableChatMutation } = chatSwitchApi;
