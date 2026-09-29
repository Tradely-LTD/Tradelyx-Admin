import { useState } from "react";
import { Link } from "react-router-dom";
import { useDebounce } from "react-use";
import Pagination from "rc-pagination";
import { ExternalLink, FileQuestion, Mail, Search, XCircle } from "lucide-react";

import { RequestFilter, StaffRequest, useCloseRequestMutation, useGetStaffRequestsQuery } from "./requests-api";
import { Btn, Card, Confirm, EmptyState, PageHeader, Pill, Skeleton, formatDate, formatNumber } from "@/common/ui/kit";

/**
 * Buyer requests, with the unclear ones first to hand.
 *
 * The API checks every request the way it now checks new ones, so a request
 * posted before that (like "20 tons" with no product) is flagged here. Staff
 * nudge the buyer with a ready-made email linking straight to that request,
 * where the buyer can now edit it, or close a request that can't be saved.
 */

const WEB_URL = "https://web.tradelyx.com";

const PROBLEM_LABEL: Record<string, string> = {
  PRODUCT_REQUIRED: "No product",
  TITLE_TOO_VAGUE: "Vague title",
  DESCRIPTION_TOO_SHORT: "No detail",
  UNIT_MISMATCH: "Unit clash",
};

export default function RequestsPage() {
  const [filter, setFilter] = useState<RequestFilter>("needs_detail");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [closing, setClosing] = useState<StaffRequest | null>(null);
  const [reason, setReason] = useState("");
  useDebounce(() => { setDebounced(search.trim()); setPage(1); }, 350, [search]);

  const { data, isLoading, isFetching } = useGetStaffRequestsQuery({ filter, page, limit: 20, search: debounced || undefined });
  const [closeRequest, { isLoading: closingNow }] = useCloseRequestMutation();
  const counts = data?.counts;

  const filters: { value: RequestFilter; label: string; count?: number }[] = [
    { value: "needs_detail", label: "Needs detail", count: counts?.needsDetail },
    { value: "open", label: "Open", count: counts?.open },
    { value: "closed", label: "Closed" },
    { value: "all", label: "All", count: counts?.all },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Marketplace"
        title="Buyer requests"
        description="Every request buyers have posted. Unclear ones are flagged: nudge the buyer to add detail (they can now edit their request), or close one that can't be saved."
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => { setFilter(f.value); setPage(1); }}
              aria-pressed={filter === f.value}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
                filter === f.value ? "bg-brand-950 text-white" : "bg-white text-ink-soft ring-1 ring-inset ring-rule hover:text-ink"
              }`}
            >
              {f.label}
              {f.count != null && (
                <span className={`tnum rounded-full px-1.5 text-[11px] ${filter === f.value ? "bg-white/15" : f.value === "needs_detail" && f.count ? "bg-attention-soft text-attention-deep" : "bg-paper-deep"}`}>{f.count}</span>
              )}
            </button>
          ))}
        </div>
        <div className="relative lg:ml-auto lg:w-72">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search product, buyer, category"
            aria-label="Search requests"
            className="h-10 w-full rounded-lg border-0 bg-white pl-9 pr-3 text-[13.5px] text-ink shadow-sm ring-1 ring-inset ring-rule placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-brand-900"
          />
        </div>
      </div>

      <Card className={`overflow-hidden transition-opacity ${isFetching && !isLoading ? "opacity-60" : ""}`}>
        {isLoading ? (
          <div className="space-y-3 p-5">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
        ) : !data?.data.length ? (
          <EmptyState icon={<FileQuestion size={20} />} title={filter === "needs_detail" ? "Every open request is clear" : "No requests match"}>
            {filter === "needs_detail" ? "New requests are checked when they're posted, so this should stay empty." : "Try another filter or search."}
          </EmptyState>
        ) : (
          <ul className="divide-y divide-rule">
            {data.data.map((r) => {
              const name = r.buyerName || r.buyerEmail || "the buyer";
              const qty = r.quantity ? `${formatNumber(Number(r.quantity))} ${r.unit ?? ""}`.trim() : "No quantity";
              return (
                <li key={r.id} className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-start">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-ink">{r.title || r.productName || "Untitled request"}</p>
                      {r.closedAt ? <Pill tone="gray">Closed</Pill> : <Pill tone="green" dot>Open</Pill>}
                      {r.problems.map((p) => (
                        <Pill key={p.code} tone="orange" className="cursor-help" >
                          <span title={p.message}>{PROBLEM_LABEL[p.code] ?? p.code}</span>
                        </Pill>
                      ))}
                    </div>
                    <p className="mt-1 text-[13px] text-ink-soft">
                      {[r.productName, r.category, qty, r.deliveryCountry ? `to ${r.deliveryCountry}` : null].filter(Boolean).join(" · ")}
                    </p>
                    {r.description && <p className="mt-1 line-clamp-2 text-[12.5px] text-ink-faint">{r.description}</p>}
                    <p className="mt-1.5 text-[12px] text-ink-faint">
                      {name}
                      {r.buyerPhone ? ` · ${r.buyerPhone}` : ""} · posted {formatDate(r.createdAt)} ·{" "}
                      <span className="tnum">{r.quotes}</span> {r.quotes === 1 ? "quote" : "quotes"}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-1.5">
                    <a href={`${WEB_URL}/rfq/${r.id}`} target="_blank" rel="noreferrer">
                      <Btn size="sm" variant="ghost" icon={<ExternalLink size={14} />}>View</Btn>
                    </a>
                    {!r.closedAt && r.problems.length > 0 && (
                      <Link to={`/outreach?template=buyer_request_needs_detail&user=${r.buyerId}&name=${encodeURIComponent(name)}&path=${encodeURIComponent(`/rfq/${r.id}`)}`}>
                        <Btn size="sm" variant="secondary" icon={<Mail size={14} />}>Nudge buyer</Btn>
                      </Link>
                    )}
                    {!r.closedAt && (
                      <Btn size="sm" variant="danger" icon={<XCircle size={14} />} onClick={() => { setClosing(r); setReason(""); }}>
                        Close
                      </Btn>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {(data?.pagination.totalPages ?? 0) > 1 && (
          <div className="flex justify-end border-t border-rule px-5 py-3">
            <Pagination current={page} total={data!.pagination.total} pageSize={20} onChange={setPage} />
          </div>
        )}
      </Card>

      <Confirm
        open={!!closing}
        title="Close this request?"
        confirmLabel="Close request"
        loading={closingNow}
        onCancel={() => setClosing(null)}
        onConfirm={async () => {
          if (!closing) return;
          try {
            await closeRequest({ id: closing.id, reason: reason.trim() || undefined }).unwrap();
            setClosing(null);
          } catch {
            // toast says why
          }
        }}
      >
        <p>
          <strong className="text-ink">{closing?.title || closing?.productName}</strong> stops taking quotes. Payments already started carry on.
          This can't be undone; the buyer can post a new, clearer request.
        </p>
        <label className="mt-4 block text-[13px] font-semibold text-ink" htmlFor="close-reason">Reason (kept in the activity log)</label>
        <input
          id="close-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. No product given; buyer didn't reply"
          className="mt-1.5 h-10 w-full rounded-lg border-0 bg-white px-3 text-sm text-ink ring-1 ring-inset ring-rule focus:outline-none focus:ring-2 focus:ring-brand-900"
        />
      </Confirm>
    </>
  );
}
