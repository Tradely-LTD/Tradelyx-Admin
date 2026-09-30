import { useState } from "react";
import { useDebounce } from "react-use";
import { Banknote, Check, Handshake, Link2, PauseCircle, Search, UserPlus, Users, X } from "lucide-react";

import {
  AgentRow,
  Balances,
  PayoutDue,
  useApproveAgentMutation,
  useGetAgentQuery,
  useGetAgentsQuery,
  useGetPayoutsDueQuery,
  useLinkPersonMutation,
  usePayAgentMutation,
  useRejectAgentMutation,
  useReverseCommissionMutation,
  useSetAgentRateMutation,
  useSuspendAgentMutation,
} from "./agents-api";
import { useGetUsersQuery } from "../user-management/user-api";
import { Btn, Card, Confirm, Drawer, EmptyState, PageHeader, Pill, Skeleton, Tabs, formatDate, formatNumber, initials } from "@/common/ui/kit";

/**
 * The Agent Program for staff.
 *
 * Applications: approve (their ID must be verified first) or decline.
 * Agents: who each has brought in, what they've earned, their rate.
 * Payouts due: who is owed at least the minimum, with the bank details to
 * pay them; "Mark paid" records the transfer reference against every
 * commission it covers.
 *
 * Every action is recorded in the activity log.
 */

const money = (currency: string, amount: number) => {
  try {
    return new Intl.NumberFormat("en-NG", { style: "currency", currency, maximumFractionDigits: currency === "NGN" ? 0 : 2 }).format(amount);
  } catch {
    return `${currency} ${formatNumber(amount)}`;
  }
};

const nameOf = (a: { firstName?: string | null; lastName?: string | null; email?: string | null }) =>
  [a.firstName, a.lastName].filter(Boolean).join(" ") || a.email || "Agent";

const owed = (b: Balances) => Object.entries(b).filter(([, v]) => v.payable > 0).map(([c, v]) => money(c, v.payable)).join(" + ") || "—";

type Tab = "applications" | "agents" | "payouts";

export default function AgentsPage() {
  const [tab, setTab] = useState<Tab>("applications");
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: applied, isLoading: appliedLoading } = useGetAgentsQuery("applied");
  const { data: all, isLoading: allLoading } = useGetAgentsQuery();
  const { data: due, isLoading: dueLoading } = useGetPayoutsDueQuery();

  const agents = (all?.data ?? []).filter((a) => a.status === "approved" || a.status === "suspended");
  const payable = (due?.data ?? []).filter((d) => d.meetsMinimum);
  const terms = all?.terms ?? applied?.terms;

  return (
    <>
      <PageHeader
        eyebrow="People"
        title="Agents"
        description={
          terms
            ? `Agents bring buyers and sellers in and earn ${Math.round(terms.rate * 100)}% of our fee on their orders for ${terms.windowMonths} months, payable ${terms.holdDays} days after release, paid monthly from ${money("NGN", terms.minimumPayout.NGN ?? 5000)}.`
            : "Agents bring buyers and sellers in and share in the fee on their orders."
        }
      />

      <div className="mb-6">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { value: "applications", label: "Applications", count: applied?.data.length },
            { value: "agents", label: "Agents", count: agents.length },
            { value: "payouts", label: "Payouts due", count: payable.length },
          ]}
        />
      </div>

      {tab === "applications" && <Applications rows={applied?.data ?? []} loading={appliedLoading} onOpen={setOpenId} />}
      {tab === "agents" && <AgentsTable rows={agents} loading={allLoading} onOpen={setOpenId} />}
      {tab === "payouts" && <PayoutsDue rows={due?.data ?? []} loading={dueLoading} minimums={due?.minimums ?? {}} />}

      {openId && <AgentDrawer id={openId} onClose={() => setOpenId(null)} />}
    </>
  );
}

