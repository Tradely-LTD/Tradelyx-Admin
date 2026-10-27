import { useState } from "react";
import { Globe } from "lucide-react";

import { Card, EmptyState, PageHeader, Skeleton, Tabs, formatNumber } from "@/common/ui/kit";
import { Breakdown, useGetVisitSummaryQuery } from "./growth-api";

/**
 * Website visitors (TradelyBackend modules/visits): everyone who opens the
 * site, signed up or not, counted once a day under an anonymous id, and how
 * many of them go on to start and finish signing up. Countries aren't
 * recorded here (Hotjar has them).
 */

type Window = "7" | "30" | "90";

const SOURCE: Record<string, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  facebook: "Facebook",
  google: "Google",
  x: "X (Twitter)",
  linkedin: "LinkedIn",
  sticker: "Store sticker / QR",
  share: "Shared link",
  tradelyx: "TradelyX",
  direct: "Direct (typed or bookmark)",
  other: "Other sites",
};
const DEVICE: Record<string, string> = { mobile: "Phone", tablet: "Tablet", desktop: "Computer" };
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
const weekLabel = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

export default function VisitorsPage() {
  const [days, setDays] = useState<Window>("30");
  const { data, isLoading, isError, isFetching } = useGetVisitSummaryQuery(Number(days));
  const v = data?.data;
  const total = v?.weekly.reduce((t, w) => ({ started: t.started + w.started, completed: t.completed + w.completed }), { started: 0, completed: 0 });

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title="Visitors"
        description="Everyone who opens the website, signed up or not, once a day per person (anonymous; nobody is named), and how many go on to sign up. Recorded from 27 Oct 2026; countries are in Hotjar."
      />
      <div className="mb-4">
        <Tabs<Window>
          value={days}
          onChange={setDays}
          items={[
            { value: "7", label: "7 days" },
            { value: "30", label: "30 days" },
            { value: "90", label: "90 days" },
          ]}
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : isError || !v || !total ? (
        <Card>
          <EmptyState icon={<Globe size={20} />} title="Couldn't load visitors">
            Your staff account needs the Marketing & prospects section, or visit counting isn't live on the API yet.
          </EmptyState>
        </Card>
      ) : (
        <div className={`space-y-5 transition-opacity ${isFetching ? "opacity-60" : ""}`}>
          <div className="grid gap-3 sm:grid-cols-4">
            <Stat label="Visitors" value={formatNumber(v.totals.visitors)} />
            <Stat label="Visits" value={formatNumber(v.totals.visits)} note="one per person per day" />
            <Stat label="Started signing up" value={formatNumber(total.started)} note={`${pct(total.started, v.totals.visitors)}% of visitors`} />
            <Stat label="Signed up" value={formatNumber(total.completed)} note={`${pct(total.completed, v.totals.visitors)}% of visitors`} />
          </div>

          <Card className="overflow-hidden">
            <div className="border-b border-rule px-5 py-3">
              <h2 className="text-[15px] font-semibold text-ink">Visit to sign-up, by week</h2>
              <p className="text-[13px] text-ink-soft">Of each week's visitors, how many started signing up that week and how many finished.</p>
            </div>
            {!v.weekly.length ? (
              <EmptyState icon={<Globe size={20} />} title="No visits recorded yet" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-rule bg-paper text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-faint">
                      <th className="py-3 pl-5">Week of</th>
                      <th className="px-3 py-3 text-right">Visitors</th>
                      <th className="px-3 py-3 text-right">New</th>
                      <th className="px-3 py-3 text-right">Started sign-up</th>
                      <th className="px-3 py-3 pr-5 text-right">Signed up</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rule">
                    {[...v.weekly].reverse().map((w) => (
                      <tr key={w.weekStart}>
                        <td className="py-3 pl-5 font-semibold text-ink">{weekLabel(w.weekStart)}</td>
                        <td className="tnum px-3 py-3 text-right font-semibold text-ink">{formatNumber(w.visitors)}</td>
                        <td className="tnum px-3 py-3 text-right">{formatNumber(w.newVisitors)} <span className="text-[11.5px] text-ink-faint">{pct(w.newVisitors, w.visitors)}%</span></td>
                        <td className="tnum px-3 py-3 text-right">{formatNumber(w.started)} <span className="text-[11.5px] text-ink-faint">{pct(w.started, w.visitors)}%</span></td>
                        <td className="tnum px-3 py-3 pr-5 text-right font-semibold text-ink">{formatNumber(w.completed)} <span className="text-[11.5px] font-normal text-ink-faint">{pct(w.completed, w.visitors)}%</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <div className="grid gap-5 lg:grid-cols-2">
            <BarList title="Where they came from" note="The share tag or campaign on the link, else the site that sent them." items={v.sources} label={(k) => SOURCE[k] ?? k} total={v.totals.visitors} />
            <BarList title="First page they saw" note="Where each visitor's day started." items={v.pages} label={(k) => k} total={v.totals.visitors} mono />
            <BarList title="Device" note="From the browser." items={v.devices} label={(k) => DEVICE[k] ?? k} total={v.totals.visitors} />
            <BarList title="Campaigns" note="The utm_campaign on ad and newsletter links." items={v.campaigns} label={(k) => k} total={v.totals.visitors} empty="No campaign links used yet. Add ?utm_campaign=name to ad links to see them here." />
          </div>
        </div>
      )}
    </>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <Card className="px-5 py-4">
      <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-faint">{label}</p>
      <p className="tnum mt-1 text-[22px] font-bold text-ink">{value}</p>
      {note ? <p className="text-[12px] text-ink-faint">{note}</p> : null}
    </Card>
  );
}

function BarList({ title, note, items, label, total, mono, empty }: { title: string; note: string; items: Breakdown; label: (key: string) => string; total: number; mono?: boolean; empty?: string }) {
  const top = items[0]?.visitors ?? 1;
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-rule px-5 py-3">
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        <p className="text-[13px] text-ink-soft">{note}</p>
      </div>
      {!items.length ? (
        <p className="px-5 py-4 text-[13px] text-ink-faint">{empty ?? "Nothing yet."}</p>
      ) : (
        <ul className="divide-y divide-rule">
          {items.map((i) => (
            <li key={i.key} className="px-5 py-2.5">
              <div className="flex items-baseline justify-between gap-3">
                <p className={`min-w-0 truncate text-[13.5px] text-ink ${mono ? "font-mono text-[12.5px]" : "font-medium"}`}>{label(i.key)}</p>
                <p className="tnum shrink-0 text-[13px] text-ink-soft">
                  <span className="font-semibold text-ink">{formatNumber(i.visitors)}</span> · {pct(i.visitors, total)}%
                </p>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-paper-deep" aria-hidden>
                <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.max((i.visitors / top) * 100, 3)}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
