import type { ThunkDispatch, UnknownAction } from "@reduxjs/toolkit";

import { baseApi } from "@/store/baseApi";
import { Methods } from "@/utils/enums";
import type { Country, LeadTab, RejectReason } from "./labels";

/**
 * Lead review (TradelyBackend modules/lead-review, mounted at /lead-review).
 * Shapes follow docs/stories/gmaps-lead-review-api-contract.md exactly.
 *
 * Access is granted by name and checked by the server on every request, so
 * any reviewer call can come back 403 LEAD_REVIEW_NOT_PERMITTED the moment it
 * is removed (A8). Every endpoint here watches for that and flips the cached
 * /me to "no access", which drops the menu item and shows the no-access state.
 */

export type Person = { id: string; name: string };

export type Stats = {
  fetched: number;
  known: number;
  repeats: number;
  hidden: number;
  approvedBuyer: number;
  approvedSeller: number;
  rejected: Record<RejectReason, number> & { total: number };
  unreviewed: number;
};

export type FetchStatus = "queued" | "running" | "done" | "no_new" | "failed";

export type FetchRow = {
  id: string;
  searchId: string;
  status: FetchStatus;
  startedBy: Person | null;
  queuedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  /** The server's clock when it answered; elapsed time is measured against it */
  serverNow: string;
  queuePosition: number | null;
  passesDone: number;
  passesPlanned: number;
  foundSoFar: number;
  found: number;
  known: number;
  repeats: number;
  hidden: number;
  added: number;
  failureReason: string | null;
};

export type SearchRow = {
  id: string;
  phrase: string;
  location: string;
  country: Country;
  owner: (Person & { role: string | null }) | null;
  createdAt: string;
  lastFetchAt: string | null;
  activeFetch: FetchRow | null;
  lastNoNewAt: string | null;
  exhausted: boolean;
  isMine: boolean;
  stats: Stats;
};

export type DuplicateRef = { type: "prospect" | "user"; id: string; name: string };

export type Lead = {
  id: string;
  searchId: string;
  name: string | null;
  category: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  email: string | null;
  rating: number | null;
  reviewCount: number | null;
  mapsUrl: string | null;
  status: LeadTab;
  boosted: boolean;
  boostTerm: string | null;
  hiddenReason: string | null;
  restoredAt: string | null;
  skippedAt: string | null;
  skipCount: number;
  decision: "buyer" | "seller" | "rejected" | null;
  rejectReason: RejectReason | null;
  rejectNote: string | null;
  autoRejected: boolean;
  duplicateOf: DuplicateRef | null;
  decidedBy: Person | null;
  decidedAt: string | null;
  prospectId: string | null;
  purged: boolean;
  createdAt: string;
};

export type Rule = { id: string; term: string; createdAt: string };

export type LeadReviewConfig = {
  scraperConfigured: boolean;
  threshold: number;
  undoSeconds: number;
  targetNewPerFetch: number;
  rejectReasons: { key: RejectReason; label: string }[];
  countries: Country[];
  hide: Rule[];
  boost: Rule[];
  canEditLists: boolean;
};

export type LeadReviewMe = { access: boolean; canEditLists: boolean; canManageAccess: boolean };

export type Pagination = { total: number; currentPage: number; totalPages: number };
export type LeadsPage = { data: Lead[]; nextCursor: string | null };
export type Reapplied = { hidden: number; unhidden: number; boosted: number; unboosted: number };

export type IneligibleReason = "not_admin_panel_account" | "view_only" | null;
export type AccessHolder = { userId: string; name: string; email: string; role: string; grantedAt: string; grantedBy: Person | null };
export type AccessCandidate = { id: string; name: string; email: string; role: string; eligible: boolean; ineligibleReason: IneligibleReason; granted: boolean };
export type AccessFor = { userId: string; role: string; eligible: boolean; ineligibleReason: IneligibleReason; granted: boolean };

