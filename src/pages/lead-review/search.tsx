import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { toast, type Id } from "react-toastify";
import { AlertTriangle, ArrowLeft, Check, Inbox, Keyboard, MapPin, RefreshCw, RotateCcw, SkipForward, Undo2, X } from "lucide-react";

import { Btn, Card, EmptyState, Skeleton, Tabs, formatDate, formatNumber } from "@/common/ui/kit";
import ProspectDrawer from "@/pages/prospects/prospect-drawer";
import { LeadReviewGate } from "./gate";
import { FetchOutcome, FetchProgress, StateBadge } from "./fetch-status";
import { useActiveFetches } from "./use-active-fetches";
import LeadCard from "./lead-card";
import RejectPicker from "./reject-picker";
import {
  type DuplicateRef,
  type Lead,
  type LeadReviewMe,
  type SearchRow,
  codeOf,
  failureOf,
  isLeadReviewRefusal,
  leadReviewApi,
  messageOf,
  useApproveLeadMutation,
  useGetLeadReviewConfigQuery,
  useGetLeadSearchQuery,
  useGetLeadsInfiniteQuery,
  useRejectLeadMutation,
  useRestoreLeadMutation,
  useSkipLeadMutation,
  useStartFetchMutation,
  useUndoLeadMutation,
} from "./lead-review-api";
import { KEY_MAP, type LeadTab, REJECT_REASONS, type RejectReason, type ReviewAction, SCRAPER_OFF, TABS, countryLabel, reasonLabel, safeMapsUrl } from "./labels";
import { useReviewKeys } from "./use-review-keys";

/**
 * One search's review queue (G1–G6, H1–H9, I1–I8, K1). The card on top is
 * the one being decided; keys and buttons act on it, and it leaves the queue
 * at once (optimistic), so the next one shows without waiting (G5). Pages of
 * 50 load by cursor and the next page is fetched when 10 or fewer are left.
 */
export default function LeadQueuePage() {
  const { searchId = "" } = useParams();
  return <LeadReviewGate>{(me) => <Queue key={searchId} me={me} searchId={searchId} />}</LeadReviewGate>;
}

const REFILL_AT = 10;
const UP_NEXT = 5;
const TERMINAL = new Set(["done", "no_new", "failed"]);

type LastDecision = { leadId: string; toastId: Id; until: number };

