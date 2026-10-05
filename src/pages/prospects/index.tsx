import { useMemo, useState } from "react";
import { useDebounce } from "react-use";
import Pagination from "rc-pagination";
import { Check, Instagram, Mail, MessageCircle, Plus, Search, Target, UserCheck } from "lucide-react";
import { toast } from "react-toastify";

import { Btn, Card, Drawer, EmptyState, PageHeader, Pill, Skeleton, formatDate, formatNumber } from "@/common/ui/kit";
import TableDropdown from "@/common/dropdown";
import { useUserSlice } from "@/pages/auth/authSlice";
import ProspectDrawer from "./prospect-drawer";
import {
  Channel,
  ImportRow,
  ProspectStatus,
  useAssignProspectsMutation,
  useGetAssigneesQuery,
  useGetProspectStatsQuery,
  useGetProspectsQuery,
  useImportProspectsMutation,
  useUpdateProspectMutation,
} from "./prospects-api";

/**
 * Prospects: businesses to bring onto TradelyX, worked one at a time.
 *
 * Bulk or automated DMs break Instagram's and WhatsApp's rules and get
 * accounts blocked, so each contact is a person sending one prepared
 * message: Instagram copies it and opens their DM; WhatsApp opens the chat
 * with it filled in. Opening either marks the prospect contacted. A
 * prospect turns "Signed up" by itself when their phone or email registers.
 */

const STATUS: Record<ProspectStatus, { label: string; tone: "gray" | "blue" | "orange" | "green" | "red" }> = {
  new: { label: "New", tone: "gray" },
  contacted: { label: "Contacted", tone: "blue" },
  replied: { label: "Replied", tone: "orange" },
  signed_up: { label: "Signed up", tone: "green" },
  not_interested: { label: "Not interested", tone: "red" },
  already_user: { label: "Already on TradelyX", tone: "gray" },
};

const FILTERS: [ProspectStatus | "", string][] = [
  ["", "All"],
  ["new", "New"],
  ["contacted", "Contacted"],
  ["replied", "Replied"],
  ["signed_up", "Signed up"],
  ["not_interested", "Not interested"],
];

