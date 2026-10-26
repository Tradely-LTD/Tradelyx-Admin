import { toast } from "react-toastify";
import { baseApi } from "@/store/baseApi";
import { Methods } from "@/utils/enums";

/**
 * Buyer requests (RFQs) for staff: TradelyBackend rfq/admin.ts. Each one
 * carries the same detail check buyers now get when posting (rfq/quality.ts),
 * so older unclear requests are flagged here.
 */
export type RequestProblem = { code: string; field: string; message: string };

/**
 * The buyer's purchase order (LPO) as staff see it on the list. The document
 * itself is never in the list; it is opened through a short-lived signed link
 * (getRequestLpoDocument). removedAt/removedReason survive a removal so staff
 * can see why a request lost its badge.
 */
export interface StaffRequestLpo {
  attached: boolean;
  poNumber: string | null;
  ceiling: number | null;
  ceilingCurrency: string | null;
  removedAt: string | null;
  removedReason: string | null;
}

export interface StaffRequest {
  id: string;
  title: string | null;
  productName: string | null;
  description: string | null;
  category: string | null;
  type: string | null;
  quantity: string | null;
  unit: string | null;
  deliveryCountry: string | null;
  deliveryLocation: string | null;
  budget: string | null;
  budgetCurrency: string | null;
  expiryDate: string | null;
  /** Set when staff posted it for the buyer */
  postedBy: string | null;
  createdAt: string;
  closedAt: string | null;
  buyerId: string;
  buyerName: string | null;
  buyerEmail: string | null;
  buyerPhone: string | null;
  quotes: number;
  problems: RequestProblem[];
  lpo: StaffRequestLpo;
}

export type RequestFilter = "needs_detail" | "open" | "closed" | "all";

/** The backend's own words from a failed call ({ message, error }), else the fallback. */
const errorMessage = (err: unknown, fallback: string) => {
  const body = (err as { error?: { data?: { message?: string; error?: string } } })?.error?.data;
  return body?.message || body?.error || fallback;
};

/** GET /rfq/admin/reading/summary: AI request posting, for staff (story 5.4). */
export type ReadingSummary = {
  days: number;
  documents: number;
  ok: number;
  unreadable: number;
  failed: number;
  products: number;
  requestsPosted: number;
  fieldsFilled: number;
  fieldsChanged: number;
  inputTokens: number;
  outputTokens: number;
};

export const requestsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getStaffRequests: builder.query<
      { data: StaffRequest[]; counts: { all: number; open: number; needsDetail: number }; pagination: { total: number; totalPages: number } },
      { filter: RequestFilter; page: number; limit: number; search?: string }
    >({
      query: (params) => ({ url: "/rfq/admin/list", params }),
      providesTags: ["REQUESTS"],
    }),
    closeRequest: builder.mutation<unknown, { id: string; reason?: string }>({
      query: ({ id, reason }) => ({ url: `/rfq/admin/${id}/close`, method: Methods.Post, body: { reason } }),
      invalidatesTags: ["REQUESTS", "ACTIVITY"],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await queryFulfilled;
          toast.success("Request closed", { position: "top-right" });
        } catch (err) {
          toast.error(errorMessage(err, "Could not close the request"), { position: "top-right" });
        }
      },
    }),
    // Staff help a buyer (TradelyBackend rfq/staffRequests.ts): posted under the buyer's name, live straight away
    postRequestForBuyer: builder.mutation<{ rfq: { id: string } }, Record<string, unknown> & { buyerId: string }>({
      query: (body) => ({ url: "/rfq/postrfq", method: Methods.Post, body }),
      invalidatesTags: ["REQUESTS", "ACTIVITY"],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await queryFulfilled;
          toast.success("Request posted for the buyer", { position: "top-right" });
        } catch (err) {
          toast.error(errorMessage(err, "Could not post the request"), { position: "top-right" });
        }
      },
    }),
    editStaffRequest: builder.mutation<unknown, { id: string; changes: Record<string, unknown> }>({
      query: ({ id, changes }) => ({ url: `/rfq/admin/${id}`, method: Methods.Put, body: changes }),
      invalidatesTags: ["REQUESTS", "ACTIVITY"],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await queryFulfilled;
          toast.success("Request updated; the buyer has been told", { position: "top-right" });
        } catch (err) {
          toast.error(errorMessage(err, "Could not update the request"), { position: "top-right" });
        }
      },
    }),
    getReadingSummary: builder.query<{ data: ReadingSummary }, number>({
      query: (days) => ({ url: "/rfq/admin/reading/summary", params: { days } }),
    }),
    getRequestLpoDocument: builder.query<{ success: boolean; data: { url: string; expiresInSeconds: number } }, { id: string }>({
      query: ({ id }) => ({ url: `/rfq/admin/${id}/lpo/document` }),
      // Never reuse a cached answer: the signed link expires after 15 minutes
      keepUnusedDataFor: 0,
    }),
    removeRequestLpo: builder.mutation<{ success: boolean; data: { lpoAttached: false; lpo: StaffRequestLpo } }, { id: string; reason: string }>({
      query: ({ id, reason }) => ({ url: `/rfq/admin/${id}/lpo/remove`, method: Methods.Post, body: { reason } }),
      invalidatesTags: ["REQUESTS", "ACTIVITY"],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await queryFulfilled;
          toast.success("LPO removed", { position: "top-right" });
        } catch (err) {
          toast.error(errorMessage(err, "Could not remove the LPO"), { position: "top-right" });
        }
      },
    }),
  }),
});

export const {
  useGetStaffRequestsQuery,
  useGetReadingSummaryQuery,
  useCloseRequestMutation,
  useLazyGetRequestLpoDocumentQuery,
  useRemoveRequestLpoMutation,
  usePostRequestForBuyerMutation,
  useEditStaffRequestMutation,
} = requestsApi;