function Queue({ me, searchId }: { me: LeadReviewMe; searchId: string }) {
  const dispatch = useDispatch();
  const isStaff = me.canEditLists;
  const { data: config } = useGetLeadReviewConfigQuery();
  const reasons = config?.rejectReasons?.length ? config.rejectReasons : REJECT_REASONS;
  const undoSeconds = config?.undoSeconds ?? 10;

  const searchQ = useGetLeadSearchQuery(searchId);
  const search = searchQ.data?.search;
  const [tab, setTab] = useState<LeadTab>("unreviewed");
  const leadsQ = useGetLeadsInfiniteQuery({ searchId, status: tab });
  const { hasNextPage, isFetchingNextPage, isFetching: leadsFetching, fetchNextPage, refetch: refetchLeads } = leadsQ;
  const leads = useMemo(() => {
    const seen = new Set<string>();
    return (leadsQ.data?.pages ?? []).flatMap((p) => p.data).filter((l) => (seen.has(l.id) ? false : (seen.add(l.id), true)));
  }, [leadsQ.data]);

  const decideMode = tab === "unreviewed" || tab === "hidden";
  // Purged leads (details deleted under the 12-month rule) can't be decided or
  // restored, so they never become the card the keys act on; otherwise the
  // Hidden queue, which has no Skip, would be stuck behind one.
  const current: Lead | undefined = decideMode ? leads.find((l) => !l.purged) : undefined;
  const purgedOnly = decideMode && !current ? leads.filter((l) => l.purged) : [];

  // Keep a page ahead (G5, the 300-lead queue)
  useEffect(() => {
    if (decideMode && leads.length <= REFILL_AT && hasNextPage && !isFetchingNextPage && !leadsFetching) fetchNextPage();
  }, [decideMode, leads.length, hasNextPage, isFetchingNextPage, leadsFetching, fetchNextPage]);

  // ------------------------------------------------------------ fetches
  const onFinished = useCallback(
    (left: { searchId: string }[]) => {
      if (!left.some((f) => f.searchId === searchId)) return;
      // New leads and final counts (D4): the search, and every tab from its first page
      dispatch(
        leadReviewApi.util.invalidateTags([
          { type: "LEAD_REVIEW", id: `search-${searchId}` },
          ...(["unreviewed", "hidden", "approved", "rejected"] as const).map((s) => ({ type: "LEAD_REVIEW" as const, id: `leads-${searchId}-${s}` })),
        ])
      );
    },
    [dispatch, searchId]
  );
  const active = useActiveFetches(onFinished);
  const activeRow = active.rows.find((r) => r.searchId === searchId) ?? (active.isLoading ? search?.activeFetch ?? undefined : undefined);
  const activeReceivedAt = active.rows.some((r) => r.searchId === searchId) ? active.receivedAt : searchQ.fulfilledTimeStamp;
  const lastFetch = searchQ.data?.fetches?.[0];
  const [start, { isLoading: starting }] = useStartFetchMutation();
  const [fetchProblem, setFetchProblem] = useState<string | null>(null);
  const fetchMore = async () => {
    setFetchProblem(null);
    try {
      await start({ searchId }).unwrap();
    } catch (err) {
      if (!isLeadReviewRefusal(err)) setFetchProblem(messageOf(err, "Couldn't start the fetch. Try again."));
    }
  };

  // ------------------------------------------------------------ decisions
  const [approve, approveState] = useApproveLeadMutation();
  const [reject, rejectState] = useRejectLeadMutation();
  const [skip, skipState] = useSkipLeadMutation();
  const [restore, restoreState] = useRestoreLeadMutation();
  const [undo, undoState] = useUndoLeadMutation();
  const busy = approveState.isLoading || rejectState.isLoading || skipState.isLoading || restoreState.isLoading;

  const [rejecting, setRejecting] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [prospectId, setProspectId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [undoable, setUndoable] = useState<LastDecision | null>(null);
  const last = useRef<LastDecision | null>(null);

  // The card changed under the picker (someone else decided it): start over
  useEffect(() => setRejecting(false), [current?.id]);
  useEffect(() => {
    setRejecting(false);
    setSelectedId(null);
  }, [tab]);

  const doUndo = useCallback(
    async (leadId: string, toastId: Id) => {
      if (last.current?.leadId === leadId) {
        last.current = null;
        setUndoable(null);
      }
      try {
        await undo({ leadId, searchId }).unwrap();
        toast.dismiss(toastId);
        toast.success("Undone. It's back at the front of Unreviewed.", { position: "bottom-center", autoClose: 3000 });
      } catch (err) {
        toast.dismiss(toastId);
        if (!isLeadReviewRefusal(err)) toast.error(messageOf(err, "Couldn't undo that."), { position: "bottom-center" });
      }
    },
    [undo, searchId]
  );

  /** Q5: a 10 s toast with Undo; U does the same while it shows. */
  const offerUndo = (lead: Lead, label: string) => {
    const toastId: Id = toast(<UndoToast label={label} name={lead.name} onUndo={() => doUndo(lead.id, toastId)} />, {
      position: "bottom-center",
      autoClose: undoSeconds * 1000,
      closeOnClick: false,
      pauseOnHover: false,
      pauseOnFocusLoss: false,
      onClose: () => {
        if (last.current?.toastId === toastId) {
          last.current = null;
          setUndoable(null);
        }
      },
    });
    const entry = { leadId: lead.id, toastId, until: Date.now() + undoSeconds * 1000 };
    last.current = entry;
    setUndoable(entry);
  };

  const onDecisionError = (err: unknown) => {
    if (isLeadReviewRefusal(err)) return; // the gate shows "no access" (A8)
    const code = codeOf(err);
    if (code === "DUPLICATE") {
      // Q8: the server has already marked it rejected (duplicate); move on
      const existing = failureOf(err)?.data?.existing;
      toast.warn(<DuplicateToast message={messageOf(err, "Already on TradelyX. Marked rejected (duplicate).")} existing={existing} canOpen={isStaff} onOpen={setProspectId} />, {
        position: "bottom-center",
        autoClose: 8000,
      });
    } else if (code === "ALREADY_DECIDED") {
      toast.info(messageOf(err, "Someone already decided this lead."), { position: "bottom-center" });
    } else if (code === "PURGED") {
      toast.info("This business's details were deleted under the 12-month rule.", { position: "bottom-center" });
    } else if (code === "NOT_FOUND") {
      toast.info("This lead is no longer available.", { position: "bottom-center" });
    } else if (code === "NOT_UNREVIEWED" || code === "NOT_HIDDEN") {
      toast.info(messageOf(err, "This lead has already moved on."), { position: "bottom-center" });
    } else {
      toast.error(messageOf(err, "Couldn't save that. Try again."), { position: "bottom-center" });
    }
  };

  const args = (lead: Lead) => ({ lead, searchId, tab });

  const decideApprove = async (kind: "buyer" | "seller") => {
    if (!current || current.purged || busy) return;
    const lead = current;
    try {
      await approve({ ...args(lead), kind }).unwrap();
      offerUndo(lead, `Approved as ${kind}`);
    } catch (err) {
      onDecisionError(err);
    }
  };

  const decideReject = async (reason: RejectReason, note?: string) => {
    if (!current || current.purged || busy) return;
    const lead = current;
    setRejecting(false);
    try {
      await reject({ ...args(lead), reason, note }).unwrap();
      offerUndo(lead, `Rejected (${reasonLabel(reason, reasons).toLowerCase()})`);
    } catch (err) {
      onDecisionError(err);
    }
  };

  const decideSkip = async () => {
    if (!current || busy || tab !== "unreviewed") return;
    try {
      await skip(args(current)).unwrap();
    } catch (err) {
      onDecisionError(err);
    }
  };

  const doRestore = async (lead: Lead) => {
    if (lead.purged) return;
    try {
      await restore(args(lead)).unwrap();
      toast.success("Restored. It's in Unreviewed now.", { position: "bottom-center", autoClose: 3000 });
    } catch (err) {
      onDecisionError(err);
    }
  };

  const target = current ?? leads.find((l) => l.id === selectedId) ?? leads[0];
  const openMaps = () => {
    const url = safeMapsUrl(target?.mapsUrl);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  const onKey = (action: ReviewAction) => {
    if (action === "help") return setHelpOpen((v) => !v);
    if (action === "maps") return openMaps();
    if (action === "undo") {
      const l = last.current;
      if (l && Date.now() < l.until && !undoState.isLoading) doUndo(l.leadId, l.toastId);
      return;
    }
    if (!current || current.purged) return;
    if (action === "buyer") decideApprove("buyer");
    else if (action === "seller") decideApprove("seller");
    else if (action === "reject") setRejecting(true);
    else if (action === "skip") decideSkip();
  };
  useReviewKeys(onKey, { tab, busy, enabled: !rejecting && !prospectId && !!search });

  // ------------------------------------------------------------ render
  if (searchQ.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-24" />
        <Skeleton className="h-72" />
      </div>
    );
  }
  if (searchQ.isError || !search) {
    const notFound = failureOf(searchQ.error)?.status === 404;
    return (
      <Card>
        <EmptyState icon={<MapPin size={20} />} title={notFound ? "Search not found" : "Couldn't load this search"}>
          {notFound ? "It doesn't exist, or it isn't one of your searches." : messageOf(searchQ.error, "Something went wrong.")}
          <span className="mt-3 flex justify-center gap-2">
            {!notFound && (
              <Btn size="sm" variant="secondary" onClick={() => searchQ.refetch()}>
                Try again
              </Btn>
            )}
            <Link to="/lead-review" className="inline-flex h-8 items-center px-3 text-[13px] font-semibold text-brand-900 hover:underline">
              Back to Lead review
            </Link>
          </span>
        </EmptyState>
      </Card>
    );
  }

  const stats = search.stats;
  const counts: Record<LeadTab, number> = { unreviewed: stats.unreviewed, hidden: stats.hidden, approved: stats.approvedBuyer + stats.approvedSeller, rejected: stats.rejected.total };
  const threshold = config?.threshold ?? 20;
  const overThreshold = stats.unreviewed > threshold;
  const scraperOff = config ? !config.scraperConfigured : false;
  const fetchBlock = activeRow
    ? "A fetch for this search is already queued or running."
    : scraperOff
      ? "Google Maps discovery isn't set up on this server."
      : search.exhausted
        ? "Fully explored: every nearby area has been searched. Try a different phrase."
        : overThreshold
          ? `You have ${stats.unreviewed} unreviewed leads. Review down to ${threshold} or fewer to fetch more.`
          : null;

  return (
    <>
      <Link to="/lead-review" className="mb-3 inline-flex items-center gap-1 text-[13px] font-semibold text-ink-soft hover:text-ink">
        <ArrowLeft size={14} /> Lead review
      </Link>

      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="flex flex-wrap items-center gap-3 text-[26px] font-bold leading-tight tracking-[-0.02em] text-ink">
            <span dir="auto">{search.phrase}</span>
            <StateBadge s={search} />
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            <span dir="auto">{search.location}</span> · {countryLabel(search.country)} · started by {search.isMine ? "you" : search.owner?.name ?? "Deleted user"}
            {search.lastFetchAt && ` · last fetched ${formatDate(search.lastFetchAt, true)}`}
          </p>
        </div>
        <div className="flex flex-col items-start gap-1.5 lg:items-end">
          {search.isMine ? (
            <>
              <Btn icon={<RefreshCw size={15} />} loading={starting} disabled={!!fetchBlock} onClick={fetchMore}>
                Fetch more
              </Btn>
              {fetchBlock && <p className="max-w-xs text-[12.5px] text-ink-soft lg:text-right">{fetchBlock}</p>}
            </>
          ) : (
            <p className="max-w-xs text-[12.5px] text-ink-faint lg:text-right">Only {search.owner?.name ?? "the person who started it"} can fetch more for this search.</p>
          )}
        </div>
      </div>

      {scraperOff && (
        <p role="status" className="mb-4 flex items-start gap-2.5 rounded-xl bg-attention-soft px-4 py-3 text-[13.5px] text-attention-deep ring-1 ring-inset ring-attention/25">
          <AlertTriangle size={17} className="mt-px shrink-0" />
          {SCRAPER_OFF}
        </p>
      )}
      {fetchProblem && (
        <p role="alert" className="mb-4 rounded-xl bg-danger-soft px-4 py-3 text-[13.5px] font-medium text-danger-deep">
          {fetchProblem}
        </p>
      )}

      <StatsStrip search={search} reasons={reasons} />

      <div className="mt-4 space-y-3">
        {activeRow ? (
          <Card className="px-5 py-3.5">
            <FetchProgress row={activeRow} receivedAt={activeReceivedAt} />
          </Card>
        ) : (
          lastFetch && TERMINAL.has(lastFetch.status) && <FetchOutcome row={lastFetch} canRetry={search.isMine && !fetchBlock} retrying={starting} onRetry={fetchMore} />
        )}
        {search.lastNoNewAt && !activeRow && lastFetch?.status !== "no_new" && (
          <p className="text-[12.5px] text-ink-soft">Google Maps had nothing new last time it was checked ({formatDate(search.lastNoNewAt, true)}).</p>
        )}
      </div>

      <div className="mt-7">
        <Tabs value={tab} onChange={setTab} items={TABS.map((t) => ({ ...t, count: counts[t.value] }))} />
      </div>

      <div className="mt-5">
        {leadsQ.isLoading ? (
          <Skeleton className="h-72" />
        ) : leadsQ.isError && !leads.length ? (
          <Card>
            <EmptyState title="Couldn't load leads">
              {messageOf(leadsQ.error, "Something went wrong.")}
              <span className="mt-3 block">
                <Btn size="sm" variant="secondary" onClick={() => refetchLeads()}>
                  Try again
                </Btn>
              </span>
            </EmptyState>
          </Card>
        ) : decideMode ? (
          current ? (
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
              <div>
                <LeadCard
                  key={current.id}
                  lead={current}
                  current
                  isStaff={isStaff}
                  reasons={reasons}
                  onOpenProspect={setProspectId}
                  className="animate-rise"
                  actions={
                    tab === "hidden" ? (
                      <Btn size="sm" variant="secondary" icon={<RotateCcw size={14} />} loading={restoreState.isLoading} disabled={busy} onClick={() => doRestore(current)}>
                        Restore to Unreviewed
                      </Btn>
                    ) : null
                  }
                />
                {rejecting ? (
                  <RejectPicker reasons={reasons} busy={busy} onPick={decideReject} onCancel={() => setRejecting(false)} />
                ) : (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <ActionBtn k="B" icon={<Check size={15} />} onClick={() => decideApprove("buyer")} disabled={busy} primary>
                      Approve as buyer
                    </ActionBtn>
                    <ActionBtn k="S" icon={<Check size={15} />} onClick={() => decideApprove("seller")} disabled={busy} primary>
                      Approve as seller
                    </ActionBtn>
                    <ActionBtn k="R" icon={<X size={15} />} onClick={() => setRejecting(true)} disabled={busy} danger>
                      Reject
                    </ActionBtn>
                    {tab === "unreviewed" && (
                      <ActionBtn k="N" icon={<SkipForward size={15} />} onClick={decideSkip} disabled={busy}>
                        Skip
                      </ActionBtn>
                    )}
                  </div>
                )}
                <KeyLegend tab={tab} canUndo={!!undoable} onUndo={() => undoable && doUndo(undoable.leadId, undoable.toastId)} onMaps={openMaps} onHelp={() => setHelpOpen((v) => !v)} />
              </div>
              <UpNext leads={leads.filter((l) => l.id !== current.id).slice(0, UP_NEXT)} more={Math.max(0, counts[tab] - 1 - UP_NEXT)} hidden={tab === "hidden"} onRestore={doRestore} restoring={restoreState.isLoading} />
            </div>
          ) : purgedOnly.length ? (
            <div className="space-y-3">
              {purgedOnly.map((l) => (
                <LeadCard key={l.id} lead={l} isStaff={isStaff} reasons={reasons} />
              ))}
            </div>
          ) : hasNextPage || isFetchingNextPage ? (
            <Skeleton className="h-72" />
          ) : (
            <QueueEmpty
              tab={tab}
              waiting={counts[tab]}
              fetching={leadsFetching}
              onAgain={() => refetchLeads()}
              hint={search.isMine && !fetchBlock ? "Fetch more to find new businesses." : null}
            />
          )
        ) : !leads.length ? (
          <Card>
            <EmptyState icon={<Inbox size={20} />} title={tab === "approved" ? "Nothing approved yet" : "Nothing rejected yet"} />
          </Card>
        ) : (
          <div className="space-y-3">
            {leads.map((l) => (
              <div key={l.id} onClick={() => setSelectedId(l.id)} className={`rounded-xl ${target?.id === l.id ? "ring-2 ring-brand-300" : ""}`}>
                <LeadCard lead={l} isStaff={isStaff} reasons={reasons} onOpenProspect={setProspectId} />
              </div>
            ))}
            {hasNextPage && (
              <div className="flex justify-center">
                <Btn variant="secondary" size="sm" loading={isFetchingNextPage} onClick={() => fetchNextPage()}>
                  Load more
                </Btn>
              </div>
            )}
            <p className="text-center text-[12px] text-ink-faint">Click a card, then press O to open it on Google Maps.</p>
          </div>
        )}
      </div>

      {helpOpen && <HelpOverlay reasons={reasons} onClose={() => setHelpOpen(false)} />}
      {prospectId && <ProspectDrawer id={prospectId} onClose={() => setProspectId(null)} />}
    </>
  );
}

// ---------------------------------------------------------------- pieces

function StatsStrip({ search, reasons }: { search: SearchRow; reasons: { key: RejectReason; label: string }[] }) {
  const s = search.stats;
  const items: { label: string; value: number; title?: string; strong?: boolean }[] = [
    { label: "Fetched", value: s.fetched, title: "Businesses Google Maps returned" },
    { label: "Already known", value: s.known, title: "Left out: already a prospect or a TradelyX user" },
    { label: "Repeats", value: s.repeats, title: "Left out: found before by any search, or the same phone as another lead" },
    { label: "Hidden", value: s.hidden, title: "Hidden by the sorting lists, or no phone and no website" },
    { label: "Buyers", value: s.approvedBuyer, strong: true },
    { label: "Sellers", value: s.approvedSeller, strong: true },
    { label: "Rejected", value: s.rejected.total, title: reasons.map((r) => `${r.label}: ${s.rejected[r.key] ?? 0}`).join("\n") },
    { label: "Unreviewed", value: s.unreviewed, title: "Includes skipped; not hidden", strong: true },
  ];
  return (
    <Card className="grid grid-cols-2 divide-rule sm:grid-cols-4 lg:grid-cols-8 lg:divide-x">
      {items.map((i) => (
        <div key={i.label} className="px-4 py-3" title={i.title}>
          <p className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-ink-faint">{i.label}</p>
          <p className={`tnum mt-0.5 text-lg ${i.strong ? "font-bold text-ink" : "font-semibold text-ink-soft"} ${i.title ? "cursor-help" : ""}`}>{formatNumber(i.value)}</p>
        </div>
      ))}
    </Card>
  );
}

function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="grid h-5 min-w-5 place-items-center rounded bg-black/10 px-1 font-sans text-[11px] font-bold">{children}</kbd>;
}

