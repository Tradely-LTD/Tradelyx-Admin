import { baseApi } from "@/store/baseApi";
import { Methods } from "@/utils/enums";

/**
 * Staff review of buyer–seller conversations (TradelyBackend
 * modules/conversation-review, /conversation-reviews/*). Every route needs an
 * admin holding the "conversations" section by name and not View only; with
 * the feature switched off every route is a plain 404. Shapes follow the
 * backend's types.ts as built.
 *
 * Nothing private is cached: the thread and the revealed contact details are
 * fetched fresh each time (the backend logs each view and sends no-store).
 */

export type QueueStatus = "new" | "reviewed" | "all";
export type QueueBasis = "report" | "flag";
export type ReportReason = "scam_fraud" | "pay_outside" | "abuse_harassment" | "spam" | "other";
export type FlagType = "email" | "phone" | "link" | "contact_words";
export type ReviewOutcome = "not_a_concern" | "concern_noted";
export type AccessBasis = "dispute" | "report" | "flag";

export interface Participant {
  id: string;
  /** "First Last", or "Deleted user" when the account no longer exists */
  displayName: string;
  businessName: string | null;
  deleted: boolean;
}

export type StaffRef = { id: string; displayName: string };

/** A queue row. Never any message text. */
export interface QueueRow {
  id: string;
  status: "new" | "reviewed";
  bases: QueueBasis[];
  reasons: string[];
  flagTypes: string[];
  reportCount: number;
  flagCount: number;
  openedAt: string;
  lastActivityAt: string;
  /** Ordered by id (lower first), the same order the thread route accepts */
  participants: [Participant, Participant];
  reviewedBy?: StaffRef | null;
  reviewedAt?: string | null;
  outcome?: string | null;
}

export type Pagination = { page: number; limit: number; total: number; pages: number };
export type QueueQuery = { status: QueueStatus; basis?: QueueBasis; reason?: ReportReason; flagType?: FlagType; page: number; limit: number };

export interface ThreadMessage {
  id: string;
  senderId: string;
  /** ISO 8601, UTC */
  createdAt: string;
  title: string;
  /** Exactly as sent; contact details typed in a message are not masked */
  body: string;
  /** Rule types flagged at send time; [] when not flagged */
  flags: string[];
}

export interface ThreadReport {
  id: string;
  itemId: string;
  reporterId: string;
  reportedUserId: string;
  reason: string;
  note: string | null;
  status: string;
  createdAt: string;
}

export interface ThreadItem {
  id: string;
  status: string;
  openedAt: string;
  lastActivityAt: string;
  reviewedBy: StaffRef | null;
  reviewedAt: string | null;
  outcome: string | null;
  reviewNote: string | null;
}

export interface ThreadContext {
  rfqs: { id: string; title: string; buyerId: string | null; status: string | null }[];
  quotes: { id: string; rfqId: string | null; replierId: string | null; posterId: string | null; createdAt: string | null }[];
  sellOffers: { id: string; title: string; creatorId: string | null }[];
  products: { id: string; title: string; creatorId: string | null }[];
  orders: { id: string; title: string; status: string | null; buyerId: string; sellerId: string; createdAt: string | null }[];
  disputes: {
    disputeId: string;
    escrowId: string;
    status: string;
    isOpen: boolean;
    resolvedAt: string | null;
    raisedBy: string | null;
    createdAt: string;
    /** Open, or resolved within the last 12 months */
    givesBasis: boolean;
  }[];
}

/** One page of a conversation. context, reports and items come with page 1 only. */
export interface ThreadPage {
  /** Pass back as `view` for later pages (60 minutes, same reviewer) */
  viewId: string;
  bases: AccessBasis[];
  conversation: { key: string; participants: [Participant, Participant] };
  messages: ThreadMessage[];
  page: { number: number; size: number; total: number; hasMore: boolean };
  context?: ThreadContext;
  reports?: ThreadReport[];
  items?: ThreadItem[];
}

export type ThreadArgs = { userA: string; userB: string; page: number; view?: string };
export type RevealedContact = { id: string; email: string | null; phone: string | null };

export interface Refusal {
  status?: number | string;
  data?: { code?: string; message?: string; error?: string; data?: Record<string, unknown> };
}

/** The backend's refusal, from an unwrap() rejection or a query's `error`. */
export const refusalOf = (err: unknown): Refusal | undefined => (err as { error?: Refusal })?.error ?? (err as Refusal);
export const refusalMessage = (err: unknown, fallback: string) => {
  const r = refusalOf(err);
  return r?.data?.message || r?.data?.error || fallback;
};

const path = (id: string) => encodeURIComponent(id);

export const conversationsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /** How many items are New; the menu badge. 404 = feature off, 403 = not a reviewer. */
    getConversationReviewSummary: builder.query<{ newCount: number }, void>({
      query: () => ({ url: "/conversation-reviews/summary" }),
      transformResponse: (r: { data: { newCount: number } }) => r.data,
      providesTags: ["CONVERSATION_REVIEW"],
    }),
    getConversationQueue: builder.query<{ rows: QueueRow[]; pagination: Pagination }, QueueQuery>({
      query: (params) => ({ url: "/conversation-reviews/items", params }),
      transformResponse: (r: { data: QueueRow[]; pagination: Pagination }) => ({ rows: r.data, pagination: r.pagination }),
      providesTags: ["CONVERSATION_REVIEW"],
    }),
    /**
     * One page of a conversation. Without `view` the backend logs a new view;
     * with it, a later page of that same view. Used lazily and never cached,
     * so a cache hit can never stand in for a logged view.
     */
    getConversationPage: builder.query<ThreadPage, ThreadArgs>({
      query: ({ userA, userB, page, view }) => ({
        url: `/conversation-reviews/conversations/${path(userA)}/${path(userB)}`,
        params: view ? { page, view } : { page },
      }),
      transformResponse: (r: { data: ThreadPage }) => r.data,
      keepUnusedDataFor: 0,
    }),
    /** The two people's email and phone. Logged by the backend before it answers. */
    revealContact: builder.mutation<RevealedContact[], { userA: string; userB: string }>({
      query: ({ userA, userB }) => ({ url: `/conversation-reviews/conversations/${path(userA)}/${path(userB)}/reveal-contact`, method: Methods.Post }),
      transformResponse: (r: { data: { participants: RevealedContact[] } }) => r.data.participants,
      invalidatesTags: (_r, error) => (error ? [] : ["ACTIVITY"]),
    }),
    reviewItem: builder.mutation<ThreadItem, { id: string; outcome: ReviewOutcome; note: string }>({
      query: ({ id, ...body }) => ({ url: `/conversation-reviews/items/${path(id)}/review`, method: Methods.Post, body }),
      transformResponse: (r: { data: { item: ThreadItem } }) => r.data.item,
      // A 409 means someone else reviewed it: the queue and badge are stale too
      invalidatesTags: (_r, error) => (!error || (error as Refusal).status === 409 ? ["CONVERSATION_REVIEW", "ACTIVITY"] : []),
    }),
  }),
});

export const {
  useGetConversationReviewSummaryQuery,
  useGetConversationQueueQuery,
  useLazyGetConversationPageQuery,
  useRevealContactMutation,
  useReviewItemMutation,
} = conversationsApi;