export const INELIGIBLE_TEXT: Record<string, string> = {
  not_admin_panel_account: "They sign in to the web app, not the admin panel",
  view_only: "View-only staff can't review leads",
};

// ---------------------------------------------------------------- refusals

/** The backend's error body: { code, error, message, ...extra } */
export type LeadReviewFailure = {
  status?: number | string;
  data?: {
    code?: string;
    message?: string;
    error?: string;
    missing?: string[];
    unreviewed?: number;
    threshold?: number;
    fetch?: FetchRow;
    lead?: Lead | null;
    existing?: DuplicateRef;
    reason?: string;
  };
};

/** The failure, from an unwrap() rejection, a query's `error` or an onQueryStarted rejection */
export const failureOf = (err: unknown): LeadReviewFailure | undefined => {
  const nested = (err as { error?: LeadReviewFailure } | undefined)?.error;
  return nested && typeof nested === "object" && "status" in nested ? nested : (err as LeadReviewFailure | undefined);
};
export const codeOf = (err: unknown) => failureOf(err)?.data?.code;
export const messageOf = (err: unknown, fallback: string) => {
  const f = failureOf(err);
  if (f?.status === "FETCH_ERROR") return "Can't reach the server. Check your connection and try again.";
  return f?.data?.message || f?.data?.error || fallback;
};

/** Access was removed (or never held): the server's answer to every reviewer call (A8). */
export const isLeadReviewRefusal = (err: unknown) => {
  const f = failureOf(err);
  return f?.status === 403 && f.data?.code === "LEAD_REVIEW_NOT_PERMITTED";
};

// The store state type would import the store here (a cycle); the thunks only need dispatch
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Dispatch = ThunkDispatch<any, unknown, UnknownAction>;
type Started = { dispatch: Dispatch; queryFulfilled: Promise<unknown> };

/** Show the no-access state now, then ask the server again to be sure */
function markNoAccess(dispatch: Dispatch): void {
  dispatch(
    leadReviewApi.util.updateQueryData("getLeadReviewMe", undefined, (me) => {
      me.access = false;
      me.canEditLists = false;
    })
  );
  dispatch(baseApi.util.invalidateTags(["LEAD_REVIEW_ME"]));
}

async function watchRefusal(_arg: unknown, { dispatch, queryFulfilled }: Started): Promise<void> {
  try {
    await queryFulfilled;
  } catch (err) {
    if (isLeadReviewRefusal(err)) markNoAccess(dispatch);
  }
}

// ---------------------------------------------------------------- tags

const T = "LEAD_REVIEW" as const;
const tag = (id: string) => ({ type: T, id });
const searchTag = (id: string) => tag(`search-${id}`);
const leadsTag = (searchId: string, status: LeadTab) => tag(`leads-${searchId}-${status}`);
const otherTabs = (searchId: string, but: LeadTab) => (["unreviewed", "hidden", "approved", "rejected"] as LeadTab[]).filter((s) => s !== but).map((s) => leadsTag(searchId, s));

/**
 * Codes where the lead has left the queue anyway (someone else decided it,
 * it turned out to be a duplicate, or it is no longer visible), so the card
 * stays gone instead of coming back.
 */
// PURGED: its details were deleted under the 12-month rule; it can no longer be decided
const LEAD_GONE = new Set(["ALREADY_DECIDED", "DUPLICATE", "NOT_FOUND", "NOT_UNREVIEWED", "NOT_HIDDEN", "PURGED"]);

export type DecisionArgs = { lead: Lead; searchId: string; tab: LeadTab };
export type LeadsArgs = { searchId: string; status: LeadTab };

