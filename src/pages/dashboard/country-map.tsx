import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Globe2 } from "lucide-react";

import { Card, Skeleton, formatNumber } from "@/common/ui/kit";
import { CountryCount, useGetUsersByCountryQuery } from "./stats-api";

/**
 * Where TradelyX's people are: every country with at least one user, shaded
 * by how many, with a marker so small countries (Rwanda, Sierra Leone) still
 * show. Clicking a country, on the map or in the list, opens the users list
 * filtered to it.
 *
 * The outlines are public/maps/world-110m.json: Natural Earth 1:110m
 * boundaries (public domain, via world-atlas 2.0.2), projected ahead of time
 * to SVG paths by a one-off script, so the page needs no map library.
 */

type World = { viewBox: string; countries: { name: string; d: string; c: [number, number] | null }[] };

/** Our names (TradelyBackend stats/countryNames.ts) → the map's, where they differ */
const MAP_NAME: Record<string, string> = {
  "United States": "United States of America",
  "DR Congo": "Dem. Rep. Congo",
  "Central African Republic": "Central African Rep.",
  "South Sudan": "S. Sudan",
  Eswatini: "eSwatini",
  "Equatorial Guinea": "Eq. Guinea",
  "Bosnia and Herzegovina": "Bosnia and Herz.",
  "Dominican Republic": "Dominican Rep.",
};
const NOT_SET = "Not set";

const plural = (n: number, one: string, many: string) => `${formatNumber(n)} ${n === 1 ? one : many}`;

/**
 * A view framed on the countries with people (with room around them), at the
 * map's own proportions, so a business that is mostly in Africa isn't a few
 * specks on a world map. Never tighter than about a fifth of the world.
 */
function fitView(points: [number, number][], full: string) {
  const [, , W, H] = full.split(" ").map(Number);
  if (!points.length) return full;
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const pad = 70;
  let x0 = Math.min(...xs) - pad, x1 = Math.max(...xs) + pad, y0 = Math.min(...ys) - pad, y1 = Math.max(...ys) + pad;
  const ratio = W / H;
  let w = Math.max(x1 - x0, 260), h = Math.max(y1 - y0, 260 / ratio);
  if (w / h > ratio) h = w / ratio;
  else w = h * ratio;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  x0 = Math.min(Math.max(cx - w / 2, 0), Math.max(0, W - w));
  y0 = Math.min(Math.max(cy - h / 2, 0), Math.max(0, H - h));
  return `${x0.toFixed(1)} ${y0.toFixed(1)} ${Math.min(w, W).toFixed(1)} ${Math.min(h, H).toFixed(1)}`;
}

let worldCache: Promise<World> | null = null;
const loadWorld = () => (worldCache ??= fetch("/maps/world-110m.json").then((r) => (r.ok ? r.json() : Promise.reject(r.status))));

/** Five greens, light to brand, by share of the busiest country (log, so one big country doesn't wash out the rest) */
const SHADES = ["#cce9dc", "#99d3b9", "#4db185", "#1a9b62", "#00703f"];
const shade = (users: number, max: number) => SHADES[Math.min(SHADES.length - 1, Math.floor((Math.log(users + 1) / Math.log(max + 1)) * (SHADES.length - 0.01)))];

