import { baseApi } from "@/store/baseApi";

/**
 * Paid orders for staff (TradelyBackend modules/orders, admin with the
 * finance section): where each stands, how it's travelling, and which need
 * someone to look (not dispatched 3 days after payment, inspection period
 * over without a release, disputed).
 */
export type OrderStage = "awaiting_payment" | "paid" | "dispatched" | "delivered" | "released" | "disputed" | "refunding" | "refunded" | "cancelled";
export type OrderFilter = "attention" | "all" | "paid" | "dispatched" | "delivered" | "released" | "disputed";
export type AttentionReason = "not_dispatched" | "inspection_overdue" | "disputed";

export interface StaffOrder {
  id: string;
  title: string;
  status: string | null;
  stage: OrderStage;
  buyer: { id: string; name: string | null };
  seller: { id: string; name: string | null };
  amountCharged: number | null;
  currency: string | null;
  paidAt: string | null;
  dispatchedAt: string | null;
  carrier: string | null;
  trackingNumber: string | null;
  inspectionDeadline: string | null;
  attention: AttentionReason[];
}

export interface OrderEvent {
  kind: string;
  at: string;
  data?: Record<string, unknown> | null;
}

export interface StaffOrderDetail {
  escrowId: string;
  title: string;
  status: string | null;
  stage: OrderStage;
  buyerId: string;
  sellerId: string;
  inspectionDeadline: string | null;
  attention: AttentionReason[];
  shipment: { carrier: string | null; trackingNumber: string | null; expectedDelivery: string | null; note: string | null; dispatchedAt: string; updatedAt: string } | null;
  events: OrderEvent[];
}

export const ordersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getStaffOrders: builder.query<
      { data: StaffOrder[]; pagination: { total: number; totalPages: number }; filter: OrderFilter },
      { filter: OrderFilter; page: number; limit: number }
    >({
      query: (params) => ({ url: "/orders/admin", params }),
    }),
    getStaffOrder: builder.query<{ data: StaffOrderDetail }, string>({
      query: (id) => ({ url: `/orders/admin/${id}` }),
    }),
  }),
});

export const { useGetStaffOrdersQuery, useGetStaffOrderQuery } = ordersApi;
