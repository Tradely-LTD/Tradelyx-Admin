import { Link } from "react-router-dom";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { ArrowRight, Award, Mail, Megaphone, ShieldCheck, Store, ShoppingBag } from "lucide-react";

import { useGetStatsChartQuery, useGetStatsQuery } from "./stats-api";
import { useUserSlice } from "../auth/authSlice";
import { useGetKycSubmissionsQuery } from "../kyc/kyc-api";
import { useGetCertificationsQuery } from "../certificates/certificates-api";
import { Segment, SegmentKey, useGetSegmentsQuery } from "../outreach/outreach-api";
import { Btn, Card, PageHeader, Skeleton, formatNumber } from "@/common/ui/kit";

/** Which ready-made email fixes which stall (TradelyBackend outreach/templates.ts) */
export const TEMPLATE_FOR: Partial<Record<SegmentKey, string>> = {
  buyers_incomplete_profile: "buyer_complete_profile",
  buyers_no_kyc: "buyer_verify_identity",
  buyers_no_request: "buyer_first_request",
  sellers_no_products: "seller_add_products",
  sellers_incomplete_store: "seller_finish_store",
  sellers_no_certifications: "seller_add_certifications",
  sellers_no_kyc: "seller_verify_identity",
};

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

export default function AdminDashboard() {
  const { loginResponse } = useUserSlice();
  const isAdmin = loginResponse?.user.roles === "admin";
  const { data: stats, isLoading: statsLoading } = useGetStatsQuery({});
  const { data: chart, isLoading: chartLoading } = useGetStatsChartQuery({});
  const s = stats?.data ?? {};

  const kpis = [
    { label: "Users", value: s.totalUsers, note: "All accounts" },
    { label: "Buyers", value: s.usersByRole?.buyer, note: "Acting as buyer" },
    { label: "Sellers", value: s.usersByRole?.seller, note: "Acting as seller" },
    { label: "Live sell offers", value: s.activeSellOffers, note: "Active now" },
    ...(isAdmin
      ? [
          { label: "Buyer requests", value: s.totalRFQs, note: "RFQs posted" },
          { label: "Freight requests", value: s.totalRFFs, note: "RFFs posted" },
        ]
      : [{ label: "Agents", value: s.usersByRole?.agent, note: "Field agents" }]),
  ];

  return (
    <>
      <PageHeader
        eyebrow={new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
        title={`${greeting()}, ${loginResponse?.user.firstName ?? "there"}`}
        description={isAdmin ? "Here is who is waiting on you, and who is stuck setting up." : "An overview of the people and listings you look after."}
        actions={
          isAdmin && (
            <Link to="/outreach">
              <Btn icon={<Megaphone size={16} />}>Outreach</Btn>
            </Link>
          )
        }
      />

      <Card className="grid grid-cols-2 gap-px overflow-hidden bg-rule sm:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k) => (
          <div key={k.label} className="bg-white px-5 py-4">
            <p className="text-[12.5px] font-medium text-ink-soft">{k.label}</p>
            {statsLoading ? (
              <Skeleton className="mt-2 h-7 w-16" />
            ) : (
              <p className="tnum mt-1 text-[26px] font-bold tracking-[-0.02em] text-ink">{formatNumber(k.value)}</p>
            )}
            <p className="text-[11.5px] text-ink-faint">{k.note}</p>
          </div>
        ))}
      </Card>

      {isAdmin && (
        <>
          <ReviewQueues />
          <OnboardingFunnel />
        </>
      )}

      <section className="mt-10">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-[15px] font-bold text-ink">Activity</h2>
          <p className="text-[12.5px] text-ink-faint">New per day</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Spark title="New users" dataKey="users" data={chart?.data} loading={chartLoading} />
          <Spark title="Sell offers" dataKey="sellOffers" data={chart?.data} loading={chartLoading} />
          {isAdmin && <Spark title="Buyer requests" dataKey="rfqs" data={chart?.data} loading={chartLoading} />}
          {isAdmin && <Spark title="Freight requests" dataKey="rffs" data={chart?.data} loading={chartLoading} />}
        </div>
      </section>
    </>
  );
}

