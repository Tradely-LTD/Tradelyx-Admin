import { FormEvent, useCallback, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import Pagination from "rc-pagination";
import { AlertTriangle, MapPin, Search } from "lucide-react";

import { Btn, Card, EmptyState, PageHeader, Skeleton, formatDate, formatNumber } from "@/common/ui/kit";
import { LeadReviewGate } from "./gate";
import { FetchProgress, StateBadge } from "./fetch-status";
import { useActiveFetches } from "./use-active-fetches";
import RulesEditor from "./rules-editor";
import {
  type LeadReviewConfig,
  type LeadReviewMe,
  type SearchRow,
  codeOf,
  failureOf,
  leadReviewApi,
  messageOf,
  useGetLeadOwnersQuery,
  useGetLeadReviewConfigQuery,
  useGetLeadSearchesQuery,
  useStartFetchMutation,
} from "./lead-review-api";
import { COUNTRIES, type Country, FIELD_MAX, FIELD_MIN, REJECT_REASONS, SCRAPER_OFF, countryLabel } from "./labels";

/**
 * Lead review: Google Maps searches and how each is going (C1–C4, K2, J3).
 * Only for people holding Lead review by name (the gate). Agents see their
 * own searches only; staff see everyone's and can filter by who started them.
 */
export default function LeadReviewPage() {
  return <LeadReviewGate>{(me) => <Searches me={me} />}</LeadReviewGate>;
}

const PAGE_SIZE = 20;

function Searches({ me }: { me: LeadReviewMe }) {
  const dispatch = useDispatch();
  const isStaff = me.canEditLists;
  const { data: config, isError: configFailed, error: configError } = useGetLeadReviewConfigQuery();
  const [owner, setOwner] = useState("");
  const [page, setPage] = useState(1);
  const { data, isLoading, isFetching, isError, error, refetch } = useGetLeadSearchesQuery({ page, limit: PAGE_SIZE, ...(owner ? { owner } : {}) });
  const { data: owners } = useGetLeadOwnersQuery(undefined, { skip: !isStaff });

  // A fetch finished: the searches' counts and states have changed
  const onFinished = useCallback(() => {
    dispatch(leadReviewApi.util.invalidateTags([{ type: "LEAD_REVIEW", id: "SEARCHES" }]));
  }, [dispatch]);
  const active = useActiveFetches(onFinished);
  const names = useMemo(() => new Map((data?.data ?? []).map((s) => [s.id, `${s.phrase} · ${s.location}`])), [data]);

  return (
    <>
      <PageHeader
        eyebrow="Communication"
        title="Lead review"
        description="Search Google Maps for a product and a place, then approve or reject each business it finds. Only approved businesses become prospects, assigned to whoever approved them."
      />

      {config && !config.scraperConfigured && (
        <p role="status" className="mb-5 flex items-start gap-2.5 rounded-xl bg-attention-soft px-4 py-3 text-[13.5px] text-attention-deep ring-1 ring-inset ring-attention/25">
          <AlertTriangle size={17} className="mt-px shrink-0" />
          {SCRAPER_OFF}
        </p>
      )}
      {configFailed && (
        <p role="alert" className="mb-5 rounded-xl bg-danger-soft px-4 py-3 text-[13.5px] text-danger-deep">
          {messageOf(configError, "Couldn't load Lead review settings.")}
        </p>
      )}

      <NewSearch config={config} />

      {active.rows.length > 0 && (
        <Card className="mt-5 divide-y divide-rule">
          <p className="px-5 py-3 text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-faint">
            Fetching now {active.queueLength > active.rows.length && <span className="normal-case tracking-normal">· {active.queueLength} in the queue across TradelyX</span>}
          </p>
          {active.rows.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
              <FetchProgress row={r} receivedAt={active.receivedAt} title={names.get(r.searchId)} />
              <Link to={`/lead-review/${r.searchId}`} className="text-[13px] font-semibold text-brand-900 hover:underline">
                Open
              </Link>
            </div>
          ))}
        </Card>
      )}

      <div className="mb-3 mt-8 flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-[17px] font-bold text-ink">{isStaff ? "Searches" : "Your searches"}</h2>
        {isStaff && (
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Who started the search">
            {[
              { value: "", label: "Everyone" },
              { value: "me", label: "Mine" },
            ].map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  setOwner(o.value);
                  setPage(1);
                }}
                aria-pressed={owner === o.value}
                className={`cursor-pointer rounded-full px-3 py-1.5 text-[12.5px] font-semibold ${owner === o.value ? "bg-brand-950 text-white" : "bg-white text-ink-soft ring-1 ring-inset ring-rule hover:text-ink"}`}
              >
                {o.label}
              </button>
            ))}
            <select
              value={owner && owner !== "me" ? owner : ""}
              onChange={(e) => {
                setOwner(e.target.value);
                setPage(1);
              }}
              aria-label="Started by"
              className="h-8 rounded-full border-0 bg-white px-3 text-[12.5px] font-semibold text-ink-soft ring-1 ring-inset ring-rule focus:outline-none focus:ring-2 focus:ring-brand-900"
            >
              <option value="">A person…</option>
              {owners?.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                  {o.role === "agent" ? " (agent)" : ""}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <Card className={`overflow-hidden transition-opacity ${isFetching && !isLoading ? "opacity-70" : ""}`}>
        {isLoading ? (
          <div className="space-y-2 p-5">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : isError ? (
          <EmptyState icon={<MapPin size={20} />} title="Couldn't load searches">
            {messageOf(error, "Something went wrong.")}
            <span className="mt-3 block">
              <Btn size="sm" variant="secondary" onClick={() => refetch()}>
                Try again
              </Btn>
            </span>
          </EmptyState>
        ) : !data?.data.length ? (
          <EmptyState icon={<MapPin size={20} />} title={owner ? "No searches match" : "No searches yet"}>
            Type a product and a place above, then Fetch.
          </EmptyState>
        ) : (
          <SearchesTable rows={data.data} isStaff={isStaff} />
        )}
        {(data?.pagination.totalPages ?? 0) > 1 && (
          <div className="flex justify-end border-t border-rule px-5 py-3">
            <Pagination current={page} total={data!.pagination.total} pageSize={PAGE_SIZE} onChange={setPage} />
          </div>
        )}
      </Card>

      {config?.canEditLists && (
        <div className="mt-8">
          <RulesEditor config={config} />
        </div>
      )}
    </>
  );
}

