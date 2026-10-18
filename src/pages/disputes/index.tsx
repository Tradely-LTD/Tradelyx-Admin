import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Pagination from "rc-pagination";
import { Scale } from "lucide-react";

import { AgeBucket, DisputeListItem, ListStatus, useGetDisputesQuery } from "./disputes-api";
import { FinanceGate, LoadError } from "./finance-gate";
import { STATE, ROLE_LABEL, ageText, ageTone, categoryLabel, humanize, isOpenStatus, money } from "./labels";
import { Card, EmptyState, PageHeader, Pill, Skeleton, formatDate } from "@/common/ui/kit";

/**
 * Disputes for finance admins: every dispute raised on an escrowed order,
 * oldest waiting first. Age counts business days (Mon–Fri, Lagos); the target
 * is a decision within 5, so 3–5 days shows amber and over 5 red.
 */

const PAGE_SIZE = 20;

const STATUS_FILTERS: { value: ListStatus | ""; label: string }[] = [
  { value: "active", label: "Needs action" },
  { value: "open", label: "Open" },
  { value: "under_review", label: "Under review" },
  { value: "decided_pending", label: "Decided, money moving" },
  { value: "resolved_refunded", label: "Refunded" },
  { value: "resolved_released", label: "Released" },
  { value: "", label: "All" },
];

const AGE_FILTERS: { value: AgeBucket | ""; label: string }[] = [
  { value: "", label: "Any age" },
  { value: "0_2", label: "0–2 days" },
  { value: "3_5", label: "3–5 days" },
  { value: "over_5", label: "Over 5 days" },
];

export default function DisputesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Finance"
        title="Disputes"
        description="Buyers and sellers who disagree about an escrowed order. Start a review, read both sides and the evidence, then decide: a full refund to the buyer or a full release to the seller. Every step is recorded in Activity."
      />
      <FinanceGate>{() => <DisputeList />}</FinanceGate>
    </>
  );
}

function FilterChips<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label={label}>
      {options.map((f) => (
        <button
          key={f.value || "all"}
          onClick={() => onChange(f.value)}
          aria-pressed={value === f.value}
          className={`cursor-pointer rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
            value === f.value ? "bg-brand-950 text-white" : "bg-white text-ink-soft ring-1 ring-inset ring-rule hover:text-ink"
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}

function DisputeList() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<ListStatus | "">("active");
  const [age, setAge] = useState<AgeBucket | "">("");
  const [page, setPage] = useState(1);
  const { data, error, isLoading, isFetching, refetch } = useGetDisputesQuery({
    status: status || undefined,
    age: age || undefined,
    page,
    limit: PAGE_SIZE,
  });

  return (
    <>
      <div className="mb-4 flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
        <FilterChips label="Filter by status" value={status} options={STATUS_FILTERS} onChange={(v) => { setStatus(v); setPage(1); }} />
        <FilterChips label="Filter by age" value={age} options={AGE_FILTERS} onChange={(v) => { setAge(v); setPage(1); }} />
      </div>

      {error ? (
        <LoadError error={error} onRetry={refetch} />
      ) : (
        <Card className={`overflow-hidden transition-opacity ${isFetching && !isLoading ? "opacity-60" : ""}`}>
          {isLoading ? (
            <div className="space-y-3 p-5">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : !data?.items.length ? (
            <EmptyState icon={<Scale size={20} />} title={status === "active" && !age ? "No disputes waiting" : "No disputes match"}>
              {status === "active" && !age ? "When a buyer or seller raises a dispute it appears here." : "Try another status or age."}
            </EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px] text-left text-[13.5px]">
                <thead>
                  <tr className="border-b border-rule bg-paper text-[11.5px] font-semibold uppercase tracking-[0.06em] text-ink-faint">
                    <th className="px-5 py-3">Order</th>
                    <th className="px-3 py-3">Buyer</th>
                    <th className="px-3 py-3">Seller</th>
                    <th className="px-3 py-3">Amount</th>
                    <th className="px-3 py-3">Reason</th>
                    <th className="px-3 py-3">Raised by</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Age</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule">
                  {data.items.map((d) => (
                    <Row key={d.id} d={d} onOpen={() => navigate(`/disputes/${d.id}`)} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {(data?.pagination.pages ?? 0) > 1 && (
            <div className="flex items-center justify-between border-t border-rule px-5 py-3 text-[12.5px] text-ink-soft">
              <span className="tnum">{data!.pagination.total} disputes</span>
              <Pagination current={page} total={data!.pagination.total} pageSize={PAGE_SIZE} onChange={setPage} />
            </div>
          )}
        </Card>
      )}
    </>
  );
}

function Row({ d, onOpen }: { d: DisputeListItem; onOpen: () => void }) {
  const waiting = isOpenStatus(d.status) && !d.outcome;
  const state = STATE[d.displayState] ?? { label: humanize(d.status), tone: "gray" as const };
  return (
    <tr
      onClick={onOpen}
      onKeyDown={(e) => e.key === "Enter" && onOpen()}
      tabIndex={0}
      className="cursor-pointer transition-colors hover:bg-brand-50/40 focus:bg-brand-50/40 focus:outline-none"
    >
      <td className="px-5 py-3">
        <p className="font-mono text-[12.5px] font-semibold text-ink">#{d.orderRef}</p>
        <p className="max-w-[220px] truncate text-[12.5px] text-ink-soft">{d.orderTitle}</p>
      </td>
      <td className="max-w-[160px] truncate px-3 py-3 text-ink">{d.buyer.name || "—"}</td>
      <td className="max-w-[160px] truncate px-3 py-3 text-ink">{d.seller.name || "—"}</td>
      <td className="tnum px-3 py-3">
        <p className="font-semibold text-ink">{money(d.currency, d.amount)}</p>
        <p className="text-[12px] text-ink-faint">
          {humanize(d.provider)}
          {d.usdAmount !== null && ` · ${money("USD", d.usdAmount)} received`}
        </p>
      </td>
      <td className="px-3 py-3 text-ink-soft">{categoryLabel(d.category)}</td>
      <td className="px-3 py-3 text-ink-soft">{d.raisedByRole ? ROLE_LABEL[d.raisedByRole] : "—"}</td>
      <td className="px-3 py-3">
        <div className="flex flex-col items-start gap-1">
          <Pill tone={state.tone} dot>{state.label}</Pill>
          {d.responseOverdue && <Pill tone="red">Response overdue</Pill>}
        </div>
      </td>
      <td className="px-3 py-3">
        <Pill tone={ageTone(d.businessDaysOpen, waiting)}>{ageText(d.businessDaysOpen)}</Pill>
        <p className="mt-0.5 text-[11.5px] text-ink-faint">raised {formatDate(d.raisedAt)}</p>
      </td>
    </tr>
  );
}
