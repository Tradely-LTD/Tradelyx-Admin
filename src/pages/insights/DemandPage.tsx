import { useState } from "react";
import { BarChart2, ExternalLink, FileQuestion, MapPin, SearchX } from "lucide-react";

import { Card, EmptyState, PageHeader, Skeleton, Tabs, formatDate, formatNumber } from "@/common/ui/kit";
import { useGetDemandQuery } from "./insights-api";

/**
 * Demand board (roadmap #12e): what buyers ask for, by category and by where
 * the goods go, and what nobody is supplying: requests no seller quoted and
 * searches that found nothing. Those two lists are the supplier-recruitment
 * list.
 */

type Window = "7" | "30" | "90";
const WEB_URL = "https://web.tradelyx.com";

const countryName = (code: string) => {
  if (code === "Unknown") return "Not given";
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
};

export default function DemandPage() {
  const [days, setDays] = useState<Window>("30");
  const { data, isLoading, isFetching, isError } = useGetDemandQuery(Number(days));
  const demand = data?.data;

  const totals = demand
    ? demand.categories.reduce((t, c) => ({ requests: t.requests + c.requests, unquoted: t.unquoted + c.unquoted }), { requests: 0, unquoted: 0 })
    : null;
  const topCategory = demand?.categories[0]?.requests ?? 1;
  const topCountry = demand?.countries[0]?.requests ?? 1;

  return (
    <>
      <PageHeader
        eyebrow="Marketplace"
        title="Demand"
        description="What buyers want, and where. The requests nobody quoted and the searches that found nothing are the products to find suppliers for."
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
      ) : isError || !demand || !totals ? (
        <Card>
          <EmptyState icon={<BarChart2 size={20} />} title="Couldn't load demand">
            Your staff account needs the Marketing & prospects section, or insights aren't live on the API yet.
          </EmptyState>
        </Card>
      ) : (
        <div className={`space-y-5 transition-opacity ${isFetching ? "opacity-60" : ""}`}>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Requests posted" value={formatNumber(totals.requests)} />
            <Stat
              label="Got no quote"
              value={`${formatNumber(totals.unquoted)}${totals.requests ? ` (${Math.round((totals.unquoted / totals.requests) * 100)}%)` : ""}`}
              attention={totals.unquoted > 0}
            />
            <Stat label="Searches that found nothing" value={formatNumber(demand.emptySearches.length)} attention={demand.emptySearches.length > 0} />
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
            <Card className="overflow-hidden">
              <Header title="By category" note="Requests posted, and how many got at least one quote." />
              {!demand.categories.length ? (
                <EmptyState icon={<BarChart2 size={20} />} title="No requests in this period" />
              ) : (
                <ul className="divide-y divide-rule">
                  {demand.categories.map((c) => (
                    <li key={c.category} className="px-5 py-3">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="truncate text-[13.5px] font-semibold text-ink">{c.category}</p>
                        <p className="tnum shrink-0 text-[13px] text-ink-soft">
                          <span className="font-semibold text-ink">{formatNumber(c.requests)}</span> requests · {formatNumber(c.buyers)} buyers
                        </p>
                      </div>
                      {/* Bar length = share of the busiest category; green part quoted, orange part not */}
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-paper-deep" role="img" aria-label={`${c.quoted} quoted, ${c.unquoted} not quoted`}>
                        <div className="flex h-full" style={{ width: `${Math.max((c.requests / topCategory) * 100, 4)}%` }}>
                          <div className="h-full bg-brand" style={{ width: `${(c.quoted / c.requests) * 100}%` }} />
                          <div className="h-full bg-attention" style={{ width: `${(c.unquoted / c.requests) * 100}%` }} />
                        </div>
                      </div>
                      {c.unquoted > 0 ? <p className="mt-1 text-[12px] text-attention-deep">{formatNumber(c.unquoted)} with no quote</p> : null}
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex gap-4 border-t border-rule px-5 py-2.5 text-[12px] text-ink-soft">
                <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-brand" /> Quoted</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-attention" /> No quote</span>
              </div>
            </Card>

            <Card className="overflow-hidden">
              <Header title="Where it's wanted" note="Delivery country on each request." />
              {!demand.countries.length ? (
                <EmptyState icon={<MapPin size={20} />} title="No requests in this period" />
              ) : (
                <ul className="divide-y divide-rule">
                  {demand.countries.map((c) => (
                    <li key={c.country} className="px-5 py-3">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="text-[13.5px] font-medium text-ink">{countryName(c.country)}</p>
                        <p className="tnum text-[13px] font-semibold text-ink">{formatNumber(c.requests)}</p>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-paper-deep" aria-hidden>
                        <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.max((c.requests / topCountry) * 100, 4)}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <Card className="overflow-hidden">
              <Header title="Requests nobody quoted" note="Still open with no quote. Find a seller, or call the buyer." />
              {!demand.unquotedRequests.length ? (
                <EmptyState icon={<FileQuestion size={20} />} title="Every request got a quote" />
              ) : (
                <ul className="divide-y divide-rule">
                  {demand.unquotedRequests.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-[13.5px] font-semibold text-ink">{r.title}</p>
                        <p className="text-[12px] text-ink-soft">{r.category} · posted {formatDate(r.createdAt)}</p>
                      </div>
                      <a
                        href={`${WEB_URL}/rfq/${r.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex shrink-0 items-center gap-1 text-[13px] font-semibold text-brand hover:underline"
                      >
                        View <ExternalLink size={13} />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="overflow-hidden">
              <Header title="Searched, found nothing" note="Ranked by how many different people tried it." />
              {!demand.emptySearches.length ? (
                <EmptyState icon={<SearchX size={20} />} title="Every search found something" />
              ) : (
                <ul className="divide-y divide-rule">
                  {demand.emptySearches.map((s, i) => (
                    <li key={s.query} className="flex items-center gap-3 px-5 py-3">
                      <span className="tnum w-5 text-[13px] font-bold text-ink-faint">{i + 1}</span>
                      <p className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-ink">{s.query}</p>
                      <p className="tnum shrink-0 text-[13px] text-ink-soft">
                        {formatNumber(s.people)} {s.people === 1 ? "person" : "people"}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      )}
    </>
  );
}

function Stat({ label, value, attention }: { label: string; value: string; attention?: boolean }) {
  return (
    <Card className="px-5 py-4">
      <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-faint">{label}</p>
      <p className={`tnum mt-1 text-[22px] font-bold ${attention ? "text-attention-deep" : "text-ink"}`}>{value}</p>
    </Card>
  );
}

function Header({ title, note }: { title: string; note: string }) {
  return (
    <div className="border-b border-rule px-5 py-3">
      <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
      <p className="text-[13px] text-ink-soft">{note}</p>
    </div>
  );
}
