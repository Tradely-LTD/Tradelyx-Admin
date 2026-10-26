import { useState } from "react";
import Pagination from "rc-pagination";
import { Gift, Landmark } from "lucide-react";

import { Btn, Card, Confirm, EmptyState, PageHeader, Pill, Skeleton, Tabs, formatDate } from "@/common/ui/kit";
import type { Tone } from "@/common/ui/kit";
import {
  PayoutDue,
  Reward,
  RewardFilter,
  useApproveRewardMutation,
  useGetPayoutsDueQuery,
  useGetRewardsQuery,
  usePayReferrerMutation,
  useRejectRewardMutation,
} from "./rewards-api";

/**
 * Referrer rewards (roadmap #14): ₦500 when someone a referrer brought in
 * passes KYC. Review each one (the same person twice is already rejected by
 * the API; more than 10 in a day are held for you), then pay referrers by
 * bank transfer once they're owed the minimum and record the reference.
 */

const naira = (n: number) => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n);

const STATUS: Record<Reward["status"], { label: string; tone: Tone }> = {
  pending: { label: "To review", tone: "orange" },
  held: { label: "Held", tone: "red" },
  approved: { label: "Approved", tone: "green" },
  rejected: { label: "Rejected", tone: "gray" },
  paid: { label: "Paid", tone: "blue" },
};

const HOLD: Record<string, string> = { daily_cap: "More than 10 in a day from this referrer" };

export default function ReferralRewardsPage() {
  const [tab, setTab] = useState<"rewards" | "payouts">("rewards");
  return (
    <>
      <PageHeader
        eyebrow="People"
        title="Referral rewards"
        description="₦500 to a referrer when someone they brought in passes ID verification. Approve each one, then pay referrers by bank transfer once they're owed the minimum. Agents don't earn these; they earn commission."
      />
      <div className="mb-4">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { value: "rewards", label: "Rewards" },
            { value: "payouts", label: "Payouts due" },
          ]}
        />
      </div>
      {tab === "rewards" ? <RewardList /> : <PayoutsDue />}
    </>
  );
}

const FILTERS: { value: RewardFilter; label: string }[] = [
  { value: "review", label: "To review" },
  { value: "approved", label: "Approved" },
  { value: "paid", label: "Paid" },
  { value: "rejected", label: "Rejected" },
];

