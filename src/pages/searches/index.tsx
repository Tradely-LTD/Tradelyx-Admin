import { useState } from "react";
import { SearchX, TrendingUp } from "lucide-react";

import { Card, EmptyState, PageHeader, Skeleton, Tabs, formatDate, formatNumber } from "@/common/ui/kit";
import { SearchTerm, useGetSearchInsightsQuery } from "./searches-api";

/**
 * Demand at a glance: what visitors search for, and what they searched for
 * and didn't find — the products to recruit suppliers for. Each search counts
 * once per visitor per day; visitors are anonymous unless signed in.
 */

type Window = "7" | "30" | "90";

function Terms({ terms, emptyTitle, emptyIcon, showResults }: { terms: SearchTerm[]; emptyTitle: string; emptyIcon: React.ReactNode; showResults: boolean }) {
  if (!terms.length) return <EmptyState icon={emptyIcon} title={emptyTitle} />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-[13.5px]">
        <thead>
          <tr className="border-b border-rule bg-paper text-[11.5px] font-semibold uppercase tracking-[0.06em] text-ink-faint">
            <th className="w-10 py-3 pl-5">#</th>
            <th className="px-3 py-3">Search</th>
            <th className="px-3 py-3 text-right">People</th>
            <th className="px-3 py-3 text-right">Signed in</th>
            {showResults ? <th className="px-3 py-3 text-right">Results now</th> : null}
            <th className="px-3 py-3 pr-5 text-right">Last searched</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-rule">
          {terms.map((term, i) => (
            <tr key={term.query}>
              <td className="py-3 pl-5 font-bold text-ink-soft">{i + 1}</td>
              <td className="px-3 py-3 font-semibold text-ink">{term.query}</td>
              <td className="tnum px-3 py-3 text-right">{formatNumber(term.visitors)}</td>
              <td className="tnum px-3 py-3 text-right text-ink-soft">{formatNumber(term.signedIn)}</td>
              {showResults ? (
                <td className={`tnum px-3 py-3 text-right ${term.lastResultCount === 0 ? "font-semibold text-attention-deep" : ""}`}>{formatNumber(term.lastResultCount)}</td>
              ) : null}
              <td className="px-3 py-3 pr-5 text-right text-ink-soft">{term.lastSearchedAt ? formatDate(term.lastSearchedAt) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function SearchesPage() {
  const [days, setDays] = useState<Window>("30");
  const { data, isLoading, isFetching, isError } = useGetSearchInsightsQuery(Number(days));
  const insights = data?.data;

  const stats = insights
    ? [
        { label: "Searches", value: formatNumber(insights.totals.searches) },
        { label: "People searching", value: formatNumber(insights.totals.visitors) },
        { label: "Found nothing", value: `${formatNumber(insights.totals.noResults)}${insights.totals.searches ? ` (${Math.round((insights.totals.noResults / insights.totals.searches) * 100)}%)` : ""}` },
      ]
    : [];

  return (
    <>
      <PageHeader
        eyebrow="Growth"
        title="Searches"
        description="What people look for on the marketplace, and what they don't find. Each search counts once per person per day; visitors stay anonymous unless signed in. Kept for 12 months."
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
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : isError || !insights ? (
        <Card>
          <EmptyState icon={<SearchX size={20} />} title="Couldn't load searches">
            Your staff account needs the Marketing & prospects section, or search logging isn't live on the API yet.
          </EmptyState>
        </Card>
      ) : (
        <div className={`space-y-5 transition-opacity ${isFetching ? "opacity-60" : ""}`}>
          <div className="grid gap-3 sm:grid-cols-3">
            {stats.map((s) => (
              <Card key={s.label} className="px-5 py-4">
                <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-faint">{s.label}</p>
                <p className="tnum mt-1 text-[22px] font-bold text-ink">{s.value}</p>
              </Card>
            ))}
          </div>

          <Card className="overflow-hidden">
            <div className="border-b border-rule px-5 py-3">
              <h2 className="text-[15px] font-semibold text-ink">Searched, found nothing</h2>
              <p className="text-[13px] text-ink-soft">Still no results on the latest search. Products to find suppliers for.</p>
            </div>
            <Terms terms={insights.noResults} emptyTitle="Every search found something" emptyIcon={<SearchX size={20} />} showResults={false} />
          </Card>

          <Card className="overflow-hidden">
            <div className="border-b border-rule px-5 py-3">
              <h2 className="text-[15px] font-semibold text-ink">Top searches</h2>
              <p className="text-[13px] text-ink-soft">Ranked by how many people searched.</p>
            </div>
            <Terms terms={insights.top} emptyTitle="No searches yet" emptyIcon={<TrendingUp size={20} />} showResults />
          </Card>
        </div>
      )}
    </>
  );
}
