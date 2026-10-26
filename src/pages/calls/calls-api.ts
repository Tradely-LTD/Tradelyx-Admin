import { toast } from "react-toastify";

import { baseApi } from "@/store/baseApi";
import { Methods } from "@/utils/enums";

/**
 * Calls to make (TradelyBackend modules/salesTasks): created from platform
 * activity (unpaid quotes, empty requests, unanswered messages, stuck KYC,
 * lapsed orders) or by staff. Agents only ever get their own.
 */
export type TaskKind = "quote_unpaid" | "no_quotes" | "message_unanswered" | "kyc_stuck" | "order_lapsed" | "manual";
export type Outcome = "reached" | "no_answer" | "call_back" | "not_interested" | "wrong_number";
export type TaskView = "mine" | "unassigned" | "all";

export interface CallTask {
  id: string;
  kind: TaskKind;
  title: string;
  context: string | null;
  sourceRef: string | null;
  dueAt: string;
  overdue: boolean;
  status: "open" | "done";
  outcome: Outcome | null;
  outcomeNote: string | null;
  attempts: number;
  assigneeId: string | null;
  subject: { id: string; name: string; company: string | null; role: string | null; phone: string | null; email: string | null };
  questions: string[];
}

type ApiFailure = { error?: { data?: { message?: string; error?: string } } };
const action = (success: string, fallback: string) =>
  async function onQueryStarted(_: unknown, { queryFulfilled }: { queryFulfilled: Promise<unknown> }) {
    try {
      await queryFulfilled;
      toast.success(success, { position: "top-right" });
    } catch (err) {
      const body = (err as ApiFailure)?.error?.data;
      toast.error(body?.message || body?.error || fallback, { position: "top-right" });
    }
  };

export const callsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCalls: builder.query<{ data: CallTask[]; view: TaskView }, { view: TaskView; status: "open" | "done"; today: boolean }>({
      query: ({ view, status, today }) => ({ url: "/sales-tasks", params: { view, status, ...(today ? { today: 1 } : {}) } }),
      providesTags: ["PROSPECTS"],
    }),
    getAssignees: builder.query<{ data: { id: string; name: string; role: string }[] }, void>({
      query: () => ({ url: "/sales-tasks/assignees" }),
    }),
    assignCall: builder.mutation<unknown, { id: string; assigneeId: string | null }>({
      query: ({ id, assigneeId }) => ({ url: `/sales-tasks/${id}/assign`, method: Methods.Post, body: { assigneeId } }),
      invalidatesTags: ["PROSPECTS"],
      onQueryStarted: action("Assigned", "Could not assign"),
    }),
    recordOutcome: builder.mutation<unknown, { id: string; outcome: Outcome; note?: string; callBackAt?: string }>({
      query: ({ id, ...body }) => ({ url: `/sales-tasks/${id}/outcome`, method: Methods.Post, body }),
      invalidatesTags: ["PROSPECTS"],
      onQueryStarted: action("Saved", "Could not save the outcome"),
    }),
    addCall: builder.mutation<unknown, { subjectUserId: string; title: string; context?: string; dueAt?: string; assigneeId?: string | null }>({
      query: (body) => ({ url: "/sales-tasks", method: Methods.Post, body }),
      invalidatesTags: ["PROSPECTS"],
      onQueryStarted: action("Call added", "Could not add the call"),
    }),
  }),
});

export const { useGetCallsQuery, useGetAssigneesQuery, useAssignCallMutation, useRecordOutcomeMutation, useAddCallMutation } = callsApi;
