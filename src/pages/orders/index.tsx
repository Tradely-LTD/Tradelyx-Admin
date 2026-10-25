import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Pagination from "rc-pagination";
import { AlertTriangle, PackageCheck } from "lucide-react";

import { Card, EmptyState, PageHeader, Pill, Skeleton, formatDate } from "@/common/ui/kit";
import { ATTENTION, STAGE, money } from "./labels";
import { OrderFilter, useGetStaffOrdersQuery } from "./orders-api";

/**
 * Every paid order and where it stands (roadmap #9). "Needs attention" is
 * the default: orders paid 3+ days ago and not dispatched, delivered orders
 * whose inspection period ended without a release, and disputes. Sellers and
 * buyers are reminded once automatically; this is where staff follow up.
 */

const PAGE_SIZE = 25;

const FILTERS: { value: OrderFilter; label: string }[] = [
  { value: "attention", label: "Needs attention" },
  { value: "paid", label: "Paid, not dispatched" },
  { value: "dispatched", label: "On the way" },
  { value: "delivered", label: "Delivered" },
  { value: "released", label: "Released" },
  { value: "disputed", label: "Disputed" },
  { value: "all", label: "All" },
];

export default function OrdersPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<OrderFilter>("attention");
  const [page, setPage] = useState(1);
  const { data, isLoading, isFetching, isError } = useGetStaffOrdersQuery({ filter, page, limit: PAGE_SIZE });

  return (
    <>
      <PageHeader
        eyebrow="Finance"
        title="Orders"
        description="Every paid order: where it stands, how it's travelling, and which need someone to call. Sellers are reminded once after 3 days without dispatch, buyers once when their inspection period ends; money is never released automatically."
      />

      <div className="mb-4 flex flex-wrap gap-1.5" role="group" aria-label="Filter">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => { setFilter(f.value); setPage(1); }}
            aria-pressed={filter === f.value}
            className={`cursor-pointer rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
              filter === f.value ? "bg-brand-950 text-white" : "bg-white text-ink-soft ring-1 ring-inset ring-rule hover:text-ink"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="space-y-2 p-5">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : isError ? (
          <EmptyState icon={<PackageCheck size={20} />} title="Couldn't load orders">
            Your staff account needs the Finance section, or order tracking isn't live on the API yet.
          </EmptyState>
        ) : !data?.data.length ? (
          <EmptyState icon={<PackageCheck size={20} />} title={filter === "attention" ? "Nothing needs attention" : "No orders here"} />
        ) : (
          <div className={`overflow-x-auto transition-opacity ${isFetching ? "opacity-60" : ""}`}>
            <table className="w-full min-w-[880px] text-left text-[13.5px]">
              <thead>
                <tr className="border-b border-rule bg-paper text-[11.5px] font-semibold uppercase tracking-[0.06em] text-ink-faint">
                  <th className="py-3 pl-5">Order</th>
                  <th className="px-3 py-3">Buyer → seller</th>
                  <th className="px-3 py-3 text-right">Amount</th>
                  <th className="px-3 py-3">Stage</th>
                  <th className="px-3 py-3 pr-5">Tracking</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {data.data.map((o) => (
                  <tr key={o.id} onClick={() => navigate(`/orders/${o.id}`)} className="cursor-pointer align-top hover:bg-paper/60">
                    <td className="py-3 pl-5">
                      <p className="font-semibold text-ink">{o.title}</p>
                      <p className="text-[12px] text-ink-faint">Placed {formatDate(o.paidAt)}</p>
                      {o.attention.map((reason) => (
                        <p key={reason} className="mt-0.5 flex items-center gap-1 text-[12px] text-attention-deep">
                          <AlertTriangle size={12} /> {ATTENTION[reason]}
                        </p>
                      ))}
                    </td>
                    <td className="px-3 py-3 text-ink-soft">
                      {o.buyer.name ?? "Buyer"} → {o.seller.name ?? "Seller"}
                    </td>
                    <td className="tnum px-3 py-3 text-right font-semibold text-ink">{money(o.amountCharged, o.currency)}</td>
                    <td className="px-3 py-3">
                      <Pill tone={STAGE[o.stage].tone}>{STAGE[o.stage].label}</Pill>
                      {o.stage === "delivered" && o.inspectionDeadline ? (
                        <p className="mt-1 text-[12px] text-ink-faint">Inspect by {formatDate(o.inspectionDeadline, true)}</p>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 pr-5 text-ink-soft">
                      {o.trackingNumber || o.carrier ? (
                        <>
                          <p className="text-ink">{o.carrier ?? "—"}</p>
                          <p className="break-all text-[12px]">{o.trackingNumber ?? ""}</p>
                        </>
                      ) : o.dispatchedAt ? (
                        "Dispatched, no tracking"
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {data && data.pagination.totalPages > 1 ? (
        <div className="mt-4 flex justify-end">
          <Pagination current={page} total={data.pagination.total} pageSize={PAGE_SIZE} onChange={setPage} />
        </div>
      ) : null}
    </>
  );
}