function ReviewQueues() {
  const { data: kyc, isLoading: kycLoading } = useGetKycSubmissionsQuery({ status: "pending", page: 1, limit: 1 });
  const { data: certs, isLoading: certLoading } = useGetCertificationsQuery("unverified");
  const queues = [
    { label: "ID verifications", sub: "waiting for review", to: "/kyc", icon: ShieldCheck, count: kyc?.pagination?.total ?? 0, loading: kycLoading },
    { label: "Certificates", sub: "waiting to be verified", to: "/certificates", icon: Award, count: certs?.data?.length ?? 0, loading: certLoading },
  ];
  return (
    <section className="mt-10">
      <h2 className="mb-3 text-[15px] font-bold text-ink">Waiting on you</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {queues.map((q) => (
          <Link key={q.to} to={q.to} className="group">
            <Card className="flex items-center gap-4 px-5 py-4 transition-shadow duration-200 group-hover:shadow-lift">
              <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${q.count ? "bg-attention-soft text-attention-deep" : "bg-brand-50 text-brand-900"}`}>
                <q.icon size={20} />
              </div>
              <div className="min-w-0 flex-1">
                {q.loading ? (
                  <Skeleton className="h-6 w-24" />
                ) : (
                  <p className="text-[15px] font-semibold text-ink">
                    <span className="tnum text-[22px] font-bold tracking-[-0.02em]">{q.count}</span> {q.label}
                  </p>
                )}
                <p className="text-[12.5px] text-ink-soft">{q.count ? q.sub : "All caught up"}</p>
              </div>
              <ArrowRight size={18} className="text-ink-faint transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-ink" />
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}

/**
 * Where people stall. Each row is one step of onboarding: how many of that
 * kind of user haven't done it, as a share of all of them, with the list and
 * the ready-made email one click away.
 */
function OnboardingFunnel() {
  const { data: segments, isLoading, isError } = useGetSegmentsQuery();
  const by = (k: SegmentKey) => segments?.find((s) => s.key === k);
  const columns: { title: string; icon: typeof Store; base?: Segment; steps: SegmentKey[] }[] = [
    { title: "Sellers", icon: Store, base: by("all_sellers"), steps: ["sellers_incomplete_store", "sellers_no_products", "sellers_no_certifications", "sellers_no_kyc"] },
    { title: "Buyers", icon: ShoppingBag, base: by("all_buyers"), steps: ["buyers_incomplete_profile", "buyers_no_request", "buyers_no_kyc"] },
  ];

  return (
    <section className="mt-10">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[15px] font-bold text-ink">Stuck in onboarding</h2>
        <p className="text-[12.5px] text-ink-faint">People who haven't finished each step, out of everyone of that kind</p>
      </div>
      {isError ? (
        <Card className="px-5 py-6 text-sm text-ink-soft">Couldn't load onboarding numbers. The API may not have the outreach update yet.</Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {columns.map((col) => (
            <Card key={col.title} className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-rule px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <col.icon size={16} className="text-brand-900" />
                  <h3 className="text-sm font-bold text-ink">{col.title}</h3>
                </div>
                <span className="tnum text-[12.5px] text-ink-soft">{isLoading ? "…" : `${formatNumber(col.base?.count)} total`}</span>
              </div>
              <ul className="divide-y divide-rule">
                {col.steps.map((key) => {
                  const seg = by(key);
                  const total = col.base?.count ?? 0;
                  const pct = seg && total ? Math.round((seg.count / total) * 100) : 0;
                  return (
                    <li key={key} className="group px-5 py-3.5">
                      {isLoading || !seg ? (
                        <Skeleton className="h-9 w-full" />
                      ) : (
                        <>
                          <div className="flex items-center gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[13.5px] font-semibold text-ink">{seg.label}</p>
                              <p className="truncate text-[12px] text-ink-faint">{seg.description}</p>
                            </div>
                            <div className="text-right">
                              <p className="tnum text-[17px] font-bold leading-none text-ink">{formatNumber(seg.count)}</p>
                              <p className="tnum mt-1 text-[11px] text-ink-faint">{pct}%</p>
                            </div>
                          </div>
                          <div className="mt-2.5 flex items-center gap-3">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-brand-50" role="img" aria-label={`${pct}% of ${col.title.toLowerCase()}`}>
                              <div className={`h-full rounded-full ${pct >= 50 ? "bg-attention" : "bg-brand-700"}`} style={{ width: `${Math.max(pct, seg.count ? 2 : 0)}%` }} />
                            </div>
                            <div className="flex shrink-0 gap-1">
                              <Link to={`/users?segment=${key}`} className="rounded-md px-2 py-1 text-[12px] font-semibold text-ink-soft hover:bg-paper-deep hover:text-ink">
                                View
                              </Link>
                              {seg.count > 0 && TEMPLATE_FOR[key] && (
                                <Link
                                  to={`/outreach?template=${TEMPLATE_FOR[key]}`}
                                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-semibold text-brand-900 hover:bg-brand-50"
                                >
                                  <Mail size={12} /> Email them
                                </Link>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

function Spark({ title, dataKey, data, loading }: { title: string; dataKey: string; data?: Record<string, number | string>[]; loading: boolean }) {
  const rows = data ?? [];
  const total = rows.reduce((sum, r) => sum + Number(r[dataKey] ?? 0), 0);
  const label = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return (
    <Card className="px-5 pb-3 pt-4">
      <p className="text-[12.5px] font-medium text-ink-soft">{title}</p>
      {loading ? (
        <Skeleton className="mt-2 h-[92px] w-full" />
      ) : (
        <>
          <p className="tnum mt-0.5 text-xl font-bold text-ink">
            {formatNumber(total)} <span className="text-[12px] font-medium text-ink-faint">in {rows.length} days</span>
          </p>
          <div className="mt-2 h-[64px]" aria-label={`${title}: ${total} over ${rows.length} days`} role="img">
            {rows.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={rows} margin={{ top: 4, right: 2, bottom: 0, left: 2 }}>
                  <defs>
                    <linearGradient id={`g-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#009051" stopOpacity={0.22} />
                      <stop offset="100%" stopColor="#009051" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" hide />
                  <Tooltip
                    cursor={{ stroke: "#9ca3af", strokeWidth: 1, strokeDasharray: "3 3" }}
                    labelFormatter={(d) => label(String(d))}
                    formatter={(v) => [formatNumber(v as number), title]}
                    contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12, fontFamily: "Plus Jakarta Sans" }}
                  />
                  <Area type="monotone" dataKey={dataKey} stroke="#009051" strokeWidth={2} fill={`url(#g-${dataKey})`} activeDot={{ r: 4, stroke: "#fff", strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="pt-5 text-[12px] text-ink-faint">No activity yet</p>
            )}
          </div>
          {rows.length > 0 && (
            <div className="mt-1 flex justify-between text-[10.5px] text-ink-faint">
              <span>{label(String(rows[0].date))}</span>
              <span>{label(String(rows[rows.length - 1].date))}</span>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