/** Take the card out of the queue on screen at once (G5); put it back if the server says no for a fixable reason. */
function removeOptimistically({ lead, searchId, tab }: DecisionArgs, { dispatch, queryFulfilled }: Started) {
  const patch = dispatch(
    leadReviewApi.util.updateQueryData("getLeads", { searchId, status: tab }, (draft) => {
      for (const page of draft.pages) page.data = page.data.filter((l) => l.id !== lead.id);
    })
  );
  queryFulfilled.catch((err) => {
    if (isLeadReviewRefusal(err)) {
      patch.undo();
      markNoAccess(dispatch);
    } else if (!LEAD_GONE.has(codeOf(err) ?? "")) {
      patch.undo();
    }
  });
}

const PAGE_SIZE = 50;

export const leadReviewApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /** Booleans only; asked by the layout for every admin-panel role, agents included */
    getLeadReviewMe: builder.query<LeadReviewMe, void>({
      query: () => ({ url: "/lead-review/me" }),
      transformResponse: (r: { data: LeadReviewMe }) => r.data,
      providesTags: ["LEAD_REVIEW_ME"],
    }),
    getLeadReviewConfig: builder.query<LeadReviewConfig, void>({
      query: () => ({ url: "/lead-review/config" }),
      transformResponse: (r: { data: LeadReviewConfig }) => r.data,
      providesTags: [tag("CONFIG")],
      onQueryStarted: watchRefusal,
    }),
    getLeadSearches: builder.query<{ data: SearchRow[]; pagination: Pagination }, { owner?: string; page: number; limit: number }>({
      query: (params) => ({ url: "/lead-review/searches", params }),
      providesTags: [tag("SEARCHES")],
      onQueryStarted: watchRefusal,
    }),
    getLeadSearch: builder.query<{ search: SearchRow; fetches: FetchRow[] }, string>({
      query: (id) => ({ url: `/lead-review/searches/${encodeURIComponent(id)}` }),
      transformResponse: (r: { data: { search: SearchRow; fetches: FetchRow[] } }) => r.data,
      providesTags: (_r, _e, id) => [searchTag(id), tag("SEARCHES")],
      onQueryStarted: watchRefusal,
    }),
    getLeadOwners: builder.query<{ id: string; name: string; role: string | null }[], void>({
      query: () => ({ url: "/lead-review/owners" }),
      transformResponse: (r: { data: { id: string; name: string; role: string | null }[] }) => r.data,
      providesTags: [tag("SEARCHES")],
      onQueryStarted: watchRefusal,
    }),
    /** Queued and running fetches the caller can see. Poll every 5 s only while this has rows. */
    getActiveFetches: builder.query<{ data: FetchRow[]; queueLength: number }, void>({
      query: () => ({ url: "/lead-review/fetches/active" }),
      providesTags: [tag("ACTIVE")],
      onQueryStarted: watchRefusal,
    }),
    /**
     * A search's leads for one tab, 50 at a time by opaque cursor. A refetch
     * reloads the first page only: after decisions, page 1 is exactly the
     * leads still waiting.
     */
    getLeads: builder.infiniteQuery<LeadsPage, LeadsArgs, string | null>({
      infiniteQueryOptions: {
        initialPageParam: null,
        getNextPageParam: (last) => last.nextCursor ?? undefined,
        refetchCachedPages: false,
      },
      query: ({ queryArg, pageParam }) => ({
        url: `/lead-review/searches/${encodeURIComponent(queryArg.searchId)}/leads`,
        params: { status: queryArg.status, limit: PAGE_SIZE, ...(pageParam ? { cursor: pageParam } : {}) },
      }),
      providesTags: (_r, _e, arg) => [leadsTag(arg.searchId, arg.status)],
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
        } catch (err) {
          if (isLeadReviewRefusal(err)) markNoAccess(dispatch);
          // A stale or malformed cursor (400 BAD_CURSOR): start the list again from
          // the first page, which has no cursor, so this can't repeat
          else if (codeOf(err) === "BAD_CURSOR") dispatch(baseApi.util.invalidateTags([leadsTag(arg.searchId, arg.status)]));
        }
      },
    }),

    /** New search ({ phrase, location, country }) or Fetch more ({ searchId }). 202 with the search and its fetch. */
    startFetch: builder.mutation<{ data: { search: SearchRow; fetch: FetchRow } }, { searchId: string } | { phrase: string; location: string; country: Country }>({
      query: (body) => ({ url: "/lead-review/fetches", method: Methods.Post, body }),
      // FETCH_ACTIVE also means there is something to watch
      invalidatesTags: (r, e) => [tag("ACTIVE"), tag("SEARCHES"), ...(r?.data.search ? [searchTag(r.data.search.id)] : []), ...(e ? [] : ["ACTIVITY" as const])],
      onQueryStarted: watchRefusal,
    }),

    approveLead: builder.mutation<{ data: { lead: Lead; prospect: { id: string; businessName: string }; undoUntil: string } }, DecisionArgs & { kind: "buyer" | "seller" }>({
      query: ({ lead, kind }) => ({ url: `/lead-review/leads/${encodeURIComponent(lead.id)}/approve`, method: Methods.Post, body: { kind } }),
      invalidatesTags: (_r, e, { searchId, tab }) =>
        e && !LEAD_GONE.has(codeOf(e) ?? "") ? [] : [searchTag(searchId), tag("SEARCHES"), ...otherTabs(searchId, tab), "ACTIVITY", "PROSPECTS"],
      onQueryStarted: (arg, api) => removeOptimistically(arg, api),
    }),
    rejectLead: builder.mutation<{ data: { lead: Lead; undoUntil: string } }, DecisionArgs & { reason: RejectReason; note?: string }>({
      query: ({ lead, reason, note }) => ({
        url: `/lead-review/leads/${encodeURIComponent(lead.id)}/reject`,
        method: Methods.Post,
        body: note ? { reason, note } : { reason },
      }),
      invalidatesTags: (_r, e, { searchId, tab }) => (e && !LEAD_GONE.has(codeOf(e) ?? "") ? [] : [searchTag(searchId), tag("SEARCHES"), ...otherTabs(searchId, tab), "ACTIVITY"]),
      onQueryStarted: (arg, api) => removeOptimistically(arg, api),
    }),
    skipLead: builder.mutation<{ data: { lead: Lead } }, DecisionArgs>({
      query: ({ lead }) => ({ url: `/lead-review/leads/${encodeURIComponent(lead.id)}/skip`, method: Methods.Post }),
      invalidatesTags: (_r, e, { searchId }) => (e && LEAD_GONE.has(codeOf(e) ?? "") ? [searchTag(searchId)] : []),
      onQueryStarted: (arg, api) => removeOptimistically(arg, api),
    }),
    restoreLead: builder.mutation<{ data: { lead: Lead } }, DecisionArgs>({
      query: ({ lead }) => ({ url: `/lead-review/leads/${encodeURIComponent(lead.id)}/restore`, method: Methods.Post }),
      invalidatesTags: (_r, e, { searchId }) => (e && !LEAD_GONE.has(codeOf(e) ?? "") ? [] : [searchTag(searchId), tag("SEARCHES"), leadsTag(searchId, "unreviewed"), "ACTIVITY"]),
      onQueryStarted: (arg, api) => removeOptimistically(arg, api),
    }),
    /** Back to unreviewed; the card goes back to the front of the Unreviewed queue */
    undoLead: builder.mutation<{ data: { lead: Lead } }, { leadId: string; searchId: string }>({
      query: ({ leadId }) => ({ url: `/lead-review/leads/${encodeURIComponent(leadId)}/undo`, method: Methods.Post }),
      invalidatesTags: (_r, e, { searchId }) =>
        e ? [] : [searchTag(searchId), tag("SEARCHES"), ...otherTabs(searchId, "unreviewed"), "ACTIVITY", "PROSPECTS"],
      async onQueryStarted({ searchId }, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          const lead = data.data.lead;
          dispatch(
            leadReviewApi.util.updateQueryData("getLeads", { searchId, status: "unreviewed" }, (draft) => {
              if (!draft.pages.length || draft.pages.some((p) => p.data.some((l) => l.id === lead.id))) return;
              draft.pages[0].data.unshift(lead);
            })
          );
        } catch (err) {
          if (isLeadReviewRefusal(err)) markNoAccess(dispatch);
        }
      },
    }),

    addLeadRule: builder.mutation<{ data: { rule: Rule & { list: "hide" | "boost" }; reapplied: Reapplied } }, { list: "hide" | "boost"; term: string }>({
      query: (body) => ({ url: "/lead-review/rules", method: Methods.Post, body }),
      // Re-applied to every unreviewed lead (Q7): every list and count may have moved
      invalidatesTags: (_r, e) => (e ? [] : [T, "ACTIVITY"]),
      onQueryStarted: watchRefusal,
    }),
    removeLeadRule: builder.mutation<{ data: { reapplied: Reapplied } }, string>({
      query: (id) => ({ url: `/lead-review/rules/${encodeURIComponent(id)}`, method: Methods.Delete }),
      invalidatesTags: (_r, e) => (e ? [] : [T, "ACTIVITY"]),
      onQueryStarted: watchRefusal,
    }),
    updateLeadReviewSettings: builder.mutation<{ data: { threshold: number } }, { unreviewedThreshold: number }>({
      query: (body) => ({ url: "/lead-review/settings", method: Methods.Put, body }),
      invalidatesTags: (_r, e) => (e ? [] : [tag("CONFIG"), tag("SEARCHES"), "ACTIVITY"]),
      onQueryStarted: watchRefusal,
    }),

    // ------------------------------------------------------------ access (staff managers)
    getLeadReviewAccessList: builder.query<AccessHolder[], void>({
      query: () => ({ url: "/lead-review/access" }),
      transformResponse: (r: { data: AccessHolder[] }) => r.data,
      providesTags: [tag("ACCESS")],
    }),
    getLeadReviewAccessFor: builder.query<AccessFor, string>({
      query: (userId) => ({ url: `/lead-review/access/${encodeURIComponent(userId)}` }),
      transformResponse: (r: { data: AccessFor }) => r.data,
      providesTags: (_r, _e, userId) => [tag(`access-${userId}`), tag("ACCESS")],
    }),
    searchLeadReviewCandidates: builder.query<AccessCandidate[], string>({
      query: (q) => ({ url: "/lead-review/access/candidates", params: { q } }),
      transformResponse: (r: { data: AccessCandidate[] }) => r.data,
      providesTags: [tag("ACCESS")],
    }),
    setLeadReviewAccess: builder.mutation<{ data: { userId: string; granted: boolean; changed: boolean } }, { userId: string; granted: boolean }>({
      query: ({ userId, granted }) => ({ url: `/lead-review/access/${encodeURIComponent(userId)}`, method: Methods.Put, body: { granted } }),
      // The manager may have changed their own access (self-grant is allowed, OQ2)
      invalidatesTags: (_r, e) => (e ? [] : [tag("ACCESS"), "LEAD_REVIEW_ME", "ACTIVITY"]),
    }),
  }),
});

export const {
  useGetLeadReviewMeQuery,
  useGetLeadReviewConfigQuery,
  useGetLeadSearchesQuery,
  useGetLeadSearchQuery,
  useGetLeadOwnersQuery,
  useGetActiveFetchesQuery,
  useGetLeadsInfiniteQuery,
  useStartFetchMutation,
  useApproveLeadMutation,
  useRejectLeadMutation,
  useSkipLeadMutation,
  useRestoreLeadMutation,
  useUndoLeadMutation,
  useAddLeadRuleMutation,
  useRemoveLeadRuleMutation,
  useUpdateLeadReviewSettingsMutation,
  useGetLeadReviewAccessListQuery,
  useGetLeadReviewAccessForQuery,
  useSearchLeadReviewCandidatesQuery,
  useSetLeadReviewAccessMutation,
} = leadReviewApi;
