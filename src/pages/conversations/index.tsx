import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import Pagination from "rc-pagination";
import { MessageSquareWarning } from "lucide-react";

import { Card, EmptyState, PageHeader, Pill, Skeleton } from "@/common/ui/kit";
import { FlagType, QueueBasis, QueueRow, QueueStatus, ReportReason, refusalOf, refusalMessage, useGetConversationQueueQuery } from "./conversations-api";
import { BASIS_LABEL, FLAG_LABEL, REASON_LABEL, flagLabel, localTime, outcomeLabel, reasonLabel, threadPath, timeZoneName } from "./labels";
import { NoAccess, ReviewerGate } from "./reviewer-gate";

/**
 * Conversations a participant reported or that shared contact details at
 * send time, one row per open item, most recent activity first. Only who,
 * why and when: never a message or an excerpt. Opening a row is a logged
 * view of the whole conversation.
 */

const PAGE_SIZE = 20;

const STATUS_FILTERS: { value: QueueStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "reviewed", label: "Reviewed" },
  { value: "all", label: "All" },
];

const BASIS_FILTERS: { value: QueueBasis | ""; label: string }[] = [
  { value: "", label: "Reported or flagged" },
  { value: "report", label: "Reported" },
  { value: "flag", label: "Flagged" },
];

const REASON_FILTERS: { value: ReportReason | ""; label: string }[] = [
  { value: "", label: "Any reason" },
  ...(Object.entries(REASON_LABEL) as [ReportReason, string][]).map(([value, label]) => ({ value, label })),
];

const FLAG_FILTERS: { value: FlagType | ""; label: string }[] = [
  { value: "", label: "Any flag" },
  ...(Object.entries(FLAG_LABEL) as [FlagType, string][]).map(([value, label]) => ({ value, label })),
];

export default function ConversationsPage() {
  // The header is inside the gate: while the feature is off nothing here renders
  return (
    <ReviewerGate>
      {() => (
        <>
          <PageHeader
            eyebrow="Trust & safety"
            title="Flagged & reported conversations"
            description="Buyer–seller conversations a participant reported, or where someone shared contact details to take the deal off TradelyX. Opening one is read-only and recorded in Activity. Nobody is told when you look."
          />
          <Queue />
        </>
      )}
    </ReviewerGate>
  );
}