export default function CountryMap() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useGetUsersByCountryQuery();
  const [world, setWorld] = useState<World | null>(null);
  const [worldFailed, setWorldFailed] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const [whole, setWhole] = useState(false);

  useEffect(() => {
    let live = true;
    loadWorld()
      .then((w) => live && setWorld(w))
      .catch(() => live && setWorldFailed(true));
    return () => {
      live = false;
    };
  }, []);

  const rows = data ?? [];
  const placed = rows.filter((r) => r.country !== NOT_SET);
  const notSet = rows.find((r) => r.country === NOT_SET);
  const max = Math.max(1, ...placed.map((r) => r.users));
  const total = rows.reduce((n, r) => n + r.users, 0);
  const byMapName = useMemo(() => new Map(placed.map((r) => [MAP_NAME[r.country] ?? r.country, r])), [placed]);
  const open = (country: string) => navigate(`/users?country=${encodeURIComponent(country)}`);
  const hovered = hover ? placed.find((r) => r.country === hover) : null;
  const fitted = useMemo(
    () => (world ? fitView(world.countries.filter((c) => c.c && byMapName.has(c.name)).map((c) => c.c as [number, number]), world.viewBox) : ""),
    [world, byMapName]
  );
  // Markers and outlines keep their size on screen when the map is zoomed in
  const zoom = world && fitted && !whole ? Number(world.viewBox.split(" ")[2]) / Number(fitted.split(" ")[2]) : 1;

  return (
    <section className="mt-10">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-[15px] font-bold text-ink">Where our people are</h2>
        {!isLoading && !isError && (
          <p className="text-[12.5px] text-ink-faint">
            {formatNumber(total)} people in {placed.length} {placed.length === 1 ? "country" : "countries"}
          </p>
        )}
      </div>

      <Card className="grid overflow-hidden lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* Map */}
        <div className="relative min-w-0 bg-gradient-to-b from-paper to-white px-3 py-4 sm:px-5">
          {worldFailed ? (
            <div className="grid aspect-[1000/438] place-items-center text-[13px] text-ink-faint">The map didn't load. The list has everything.</div>
          ) : !world || isLoading ? (
            <Skeleton className="aspect-[1000/438] w-full" />
          ) : (
            <svg viewBox={whole ? world.viewBox : fitted} className="block h-auto w-full" role="img" aria-label={`Map: TradelyX users in ${placed.length} countries`}>
              <g>
                {world.countries.map((c) => {
                  const row = byMapName.get(c.name);
                  const on = hover === row?.country;
                  return (
                    <path
                      key={c.name}
                      d={c.d}
                      fill={row ? shade(row.users, max) : "#eceef1"}
                      stroke="#ffffff"
                      strokeWidth={(on ? 1.4 : 0.5) / zoom}
                      className={row ? "cursor-pointer transition-[fill,filter] duration-150 hover:brightness-95" : undefined}
                      style={on ? { filter: "drop-shadow(0 1px 2px rgba(0,48,27,.35))" } : undefined}
                      onMouseEnter={row ? () => setHover(row.country) : undefined}
                      onMouseLeave={row ? () => setHover(null) : undefined}
                      onClick={row ? () => open(row.country) : undefined}
                    >
                      {row && <title>{`${row.country}: ${formatNumber(row.users)} ${row.users === 1 ? "person" : "people"}`}</title>}
                    </path>
                  );
                })}
              </g>
              {/* Markers on top, so small countries can be seen and clicked */}
              <g>
                {world.countries.map((c) => {
                  const row = byMapName.get(c.name);
                  if (!row || !c.c) return null;
                  const r = (2.2 + Math.sqrt(row.users / max) * 6) / zoom;
                  const on = hover === row.country;
                  return (
                    <g
                      key={c.name}
                      transform={`translate(${c.c[0]} ${c.c[1]})`}
                      className="cursor-pointer"
                      onMouseEnter={() => setHover(row.country)}
                      onMouseLeave={() => setHover(null)}
                      onClick={() => open(row.country)}
                    >
                      {row.joinedLast30 > 0 && <circle r={r + 3 / zoom} fill="#009051" opacity={0.18} className="motion-safe:animate-ping" style={{ transformBox: "fill-box", transformOrigin: "center", animationDuration: "2.4s" }} />}
                      <circle r={on ? r + 1.5 / zoom : r} fill="#00301b" stroke="#ffffff" strokeWidth={1.2 / zoom} />
                    </g>
                  );
                })}
              </g>
            </svg>
          )}

          {world && !worldFailed && placed.length > 0 && (
            <div className="absolute right-4 top-4 flex overflow-hidden rounded-lg bg-white/90 text-[12px] font-semibold shadow-sm ring-1 ring-rule backdrop-blur" role="group" aria-label="Map view">
              {([[false, "Our countries"], [true, "World"]] as const).map(([w, label]) => (
                <button key={label} type="button" aria-pressed={whole === w} onClick={() => setWhole(w)} className={`cursor-pointer px-3 py-1.5 ${whole === w ? "bg-brand-950 text-white" : "text-ink-soft hover:text-ink"}`}>
                  {label}
                </button>
              ))}
            </div>
          )}

          {hovered && (
            <div className="pointer-events-none absolute left-4 top-4 rounded-xl bg-white/95 px-3.5 py-2.5 shadow-lift ring-1 ring-rule backdrop-blur">
              <p className="text-[13.5px] font-bold text-ink">{hovered.country}</p>
              <p className="tnum text-[12.5px] text-ink-soft">
                {plural(hovered.users, "person", "people")} · {plural(hovered.buyers, "buyer", "buyers")} · {plural(hovered.sellers, "seller", "sellers")}
              </p>
              {hovered.joinedLast30 > 0 && <p className="text-[12px] font-semibold text-brand-900">+{formatNumber(hovered.joinedLast30)} in the last 30 days</p>}
            </div>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-ink-faint">
            <span className="inline-flex items-center gap-1.5">
              Fewer
              <span className="flex overflow-hidden rounded-sm">{SHADES.map((s) => <span key={s} className="h-2 w-5" style={{ background: s }} />)}</span>
              More people
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="relative inline-block h-2.5 w-2.5 rounded-full bg-brand-950 ring-2 ring-brand-900/20" /> Joined in the last 30 days
            </span>
          </div>
        </div>

        {/* Ranked list */}
        <div className="min-w-0 border-t border-rule lg:border-l lg:border-t-0">
          {isLoading ? (
            <div className="space-y-2 p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-9" />)}</div>
          ) : isError ? (
            <p className="p-5 text-[13px] text-ink-soft">Couldn't load the countries.</p>
          ) : !placed.length ? (
            <div className="grid h-full place-items-center p-6 text-center text-[13px] text-ink-faint">
              <span>
                <Globe2 size={22} className="mx-auto mb-2" />
                Nobody has set a country yet.
              </span>
            </div>
          ) : (
            <ol className="max-h-[360px] divide-y divide-rule overflow-y-auto">
              {placed.map((r, i) => (
                <li key={r.country}>
                  <CountryRow row={r} rank={i + 1} max={max} active={hover === r.country} onHover={setHover} onOpen={open} />
                </li>
              ))}
              {notSet && (
                <li>
                  <button type="button" onClick={() => open(NOT_SET)} className="group flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-2.5 text-left text-[12.5px] text-ink-faint hover:bg-paper">
                    <span>No country set</span>
                    <span className="tnum inline-flex items-center gap-1 group-hover:text-ink">
                      {formatNumber(notSet.users)} <ArrowRight size={12} className="opacity-0 transition-opacity group-hover:opacity-100" />
                    </span>
                  </button>
                </li>
              )}
            </ol>
          )}
        </div>
      </Card>
    </section>
  );
}