function ActionBtn({ k, icon, children, onClick, disabled, primary, danger }: { k: string; icon: ReactNode; children: ReactNode; onClick: () => void; disabled?: boolean; primary?: boolean; danger?: boolean }) {
  return (
    <Btn variant={primary ? "primary" : danger ? "danger" : "secondary"} icon={icon} onClick={onClick} disabled={disabled} aria-keyshortcuts={k} title={`${children} (${k})`}>
      {children}
      <Kbd>{k}</Kbd>
    </Btn>
  );
}

function KeyLegend({ tab, canUndo, onUndo, onMaps, onHelp }: { tab: LeadTab; canUndo: boolean; onUndo: () => void; onMaps: () => void; onHelp: () => void }) {
  const chip = "inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-medium text-ink-soft hover:bg-paper-deep hover:text-ink disabled:cursor-not-allowed disabled:opacity-40";
  const kbd = "grid h-5 min-w-5 place-items-center rounded border border-rule bg-white px-1 font-sans text-[11px] font-bold text-ink";
  return (
    <div className="mt-3 flex flex-wrap items-center gap-1 text-[12px] text-ink-faint" aria-label="Keyboard shortcuts">
      <span className="mr-1 inline-flex items-center gap-1">
        <Keyboard size={13} /> Keys:
      </span>
      {KEY_MAP.filter((k) => ["B", "S", "R"].includes(k.key) || (k.key === "N" && tab === "unreviewed")).map((k) => (
        <span key={k.key} className="inline-flex items-center gap-1.5 px-2 py-1">
          <kbd className={kbd}>{k.key}</kbd> {k.action === "buyer" ? "buyer" : k.action === "seller" ? "seller" : k.action === "reject" ? "reject (1–6 reason)" : "skip"}
        </span>
      ))}
      <button type="button" className={chip} disabled={!canUndo} onClick={onUndo}>
        <kbd className={kbd}>U</kbd> <Undo2 size={12} /> undo
      </button>
      <button type="button" className={chip} onClick={onMaps}>
        <kbd className={kbd}>O</kbd> open on Maps
      </button>
      <button type="button" className={chip} onClick={onHelp}>
        <kbd className={kbd}>?</kbd> all shortcuts
      </button>
    </div>
  );
}

