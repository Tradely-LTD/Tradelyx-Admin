import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Handshake, Search, Share2, Users } from "lucide-react";

import { Referrer, useEnrollAgentMutation, useGetReferredPeopleQuery, useGetReferrersQuery } from "../agents/agents-api";
import { Btn, Card, Confirm, Drawer, EmptyState, PageHeader, Pill, Skeleton, formatDate, formatNumber, initials } from "@/common/ui/kit";

/**
 * Referrals, for admins: everyone whose referral code has brought people
 * onto TradelyX, and what those people did.
 *
 * The obvious agents are already here: someone with twenty signups is doing
 * the job. "Make agent" enrols them (their ID must be verified), links every
 * person who used their code, and from then on they earn on orders from
 * people who joined in the last 12 months.
 */

const nameOf = (r: { firstName?: string | null; lastName?: string | null; email?: string | null }) =>
  [r.firstName, r.lastName].filter(Boolean).join(" ") || r.email || "Someone";

export default function Referrers() {
  const { data, isLoading } = useGetReferrersQuery();
  const [enroll, { isLoading: enrolling }] = useEnrollAgentMutation();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<Referrer | null>(null);
  const [making, setMaking] = useState<Referrer | null>(null);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data?.data ?? []).filter((r) => !term || [nameOf(r), r.email, r.code, r.phone].some((v) => String(v ?? "").toLowerCase().includes(term)));
  }, [data, search]);
  const totals = useMemo(
    () => ({
      referrers: data?.data.length ?? 0,
      signups: (data?.data ?? []).reduce((s, r) => s + r.signups, 0),
      agents: (data?.data ?? []).filter((r) => r.agentStatus === "approved").length,
    }),
    [data]
  );

  return (
    <>
      <PageHeader
        eyebrow="People"
        title="Referrals"
        description="Everyone whose referral code has brought people onto TradelyX. The strongest referrers are your natural agents: make them one and they earn on their people's orders."
        actions={
          <Link to="/agents">
            <Btn variant="secondary" icon={<Handshake size={16} />}>Agents</Btn>
          </Link>
        }
      />

      <div className="mb-6 grid grid-cols-3 gap-3">
        {[
          ["Referrers", totals.referrers],
          ["People brought in", totals.signups],
          ["Already agents", totals.agents],
        ].map(([label, value]) => (
          <Card key={label as string} className="px-4 py-3.5">
            <p className="text-[12px] text-ink-soft">{label}</p>
            {isLoading ? <Skeleton className="mt-1 h-5 w-10" /> : <p className="tnum text-lg font-bold text-ink">{formatNumber(value as number)}</p>}
          </Card>
        ))}
      </div>

      <div className="relative mb-4 lg:w-80">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email or code"
          aria-label="Search referrers"
          className="h-10 w-full rounded-lg border-0 bg-white pl-9 pr-3 text-[13.5px] text-ink shadow-sm ring-1 ring-inset ring-rule placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-brand-900"
        />
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="space-y-3 p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : !rows.length ? (
          <EmptyState icon={<Share2 size={20} />} title="No referrals yet">When someone signs up with a referral code, its owner appears here.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-[13.5px]">
              <thead>
                <tr className="border-b border-rule bg-paper text-[11.5px] font-semibold uppercase tracking-[0.06em] text-ink-faint">
                  <th className="px-5 py-3">Referrer</th>
                  <th className="px-3 py-3">Code</th>
                  <th className="px-3 py-3">Brought in</th>
                  <th className="px-3 py-3">Last 12 months</th>
                  <th className="px-3 py-3">Last signup</th>
                  <th className="px-3 py-3">Agent</th>
                  <th className="px-3 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {rows.map((r) => (
                  <tr key={r.id} className="cursor-pointer transition-colors hover:bg-brand-50/40" onClick={() => setOpen(r)}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-paper-deep text-[12px] font-bold text-ink-soft">{initials(r.firstName, r.lastName)}</div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-ink">{nameOf(r)}</p>
                          <p className="truncate text-[12.5px] text-ink-soft">{r.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 font-mono text-[12.5px] text-ink-soft">{r.code}</td>
                    <td className="tnum px-3 py-3 text-ink">
                      {r.signups} <span className="text-ink-faint">({r.sellers} sellers)</span>
                    </td>
                    <td className="tnum px-3 py-3 text-ink-soft">{r.recent}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-ink-soft">{formatDate(r.lastSignup)}</td>
                    <td className="px-3 py-3">
                      {r.agentStatus === "approved" ? (
                        <Pill tone="green" dot>Agent</Pill>
                      ) : r.agentStatus === "applied" ? (
                        <Pill tone="orange" dot>Applied</Pill>
                      ) : r.agentStatus === "suspended" ? (
                        <Pill tone="gray" dot>Paused</Pill>
                      ) : (
                        <span className="text-[12.5px] text-ink-faint">No</span>
                      )}
                    </td>
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      {r.agentStatus !== "approved" && (
                        <Btn size="sm" variant="secondary" icon={<Handshake size={14} />} onClick={() => setMaking(r)}>
                          Make agent
                        </Btn>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {open && <ReferredDrawer referrer={open} onClose={() => setOpen(null)} onMake={() => setMaking(open)} />}

      <Confirm
        open={!!making}
        title={making ? `Make ${nameOf(making)} an agent?` : ""}
        confirmLabel="Make agent"
        loading={enrolling}
        onCancel={() => setMaking(null)}
        onConfirm={async () => {
          if (!making) return;
          await enroll(making.id).unwrap().catch(() => undefined);
          setMaking(null);
        }}
      >
        {making && !making.kycCompleted ? (
          <p className="text-attention-deep">
            Their ID isn't verified yet, so this will be refused: agents are paid. Ask them to verify under Account → Identity verification, then approve it in KYC review.
          </p>
        ) : (
          <p>
            They get an Agent workspace on the web, and all {making?.signups} people who used code <span className="font-mono">{making?.code}</span> are linked to them. They earn on orders
            from the {making?.recent} who joined in the last {data?.windowMonths ?? 12} months, and on everyone new.
          </p>
        )}
      </Confirm>
    </>
  );
}

function ReferredDrawer({ referrer, onClose, onMake }: { referrer: Referrer; onClose: () => void; onMake: () => void }) {
  const { data, isLoading } = useGetReferredPeopleQuery(referrer.id);
  return (
    <Drawer
      open
      onClose={onClose}
      title={nameOf(referrer)}
      subtitle={`Code ${referrer.code} · ${referrer.signups} people brought in`}
      footer={
        referrer.agentStatus !== "approved" ? (
          <Btn size="sm" icon={<Handshake size={14} />} onClick={onMake}>
            Make agent
          </Btn>
        ) : (
          <Link to="/agents">
            <Btn size="sm" variant="secondary">Open in Agents</Btn>
          </Link>
        )
      }
    >
      <p className="mb-4 text-[13px] text-ink-soft">{[referrer.phone, referrer.email].filter(Boolean).join(" · ")}</p>
      {isLoading ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12" />)}</div>
      ) : !data?.length ? (
        <EmptyState icon={<Users size={20} />} title="No one found" />
      ) : (
        <ul className="divide-y divide-rule rounded-xl ring-1 ring-rule">
          {data.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-[13px]">
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">{p.company || [p.firstName, p.lastName].filter(Boolean).join(" ") || p.email}</p>
                <p className="text-[12px] text-ink-faint">
                  {p.isSeller ? "Seller" : "Buyer"} · joined {formatDate(p.joinedAt)}
                  {p.kycCompleted ? " · ID verified" : ""}
                </p>
              </div>
              <span className="tnum shrink-0 text-[12px] text-ink-soft">{p.sales} sales</span>
            </li>
          ))}
        </ul>
      )}
    </Drawer>
  );
}
