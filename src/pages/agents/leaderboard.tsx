import { useState } from "react";
import { AlertTriangle, FileText, Trophy } from "lucide-react";
import { toast } from "react-toastify";

import { Btn, Card, EmptyState, Skeleton, formatNumber } from "@/common/ui/kit";
import { Statement, useGetLeaderboardQuery, useLazyGetStatementQuery } from "./agents-api";

/**
 * How agents compare this month, with warning flags for patterns that
 * suggest fake sign-ups (to check, not to act on blindly), and each agent's
 * monthly statement to print or save as PDF and send them.
 */

const thisMonth = () => new Date().toISOString().slice(0, 7);
const naira = (n: number) => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n);
const esc = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const monthLabel = (m: string) => new Date(`${m}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
const money = (cur: string, n: number) => {
  try {
    return new Intl.NumberFormat("en-NG", { style: "currency", currency: cur, maximumFractionDigits: 2 }).format(n);
  } catch {
    return `${cur} ${n.toFixed(2)}`;
  }
};

/** A standalone page in a new window, so the admin layout doesn't print */
function printStatement(s: Statement) {
  const totals = Object.entries(s.totals);
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Agent statement · ${esc(s.agent.name)} · ${esc(monthLabel(s.month))}</title>
<style>
  body{font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#16201a;margin:40px;font-size:13px}
  .top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #009051;padding-bottom:14px;margin-bottom:22px}
  .brand{font-size:22px;font-weight:800;color:#00301b}.brand span{color:#009051}
  h1{font-size:18px;margin:0 0 4px}h2{font-size:14px;margin:26px 0 8px;color:#00301b}
  table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:7px 8px;border-bottom:1px solid #e6ebe8;vertical-align:top}
  th{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280}.num{text-align:right}
  .muted{color:#6b7280}.box{display:flex;gap:16px;margin-top:6px}.box div{flex:1;background:#f4faf6;border-radius:10px;padding:12px}
  .box b{display:block;font-size:17px;margin-top:4px}@media print{body{margin:18mm}}
</style></head><body>
<div class="top"><div><div class="brand">Tradely<span>X</span></div><div class="muted">Agent Program · monthly statement</div></div>
<div style="text-align:right"><h1>${esc(monthLabel(s.month))}</h1><div class="muted">Issued ${esc(new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }))}</div></div></div>
<div><strong>${esc(s.agent.name)}</strong><br><span class="muted">${esc(s.agent.email)}${s.agent.phone ? ` · ${esc(s.agent.phone)}` : ""}${s.agent.referralCode ? ` · Code ${esc(s.agent.referralCode)}` : ""}</span>
${s.agent.bank ? `<br><span class="muted">Pays to ${esc(s.agent.bank)}${s.agent.accountName ? ` (${esc(s.agent.accountName)})` : ""}</span>` : ""}</div>
<div class="box">${
    totals.length
      ? totals.map(([cur, t]) => `<div>Earned this month<b>${esc(money(cur, t.earned))}</b></div><div>Paid this month<b>${esc(money(cur, t.paid))}</b></div>${t.reversed ? `<div>Reversed<b>${esc(money(cur, t.reversed))}</b></div>` : ""}`).join("")
      : `<div>Earned this month<b>${esc(money("NGN", 0))}</b></div>`
  }<div>People brought in<b>${s.people.length}</b></div></div>
<h2>Commission</h2>${
    s.commissions.length
      ? `<table><tr><th>Date</th><th>Order</th><th>Side</th><th class="num">Our fee</th><th class="num">Rate</th><th class="num">You earn</th><th>Status</th></tr>${s.commissions
          .map((c) => `<tr><td>${esc(new Date(c.created_at).toLocaleDateString("en-GB"))}</td><td>${esc(c.order_title ?? "Order")}</td><td>${esc(c.sides)}</td><td class="num">${esc(money(c.currency, c.base_fee))}</td><td class="num">${esc(Math.round(c.rate * 100))}%</td><td class="num">${esc(money(c.currency, c.amount))}</td><td>${esc(c.status)}</td></tr>`)
          .join("")}</table>`
      : `<p class="muted">No commission this month.</p>`
  }
<h2>Payouts</h2>${
    s.payouts.length
      ? `<table><tr><th>Date</th><th>Reference</th><th class="num">Amount</th></tr>${s.payouts.map((p) => `<tr><td>${esc(new Date(p.paid_at).toLocaleDateString("en-GB"))}</td><td>${esc(p.reference)}</td><td class="num">${esc(money(p.currency, p.amount))}</td></tr>`).join("")}</table>`
      : `<p class="muted">No payouts this month.</p>`
  }
<h2>People you brought in</h2>${
    s.people.length
      ? `<table><tr><th>Name</th><th>Joined as</th><th>Joined</th><th>Active</th></tr>${s.people.map((p) => `<tr><td>${esc(p.name)}</td><td>${esc(p.role ?? "—")}</td><td>${esc(new Date(p.joinedAt).toLocaleDateString("en-GB"))}</td><td>${p.active ? "Yes" : "Not yet"}</td></tr>`).join("")}</table>`
      : `<p class="muted">No one new this month.</p>`
  }
<p class="muted" style="margin-top:28px">Commission is a share of TradelyX's fee on orders paid through escrow, payable after the hold period. Questions: support@tradelyx.com</p>
<script>window.onload=function(){window.print()}</script></body></html>`;
  const w = window.open("", "_blank");
  if (!w) return toast.error("Allow pop-ups for this site to print the statement.", { position: "top-right" });
  w.document.write(html);
  w.document.close();
}

