import { useState } from "react";
import Pagination from "rc-pagination";
import { Award, BadgeCheck, Bell, Edit3, FileX, History, Megaphone, Package, ShieldCheck, ShieldX, Store, Trash2, UserCog } from "lucide-react";

import { StaffAction, useGetActivityQuery } from "./activity-api";
import { Card, EmptyState, PageHeader, Skeleton, formatDate, initials } from "@/common/ui/kit";

/**
 * Everything staff have done, newest first: what, to whom, by whom, when.
 * Filled by the backend at the moment each action succeeds, so it can't
 * drift from what actually happened.
 */

const FILTERS: { value: string; label: string }[] = [
  { value: "", label: "Everything" },
  { value: "product.", label: "Products" },
  { value: "sell_offer.", label: "Sell offers" },
  { value: "kyc.", label: "ID verification" },
  { value: "certification.", label: "Certificates" },
  { value: "user.", label: "User edits" },
  { value: "seller_profile.", label: "Seller profiles" },
  { value: "campaign.", label: "Outreach" },
  { value: "notification.", label: "Push notifications" },
  { value: "request.", label: "Buyer requests" },
];

const ICON: Record<string, { icon: typeof History; tone: string }> = {
  "product.verified": { icon: BadgeCheck, tone: "bg-brand-50 text-brand-900" },
  "product.unverified": { icon: ShieldX, tone: "bg-attention-soft text-attention-deep" },
  "product.edited": { icon: Edit3, tone: "bg-paper-deep text-ink-soft" },
  "product.deleted": { icon: Trash2, tone: "bg-danger-soft text-danger-deep" },
  "product.created_for_seller": { icon: Package, tone: "bg-brand-50 text-brand-900" },
  "sell_offer.edited": { icon: Edit3, tone: "bg-paper-deep text-ink-soft" },
  "sell_offer.deleted": { icon: Trash2, tone: "bg-danger-soft text-danger-deep" },
  "kyc.approved": { icon: ShieldCheck, tone: "bg-brand-50 text-brand-900" },
  "kyc.rejected": { icon: ShieldX, tone: "bg-danger-soft text-danger-deep" },
  "certification.verified": { icon: Award, tone: "bg-brand-50 text-brand-900" },
  "certification.unverified": { icon: Award, tone: "bg-attention-soft text-attention-deep" },
  "user.edited": { icon: UserCog, tone: "bg-sky-50 text-sky-800" },
  "seller_profile.edited": { icon: Store, tone: "bg-sky-50 text-sky-800" },
  "campaign.sent": { icon: Megaphone, tone: "bg-brand-50 text-brand-900" },
  "notification.broadcast": { icon: Bell, tone: "bg-brand-50 text-brand-900" },
  "request.closed": { icon: FileX, tone: "bg-danger-soft text-danger-deep" },
};

export default function ActivityPage() {
  const [action, setAction] = useState("");
  const [page, setPage] = useState(1);
  const { data, isLoading, isFetching } = useGetActivityQuery({ page, limit: 25, action: action || undefined });

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title="Activity"
        description="What staff have done, to whom and when: verifications, approvals, edits, removals and messages sent. Recorded automatically; nobody can edit it."
      />

      <div className="mb-4 flex flex-wrap gap-1.5" role="group" aria-label="Filter by kind">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => {
              setAction(f.value);
              setPage(1);
            }}
            aria-pressed={action === f.value}
            className={`cursor-pointer rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
              action === f.value ? "bg-brand-950 text-white" : "bg-white text-ink-soft ring-1 ring-inset ring-rule hover:text-ink"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Card className={`overflow-hidden transition-opacity ${isFetching && !isLoading ? "opacity-60" : ""}`}>
        {isLoading ? (
          <div className="space-y-3 p-5">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : !data?.data.length ? (
          <EmptyState icon={<History size={20} />} title="Nothing recorded yet">
            Actions appear here as staff verify, approve, edit or send things.
          </EmptyState>
        ) : (
          <ol className="divide-y divide-rule">
            {data.data.map((a) => (
              <ActivityRow key={a.id} a={a} />
            ))}
          </ol>
        )}
        {(data?.pagination.totalPages ?? 0) > 1 && (
          <div className="flex justify-end border-t border-rule px-5 py-3">
            <Pagination current={page} total={data!.pagination.total} pageSize={25} onChange={setPage} />
          </div>
        )}
      </Card>
    </>
  );
}

export function ActivityRow({ a, compact }: { a: StaffAction; compact?: boolean }) {
  const meta = ICON[a.action] ?? { icon: History, tone: "bg-paper-deep text-ink-soft" };
  const reason = typeof a.details?.reason === "string" ? a.details.reason : null;
  return (
    <li className={`flex items-start gap-3.5 ${compact ? "py-2.5" : "px-5 py-3.5"}`}>
      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${meta.tone}`}>
        <meta.icon size={15} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-medium text-ink">{a.summary}</p>
        {reason && <p className="mt-0.5 text-[12.5px] text-ink-soft">"{reason}"</p>}
        <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-ink-faint">
          <span className="grid h-4 w-4 place-items-center rounded-full bg-paper-deep text-[8px] font-bold text-ink-soft">
            {initials(a.actorName?.split(" ")[0], a.actorName?.split(" ")[1])}
          </span>
          {a.actorName ?? "Staff"} · {formatDate(a.createdAt, true)}
        </p>
      </div>
    </li>
  );
}
