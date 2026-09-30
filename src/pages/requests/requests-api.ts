import { toast } from "react-toastify";
import { baseApi } from "@/store/baseApi";
import { Methods } from "@/utils/enums";

/**
 * Buyer requests (RFQs) for staff: TradelyBackend rfq/admin.ts. Each one
 * carries the same detail check buyers now get when posting (rfq/quality.ts),
 * so older unclear requests are flagged here.
 */
export type RequestProblem = { code: string; field: string; message: string };

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
  createdAt: string;
  closedAt: string | null;
  buyerId: string;
  buyerName: string | null;
  buyerEmail: string | null;
  buyerPhone: string | null;
  quotes: number;
  problems: RequestProblem[];
}

export type RequestFilter = "needs_detail" | "open" | "closed" | "all";

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
        } catch (err: any) {
          toast.error(err?.error?.data?.error || err?.error?.data?.message || "Could not close the request", { position: "top-right" });
        }
      },
    }),
  }),
});

export const { useGetStaffRequestsQuery, useCloseRequestMutation } = requestsApi;