function NewSearch({ config }: { config?: LeadReviewConfig }) {
  const navigate = useNavigate();
  const [phrase, setPhrase] = useState("");
  const [location, setLocation] = useState("");
  const [country, setCountry] = useState<Country>("NG");
  const [problem, setProblem] = useState<{ text: string; searchId?: string } | null>(null);
  const [start, { isLoading }] = useStartFetchMutation();
  const p = phrase.trim();
  const l = location.trim();
  const off = config ? !config.scraperConfigured : false;
  const countries = COUNTRIES.filter((c) => !config || config.countries.includes(c.value));

  const missing = [!p && "a search phrase", !l && "a location"].filter(Boolean) as string[];
  const tooShort = [p && (p.length < FIELD_MIN || p.length > FIELD_MAX) && "search phrase", l && (l.length < FIELD_MIN || l.length > FIELD_MAX) && "location"].filter(Boolean) as string[];
  const hint = missing.length
    ? `Add ${missing.join(" and ")} to fetch.`
    : tooShort.length
      ? `The ${tooShort.join(" and ")} must be ${FIELD_MIN} to ${FIELD_MAX} characters.`
      : null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (missing.length || tooShort.length || off) return;
    setProblem(null);
    try {
      const r = await start({ phrase: p, location: l, country }).unwrap();
      navigate(`/lead-review/${r.data.search.id}`);
    } catch (err) {
      // FETCH_ACTIVE, THRESHOLD_EXCEEDED, SCRAPER_UNAVAILABLE…: the server's words, inline.
      // The phrase and place may be one of your searches (C4): link to it.
      const existing = failureOf(err)?.data?.fetch?.searchId;
      setProblem({ text: messageOf(err, "Couldn't start the fetch. Try again."), searchId: codeOf(err) === "FETCH_ACTIVE" ? existing : undefined });
    }
  };

  const field = "h-10 w-full rounded-lg border-0 bg-white px-3 text-[13.5px] text-ink ring-1 ring-inset ring-rule placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-brand-900";

  return (
    <Card className="p-5">
      <form onSubmit={submit} noValidate>
        <h2 className="text-[15px] font-bold text-ink">New search</h2>
        <p className="mt-0.5 text-[13px] text-ink-soft">The same phrase and place as one of your searches fetches more for it. One fetch runs at a time across TradelyX; others wait their turn.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-[1.3fr_1fr_160px_auto] md:items-end">
          <div>
            <label htmlFor="lead-phrase" className="mb-1 block text-[12.5px] font-semibold text-ink">
              What to search for
            </label>
            <input id="lead-phrase" value={phrase} onChange={(e) => setPhrase(e.target.value)} maxLength={FIELD_MAX} placeholder="e.g. rice mill" dir="auto" autoComplete="off" className={field} />
          </div>
          <div>
            <label htmlFor="lead-location" className="mb-1 block text-[12.5px] font-semibold text-ink">
              Where
            </label>
            <input id="lead-location" value={location} onChange={(e) => setLocation(e.target.value)} maxLength={FIELD_MAX} placeholder="e.g. Kano" dir="auto" autoComplete="off" className={field} />
          </div>
          <div>
            <label htmlFor="lead-country" className="mb-1 block text-[12.5px] font-semibold text-ink">
              Country
            </label>
            <select id="lead-country" value={country} onChange={(e) => setCountry(e.target.value as Country)} className={field}>
              {countries.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <Btn type="submit" icon={<Search size={16} />} loading={isLoading} disabled={!!hint || off} title={off ? "Google Maps discovery isn't set up on this server" : hint ?? undefined}>
            Fetch
          </Btn>
        </div>
        {hint && (phrase || location) && <p className="mt-2 text-[12.5px] text-ink-soft">{hint}</p>}
        {!phrase && !location && !off && <p className="mt-2 text-[12.5px] text-ink-faint">Add a search phrase and a location to fetch.</p>}
        {problem && (
          <p role="alert" className="mt-3 rounded-lg bg-danger-soft px-3 py-2.5 text-[13px] font-medium text-danger-deep">
            {problem.text}
            {problem.searchId && (
              <>
                {" "}
                <Link to={`/lead-review/${problem.searchId}`} className="font-semibold underline">
                  Open that search
                </Link>
              </>
            )}
          </p>
        )}
      </form>
    </Card>
  );
}

