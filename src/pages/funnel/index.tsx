import { useState } from "react";
import { ArrowDownRight, ArrowUpRight, Filter, Minus } from "lucide-react";

import { Card, EmptyState, PageHeader, Skeleton, Tabs, formatNumber } from "@/common/ui/kit";
import { FunnelWeek, Money, Pulse, useGetFunnelQuery, useGetPulseQuery } from "./funnel-api";

/**
 * The funnel (roadmap #12f): people who signed up each week, and how many of
 * them have since passed ID checks, posted a request, had a quote, paid and
 * had money released. The step with the biggest fall is where to work next.
 * Beside it, last week's numbers exactly as the Monday pulse email (#12j)
 * sends them.
 */

type Window = "4" | "8" | "12";

const STEPS: { key: keyof Omit<FunnelWeek, "weekStart" | "sellers">; label: string; hint: string }[] = [
  { key: "signups", label: "Signed up", hint: "New accounts" },
  { key: "kyc", label: "ID verified", hint: "Passed ID checks" },
  { key: "requested", label: "Posted a request", hint: "At least one buyer request" },
  { key: "quoted", label: "Got a quote", hint: "A seller quoted them" },
  { key: "paid", label: "Paid", hint: "Paid into escrow" },
  { key: "released", label: "Released", hint: "Money released to a seller" },
];

const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);
const weekLabel = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