export default function ProspectsPage() {
  const { loginResponse } = useUserSlice();
  const role = loginResponse?.user.roles;
  const isStaff = role === "admin" || role === "country_admin";

  const [status, setStatus] = useState<ProspectStatus | "">("");
  const [assignee, setAssignee] = useState("");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState<{ id: string; channel?: Channel } | null>(null);
  useDebounce(() => { setDebounced(search.trim()); setPage(1); }, 350, [search]);

  const { data, isLoading, isFetching } = useGetProspectsQuery({ page, limit: 25, status: status || undefined, search: debounced || undefined, assignee: assignee || undefined });
  const { data: stats } = useGetProspectStatsQuery();
  const { data: assignees } = useGetAssigneesQuery(undefined, { skip: !isStaff });
  const [update] = useUpdateProspectMutation();
  const [assign, { isLoading: assigning }] = useAssignProspectsMutation();

  const rows = useMemo(() => data?.data ?? [], [data]);
  const total = data?.pagination.total ?? 0;
  const count = (s: ProspectStatus) => stats?.byStatus[s] ?? 0;
  const allTotal = Object.values(stats?.byStatus ?? {}).reduce((a, b) => a + (b ?? 0), 0);

  const assignSelected = async (to: string) => {
    await assign({ ids: [...selected], assignedTo: to || null }).unwrap().catch(() => toast.error("Could not assign", { position: "top-right" }));
    setSelected(new Set());
  };

  const toggle = (id: string) =>
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <>
      <PageHeader
        eyebrow="Growth"
        title="Prospects"
        description="Businesses to bring onto TradelyX. Each is contacted one at a time with a prepared message, never in bulk: mass messages get Instagram and WhatsApp accounts blocked."
        actions={isStaff && <Btn icon={<Plus size={16} />} onClick={() => setAdding(true)}>Add prospects</Btn>}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "To contact", value: count("new"), icon: Target, attention: true },
          { label: "Contacted", value: count("contacted"), icon: MessageCircle },
          { label: "Replied", value: count("replied"), icon: Check },
          { label: "Signed up", value: count("signed_up"), icon: UserCheck, sub: allTotal ? `${Math.round((count("signed_up") / Math.max(1, allTotal - count("already_user"))) * 100)}% of prospects` : undefined },
        ].map((t) => (
          <Card key={t.label} className="flex items-center gap-3 px-4 py-3.5">
            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${t.attention && t.value ? "bg-attention-soft text-attention-deep" : "bg-brand-50 text-brand-900"}`}>
              <t.icon size={17} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[12px] text-ink-soft">{t.label}</p>
              <p className="tnum text-lg font-bold leading-tight text-ink">{formatNumber(t.value)}</p>
              {t.sub && <p className="text-[11.5px] text-ink-faint">{t.sub}</p>}
            </div>
          </Card>
        ))}
      </div>

      {isStaff && !!stats?.byAssignee.length && (
        <Card className="mb-6 px-5 py-4">
          <p className="mb-2 text-[13px] font-bold text-ink">Who's working them</p>
          <div className="flex flex-wrap gap-2">
            {stats.byAssignee.map((a) => (
              <span key={a.id ?? "none"} className="rounded-lg bg-paper px-3 py-1.5 text-[12.5px] text-ink-soft">
                <strong className="text-ink">{a.name || "Unassigned"}</strong> · {a.total} total · {a.contacted} contacted · <span className="font-semibold text-brand-900">{a.signed_up} signed up</span>
              </span>
            ))}
          </div>
        </Card>
      )}

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter">
          {FILTERS.map(([value, label]) => (
            <button
              key={label}
              onClick={() => { setStatus(value); setPage(1); setSelected(new Set()); }}
              aria-pressed={status === value}
              className={`cursor-pointer rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${status === value ? "bg-brand-950 text-white" : "bg-white text-ink-soft ring-1 ring-inset ring-rule hover:text-ink"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-1 flex-wrap gap-2 lg:justify-end">
          {isStaff && (
            <select value={assignee} onChange={(e) => { setAssignee(e.target.value); setPage(1); }} aria-label="Assigned to" className="h-10 cursor-pointer rounded-lg border-0 bg-white pl-3 pr-8 text-[13px] ring-1 ring-inset ring-rule">
              <option value="">Everyone's</option>
              <option value="none">Unassigned</option>
              {assignees?.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          )}
          <div className="relative lg:w-72">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, handle, product" aria-label="Search prospects" className="h-10 w-full rounded-lg border-0 bg-white pl-9 pr-3 text-[13.5px] ring-1 ring-inset ring-rule placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-brand-900" />
          </div>
        </div>
      </div>

      {isStaff && selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-brand-950 px-4 py-2.5 text-white">
          <span className="text-[13.5px] font-semibold">{selected.size} selected</span>
          <div className="flex items-center gap-2">
            <select defaultValue="" disabled={assigning} onChange={(e) => e.target.value !== "" && assignSelected(e.target.value === "none" ? "" : e.target.value)} aria-label="Assign selected to" className="h-8 cursor-pointer rounded-lg border-0 bg-white pl-2 pr-7 text-[12.5px] text-ink">
              <option value="" disabled>Assign to…</option>
              <option value="none">Nobody</option>
              {assignees?.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <Btn size="sm" variant="ghost" className="text-white/80 hover:bg-white/10 hover:text-white" onClick={() => setSelected(new Set())}>Clear</Btn>
          </div>
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-[13.5px]">
            <thead>
              <tr className="border-b border-rule bg-paper text-[11.5px] font-semibold uppercase tracking-[0.06em] text-ink-faint">
                {isStaff && (
                  <th className="w-10 py-3 pl-5">
                    <input type="checkbox" aria-label="Select all on this page" checked={rows.length > 0 && rows.every((r) => selected.has(r.id))} onChange={() => setSelected(rows.every((r) => selected.has(r.id)) ? new Set() : new Set(rows.map((r) => r.id)))} className="h-4 w-4 cursor-pointer accent-brand-900" />
                  </th>
                )}
                <th className="px-4 py-3">Business</th>
                <th className="px-3 py-3">Assigned to</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Reach them</th>
                <th className="w-12 px-3 py-3"><span className="sr-only">More</span></th>
              </tr>
            </thead>
            <tbody className={`divide-y divide-rule ${isFetching && !isLoading ? "opacity-60" : ""}`}>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => <tr key={i}><td colSpan={6} className="px-5 py-3"><Skeleton className="h-10" /></td></tr>)
              ) : !rows.length ? (
                <tr><td colSpan={6}>
                  <EmptyState icon={<Target size={20} />} title={allTotal ? "None match" : "No prospects yet"}>
                    {allTotal ? "Try another filter." : isStaff ? "Add businesses you've found on Instagram, in directories or at events." : "Staff will assign businesses to you here."}
                  </EmptyState>
                </td></tr>
              ) : (
                rows.map((p) => (
                  <tr key={p.id} className={`cursor-pointer hover:bg-brand-50/40 ${selected.has(p.id) ? "bg-brand-50/60" : ""}`} onClick={() => setOpen({ id: p.id })}>
                    {isStaff && (
                      <td className="py-3 pl-5" onClick={(e) => e.stopPropagation()}><input type="checkbox" aria-label={`Select ${p.businessName}`} checked={selected.has(p.id)} onChange={() => toggle(p.id)} className="h-4 w-4 cursor-pointer accent-brand-900" /></td>
                    )}
                    <td className="px-4 py-3">
                      <p className="max-w-[260px] truncate font-semibold text-ink">{p.businessName}</p>
                      <p className="max-w-[260px] truncate text-[12.5px] text-ink-soft">
                        {[p.contactName, p.instagram && p.businessName !== `@${p.instagram}` && `@${p.instagram}`, p.product, p.location].filter(Boolean).join(" · ")}
                      </p>
                      <p className="text-[11.5px] text-ink-faint">{p.kind === "buyer" ? "Buyer" : "Seller"}{p.contactedAt ? ` · contacted ${formatDate(p.contactedAt)}${p.contactedVia ? ` on ${p.contactedVia}` : ""}` : ""}</p>
                    </td>
                    <td className="px-3 py-3 text-ink-soft">{p.assigneeName || <span className="text-ink-faint">—</span>}</td>
                    <td className="px-3 py-3"><Pill tone={STATUS[p.status].tone} dot>{STATUS[p.status].label}</Pill></td>
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      {p.status === "signed_up" || p.status === "already_user" ? (
                        <span className="text-[12.5px] text-ink-faint">{p.signedUpAt ? `Joined ${formatDate(p.signedUpAt)}` : "Has an account"}</span>
                      ) : (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {p.instagram && <Btn size="sm" variant="secondary" icon={<Instagram size={14} />} onClick={() => setOpen({ id: p.id, channel: "instagram" })}>Instagram</Btn>}
                          {p.phone && <Btn size="sm" variant="secondary" icon={<MessageCircle size={14} />} onClick={() => setOpen({ id: p.id, channel: "whatsapp" })}>WhatsApp</Btn>}
                          {p.email && <Btn size="sm" variant="secondary" icon={<Mail size={14} />} onClick={() => setOpen({ id: p.id, channel: "email" })}>Email</Btn>}
                          {!p.instagram && !p.phone && !p.email && <span className="text-[12.5px] text-ink-faint">Add contact details</span>}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      {p.status !== "signed_up" && p.status !== "already_user" && (
                        <TableDropdown
                          items={[
                            { label: "They replied", icon: <Check size={16} />, action: () => update({ id: p.id, status: "replied" }) },
                            { label: "Not interested", icon: <Target size={16} />, action: () => update({ id: p.id, status: "not_interested" }) },
                            { label: "Back to new", icon: <Target size={16} />, action: () => update({ id: p.id, status: "new" }) },
                          ]}
                        />
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {total > 25 && (
          <div className="flex justify-end border-t border-rule px-5 py-3">
            <Pagination current={page} total={total} pageSize={25} onChange={setPage} showSizeChanger={false} />
          </div>
        )}
      </Card>

      {adding && <AddProspects onClose={() => setAdding(false)} />}
      {open && <ProspectDrawer id={open.id} initialChannel={open.channel} onClose={() => setOpen(null)} />}
    </>
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[\d\s().-]{10,}$/;
const HANDLE_RE = /(instagram\.com\/|^@)/i;

/**
 * One business per line, cells separated by commas or tabs. Each cell is
 * recognised by what it looks like (email, phone, Instagram handle or link),
 * so the order doesn't matter; the remaining text fills name, product and
 * location in that order.
 */
function parseLines(text: string): ImportRow[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const row: ImportRow = {};
      const words: string[] = [];
      for (const cell of line.split(/\t|,/).map((c) => c.trim()).filter(Boolean)) {
        if (EMAIL_RE.test(cell)) row.email = cell;
        else if (HANDLE_RE.test(cell)) row.instagram = cell;
        else if (PHONE_RE.test(cell) && cell.replace(/\D/g, "").length >= 10) row.phone = cell;
        else words.push(cell);
      }
      // A lone bare handle like "kano_grains"
      if (!row.instagram && !row.phone && !row.email && words.length === 1 && /^[a-z0-9._]{2,30}$/i.test(words[0]) && /[._\d]/.test(words[0])) {
        row.instagram = words.shift();
      }
      [row.businessName, row.product, row.location] = words;
      return row;
    });
}

const EMPTY = { businessName: "", instagram: "", phone: "", email: "", product: "", location: "" };

function AddProspects({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<"one" | "paste">("one");
  const [one, setOne] = useState(EMPTY);
  const [text, setText] = useState("");
  const [kind, setKind] = useState<"seller" | "buyer">("seller");
  const [assignedTo, setAssignedTo] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const { data: assignees } = useGetAssigneesQuery();
  const [save, { isLoading }] = useImportProspectsMutation();
  const pasted = useMemo(() => parseLines(text), [text]);
  const rows: ImportRow[] = mode === "one" ? (one.businessName.trim() || one.instagram.trim() ? [one] : []) : pasted;

  const submit = async () => {
    setProblem(null);
    try {
      const { data } = await save({ rows: rows.map((r) => ({ ...r, kind })), assignedTo: assignedTo || null }).unwrap();
      setResult(
        [
          `${data.added} added`,
          data.duplicates ? `${data.duplicates} already in the list` : "",
          data.alreadyUsers ? `${data.alreadyUsers} already on TradelyX (marked, no need to contact)` : "",
          data.skipped.length ? `${data.skipped.length} skipped: ${data.skipped.slice(0, 3).map((s) => `line ${s.row} (${s.reason})`).join("; ")}` : "",
        ].filter(Boolean).join(" · ")
      );
      setText("");
      setOne(EMPTY);
    } catch (err: any) {
      setProblem(err?.data?.error || "Could not add them. Try again.");
    }
  };

  return (
    <Drawer
      open
      onClose={onClose}
      title="Add prospects"
      subtitle="Businesses you've found on Instagram, in directories or at events"
      footer={
        <div className="flex justify-end gap-2">
          <Btn variant="secondary" onClick={onClose}>Done</Btn>
          <Btn onClick={submit} loading={isLoading} disabled={!rows.length}>{mode === "one" ? "Add business" : `Add ${rows.length || ""}`}</Btn>
        </div>
      }
    >
      {problem && <p role="alert" className="mb-4 rounded-lg bg-danger-soft px-3 py-2.5 text-[13px] font-medium text-danger-deep">{problem}</p>}
      {result && <p role="status" className="mb-4 rounded-lg bg-brand-50 px-3 py-2.5 text-[13px] text-brand-950">{result}</p>}

      <div className="mb-4 flex gap-1.5">
        {([["one", "One business"], ["paste", "Paste a list"]] as const).map(([m, label]) => (
          <button key={m} type="button" onClick={() => setMode(m)} aria-pressed={mode === m} className={`cursor-pointer rounded-full px-3 py-1.5 text-[12.5px] font-semibold ${mode === m ? "bg-brand-950 text-white" : "bg-white text-ink-soft ring-1 ring-inset ring-rule hover:text-ink"}`}>
            {label}
          </button>
        ))}
      </div>

      {mode === "one" ? (
        <div className="grid grid-cols-2 gap-3">
          {([
            ["businessName", "Business name", "Kano Grains", "text"],
            ["instagram", "Instagram", "@kano_grains or link", "text"],
            ["phone", "Phone / WhatsApp", "0803 123 4567", "tel"],
            ["email", "Email", "info@business.com", "email"],
            ["product", "Product", "sesame", "text"],
            ["location", "Location", "Kano", "text"],
          ] as const).map(([key, label, placeholder, type]) => (
            <label key={key} className="block text-[12.5px] font-semibold text-ink">
              {label}
              <input
                type={type}
                value={one[key]}
                onChange={(e) => setOne({ ...one, [key]: e.target.value })}
                placeholder={placeholder}
                className="mt-1 h-9 w-full rounded-lg border-0 bg-white px-3 text-[13.5px] font-normal ring-1 ring-inset ring-rule focus:outline-none focus:ring-2 focus:ring-brand-900"
              />
            </label>
          ))}
          <p className="col-span-2 text-[12px] text-ink-faint">Add at least the name or Instagram, and one way to reach them.</p>
        </div>
      ) : (
      <>
      <label htmlFor="prospect-lines" className="mb-1.5 block text-[13px] font-semibold text-ink">One business per line</label>
      <p className="mb-2 text-[12px] text-ink-soft">
        Separate details with commas, or paste rows from a spreadsheet. Phones, emails and Instagram handles are recognised wherever they are; other text fills name, product and location in that order. Check each one afterwards in its panel.
      </p>
      <textarea
        id="prospect-lines"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={9}
        placeholder={"Kano Grains, @kano_grains, 0803 123 4567, sesame, Kano\nAbuja Agro, ginger, 0809 222 1111, info@abujaagro.com\nhttps://instagram.com/ginger_hub_ng"}
        className="w-full rounded-lg border-0 bg-white p-3 font-mono text-[12.5px] text-ink shadow-sm ring-1 ring-inset ring-rule focus:outline-none focus:ring-2 focus:ring-brand-900"
      />
      <p className="mt-1 text-[12px] text-ink-faint">{rows.length} {rows.length === 1 ? "business" : "businesses"} found. Duplicates and existing TradelyX accounts are detected automatically.</p>
      </>
      )}

      <div className="mt-5 grid grid-cols-2 gap-3">
        <label className="text-[13px] font-semibold text-ink">
          They are
          <select value={kind} onChange={(e) => setKind(e.target.value as "seller" | "buyer")} className="mt-1.5 h-10 w-full cursor-pointer rounded-lg border-0 bg-white px-3 text-[13px] font-normal ring-1 ring-inset ring-rule">
            <option value="seller">Sellers (suppliers)</option>
            <option value="buyer">Buyers</option>
          </select>
        </label>
        <label className="text-[13px] font-semibold text-ink">
          Give them to
          <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} className="mt-1.5 h-10 w-full cursor-pointer rounded-lg border-0 bg-white px-3 text-[13px] font-normal ring-1 ring-inset ring-rule">
            <option value="">Nobody yet</option>
            {assignees?.map((a) => <option key={a.id} value={a.id}>{a.name}{a.role === "admin" || a.role === "country_admin" ? " (staff)" : " (agent)"}</option>)}
          </select>
        </label>
      </div>
      <p className="mt-3 text-[12px] text-ink-faint">Prospects given to an agent carry the agent's referral code in the sign-up link, so the agent is credited.</p>
    </Drawer>
  );
}
