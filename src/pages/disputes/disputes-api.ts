import { toast } from "react-toastify";
import { baseApi } from "@/store/baseApi";
import { Methods } from "@/utils/enums";

/**
 * Dispute Resolution v1 for arbitrators (TradelyBackend modules/disputes,
 * /disputes/admin/*). Every route needs an admin with the Finance section;
 * view-only staff and country admins get 403. Shapes follow the backend's
 * admin.ts / views.ts / decision.ts as built.
 */

export type ListStatus = "active" | "open" | "under_review" | "decided_pending" | "resolved_refunded" | "resolved_released";
export type AgeBucket = "0_2" | "3_5" | "over_5";
export type DisplayState = "open" | "under_review" | "decided_processing" | "resolved_refunded" | "resolved_released";
export type Outcome = "refund" | "release";
export type PartyRole = "buyer" | "seller";
export type PersonRef = { id: string; name: string };

export interface DisputeListItem {
  id: string;
  escrowId: string;
  orderRef: string;
  orderTitle: string;
  buyer: PersonRef;
  seller: PersonRef;
  amount: number | null;
  currency: string | null;
  usdAmount: number | null;
  provider: string | null;
  category: string | null;
  raisedByRole: PartyRole | null;
  status: string;
  displayState: DisplayState;
  outcome: Outcome | null;
  raisedAt: string | null;
  businessDaysOpen: number;
  overdue: boolean;
  responseOverdue: boolean;
}

