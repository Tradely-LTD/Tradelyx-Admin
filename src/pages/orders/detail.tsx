import { Link, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, PackageCheck } from "lucide-react";

import { Card, EmptyState, PageHeader, Pill, Skeleton, formatDate } from "@/common/ui/kit";
import { ATTENTION, EVENT, STAGE } from "./labels";
import { useGetStaffOrderQuery } from "./orders-api";

/** One order: stage, why it needs attention, how it's travelling, and its full history (reminders included). */
export default function OrderDetailPage() {
  const { id = "" } = useParams();
  const { data, isLoading, isError } = useGetStaffOrderQuery(id);
  const order = data?.data;

  return (
    <>
      <Link to="/orders" className="mb-3 inline-flex items-center gap-1 text-[13px] font-semibold text-brand">
        <ArrowLeft size={14} /> Orders
      </Link>
      {isLoading ? (
        <Skeleton className="h-40" />
      ) : isError || !order ? (
        <Card>
          <EmptyState icon={<PackageCheck size={20} />} title="Order not found" />
        </Card>
      ) : (
        <>
          <PageHeader eyebrow="Order" title={order.title} description={`Escrow ${order.escrowId}`} />
          <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
            <Card className="space-y-4 px-5 py-4">
              <div className="flex items-center gap-2">
                <Pill tone={STAGE[order.stage].tone}>{STAGE[order.stage].label}</Pill>
                {order.inspectionDeadline && order.stage === "delivered" ? (
                  <span className="text-[12.5px] text-ink-faint">Inspect by {formatDate(order.inspectionDeadline, true)}</span>
                ) : null}
              </div>
              {order.attention.map((reason) => (
                <p key={reason} className="flex items-center gap-1.5 text-[13px] text-attention-deep">
                  <AlertTriangle size={14} /> {ATTENTION[reason]}
                </p>
              ))}
              <div>
                <p className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-ink-faint">Shipment</p>
                {order.shipment ? (
                  <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[13.5px]">
                    <dt className="text-ink-faint">Carrier</dt>
                    <dd className="text-ink">{order.shipment.carrier ?? "—"}</dd>
                    <dt className="text-ink-faint">Tracking</dt>
                    <dd className="break-all text-ink">{order.shipment.trackingNumber ?? "—"}</dd>
                    <dt className="text-ink-faint">Expected</dt>
                    <dd className="text-ink">{order.shipment.expectedDelivery ?? "—"}</dd>
                    <dt className="text-ink-faint">Dispatched</dt>
                    <dd className="text-ink">{formatDate(order.shipment.dispatchedAt, true)}</dd>
                    {order.shipment.note ? (
                      <>
                        <dt className="text-ink-faint">Note</dt>
                        <dd className="text-ink-soft">{order.shipment.note}</dd>
                      </>
                    ) : null}
                  </dl>
                ) : (
                  <p className="mt-1 text-[13.5px] text-ink-soft">Not dispatched yet.</p>
                )}
              </div>
              <p className="text-[12.5px] text-ink-faint">
                Look the buyer and seller up in <Link to="/users" className="font-semibold text-brand">Users</Link> to call them.
              </p>
            </Card>

            <Card className="px-5 py-4">
              <p className="mb-2 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-ink-faint">History</p>
              <ol className="space-y-2 border-l-2 border-rule pl-4">
                {order.events.map((event, i) => (
                  <li key={`${event.kind}-${i}`} className="text-[13.5px]">
                    <span className={event.kind.startsWith("reminder_") ? "text-ink-soft" : "font-semibold text-ink"}>{EVENT[event.kind] ?? event.kind}</span>
                    <span className="text-ink-faint"> · {formatDate(event.at, true)}</span>
                  </li>
                ))}
              </ol>
            </Card>
          </div>
        </>
      )}
    </>
  );
}
