import { baseApi } from "@/store/baseApi";
import { Methods } from "@/utils/enums";

/** campaign: Outreach and Direct email; the rest were sent by the old Direct email before Oct 2026 */
export type EmailType = "campaign" | "individual" | "bulk" | "all_users";

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
  useGetEmailHistoryQuery,
  useGetEmailStatsQuery,
} = emailApi;