function RewardList() {
  const [status, setStatus] = useState<RewardFilter>("review");
  const [page, setPage] = useState(1);
  const [rejecting, setRejecting] = useState<Reward | null>(null);
  const [reason, setReason] = useState("");
  const { data, isLoading, isError } = useGetRewardsQuery({ status, page });
  const [approve, { isLoading: approving }] = useApproveRewardMutation();
  const [reject, { isLoading: rejectBusy }] = useRejectRewardMutation();

  return (
    <>
      <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label="Filter">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => { setStatus(f.value); setPage(1); }}
            aria-pressed={status === f.value}
            className={`cursor-pointer rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
              status === f.value ? "bg-brand-950 text-white" : "bg-white text-ink-soft ring-1 ring-inset ring-rule hover:text-ink"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="space-y-2 p-5">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : isError ? (
          <EmptyState icon={<Gift size={20} />} title="Couldn't load rewards">Your staff account needs the Marketing & prospects section, or rewards aren't live on the API yet.</EmptyState>
        ) : !data?.data.length ? (
          <EmptyState icon={<Gift size={20} />} title={status === "review" ? "Nothing to review" : "No rewards here"} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-[13.5px]">
              <thead>
                <tr className="border-b border-rule bg-paper text-[11.5px] font-semibold uppercase tracking-[0.06em] text-ink-faint">
                  <th className="py-3 pl-5">Referrer</th>
                  <th className="px-3 py-3">Brought in</th>
                  <th className="px-3 py-3 text-right">Reward</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3 pr-5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {data.data.map((r) => (
                  <tr key={r.id} className="align-top">
                    <td className="py-3 pl-5">
                      <p className="font-semibold text-ink">{r.referrer.name ?? "—"}</p>
                      <p className="text-[12px] text-ink-faint">{r.referrer.phone ?? ""}</p>
                    </td>
                    <td className="px-3 py-3">
                      <p className="text-ink">{r.referred.name ?? "—"}</p>
                      <p className="text-[12px] text-ink-faint">Joined {formatDate(r.referred.joinedAt)} · verified {formatDate(r.createdAt)}</p>
                    </td>
                    <td className="tnum px-3 py-3 text-right font-semibold text-ink">{naira(r.amount)}</td>
                    <td className="px-3 py-3">
                      <Pill tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Pill>
                      {r.holdReason ? <p className="mt-1 text-[12px] text-attention-deep">{HOLD[r.holdReason] ?? r.holdReason}</p> : null}
                      {r.rejectionReason ? <p className="mt-1 text-[12px] text-ink-soft">{r.rejectionReason}</p> : null}
                    </td>
                    <td className="px-3 py-3 pr-5 text-right">
                      {r.status === "pending" || r.status === "held" ? (
                        <div className="flex justify-end gap-2">
                          <Btn size="sm" loading={approving} onClick={() => approve(r.id)}>Approve</Btn>
                          <Btn size="sm" variant="secondary" onClick={() => { setRejecting(r); setReason(""); }}>Reject</Btn>
                        </div>
                      ) : null}
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
          <Pagination current={page} total={data.pagination.total} pageSize={25} onChange={setPage} />
        </div>
      ) : null}
      <Confirm
        open={Boolean(rejecting)}
        title="Reject this reward?"
        confirmLabel="Reject"
        loading={rejectBusy}
        onCancel={() => setRejecting(null)}
        onConfirm={async () => {
          if (!rejecting || !reason.trim()) return;
          await reject({ id: rejecting.id, reason: reason.trim() });
          setRejecting(null);
        }}
      >
        <p className="mb-2 text-[13.5px] text-ink-soft">The referrer sees the reason on their Refer & earn page.</p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          maxLength={300}
          placeholder="e.g. Not a real business"
          className="w-full rounded-lg px-3 py-2 text-[13.5px] ring-1 ring-inset ring-rule"
        />
      </Confirm>
    </>
  );
}

function PayoutsDue() {
  const { data, isLoading, isError } = useGetPayoutsDueQuery();
  const [paying, setPaying] = useState<PayoutDue | null>(null);
  const [reference, setReference] = useState("");
  const [pay, { isLoading: payBusy }] = usePayReferrerMutation();

  return (
    <>
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="space-y-2 p-5">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : isError ? (
          <EmptyState icon={<Landmark size={20} />} title="Couldn't load payouts">Paying referrers needs the Finance section.</EmptyState>
        ) : !data?.data.length ? (
          <EmptyState icon={<Landmark size={20} />} title="No one is owed a payout yet">
            Referrers are paid once their approved rewards reach {naira(data?.minimumPayout ?? 2000)}.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-rule">
            {data.data.map((p) => (
              <li key={p.referrerId} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div className="min-w-0 text-[13.5px]">
                  <p className="font-semibold text-ink">{p.name ?? "—"} · {naira(p.amount)} <span className="font-normal text-ink-faint">({p.rewards} rewards)</span></p>
                  <p className="text-ink-soft">{[p.phone, p.email].filter(Boolean).join(" · ")}</p>
                  <p className="text-ink-faint">
                    {p.bank ? `Bank ${p.bank.bankCode ?? "?"} · ${p.bank.accountNumber ?? "?"} · ${p.bank.accountName ?? ""}` : "No bank account on file: call them for their details"}
                  </p>
                </div>
                <Btn size="sm" onClick={() => { setPaying(p); setReference(""); }}>Mark paid</Btn>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Confirm
        open={Boolean(paying)}
        title={paying ? `Record ${naira(paying.amount)} paid to ${paying.name ?? "this referrer"}?` : ""}
        confirmLabel="Record payout"
        loading={payBusy}
        onCancel={() => setPaying(null)}
        onConfirm={async () => {
          if (!paying || !reference.trim()) return;
          await pay({ referrerId: paying.referrerId, reference: reference.trim() });
          setPaying(null);
        }}
      >
        <p className="mb-2 text-[13.5px] text-ink-soft">Send the transfer first, then enter its reference. Every approved reward of theirs is marked paid.</p>
        <input
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          maxLength={120}
          placeholder="Bank transfer reference"
          className="h-10 w-full rounded-lg px-3 text-[13.5px] ring-1 ring-inset ring-rule"
        />
      </Confirm>
    </>
  );
}