function HelpOverlay({ reasons, onClose }: { reasons: { key: RejectReason; label: string }[]; onClose: () => void }) {
  return (
    <div className="fixed bottom-5 right-5 z-40 w-[320px] animate-rise rounded-2xl bg-white p-5 shadow-lift" role="dialog" aria-label="Keyboard shortcuts">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[14px] font-bold text-ink">Keyboard shortcuts</p>
        <button type="button" onClick={onClose} aria-label="Close" className="grid h-7 w-7 cursor-pointer place-items-center rounded-lg text-ink-soft hover:bg-paper-deep">
          <X size={15} />
        </button>
      </div>
      <ul className="space-y-1.5 text-[13px]">
        {KEY_MAP.map((k) => (
          <li key={k.key} className="flex items-center gap-2.5">
            <kbd className="grid h-6 min-w-6 place-items-center rounded border border-rule bg-paper px-1 font-sans text-[12px] font-bold text-ink">{k.key}</kbd>
            <span className="text-ink-soft">{k.label}</span>
          </li>
        ))}
      </ul>
      <p className="mb-1.5 mt-4 text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-faint">After R</p>
      <ul className="space-y-1 text-[13px]">
        {reasons.map((r, i) => (
          <li key={r.key} className="flex items-center gap-2.5">
            <kbd className="grid h-6 min-w-6 place-items-center rounded border border-rule bg-paper px-1 font-sans text-[12px] font-bold text-ink">{i + 1}</kbd>
            <span className="text-ink-soft">
              {r.label}
              {r.key === "other" ? " (type a note, Enter to reject)" : ""}
            </span>
          </li>
        ))}
        <li className="flex items-center gap-2.5">
          <kbd className="grid h-6 min-w-6 place-items-center rounded border border-rule bg-paper px-1 font-sans text-[11px] font-bold text-ink">Esc</kbd>
          <span className="text-ink-soft">Cancel</span>
        </li>
      </ul>
      <p className="mt-4 text-[12px] text-ink-faint">Keys do nothing while you're typing in a box. Approved and Rejected tabs: only O.</p>
    </div>
  );
}