export interface DisputeList {
  items: DisputeListItem[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

export type ListQuery = { status?: ListStatus; age?: AgeBucket; page: number; limit: number };

export interface Evidence {
  id: string;
  mime: string | null;
  /** Old app upload: a public link, not a private file */
  legacy: boolean;
  uploaderRole: PartyRole;
}

export interface DisputeEntry {
  id: string;
  kind: string;
  /** buyer | seller | staff | system */
  authorRole: string;
  author: PersonRef | null;
  /** "staff" entries are never shown to the parties */
  visibility: "parties" | "staff";
  body: string | null;
  data: Record<string, unknown> | null;
  createdAt: string;
  evidence: Evidence[];
}

/** The accepted quote the order was paid against (quotes versionDTO); null for old orders. */
export interface OrderTerms {
  versionNumber: number;
  currency: string;
  goodsPrice: number | null;
  deliveryTerm: string | null;
  deliveryFee: number;
  incoterm: string | null;
  feePayer: "buyer" | "seller";
  money: { quoteTotal: number; platformFee: number; amountCharged: number; sellerReceives: number } | null;
  inspectionWindowDays: number | null;
  legacyInspectionPeriod: string | null;
  quantity: number | null;
  unit: string | null;
  legacyQuantity: string | null;
  paymentTerms: string | null;
  note: string | null;
}

export interface AdminRefund {
  id: string;
  origin: string;
  reason: string | null;
  status: string;
  amount: number | null;
  currency: string | null;
  failureReason: string | null;
  flaggedForSupport: boolean;
  supportNote: string | null;
  provider: string | null;
  refundReference: string | null;
  attempts: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface AdminPayout {
  id: string;
  status: string;
  reference: string | null;
  amount: number | null;
  currency: string | null;
  attempts: number;
  flagged: boolean;
  failureReason: string | null;
  supportNote: string | null;
  updatedAt: string | null;
}

export interface AdminDispute {
  id: string;
  escrowId: string;
  orderRef: string;
  status: string;
  displayState: DisplayState;
  category: string | null;
  description: string | null;
  title: string | null;
  raisedByRole: PartyRole | null;
  raisedBy: PersonRef | null;
  raisedAt: string | null;
  escrowStatusAtRaise: string | null;
  responseDueAt: string | null;
  responseOverdue: boolean;
  reminderSentAt: string | null;
  businessDaysOpen: number;
  overdue: boolean;
  reviewStartedAt: string | null;
  arbitrator: PersonRef | null;
  decision: { outcome: Outcome; reason: string | null; decidedAt: string | null; decidedBy: PersonRef | null } | null;
  /** Sent back as expectedVersion on every decision, change and retry */
  decisionVersion: number;
  resolvedAt: string | null;
  /** The signed-in admin is the buyer or seller: they can look, not act */
  callerIsParty: boolean;
  parties: { buyer: PersonRef & { email: string | null }; seller: PersonRef & { email: string | null } };
  order: {
    title: string;
    items: OrderTerms | null;
    amount: number | null;
    currency: string | null;
    usdAmount: number | null;
    provider: string | null;
    escrowStatus: string;
    createdAt: string | null;
    fundedAt: string | null;
    deliveredAt: string | null;
    inspectionDeadline: string | null;
    refundedAt: string | null;
    history: { event: string; at: string }[];
  };
  refund: AdminRefund | null;
  payout: AdminPayout | null;
  entries: DisputeEntry[];
  /** Filled by the chat-review feature; null until then */
  chatLink: string | null;
}

/** What moving the money did, returned by decision, change and retry. */
export interface MoneyResult {
  kind: "refund" | "payout";
  status: string;
  message?: string;
  retryable?: boolean;
}

export type DecisionArgs = { id: string; outcome: Outcome; reason: string; expectedVersion: number };
export type NoteKind = "info_request" | "staff_note";

export interface Refusal {
  status?: number | string;
  data?: { code?: string; message?: string; error?: string; data?: Record<string, unknown> };
}

/** The backend's own words for a refusal, so staff see exactly why. */
export const refusalOf = (err: unknown): Refusal | undefined => (err as { error?: Refusal })?.error ?? (err as Refusal);
export const refusalMessage = (err: unknown, fallback: string) => {
  const r = refusalOf(err);
  return r?.data?.message || r?.data?.error || fallback;
};

/**
 * 403/409 mean the dispute moved on under us (another admin decided, the
 * version changed, conflict of interest…): reload it so the screen shows the
 * truth. Validation (400) refusals leave the cache alone.
 */
const afterWrite = (_result: unknown, error: unknown) => {
  if (!error) return ["DISPUTES" as const, "ACTIVITY" as const];
  const status = (error as Refusal).status;
  return status === 403 || status === 409 || status === 404 ? ["DISPUTES" as const] : [];
};

const toastRefusal = async (queryFulfilled: Promise<unknown>, fallback: string) => {
  try {
    await queryFulfilled;
  } catch (err) {
    toast.error(refusalMessage(err, fallback), { position: "top-right" });
  }
};

/** A UUID for clientRequestId, so a retried note is recorded once. */
export const requestId = () => {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
};

type DetailWithMoney = { dispute: AdminDispute; money: MoneyResult | null };

export const disputesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDisputes: builder.query<DisputeList, ListQuery>({
      query: (params) => ({ url: "/disputes/admin", params }),
      transformResponse: (r: { data: DisputeList }) => r.data,
      providesTags: ["DISPUTES"],
    }),
    getDispute: builder.query<AdminDispute, string>({
      query: (id) => ({ url: `/disputes/admin/${id}` }),
      transformResponse: (r: { data: { dispute: AdminDispute } }) => r.data.dispute,
      providesTags: ["DISPUTES"],
    }),
    startReview: builder.mutation<AdminDispute, string>({
      query: (id) => ({ url: `/disputes/admin/${id}/review`, method: Methods.Post }),
      transformResponse: (r: { data: { dispute: AdminDispute } }) => r.data.dispute,
      invalidatesTags: afterWrite,
      async onQueryStarted(_, { queryFulfilled }) {
        await toastRefusal(queryFulfilled, "Could not start the review");
      },
    }),
    decide: builder.mutation<DetailWithMoney, DecisionArgs>({
      query: ({ id, ...body }) => ({ url: `/disputes/admin/${id}/decision`, method: Methods.Post, body }),
      transformResponse: (r: { data: DetailWithMoney }) => r.data,
      invalidatesTags: afterWrite,
      async onQueryStarted(_, { queryFulfilled }) {
        await toastRefusal(queryFulfilled, "Could not record the decision");
      },
    }),
    changeDecision: builder.mutation<DetailWithMoney, DecisionArgs>({
      query: ({ id, ...body }) => ({ url: `/disputes/admin/${id}/decision/change`, method: Methods.Post, body }),
      transformResponse: (r: { data: DetailWithMoney }) => r.data,
      invalidatesTags: afterWrite,
      async onQueryStarted(_, { queryFulfilled }) {
        await toastRefusal(queryFulfilled, "Could not change the decision");
      },
    }),
    retryPayout: builder.mutation<DetailWithMoney, { id: string; expectedVersion: number }>({
      query: ({ id, expectedVersion }) => ({ url: `/disputes/admin/${id}/payout/retry`, method: Methods.Post, body: { expectedVersion } }),
      transformResponse: (r: { data: DetailWithMoney }) => r.data,
      invalidatesTags: afterWrite,
      async onQueryStarted(_, { queryFulfilled }) {
        await toastRefusal(queryFulfilled, "Could not retry the payout");
      },
    }),
    addNote: builder.mutation<AdminDispute, { id: string; kind: NoteKind; body: string; clientRequestId: string }>({
      query: ({ id, ...body }) => ({ url: `/disputes/admin/${id}/notes`, method: Methods.Post, body }),
      transformResponse: (r: { data: { dispute: AdminDispute } }) => r.data.dispute,
      invalidatesTags: afterWrite,
      async onQueryStarted({ kind }, { queryFulfilled }) {
        try {
          await queryFulfilled;
          toast.success(kind === "info_request" ? "Request sent to both parties" : "Staff note added", { position: "top-right" });
        } catch (err) {
          toast.error(refusalMessage(err, "Could not add the note"), { position: "top-right" });
        }
      },
    }),
    /**
     * POST /escrow/:id/admin-refund/complete {providerRefundId?}: support
     * records a refund sent by hand. The backend resolves the dispute as
     * Refunded, tells both parties and audits dispute.refund_completed.
     * Repeating it on a refunded row is a no-op, so a double click is safe.
     */
    completeRefund: builder.mutation<{ refund: AdminRefund }, { escrowId: string; providerRefundId?: string }>({
      query: ({ escrowId, providerRefundId }) => ({
        url: `/escrow/${escrowId}/admin-refund/complete`,
        method: Methods.Post,
        body: providerRefundId ? { providerRefundId } : {},
      }),
      transformResponse: (r: { data: { refund: AdminRefund } }) => r.data,
      invalidatesTags: afterWrite,
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await queryFulfilled;
          toast.success("Refund marked sent; the dispute is resolved as Refunded and both parties have been told", { position: "top-right" });
        } catch (err) {
          toast.error(refusalMessage(err, "Could not mark the refund sent"), { position: "top-right" });
        }
      },
    }),
    getEvidenceLink: builder.query<
      { url: string; expiresAt: string | null; legacy: boolean; mime: string | null },
      { id: string; evidenceId: string }
    >({
      query: ({ id, evidenceId }) => ({ url: `/disputes/admin/${id}/evidence/${evidenceId}/link` }),
      transformResponse: (r: { data: { url: string; expiresAt: string | null; legacy: boolean; mime: string | null } }) => r.data,
      // Never reuse a cached answer: the signed link expires after 15 minutes
      keepUnusedDataFor: 0,
    }),
  }),
});

export const {
  useGetDisputesQuery,
  useGetDisputeQuery,
  useStartReviewMutation,
  useDecideMutation,
  useChangeDecisionMutation,
  useRetryPayoutMutation,
  useAddNoteMutation,
  useCompleteRefundMutation,
  useLazyGetEvidenceLinkQuery,
} = disputesApi;
