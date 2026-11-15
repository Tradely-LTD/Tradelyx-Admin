import { AlertTriangle, CheckCircle2, Clock, Loader2, SearchX } from "lucide-react";

import { Btn, Pill, formatDate, formatNumber } from "@/common/ui/kit";
import type { FetchRow, SearchRow } from "./lead-review-api";
import { elapsedMs, formatElapsed, plural } from "./labels";
import { useTick } from "./use-review-keys";

/** One fetch: Queued (position) or Running, how long, which pass, new leads so far. */
export function FetchProgress({ row, receivedAt, title }: { row: FetchRow; receivedAt?: number; title?: string }) {
  const now = useTick(true);
  const running = row.status === "running";
  const since = running ? row.startedAt : row.queuedAt;
  const elapsed = formatElapsed(elapsedMs(since, row.serverNow, receivedAt, now));
  const pass = Math.min(row.passesDone + 1, row.passesPlanned);

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px]" aria-live="polite">
      {running ? (
        <Pill tone="blue">
          <Loader2 size={11} className="animate-spin" /> Running
        </Pill>
      ) : (
        <Pill tone="orange">
          <Clock size={11} /> Queued{row.queuePosition ? ` · position ${row.queuePosition}` : ""}
        </Pill>
      )}
      {title && <span className="font-semibold text-ink" dir="auto">{title}</span>}
      <span className="tnum text-ink-soft" title={running ? "Running for" : "Waiting for"}>
        {running ? "Running" : "Waiting"} {elapsed}
      </span>
      {running && (
        <span className="text-ink-soft">
          Pass {pass} of {row.passesPlanned}
        </span>
      )}
      <span className="text-ink-soft">
        <span className="tnum font-semibold text-ink">{formatNumber(row.added)}</span> new {row.added === 1 ? "lead" : "leads"} so far
        {row.foundSoFar > 0 && <span className="text-ink-faint"> · {formatNumber(row.foundSoFar)} found</span>}
      </span>
      {row.startedBy && <span className="text-ink-faint">· started by {row.startedBy.name}</span>}
    </div>
  );
}

/** What the last finished fetch came to (D4/D5/D6), with Try again after a failure. */
export function FetchOutcome({ row, onRetry, retrying, canRetry }: { row: FetchRow; onRetry?: () => void; retrying?: boolean; canRetry?: boolean }) {
  if (row.status === "done") {
    return (
      <div className="flex items-start gap-2.5 rounded-xl bg-brand-50/70 px-4 py-3 text-[13px] ring-1 ring-inset ring-brand-200">
        <CheckCircle2 size={17} className="mt-px shrink-0 text-brand-900" />
        <p className="text-ink">
          <span className="font-semibold">Last fetch added {plural(row.added, "new lead")}</span>
          <span className="text-ink-soft">
            {" "}
            · {formatNumber(row.found)} found on Google Maps, {formatNumber(row.known)} already known, {formatNumber(row.repeats)} repeats, {formatNumber(row.hidden)} hidden
            {row.finishedAt ? ` · ${formatDate(row.finishedAt, true)}` : ""}
          </span>
        </p>
      </div>
    );
  }
  if (row.status === "no_new") {
    return (
      <div className="flex items-start gap-2.5 rounded-xl bg-paper px-4 py-3 text-[13px] ring-1 ring-inset ring-rule">
        <SearchX size={17} className="mt-px shrink-0 text-ink-soft" />
        <p className="text-ink">
          <span className="font-semibold">Google Maps has no new results for this search.</span>
          <span className="text-ink-soft">
            {" "}
            {formatNumber(row.found)} found, all already known or seen before{row.finishedAt ? ` · ${formatDate(row.finishedAt, true)}` : ""}
          </span>
        </p>
      </div>
    );
  }
  if (row.status === "failed") {
    return (
      <div role="alert" className="flex flex-wrap items-start justify-between gap-3 rounded-xl bg-danger-soft px-4 py-3 text-[13px] ring-1 ring-inset ring-danger/20">
        <div className="flex min-w-0 gap-2.5">
          <AlertTriangle size={17} className="mt-px shrink-0 text-danger-deep" />
          <p className="text-danger-deep">
            <span className="font-semibold">The last fetch failed.</span> {row.failureReason ?? "No reason was given."}
            <span className="block text-[12px] text-ink-soft">Leads it already found are kept. {row.finishedAt ? formatDate(row.finishedAt, true) : ""}</span>
          </p>
        </div>
        {canRetry && onRetry && (
          <Btn size="sm" variant="secondary" loading={retrying} onClick={onRetry}>
            Try again
          </Btn>
        )}
      </div>
    );
  }
  return null;
}

/** A search's state in a word (K2): running, queued, fully explored, or nothing new last time. */
export function StateBadge({ s }: { s: SearchRow }) {
  if (s.activeFetch?.status === "running") return <Pill tone="blue" dot>Running</Pill>;
  if (s.activeFetch?.status === "queued") return <Pill tone="orange" dot>Queued</Pill>;
  if (s.exhausted) return <Pill tone="gray">Fully explored</Pill>;
  if (s.lastNoNewAt) return <Pill tone="gray">Nothing new last time</Pill>;
  return <span className="text-ink-faint">—</span>;
}