function Select<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <label className="flex items-center gap-2 text-[12.5px] font-semibold text-ink-soft">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        aria-label={label}
        className="h-9 cursor-pointer rounded-lg border-0 bg-white px-3 pr-8 text-[13px] font-semibold text-ink shadow-sm ring-1 ring-inset ring-rule focus:outline-none focus:ring-2 focus:ring-brand-900"
      >
        {options.map((o) => (
          <option key={o.value || "any"} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Queue() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<QueueStatus>("new");
  const [basis, setBasis] = useState<QueueBasis | "">("");
  const [reason, setReason] = useState<ReportReason | "">("");
  const [flagType, setFlagType] = useState<FlagType | "">("");
  const [page, setPage] = useState(1);
  const { data, error, isLoading, isFetching, refetch } = useGetConversationQueueQuery({
    status,
    basis: basis || undefined,
    reason: reason || undefined,
    flagType: flagType || undefined,
    page,
    limit: PAGE_SIZE,
  });
  const filtered = !!(basis || reason || flagType);
  const reset = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
  };

  const refusal = refusalOf(error);
  // 404: switched off since the page opened; leave like any unknown URL
  if (refusal?.status === 404) return <Navigate replace to="/" />;
  if (refusal?.status === 403) return <NoAccess title="You don't have access to conversation review" />;

  return (
    <>
      <div className="mb-4 flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by status">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => reset(setStatus)(f.value)}
              aria-pressed={status === f.value}
              className={`cursor-pointer rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
                status === f.value ? "bg-brand-950 text-white" : "bg-white text-ink-soft ring-1 ring-inset ring-rule hover:text-ink"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Select label="Filter by basis" value={basis} options={BASIS_FILTERS} onChange={reset(setBasis)} />
          <Select label="Filter by report reason" value={reason} options={REASON_FILTERS} onChange={reset(setReason)} />
          <Select label="Filter by flag type" value={flagType} options={FLAG_FILTERS} onChange={reset(setFlagType)} />
        </div>
      </div>

      {error ? (
        <Card>
          <EmptyState title="Could not load the queue">
            {refusalMessage(error, "Check your connection and try again.")}
            <button onClick={refetch} className="mt-3 block w-full cursor-pointer font-semibold text-brand-900 hover:underline">
              Try again
            </button>
          </EmptyState>
        </Card>
      ) : (
        <Card className={`overflow-hidden transition-opacity ${isFetching && !isLoading ? "opacity-60" : ""}`}>
          {isLoading ? (
            <div className="space-y-3 p-5">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : !data?.rows.length ? (
            <EmptyState icon={<MessageSquareWarning size={20} />} title={status === "new" && !filtered ? "Nothing waiting" : "No conversations match"}>
              {status === "new" && !filtered
                ? "When someone reports a conversation, or a message shares contact details, it appears here."
                : "Try another status or filter."}
            </EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-left text-[13.5px]">
                <thead>
                  <tr className="border-b border-rule bg-paper text-[11.5px] font-semibold uppercase tracking-[0.06em] text-ink-faint">
                    <th className="px-5 py-3">Between</th>
                    <th className="px-3 py-3">Why it's here</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Last activity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule">
                  {data.rows.map((r) => (
                    <Row key={r.id} r={r} onOpen={() => navigate(threadPath(r.participants[0].id, r.participants[1].id))} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex flex-col gap-2 border-t border-rule px-5 py-3 text-[12.5px] text-ink-soft sm:flex-row sm:items-center sm:justify-between">
            <span>
              {data ? <span className="tnum">{data.pagination.total} conversations · </span> : null}
              Times in {timeZoneName()}
            </span>
            {(data?.pagination.pages ?? 0) > 1 && <Pagination current={page} total={data!.pagination.total} pageSize={PAGE_SIZE} onChange={setPage} />}
          </div>
        </Card>
      )}
    </>
  );
}

function Person({ p }: { p: QueueRow["participants"][number] }) {
  return (
    <div className="min-w-0">
      <p className={`truncate font-semibold ${p.deleted ? "italic text-ink-faint" : "text-ink"}`}>{p.displayName}</p>
      {p.businessName && <p className="truncate text-[12px] text-ink-soft">{p.businessName}</p>}
    </div>
  );
}

function Row({ r, onOpen }: { r: QueueRow; onOpen: () => void }) {
  return (
    <tr
      onClick={onOpen}
      onKeyDown={(e) => e.key === "Enter" && onOpen()}
      tabIndex={0}
      aria-label={`Open the conversation between ${r.participants[0].displayName} and ${r.participants[1].displayName}`}
      className="cursor-pointer align-top transition-colors hover:bg-brand-50/40 focus:bg-brand-50/40 focus:outline-none"
    >
      <td className="px-5 py-3">
        <div className="grid max-w-[340px] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-2">
          <Person p={r.participants[0]} />
          <span className="pt-0.5 text-[12px] text-ink-faint" aria-hidden>
            &harr;
          </span>
          <Person p={r.participants[1]} />
        </div>
      </td>
      <td className="px-3 py-3">
        <div className="flex flex-wrap gap-1">
          {r.bases.map((b) => (
            <Pill key={b} tone={BASIS_LABEL[b]?.tone ?? "gray"}>
              {BASIS_LABEL[b]?.label ?? b}
              {b === "report" && r.reportCount > 1 ? ` ×${r.reportCount}` : ""}
              {b === "flag" && r.flagCount > 1 ? ` ×${r.flagCount}` : ""}
            </Pill>
          ))}
        </div>
        {(r.reasons.length > 0 || r.flagTypes.length > 0) && (
          <p className="mt-1 max-w-[360px] text-[12.5px] text-ink-soft">{[...r.reasons.map(reasonLabel), ...r.flagTypes.map(flagLabel)].join(" · ")}</p>
        )}
      </td>
      <td className="px-3 py-3">
        {r.status === "new" ? (
          <Pill tone="orange" dot>New</Pill>
        ) : (
          <div>
            <Pill tone="green" dot>Reviewed</Pill>
            <p className="mt-1 text-[12px] text-ink-soft">{outcomeLabel(r.outcome)}</p>
            {r.reviewedBy && <p className="text-[11.5px] text-ink-faint">by {r.reviewedBy.displayName}</p>}
          </div>
        )}
      </td>
      <td className="whitespace-nowrap px-3 py-3">
        <p className="tnum text-ink">{localTime(r.lastActivityAt)}</p>
        <p className="tnum text-[11.5px] text-ink-faint">opened {localTime(r.openedAt)}</p>
      </td>
    </tr>
  );
}