export default function FunnelPage() {
  const [weeks, setWeeks] = useState<Window>("8");
  const { data, isLoading, isError, isFetching } = useGetFunnelQuery(Number(weeks));
  const rows = data?.data ?? [];
  const totals = STEPS.reduce((t, s) => ({ ...t, [s.key]: rows.reduce((n, r) => n + r[s.key], 0) }), {} as Record<(typeof STEPS)[number]["key"], number>);

  // Where the most people fall away between two steps
  const drops = STEPS.slice(1).map((s, i) => ({ step: s.label, from: STEPS[i].label, kept: pct(totals[s.key], totals[STEPS[i].key]) }));
  const worst = totals.signups ? drops.reduce((a, b) => (b.kept < a.kept ? b : a), drops[0]) : null;

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title="Funnel"
        description="People who signed up each week, and how far they have got since: ID checks, a request, a quote, paying and the money released. Weeks run Monday to Sunday (UTC); staff accounts are left out."
      />

      <div className="mb-4">
        <Tabs<Window>
          value={weeks}
          onChange={setWeeks}
          items={[
            { value: "4", label: "4 weeks" },
            { value: "8", label: "8 weeks" },
            { value: "12", label: "12 weeks" },
          ]}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.7fr_1fr]">
        {/* min-w-0: the wide weekly table scrolls inside its card instead of widening the page */}
        <div className="min-w-0 space-y-5">
          {isLoading ? (
            <Skeleton className="h-72" />
          ) : isError ? (
            <Card>
              <EmptyState icon={<Filter size={20} />} title="Couldn't load the funnel">
                Your staff account needs the Marketing & prospects section, or the funnel isn't live on the API yet.
              </EmptyState>
            </Card>
          ) : (
            <>
              <Card className={`px-5 py-5 transition-opacity ${isFetching ? "opacity-60" : ""}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-[15px] font-semibold text-ink">Everyone who signed up in these {weeks} weeks</h2>
                  {worst && worst.kept < 100 ? (
                    <p className="text-[13px] text-attention-deep">
                      Biggest drop: {worst.from} → {worst.step} ({100 - worst.kept}% stop here)
                    </p>
                  ) : null}
                </div>
                <ol className="mt-4 space-y-2.5">
                  {STEPS.map((s, i) => {
                    const value = totals[s.key];
                    const width = totals.signups ? Math.max((value / totals.signups) * 100, value ? 2 : 0) : 0;
                    const fromPrev = i ? pct(value, totals[STEPS[i - 1].key]) : null;
                    return (
                      <li key={s.key} className="grid grid-cols-[6.5rem_1fr_auto] items-center gap-2.5 sm:grid-cols-[11rem_1fr_auto] sm:gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-[13.5px] font-semibold text-ink">{s.label}</p>
                          <p className="truncate text-[11.5px] text-ink-faint">{s.hint}</p>
                        </div>
                        <div className="h-7 overflow-hidden rounded-md bg-paper-deep">
                          <div
                            className="flex h-full items-center rounded-md bg-brand px-2 text-[12px] font-semibold text-white transition-[width] duration-300"
                            style={{ width: `${width}%`, opacity: 1 - i * 0.11 }}
                          >
                            {width > 12 ? `${pct(value, totals.signups)}%` : ""}
                          </div>
                        </div>
                        <div className="w-16 text-right sm:w-24">
                          <p className="tnum text-[15px] font-bold text-ink">{formatNumber(value)}</p>
                          {fromPrev !== null ? <p className="tnum text-[11.5px] text-ink-faint">{fromPrev}%<span className="hidden sm:inline"> of previous</span></p> : null}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </Card>

              <Card className="overflow-hidden">
                <div className="border-b border-rule px-5 py-3">
                  <h2 className="text-[15px] font-semibold text-ink">Week by week</h2>
                  <p className="text-[13px] text-ink-soft">By the week people signed up. Percentages are of that week's sign-ups.</p>
                </div>
                {!rows.length ? (
                  <EmptyState icon={<Filter size={20} />} title="No sign-ups in this period" />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] text-left text-[13px]">
                      <thead>
                        <tr className="border-b border-rule bg-paper text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-faint">
                          <th className="py-3 pl-5">Week of</th>
                          {STEPS.map((s) => (
                            <th key={s.key} className="px-2 py-3 text-right last:pr-5">{s.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-rule">
                        {[...rows].reverse().map((r) => (
                          <tr key={r.weekStart}>
                            <td className="py-3 pl-5 font-semibold text-ink">
                              {weekLabel(r.weekStart)}
                              {r.sellers ? <span className="ml-1.5 text-[11.5px] font-normal text-ink-faint">{r.sellers} sellers</span> : null}
                            </td>
                            {STEPS.map((s) => (
                              <td key={s.key} className="tnum px-2 py-3 text-right last:pr-5">
                                <span className="font-semibold text-ink">{formatNumber(r[s.key])}</span>
                                {s.key !== "signups" && r.signups ? <span className="ml-1 text-[11.5px] text-ink-faint">{pct(r[s.key], r.signups)}%</span> : null}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </>
          )}
        </div>

        <PulseCard />
      </div>
    </>
  );
}

const money = (m: Money) => {
  try {
    return new Intl.NumberFormat("en-NG", { style: "currency", currency: m.currency, maximumFractionDigits: 0 }).format(m.amount);
  } catch {
    return `${m.currency} ${formatNumber(Math.round(m.amount))}`;
  }
};

function PulseCard() {
  const { data, isLoading, isError } = useGetPulseQuery();
  const p: Pulse | undefined = data?.data;
  if (isLoading) return <Skeleton className="h-96" />;
  if (isError || !p) return null;

  const end = new Date(new Date(p.endsAt).getTime() - 86_400_000).toISOString().slice(0, 10);
  const rows = [
    { label: "New sign-ups", now: p.current.signups, before: p.previous.signups, note: `${p.current.signupBuyers} buyers, ${p.current.signupSellers} sellers` },
    { label: "ID checks approved", now: p.current.kycApproved, before: p.previous.kycApproved },
    { label: "Requests posted", now: p.current.requests, before: p.previous.requests },
    { label: "Quotes sent", now: p.current.quotes, before: p.previous.quotes },
    { label: "Orders paid", now: p.current.paidOrders, before: p.previous.paidOrders, note: p.current.paidValue.map(money).join(" + ") || undefined },
    { label: "Released to sellers", now: p.current.released, before: p.previous.released },
  ];

  return (
    <Card className="h-fit overflow-hidden">
      <div className="border-b border-rule bg-brand-50/60 px-5 py-3">
        <p className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-brand-900">Last week · {weekLabel(p.startsAt.slice(0, 10))} – {weekLabel(end)}</p>
        <p className="text-[13px] text-ink-soft">What Monday's pulse email says. Against the week before.</p>
      </div>
      <ul className="divide-y divide-rule">
        {rows.map((r) => {
          const diff = r.now - r.before;
          const Icon = diff > 0 ? ArrowUpRight : diff < 0 ? ArrowDownRight : Minus;
          return (
            <li key={r.label} className="flex items-center justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <p className="text-[13.5px] text-ink">{r.label}</p>
                {r.note ? <p className="truncate text-[11.5px] text-ink-faint">{r.note}</p> : null}
              </div>
              <div className="flex items-center gap-2">
                <span className="tnum text-[18px] font-bold text-ink">{formatNumber(r.now)}</span>
                <span
                  className={`inline-flex items-center gap-0.5 text-[12px] font-semibold ${diff > 0 ? "text-brand-900" : diff < 0 ? "text-attention-deep" : "text-ink-faint"}`}
                  title={`Week before: ${r.before}`}
                >
                  <Icon size={13} />
                  {diff === 0 ? "" : formatNumber(Math.abs(diff))}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="space-y-3 border-t border-rule px-5 py-4 text-[13px]">
        <div>
          <p className="font-semibold text-ink">Most requested</p>
          <p className="text-ink-soft">{p.current.topCategories.map((t) => `${t.category} (${t.requests})`).join(", ") || "No requests"}</p>
        </div>
        <div>
          <p className="font-semibold text-ink">Wanted, not supplied</p>
          <p className="text-ink-soft">
            {formatNumber(p.current.unquotedRequests)} requests with no quote
            {p.current.emptySearches.length ? ` · searched, found nothing: ${p.current.emptySearches.map((s) => s.query).join(", ")}` : ""}
          </p>
        </div>
        <p className="text-ink-soft">
          <span className="font-semibold text-ink">{formatNumber(p.hotBuyers)}</span> hot {p.hotBuyers === 1 ? "buyer" : "buyers"} to call now
        </p>
      </div>
    </Card>
  );
}