function CountryRow({ row, rank, max, active, onHover, onOpen }: { row: CountryCount; rank: number; max: number; active: boolean; onHover: (c: string | null) => void; onOpen: (c: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(row.country)}
      onMouseEnter={() => onHover(row.country)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(row.country)}
      onBlur={() => onHover(null)}
      className={`group flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left transition-colors ${active ? "bg-brand-50" : "hover:bg-paper"}`}
    >
      <span className="tnum w-4 shrink-0 text-right text-[11.5px] text-ink-faint">{rank}</span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="truncate text-[13.5px] font-semibold text-ink">{row.country}</span>
          <span className="tnum shrink-0 text-[13px] font-bold text-ink">{formatNumber(row.users)}</span>
        </span>
        <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-paper-deep">
          <span className="block h-full rounded-full bg-brand-900 transition-[width] duration-500" style={{ width: `${Math.max(4, (row.users / max) * 100)}%` }} />
        </span>
        <span className="mt-1 block text-[11.5px] text-ink-faint">
          {plural(row.buyers, "buyer", "buyers")} · {plural(row.sellers, "seller", "sellers")}
          {row.joinedLast30 > 0 && <span className="font-semibold text-brand-900"> · +{formatNumber(row.joinedLast30)} in 30 days</span>}
        </span>
      </span>
      <ArrowRight size={14} className="shrink-0 text-ink-faint opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  );
}
