import { toast } from "react-toastify";
import { baseApi } from "@/store/baseApi";
import { Methods } from "@/utils/enums";

/**
 * Staff outreach (TradelyBackend modules/outreach, admin only): who hasn't
 * finished setting up, ready-made emails that nudge them, and campaigns.
 * Every audience is computed on the server from one definition, so the
 * dashboard count, the list and who gets the email always agree.
 */

export type SegmentKey =
  | "buyers_incomplete_profile"
  | "buyers_no_kyc"
  | "buyers_no_request"
  | "sellers_no_products"
  | "sellers_incomplete_store"
  | "sellers_no_certifications"
  | "sellers_no_kyc"
  | "all_buyers"
  | "all_sellers"
  | "everyone";

export type BlockKey = "recent_products" | "recent_offers" | "open_requests";

export interface Segment {
  key: SegmentKey;
  label: string;
  description: string;
  audience: "buyer" | "seller" | "everyone";
  group: "compliance" | "engagement";
  count: number;
  optedOut: number;
}

export interface Template {
  key: string;
  name: string;
  segment: SegmentKey;
  group: "compliance" | "engagement";
  subject: string;
  body: string;
  button?: { label: string; path: string };
  block?: BlockKey;
  audience: Omit<Segment, "count" | "optedOut">;
}

export interface Draft {
  subject: string;
  body: string;
  button?: { label: string; path: string } | null;
  block?: BlockKey | null;
  templateKey?: string | null;
}

/** An audience, or one person nudged from their profile */
export type Target = { segment: SegmentKey; userId?: undefined } | { userId: string; segment?: undefined };

export interface Preview {
  subject: string;
  html: string;
  recipients: number;
  sampleName: string | null;
  emptyBlock: boolean;
}

/** GET /outreach/email-status: the email allowance and whether mail is being held back. */
export interface EmailStatus {
  today: number | null;
  month: number | null;
  dailyLimit: number | null;
  monthlyLimit: number | null;
  reserve: number;
  pausedUntil: string | null;
  pauseReason: string | null;
  fallback: { email: boolean; sms: boolean };
  /** Each sender on its own: Resend first, Brevo when Resend can't */
  providers?: Record<"resend" | "brevo", {
    configured: boolean;
    today: number | null;
    month: number | null;
    dailyLimit: number | null;
    monthlyLimit: number | null;
    pausedUntil: string | null;
    pauseReason: string | null;
  }>;
}

export interface Campaign {
  id: string;
  templateKey: string | null;
  segment: string;
  subject: string;
  status: "sending" | "done";
  totalRecipients: number;
  sent: number;
  failed: number;
  pending: number;
  senderName: string | null;
  createdAt: string;
  finishedAt: string | null;
}

export interface SegmentUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string | null;
  status: boolean;
  isKYCCompleted: boolean;
  phone: string;
  country: string | null;
  createdAt: string;
  profileImage: string | null;
  isCompany: boolean;
  companyName: string | null;
  optedOut: boolean;
}

export interface UserOverview {
  isBuyer: boolean;
  isSeller: boolean;
  optedOutAt: string | null;
  checks: { key: string; label: string; done: boolean }[];
  emails: { id: string; subject: string; status: string; emailType: string; templateKey: string | null; createdAt: string; sentAt: string | null }[];
}

type Paged<T> = { data: T[]; pagination: { total: number; currentPage: number; totalPages: number; hasMore: boolean } };

export const errorMessage = (err: unknown, fallback: string) =>
  (err as { data?: { error?: string } })?.data?.error ||
  (err as { error?: { data?: { error?: string } } })?.error?.data?.error ||
  fallback;

export const outreachApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSegments: builder.query<Segment[], void>({
      query: () => ({ url: "/outreach/segments" }),
      transformResponse: (r: { data: Segment[] }) => r.data,
      providesTags: ["OUTREACH"],
    }),
    getSegmentUsers: builder.query<Paged<SegmentUser>, { key: SegmentKey; page: number; limit: number; search?: string }>({
      query: ({ key, ...params }) => ({ url: `/outreach/segments/${key}/users`, params }),
      providesTags: ["OUTREACH", "USERS"],
    }),
    getTemplates: builder.query<{ data: Template[]; blocks: { key: BlockKey; label: string }[] }, void>({
      query: () => ({ url: "/outreach/templates" }),
    }),
    previewEmail: builder.mutation<Preview, Draft & Target>({
      query: (body) => ({ url: "/outreach/preview", method: Methods.Post, body }),
      transformResponse: (r: { data: Preview }) => r.data,
    }),
    sendTestEmail: builder.mutation<{ message: string }, Draft & Target>({
      query: (body) => ({ url: "/outreach/test", method: Methods.Post, body }),
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          toast.success(data.message, { position: "top-right" });
        } catch (err) {
          toast.error(errorMessage(err, "The test email could not be sent"), { position: "top-right" });
        }
      },
    }),
    // Errors are shown by the caller: a 409 means "look again", not failure
    createCampaign: builder.mutation<{ message: string; data: { campaignId: string; recipients: number } }, Draft & Target & { expectedRecipients: number }>({
      query: (body) => ({ url: "/outreach/campaigns", method: Methods.Post, body }),
      invalidatesTags: ["OUTREACH", "EMAILS", "ACTIVITY"],
    }),
    getCampaigns: builder.query<Paged<Campaign>, { page: number; limit: number }>({
      query: (params) => ({ url: "/outreach/campaigns", params }),
      providesTags: ["OUTREACH"],
    }),
    getEmailStatus: builder.query<EmailStatus, void>({
      query: () => ({ url: "/outreach/email-status" }),
      transformResponse: (r: { data: EmailStatus }) => r.data,
      providesTags: ["OUTREACH"],
    }),
    // One test email to me through one provider (checks key, domain and IPs)
    testProvider: builder.mutation<{ data: { provider: string; to: string } }, "resend" | "brevo">({
      query: (provider) => ({ url: "/outreach/email-test", method: Methods.Post, body: { provider } }),
      invalidatesTags: ["OUTREACH"],
    }),
    // Emails refused because the quota was spent go back in the queue
    retryCampaign: builder.mutation<{ data: { requeued: number } }, string>({
      query: (id) => ({ url: `/outreach/campaigns/${id}/retry`, method: Methods.Post }),
      invalidatesTags: ["OUTREACH", "ACTIVITY"],
    }),
    getUserOverview: builder.query<UserOverview, string>({
      query: (id) => ({ url: `/outreach/users/${id}` }),
      transformResponse: (r: { data: UserOverview }) => r.data,
      providesTags: ["OUTREACH"],
    }),
  }),
});

export const {
  useGetSegmentsQuery,
  useGetSegmentUsersQuery,
  useGetTemplatesQuery,
  usePreviewEmailMutation,
  useSendTestEmailMutation,
  useCreateCampaignMutation,
  useGetCampaignsQuery,
  useGetUserOverviewQuery,
  useGetEmailStatusQuery,
  useRetryCampaignMutation,
  useTestProviderMutation,
} = outreachApi;