function UpNext({ leads, more, hidden, onRestore, restoring }: { leads: Lead[]; more: number; hidden: boolean; onRestore: (l: Lead) => void; restoring: boolean }) {
  if (!leads.length) return null;
  return (
    <aside>
      <p className="mb-2 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-ink-faint">Up next</p>
      <ul className="space-y-1.5">
        {leads.map((l) => (
          <li key={l.id} className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 shadow-card">
            <div className="min-w-0">
              <p dir="auto" className="truncate text-[13px] font-semibold text-ink">
                {l.purged || !l.name ? "Details deleted" : l.name}
              </p>
              <p className="truncate text-[12px] text-ink-faint">{hidden ? l.hiddenReason : l.category ?? "No category"}</p>
            </div>
            {hidden && !l.purged && (
              <button type="button" disabled={restoring} onClick={() => onRestore(l)} className="shrink-0 cursor-pointer rounded-md px-1.5 py-1 text-[12px] font-semibold text-brand-900 hover:bg-brand-50 disabled:opacity-50">
                Restore
              </button>
            )}
          </li>
        ))}
      </ul>
      {more > 0 && <p className="mt-2 text-[12px] text-ink-faint">and {formatNumber(more)} more</p>}
    </aside>
  );
}

function QueueEmpty({ tab, waiting, fetching, onAgain, hint }: { tab: LeadTab; waiting: number; fetching: boolean; onAgain: () => void; hint: string | null }) {
  if (tab === "hidden") {
    return (
      <Card>
        <EmptyState icon={<Inbox size={20} />} title="Nothing hidden">
          Businesses with no phone and no website, or a category on the hide list, land here.
        </EmptyState>
      </Card>
    );
  }
  // Skipped leads go to the back; once the loaded queue is used up they need a fresh load
  return (
    <Card>
      <EmptyState icon={<Check size={20} />} title={waiting > 0 ? "You've reached the end of the queue" : "All reviewed"}>
        {waiting > 0 ? `${formatNumber(waiting)} still unreviewed, including any you skipped.` : hint ?? "Nothing is waiting in this search."}
        {waiting > 0 && (
          <span className="mt-3 block">
            <Btn size="sm" variant="secondary" icon={<RefreshCw size={14} />} loading={fetching} onClick={onAgain}>
              Go round again
            </Btn>
          </span>
        )}
      </EmptyState>
    </Card>
  );
}

function UndoToast({ label, name, onUndo }: { label: string; name: string | null; onUndo: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 font-sans text-[13.5px]">
      <span className="min-w-0">
        <span className="font-semibold text-ink">{label}</span>
        {name && (
          <span className="block truncate text-[12.5px] text-ink-soft" dir="auto">
            {name}
          </span>
        )}
      </span>
      <button type="button" onClick={onUndo} className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-paper-deep px-2.5 py-1.5 text-[12.5px] font-bold text-ink hover:bg-rule">
        <Undo2 size={13} /> Undo <kbd className="font-sans text-[11px] text-ink-soft">U</kbd>
      </button>
    </div>
  );
}

function DuplicateToast({ message, existing, canOpen, onOpen }: { message: string; existing?: DuplicateRef; canOpen: boolean; onOpen: (id: string) => void }) {
  return (
    <div className="font-sans text-[13.5px]">
      <p className="text-ink">{message}</p>
      {canOpen && existing?.type === "prospect" && (
        <button type="button" onClick={() => onOpen(existing.id)} className="mt-1 cursor-pointer text-[12.5px] font-semibold text-brand-900 hover:underline">
          Open the existing prospect
        </button>
      )}
    </div>
  );
}