function Applications({ rows, loading, onOpen }: { rows: AgentRow[]; loading: boolean; onOpen: (id: string) => void }) {
  const [approve, { isLoading: approving }] = useApproveAgentMutation();
  const [reject, { isLoading: rejecting }] = useRejectAgentMutation();
  const [declining, setDeclining] = useState<AgentRow | null>(null);
  const [reason, setReason] = useState("");

  if (loading) return <Card className="space-y-3 p-5">{[0, 1].map((i) => <Skeleton key={i} className="h-24" />)}</Card>;
  if (!rows.length)
    return (
      <Card>
        <EmptyState icon={<Handshake size={20} />} title="No applications waiting">
          People apply from Account → Agent programme on the web.
        </EmptyState>
      </Card>
    );

  return (
    <>
      <div className="space-y-3">
        {rows.map((a) => (
          <Card key={a.id} className="p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={() => onOpen(a.id)} className="cursor-pointer text-[15px] font-bold text-ink hover:underline">
                    {nameOf(a)}
                  </button>
                  {a.kycCompleted ? <Pill tone="green" dot>ID verified</Pill> : <Pill tone="orange" dot>ID not verified</Pill>}
                  <span className="text-[12.5px] text-ink-faint">applied {formatDate(a.appliedAt)}</span>
                </div>
                <p className="mt-0.5 text-[13px] text-ink-soft">{[a.region, a.phone, a.email].filter(Boolean).join(" · ")}</p>
                {a.pitch && <p className="mt-3 max-w-3xl whitespace-pre-line rounded-lg bg-paper px-3.5 py-2.5 text-[13.5px] leading-relaxed text-ink">{a.pitch}</p>}
                {a.people > 0 && <p className="mt-2 text-[12.5px] text-ink-soft">{a.people} people already signed up with their code; they'll count as theirs once approved.</p>}
              </div>
              <div className="flex shrink-0 gap-2">
                <Btn variant="secondary" size="sm" icon={<X size={14} />} onClick={() => { setDeclining(a); setReason(""); }}>
                  Decline
                </Btn>
                <Btn
                  size="sm"
                  icon={<Check size={14} />}
                  loading={approving}
                  disabled={!a.kycCompleted}
                  title={a.kycCompleted ? undefined : "Approve their ID verification first (KYC review)"}
                  onClick={() => approve(a.id)}
                >
                  Approve
                </Btn>
              </div>
            </div>
            {!a.kycCompleted && <p className="mt-3 text-[12.5px] text-attention-deep">Agents are paid, so their ID must be verified before approval. Their verification will appear in KYC review once submitted.</p>}
          </Card>
        ))}
      </div>
      <Confirm
        open={!!declining}
        title="Decline this application?"
        confirmLabel="Decline"
        loading={rejecting}
        onCancel={() => setDeclining(null)}
        onConfirm={async () => {
          if (!declining) return;
          await reject({ id: declining.id, reason: reason.trim() || undefined }).unwrap().catch(() => undefined);
          setDeclining(null);
        }}
      >
        <p>{declining && nameOf(declining)} can apply again later.</p>
        <label className="mt-4 block text-[13px] font-semibold text-ink" htmlFor="decline-reason">Reason (kept in the activity log)</label>
        <input id="decline-reason" value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1.5 h-10 w-full rounded-lg border-0 px-3 text-sm ring-1 ring-inset ring-rule focus:outline-none focus:ring-2 focus:ring-brand-900" />
      </Confirm>
    </>
  );
}

function AgentsTable({ rows, loading, onOpen }: { rows: AgentRow[]; loading: boolean; onOpen: (id: string) => void }) {
  if (loading) return <Card className="space-y-3 p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12" />)}</Card>;
  if (!rows.length)
    return (
      <Card>
        <EmptyState icon={<Users size={20} />} title="No agents yet">Approved applications appear here.</EmptyState>
      </Card>
    );
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-[13.5px]">
          <thead>
            <tr className="border-b border-rule bg-paper text-[11.5px] font-semibold uppercase tracking-[0.06em] text-ink-faint">
              <th className="px-5 py-3">Agent</th>
              <th className="px-3 py-3">People</th>
              <th className="px-3 py-3">Rate</th>
              <th className="px-3 py-3">Ready to pay</th>
              <th className="px-3 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {rows.map((a) => (
              <tr key={a.id} onClick={() => onOpen(a.id)} className="cursor-pointer transition-colors hover:bg-brand-50/40">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-50 text-[12px] font-bold text-brand-950">{initials(a.firstName, a.lastName)}</div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink">{nameOf(a)}</p>
                      <p className="truncate text-[12.5px] text-ink-soft">{a.region || a.email}</p>
                    </div>
                  </div>
                </td>
                <td className="tnum px-3 py-3 text-ink-soft">
                  {a.people} <span className="text-ink-faint">({a.sellers} sellers)</span>
                </td>
                <td className="tnum px-3 py-3 text-ink-soft">{a.commissionRate == null ? "Default" : `${Math.round(a.commissionRate * 1000) / 10}%`}</td>
                <td className="tnum px-3 py-3 font-semibold text-ink">{owed(a.balances)}</td>
                <td className="px-3 py-3">{a.status === "approved" ? <Pill tone="green" dot>Active</Pill> : <Pill tone="gray" dot>Paused</Pill>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function PayoutsDue({ rows, loading, minimums }: { rows: PayoutDue[]; loading: boolean; minimums: Record<string, number> }) {
  const [pay, { isLoading: paying }] = usePayAgentMutation();
  const [paying_, setPaying] = useState<PayoutDue | null>(null);
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");

  if (loading) return <Card className="space-y-3 p-5">{[0, 1].map((i) => <Skeleton key={i} className="h-16" />)}</Card>;
  if (!rows.length)
    return (
      <Card>
        <EmptyState icon={<Banknote size={20} />} title="Nobody is owed anything yet">
          Commission becomes payable 14 days after an order is released.
        </EmptyState>
      </Card>
    );

  return (
    <>
      <Card className="overflow-hidden">
        <ul className="divide-y divide-rule">
          {rows.map((d) => (
            <li key={`${d.agentId}-${d.currency}`} className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink">{d.name}</p>
                <p className="text-[12.5px] text-ink-soft">
                  {d.bankName && d.accountNumber ? `${d.bankName} · ${d.accountNumber}${d.accountName ? ` · ${d.accountName}` : ""}` : <span className="text-attention-deep">No bank details yet: ask them to add them on the Agent programme page</span>}
                  {d.phone ? ` · ${d.phone}` : ""}
                </p>
              </div>
              <div className="text-right">
                <p className="tnum text-lg font-bold text-ink">{money(d.currency, d.payable)}</p>
                <p className="tnum text-[12px] text-ink-faint">
                  {d.holding > 0 ? `${money(d.currency, d.holding)} still on hold` : "nothing on hold"}
                </p>
              </div>
              {d.meetsMinimum ? (
                <Btn size="sm" icon={<Banknote size={14} />} disabled={!d.accountNumber} onClick={() => { setPaying(d); setReference(""); setNote(""); }}>
                  Mark paid
                </Btn>
              ) : (
                <span className="text-[12.5px] text-ink-faint">Below the {money(d.currency, minimums[d.currency] ?? 0)} minimum</span>
              )}
            </li>
          ))}
        </ul>
      </Card>
      <Confirm
        open={!!paying_}
        title={paying_ ? `Record ${money(paying_.currency, paying_.payable)} paid to ${paying_.name}?` : ""}
        confirmLabel="Record payout"
        loading={paying}
        onCancel={() => setPaying(null)}
        onConfirm={async () => {
          if (!paying_ || !reference.trim()) return;
          await pay({ id: paying_.agentId, currency: paying_.currency, reference: reference.trim(), note: note.trim() || undefined }).unwrap().catch(() => undefined);
          setPaying(null);
        }}
      >
        <p>Transfer the money first, then record it here with the bank's reference. Every commission it covers is marked paid.</p>
        <label className="mt-4 block text-[13px] font-semibold text-ink" htmlFor="ref">Transfer reference</label>
        <input id="ref" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. GTB-2026-09-30-1188" className="mt-1.5 h-10 w-full rounded-lg border-0 px-3 font-mono text-sm ring-1 ring-inset ring-rule focus:outline-none focus:ring-2 focus:ring-brand-900" />
        <label className="mt-3 block text-[13px] font-semibold text-ink" htmlFor="note">Note (optional)</label>
        <input id="note" value={note} onChange={(e) => setNote(e.target.value)} className="mt-1.5 h-10 w-full rounded-lg border-0 px-3 text-sm ring-1 ring-inset ring-rule focus:outline-none focus:ring-2 focus:ring-brand-900" />
        {!reference.trim() && <p className="mt-2 text-[12px] text-attention-deep">A reference is needed so the payment can be traced.</p>}
      </Confirm>
    </>
  );
}

function AgentDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const { data: a, isLoading } = useGetAgentQuery(id);
  const [approve, { isLoading: approving }] = useApproveAgentMutation();
  const [suspend, { isLoading: suspending }] = useSuspendAgentMutation();
  const [setRate, { isLoading: savingRate }] = useSetAgentRateMutation();
  const [reverse] = useReverseCommissionMutation();
  const [rate, setRateInput] = useState<string | null>(null);
  const [confirmSuspend, setConfirmSuspend] = useState(false);
  const [linking, setLinking] = useState(false);

  const shownRate = rate ?? (a?.commissionRate == null ? "" : String(Math.round(a.commissionRate * 1000) / 10));

  return (
    <Drawer
      open
      onClose={onClose}
      width="max-w-[620px]"
      title={a ? nameOf(a) : "Agent"}
      subtitle={a ? [a.region, a.phone, a.email].filter(Boolean).join(" · ") : undefined}
      footer={
        a && (
          <div className="flex flex-wrap gap-2">
            {a.status === "approved" ? (
              <Btn variant="danger" size="sm" icon={<PauseCircle size={14} />} onClick={() => setConfirmSuspend(true)}>
                Pause agent
              </Btn>
            ) : (
              <Btn size="sm" icon={<Check size={14} />} loading={approving} disabled={!a.kycCompleted} onClick={() => approve(a.id)}>
                {a.status === "suspended" ? "Reinstate" : "Approve"}
              </Btn>
            )}
            {a.status === "approved" && (
              <Btn variant="secondary" size="sm" icon={<UserPlus size={14} />} onClick={() => setLinking(true)}>
                Link a person
              </Btn>
            )}
            {a.status === "approved" && a.referralCode && (
              <Btn
                variant="secondary"
                size="sm"
                loading={approving}
                title="Link anyone who has signed up with their code since they were approved"
                onClick={() => approve(a.id)}
              >
                Re-sync referrals
              </Btn>
            )}
          </div>
        )
      }
    >
      {isLoading || !a ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : (
        <div className="space-y-7">
          <div className="flex flex-wrap gap-1.5">
            <Pill tone={a.status === "approved" ? "green" : a.status === "applied" ? "orange" : "gray"} dot>
              {a.status === "approved" ? "Active" : a.status === "applied" ? "Applied" : a.status === "suspended" ? "Paused" : "Declined"}
            </Pill>
            <Pill tone={a.kycCompleted ? "green" : "orange"}>{a.kycCompleted ? "ID verified" : "ID not verified"}</Pill>
            {a.referralCode && <Pill tone="blue"><Link2 size={11} /> {a.referralCode}</Pill>}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {(["payable", "holding", "paid"] as const).map((k) => (
              <div key={k} className="rounded-xl bg-paper px-3 py-2.5">
                <p className="text-[11.5px] text-ink-soft">{k === "payable" ? "Ready to pay" : k === "holding" ? "On hold" : "Paid"}</p>
                <p className="tnum font-bold text-ink">
                  {Object.keys(a.balances).length ? Object.entries(a.balances).map(([c, b]) => money(c, b[k])).join(" + ") : money("NGN", 0)}
                </p>
              </div>
            ))}
          </div>

          <section>
            <h3 className="mb-2 text-[14px] font-bold text-ink">Commission rate</h3>
            <div className="flex items-center gap-2">
              <input
                value={shownRate}
                onChange={(e) => setRateInput(e.target.value)}
                placeholder="Default"
                inputMode="decimal"
                aria-label="Commission rate in percent"
                className="h-9 w-24 rounded-lg border-0 px-3 text-sm ring-1 ring-inset ring-rule focus:outline-none focus:ring-2 focus:ring-brand-900"
              />
              <span className="text-sm text-ink-soft">% of the platform fee</span>
              <Btn
                size="sm"
                variant="secondary"
                loading={savingRate}
                disabled={rate === null}
                onClick={async () => {
                  const value = rate?.trim() ? Number(rate) / 100 : null;
                  await setRate({ id: a.id, rate: value }).unwrap().catch(() => undefined);
                  setRateInput(null);
                }}
              >
                Save
              </Btn>
            </div>
            <p className="mt-1 text-[12px] text-ink-faint">Leave empty for the default. Applies to orders released from now on.</p>
          </section>

          <section>
            <h3 className="mb-2 text-[14px] font-bold text-ink">Payout details</h3>
            <p className="text-[13.5px] text-ink">
              {a.bankName && a.accountNumber ? `${a.bankName} · ${a.accountNumber}${a.accountName ? ` · ${a.accountName}` : ""}` : <span className="text-attention-deep">Not given yet</span>}
            </p>
          </section>

          {a.pitch && (
            <section>
              <h3 className="mb-2 text-[14px] font-bold text-ink">Their application</h3>
              <p className="whitespace-pre-line rounded-lg bg-paper px-3.5 py-2.5 text-[13.5px] leading-relaxed text-ink">{a.pitch}</p>
            </section>
          )}

          <section>
            <h3 className="mb-2 text-[14px] font-bold text-ink">
              People brought in <span className="font-normal text-ink-faint">({a.people.length})</span>
            </h3>
            {!a.people.length ? (
              <p className="text-[13px] text-ink-faint">None yet.</p>
            ) : (
              <ul className="divide-y divide-rule rounded-xl ring-1 ring-rule">
                {a.people.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-[13px]">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">{p.company || [p.firstName, p.lastName].filter(Boolean).join(" ")}</p>
                      <p className="text-[12px] text-ink-faint">
                        {p.isSeller ? "Seller" : "Buyer"} · joined {formatDate(p.joinedAt)} · counts until {formatDate(p.expiresAt)}
                        {p.source === "admin" ? " · linked by staff" : ""}
                      </p>
                    </div>
                    <span className="tnum shrink-0 text-[12px] text-ink-soft">
                      {p.isSeller ? `${p.listings} listed` : `${p.requests} requests`} · {p.sales} sales
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className="mb-2 text-[14px] font-bold text-ink">Commission</h3>
            {!a.ledger.length ? (
              <p className="text-[13px] text-ink-faint">None yet. It's recorded when an order from one of their people is released.</p>
            ) : (
              <ul className="divide-y divide-rule rounded-xl ring-1 ring-rule">
                {a.ledger.map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-[13px]">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">{l.orderTitle || "Order"}</p>
                      <p className="text-[12px] text-ink-faint">
                        {l.sides === "both" ? "buyer and seller" : l.sides} · {Math.round(l.rate * 100)}% of {money(l.currency, l.baseFee)} ·{" "}
                        {l.status === "paid" ? `paid ${formatDate(l.paidAt)}` : l.status === "reversed" ? `reversed: ${l.reversalReason ?? ""}` : new Date(l.availableAt) <= new Date() ? "ready to pay" : `on hold until ${formatDate(l.availableAt)}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className={`tnum font-semibold ${l.status === "reversed" ? "text-ink-faint line-through" : "text-ink"}`}>{money(l.currency, l.amount)}</span>
                      {l.status === "pending" && (
                        <button
                          className="cursor-pointer rounded-md px-1.5 py-0.5 text-[11.5px] font-semibold text-danger hover:bg-danger-soft"
                          onClick={() => {
                            const reason = window.prompt("Why reverse this commission? (the agent and the log see this)");
                            if (reason && reason.trim().length >= 5) reverse({ id: l.id, reason: reason.trim() });
                          }}
                        >
                          Reverse
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {a.payouts.length > 0 && (
            <section>
              <h3 className="mb-2 text-[14px] font-bold text-ink">Payouts</h3>
              <ul className="space-y-1.5 text-[13px]">
                {a.payouts.map((p) => (
                  <li key={p.id} className="flex justify-between gap-3">
                    <span className="text-ink-soft">
                      {formatDate(p.paidAt)} · ref <span className="font-mono">{p.reference}</span>
                    </span>
                    <span className="tnum font-semibold text-ink">{money(p.currency, p.amount)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      <Confirm
        open={confirmSuspend}
        title="Pause this agent?"
        confirmLabel="Pause"
        loading={suspending}
        onCancel={() => setConfirmSuspend(false)}
        onConfirm={async () => {
          await suspend({ id }).unwrap().catch(() => undefined);
          setConfirmSuspend(false);
        }}
      >
        They stop earning on orders released from now on. What they've already earned stays theirs, and you can reinstate them.
      </Confirm>

      {linking && a && <LinkPerson agentId={a.id} onClose={() => setLinking(false)} />}
    </Drawer>
  );
}

/** Pick someone who joined without the agent's code and link them. */
function LinkPerson({ agentId, onClose }: { agentId: string; onClose: () => void }) {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [picked, setPicked] = useState<{ id: string; name: string } | null>(null);
  useDebounce(() => setDebounced(search.trim()), 300, [search]);
  const { data, isFetching } = useGetUsersQuery({ page: 1, limit: 8, search: debounced }, { skip: debounced.length < 2 });
  const [link, { isLoading }] = useLinkPersonMutation();

  return (
    <Confirm
      open
      title="Link a person to this agent"
      confirmLabel={picked ? `Link ${picked.name}` : "Link"}
      loading={isLoading}
      onCancel={onClose}
      onConfirm={async () => {
        if (!picked) return;
        await link({ id: agentId, userId: picked.id }).unwrap().catch(() => undefined);
        onClose();
      }}
    >
      <p>For someone the agent brought in who signed up without their code. They count from the day they joined, for 12 months.</p>
      <div className="relative mt-4">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
        <input
          autoFocus
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPicked(null); }}
          placeholder="Search name, email or phone"
          className="h-10 w-full rounded-lg border-0 pl-9 pr-3 text-sm ring-1 ring-inset ring-rule focus:outline-none focus:ring-2 focus:ring-brand-900"
        />
      </div>
      <ul className="mt-2 max-h-56 overflow-y-auto">
        {isFetching && <li className="px-2 py-2 text-[12.5px] text-ink-faint">Searching…</li>}
        {(data?.data ?? []).map((u) => {
          const name = [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email;
          const active = picked?.id === u.id;
          return (
            <li key={u.id}>
              <button
                type="button"
                onClick={() => setPicked({ id: u.id, name })}
                className={`flex w-full cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-left text-[13px] ${active ? "bg-brand-50 text-brand-950" : "hover:bg-paper"}`}
              >
                <span>
                  <span className="font-medium">{name}</span> <span className="text-ink-faint">{u.email}</span>
                </span>
                {active && <Check size={14} />}
              </button>
            </li>
          );
        })}
      </ul>
    </Confirm>
  );
}