export default function Leaderboard() {
  const [month, setMonth] = useState(thisMonth());
  const { data, isLoading, isFetching } = useGetLeaderboardQuery(month);
  const [loadStatement] = useLazyGetStatementQuery();
  const [printing, setPrinting] = useState<string | null>(null);

  const statement = async (id: string) => {
    setPrinting(id);
    try {
      printStatement(await loadStatement({ id, month }).unwrap());
    } catch {
      toast.error("Could not load the statement", { position: "top-right" });
    } finally {
      setPrinting(null);
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule px-5 py-3">
        <p className="text-[13px] text-ink-soft">Ranked by commission earned, then people brought in.</p>
        <label className="flex items-center gap-2 text-[13px] text-ink-soft">
          Month
          <input type="month" value={month} max={thisMonth()} onChange={(e) => e.target.value && setMonth(e.target.value)} className="h-9 rounded-lg border-0 bg-white px-2 text-[13px] ring-1 ring-inset ring-rule" />
        </label>
      </div>
      {isLoading ? (
        <div className="space-y-2 p-5">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-11" />)}</div>
      ) : !data?.agents.length ? (
        <EmptyState icon={<Trophy size={20} />} title="No approved agents yet" />
      ) : (
        <div className={`overflow-x-auto transition-opacity ${isFetching ? "opacity-60" : ""}`}>
          <table className="w-full min-w-[820px] text-left text-[13.5px]">
            <thead>
              <tr className="border-b border-rule bg-paper text-[11.5px] font-semibold uppercase tracking-[0.06em] text-ink-faint">
                <th className="w-10 py-3 pl-5">#</th>
                <th className="px-3 py-3">Agent</th>
                <th className="px-3 py-3 text-right">Joined this month</th>
                <th className="px-3 py-3 text-right">Active / all time</th>
                <th className="px-3 py-3 text-right">Prospects signed up</th>
                <th className="px-3 py-3 text-right">Earned this month</th>
                <th className="px-3 py-3"><span className="sr-only">Statement</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {data.agents.map((a, i) => (
                <tr key={a.id} className="align-top">
                  <td className="py-3 pl-5 font-bold text-ink-soft">{i + 1}</td>
                  <td className="px-3 py-3">
                    <p className="font-semibold text-ink">{a.name}</p>
                    {a.flags.map((f) => (
                      <p key={f.code} className="mt-0.5 flex items-start gap-1 text-[12px] text-attention-deep" title="Worth checking before paying">
                        <AlertTriangle size={12} className="mt-0.5 shrink-0" /> {f.detail}
                      </p>
                    ))}
                  </td>
                  <td className="tnum px-3 py-3 text-right">{formatNumber(a.peopleMonth)}</td>
                  <td className="tnum px-3 py-3 text-right text-ink-soft">
                    {formatNumber(a.activeTotal)} / {formatNumber(a.peopleTotal)}
                  </td>
                  <td className="tnum px-3 py-3 text-right">{formatNumber(a.prospectsMonth)}</td>
                  <td className="tnum px-3 py-3 text-right font-semibold text-ink">{naira(a.earnedMonth)}</td>
                  <td className="px-3 py-3 text-right">
                    <Btn size="sm" variant="secondary" icon={<FileText size={14} />} loading={printing === a.id} onClick={() => statement(a.id)}>
                      Statement
                    </Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
