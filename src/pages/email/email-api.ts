import { toast } from "react-toastify";
import { baseApi } from "@/store/baseApi";
import { Methods } from "@/utils/enums";

export type EmailType = "individual" | "bulk" | "all_users";

export interface EmailLog {
  id: string;
  senderId: string | null;
  recipientId: string | null;
  recipientEmail: string | null;
  recipientName?: string | null;
  subject: string;
  body: string;
  emailType: EmailType;
  status: "pending" | "sent" | "failed";
  errorMessage?: string | null;
  metadata?: Record<string, unknown> | null;
  sentAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmailHistoryResponse {
  data: EmailLog[];
  pagination: {
    total: number;
    currentPage: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface SendIndividualEmailPayload {
  userId: string;
  subject: string;
  body: string;
  isHtml?: boolean;
}

export interface SendBulkEmailPayload {
  userIds: string[];
  subject: string;
  body: string;
  isHtml?: boolean;
}

export interface SendAllEmailFilters {
  role?: string;
  isVerified?: boolean;
  country?: string;
}

export interface SendAllEmailPayload {
  subject: string;
  body: string;
  isHtml?: boolean;
  filters?: SendAllEmailFilters;
}

export interface EmailHistoryQueryParams {
  page?: number;
  limit?: number;
  status?: EmailLog["status"];
  emailType?: EmailType;
  userId?: string;
  search?: string;
}

export interface EmailStatsTotals {
  total: number;
  sent: number;
  failed: number;
  pending: number;
  successRate: number;
}

export interface EmailStatsByType {
  emailType: EmailType;
  total: number;
  sent: number;
  failed: number;
  pending: number;
}

export interface EmailStatsDaily {
  date: string;
  total: number;
  sent: number;
  failed: number;
  pending: number;
}

export interface EmailStatsResponse {
  success: boolean;
  data: {
    totals: EmailStatsTotals;
    byType: EmailStatsByType[];
    last7Days: EmailStatsDaily[];
  };
}

export const emailApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    sendIndividualEmail: builder.mutation<{ success: boolean; message: string }, SendIndividualEmailPayload>({
      query: (data) => ({
        url: `/email/send/individual`,
        method: Methods.Post,
        body: data,
      }),
      invalidatesTags: ["EMAILS"],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          toast.success(data?.message ?? "Email sent successfully", { position: "top-right" });
        } catch (err: any) {
          const errorMessage = err?.error?.data?.error || err?.error?.data?.message || "Failed to send email";
          toast.error(errorMessage, { position: "top-right" });
        }
      },
    }),
    sendBulkEmail: builder.mutation<{ success: boolean; message: string }, SendBulkEmailPayload>({
      query: (data) => ({
        url: `/email/send/bulk`,
        method: Methods.Post,
        body: data,
      }),
      invalidatesTags: ["EMAILS"],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          toast.success(data?.message ?? "Bulk emails sent successfully", { position: "top-right" });
        } catch (err: any) {
          const errorMessage = err?.error?.data?.error || err?.error?.data?.message || "Failed to send bulk emails";
          toast.error(errorMessage, { position: "top-right" });
        }
      },
    }),
    sendAllUsersEmail: builder.mutation<{ success: boolean; message: string }, SendAllEmailPayload>({
      query: (data) => ({
        url: `/email/send/all`,
        method: Methods.Post,
        body: data,
      }),
      invalidatesTags: ["EMAILS"],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          toast.success(data?.message ?? "Emails sent to all users", { position: "top-right" });
        } catch (err: any) {
          const errorMessage = err?.error?.data?.error || err?.error?.data?.message || "Failed to send emails";
          toast.error(errorMessage, { position: "top-right" });
        }
      },
    }),
    getEmailHistory: builder.query<EmailHistoryResponse, EmailHistoryQueryParams>({
      query: (params) => ({
        url: `/email/history`,
        method: Methods.Get,
        params,
      }),
      providesTags: ["EMAILS"],
    }),
    getEmailStats: builder.query<EmailStatsResponse["data"], void>({
      query: () => ({
        url: `/email/stats`,
        method: Methods.Get,
      }),
      providesTags: ["EMAILS"],
      transformResponse: (response: EmailStatsResponse) => response.data,
    }),
  }),
});

export const {
  useSendIndividualEmailMutation,
  useSendBulkEmailMutation,
  useSendAllUsersEmailMutation,
  useGetEmailHistoryQuery,
  useGetEmailStatsQuery,
} = emailApi;