function SearchesTable({ rows, isStaff }: { rows: SearchRow[]; isStaff: boolean }) {
  const navigate = useNavigate();
  const th = "px-3 py-3 text-right";
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1040px] text-left text-[13.5px]">
        <thead>
          <tr className="border-b border-rule bg-paper text-[11.5px] font-semibold uppercase tracking-[0.06em] text-ink-faint">
            <th className="px-5 py-3">Search</th>
            {isStaff && <th className="px-3 py-3">Started by</th>}
            <th className="px-3 py-3">Last fetch</th>
            <th className={th} title="Businesses Google Maps returned">Fetched</th>
            <th className={th} title="Left out: already a prospect or a TradelyX user">Known</th>
            <th className={th} title="Left out: found before by any search, or the same phone as another lead">Repeats</th>
            <th className={th} title="Hidden by the sorting lists or no phone and no website">Hidden</th>
            <th className={th}>Buyers</th>
            <th className={th}>Sellers</th>
            <th className={th}>Rejected</th>
            <th className={th}>Unreviewed</th>
            <th className="px-3 py-3">State</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-rule">
          {rows.map((s) => {
            const rejectedTitle = REJECT_REASONS.map((r) => `${r.label}: ${s.stats.rejected[r.key] ?? 0}`).join("\n");
            return (
              <tr key={s.id} onClick={() => navigate(`/lead-review/${s.id}`)} className="cursor-pointer hover:bg-paper">
                <td className="px-5 py-3">
                  <Link to={`/lead-review/${s.id}`} onClick={(e) => e.stopPropagation()} className="font-semibold text-ink hover:underline" dir="auto">
                    {s.phrase}
                  </Link>
                  <p className="text-[12.5px] text-ink-soft">
                    <span dir="auto">{s.location}</span> · {countryLabel(s.country)}
                  </p>
                </td>
                {isStaff && (
                  <td className="px-3 py-3 text-ink-soft">
                    {s.owner?.name ?? "Deleted user"}
                    {s.owner?.role === "agent" && <span className="ml-1 text-[12px] text-ink-faint">(agent)</span>}
                  </td>
                )}
                <td className="whitespace-nowrap px-3 py-3 text-ink-soft">{s.lastFetchAt ? formatDate(s.lastFetchAt, true) : "Never"}</td>
                <Num n={s.stats.fetched} />
                <Num n={s.stats.known} />
                <Num n={s.stats.repeats} />
                <Num n={s.stats.hidden} />
                <Num n={s.stats.approvedBuyer} strong />
                <Num n={s.stats.approvedSeller} strong />
                <td className="tnum px-3 py-3 text-right text-ink-soft" title={rejectedTitle}>
                  <span className="cursor-help underline decoration-dotted underline-offset-2">{formatNumber(s.stats.rejected.total)}</span>
                </td>
                <Num n={s.stats.unreviewed} strong={s.stats.unreviewed > 0} />
                <td className="px-3 py-3">
                  <StateBadge s={s} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Num({ n, strong }: { n: number; strong?: boolean }) {
  return <td className={`tnum px-3 py-3 text-right ${strong ? "font-semibold text-ink" : "text-ink-soft"}`}>{formatNumber(n)}</td>;
}
