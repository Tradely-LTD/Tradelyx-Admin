import { toast } from "react-toastify";
import { baseApi } from "@/store/baseApi";
import { Methods } from "@/utils/enums";

/**
 * Manual KYC review. Sellers upload an ID, a photo of themselves holding it,
 * and optionally a CAC certificate from web.tradelyx.com; an admin approves
 * or rejects here. Approval sets the user's verified flag (and the company
 * badge when a certificate was sent). Admin role only — the API refuses
 * country_admin and agent.
 */
export type KycStatus = "pending" | "approved" | "rejected";

export interface KycSubmission {
  userId: string;
  status: KycStatus;
  documentType: string | null;
  docIssuingCountry: string | null;
  rejectionReason: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phoneNo: string | null;
  isCompany: boolean | null;
  companyName: string | null;
  hasCompanyDocument?: boolean;
}

export interface KycSubmissionDetail extends KycSubmission {
  documentTypeLabel: string | null;
  // Signed links, valid for 15 minutes from when the submission was opened
  documents: {
    idDocumentUrl: string | null;
    selfieUrl: string | null;
    companyDocUrl: string | null;
  };
}

interface ListResponse {
  success: boolean;
  data: KycSubmission[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

const toastError = (err: unknown, fallback: string) =>
  toast.error(
    (err as { error?: { data?: { error?: string } } })?.error?.data?.error || fallback,
    { position: "top-right" }
  );

export const kycApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getKycSubmissions: builder.query<ListResponse, { status: KycStatus; page: number; limit: number }>({
      query: ({ status, page, limit }) => ({
        url: `/kyc/admin/submissions`,
        params: { status, page, limit },
      }),
      providesTags: ["KYC"],
    }),
    getKycSubmission: builder.query<{ success: boolean; data: KycSubmissionDetail }, string>({
      query: (userId) => ({ url: `/kyc/admin/submissions/${userId}` }),
      // Never reuse a cached answer: the document links in it expire
      keepUnusedDataFor: 0,
    }),
    approveKyc: builder.mutation<unknown, string>({
      query: (userId) => ({
        url: `/kyc/admin/submissions/${userId}/approve`,
        method: Methods.Post,
      }),
      invalidatesTags: ["KYC", "USERS"],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await queryFulfilled;
          toast.success("Approved — the seller has been emailed", { position: "top-right" });
        } catch (err) {
          toastError(err, "Could not approve");
        }
      },
    }),
    rejectKyc: builder.mutation<unknown, { userId: string; reason: string }>({
      query: ({ userId, reason }) => ({
        url: `/kyc/admin/submissions/${userId}/reject`,
        method: Methods.Post,
        body: { reason },
      }),
      invalidatesTags: ["KYC", "USERS"],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await queryFulfilled;
          toast.success("Rejected — the seller has been emailed the reason", { position: "top-right" });
        } catch (err) {
          toastError(err, "Could not reject");
        }
      },
    }),
  }),
});

export const {
  useGetKycSubmissionsQuery,
  useGetKycSubmissionQuery,
  useApproveKycMutation,
  useRejectKycMutation,
} = kycApi;
