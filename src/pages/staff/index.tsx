import { useEffect, useState } from "react";
import { useDebounce } from "react-use";
import { KeyRound, Plus, Search, X } from "lucide-react";
import { toast } from "react-toastify";

import { Btn, Card, Drawer, EmptyState, PageHeader, Pill, Skeleton, initials } from "@/common/ui/kit";
import { useUserSlice } from "@/pages/auth/authSlice";
import { lastActive } from "@/pages/user-management/components/user-drawer";
import {
  Access,
  Candidate,
  OPT_IN_SECTIONS,
  PRESETS,
  SECTIONS,
  Section,
  StaffMember,
  accessLabel,
  toggleSection,
  useAddStaffMutation,
  useGetStaffQuery,
  useSearchCandidatesQuery,
  useUpdateStaffMutation,
} from "./staff-api";

/**
 * Staff and what each can work on. Sections map to the admin menu; the API
 * enforces them, so a hidden menu item is also a refused request.
 */

const errorText = (err: any, fallback: string) => err?.data?.error || fallback;

type Draft = { email: string; role: "admin" | "country_admin"; access: Access };

const personName = (p: { firstName: string | null; lastName: string | null; email: string }) => `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() || p.email;

export default function StaffPage() {
  const { loginResponse } = useUserSlice();
  const myId = loginResponse?.user.id;
  const { data: staffData, isLoading, isError, error } = useGetStaffQuery();
  const data = staffData?.staff;
  const [editing, setEditing] = useState<StaffMember | "new" | null>(null);

  return (
    <>
      <PageHeader
        eyebrow="Team"
        title="Staff"
        description="Who works in the admin panel, and which sections each person can use. Changes take effect within a minute and are recorded in the activity log."
        actions={
          <Btn icon={<Plus size={16} />} onClick={() => setEditing("new")}>
            Add staff
          </Btn>
        }
      />

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="space-y-2 p-5">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : isError ? (
          <EmptyState icon={<KeyRound size={20} />} title="Can't show staff">{errorText(error, "Something went wrong.")}</EmptyState>
        ) : !data?.length ? (
          <EmptyState icon={<KeyRound size={20} />} title="No staff yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-[13.5px]">
              <thead>
                <tr className="border-b border-rule bg-paper text-[11.5px] font-semibold uppercase tracking-[0.06em] text-ink-faint">
                  <th className="px-5 py-3">Person</th>
                  <th className="px-3 py-3">Role</th>
                  <th className="px-3 py-3">Can use</th>
                  <th className="px-3 py-3">Last active</th>
                  <th className="px-3 py-3"><span className="sr-only">Change</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {data.map((s) => {
                  const name = `${s.firstName ?? ""} ${s.lastName ?? ""}`.trim() || s.email;
                  const me = s.id === myId;
                  return (
                    <tr key={s.id}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-50 text-[12px] font-bold text-brand-950">{initials(s.firstName, s.lastName)}</div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-ink">{name}{me && <span className="ml-1.5 text-[12px] font-normal text-ink-faint">(you)</span>}</p>
                            <p className="truncate text-[12.5px] text-ink-soft">{s.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <Pill tone={s.role === "admin" ? "green" : "blue"}>{s.role === "admin" ? "Admin" : `Country admin${s.operatingCountry ? ` · ${s.operatingCountry}` : ""}`}</Pill>
                      </td>
                      <td className="max-w-[280px] px-3 py-3 text-ink-soft">
                        <span className={s.staffPermissions === null ? "font-semibold text-brand-900" : s.staffPermissions.length ? "" : "text-danger-deep"}>{accessLabel(s.staffPermissions)}</span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-ink-soft">{lastActive(s.lastActiveAt)}</td>
                      <td className="px-3 py-3 text-right">
                        {me ? (
                          <span className="text-[12px] text-ink-faint">Ask another admin</span>
                        ) : (
                          <Btn size="sm" variant="secondary" onClick={() => setEditing(s)}>Change access</Btn>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <StaffDrawer target={editing} grantable={staffData?.sections ?? []} onClose={() => setEditing(null)} />
    </>
  );
}

function StaffDrawer({ target, grantable, onClose }: { target: StaffMember | "new" | null; grantable: string[]; onClose: () => void }) {
  const isNew = target === "new";
  const [draft, setDraft] = useState<Draft>({ email: "", role: "admin", access: ["people", "catalog"] });
  const [add, { isLoading: adding }] = useAddStaffMutation();
  const [update, { isLoading: updating }] = useUpdateStaffMutation();
  const [picked, setPicked] = useState<Candidate | null>(null);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  useDebounce(() => setDebounced(query.trim()), 300, [query]);
  const { data: matches, isFetching: searching } = useSearchCandidatesQuery(debounced, { skip: !isNew || picked !== null || debounced.length < 2 });

  useEffect(() => {
    if (!target) return;
    setDraft(isNew ? { email: "", role: "admin", access: ["people", "catalog"] } : { email: target.email, role: target.role, access: target.staffPermissions });
    setPicked(null);
    setQuery("");
    setProblem(null);
  }, [target, isNew]);

  if (!target) return null;
  // Opt-in sections are offered only while the backend lists them (their
  // feature is switched on) and only for admins. Full access (null) never
  // includes them, so they are ticked only when listed by name.
  const optIn = OPT_IN_SECTIONS.filter((s) => grantable.includes(s.key) && draft.role === "admin");
  const ticked = (key: Section) => (draft.access === null ? !OPT_IN_SECTIONS.some((o) => o.key === key) : draft.access.includes(key));
  const toggle = (key: Section) => setDraft({ ...draft, access: toggleSection(draft.access, key) });
  /** Opt-in sections the backend would refuse now: country admins never; switched-off features are unknown sections */
  const dropped = OPT_IN_SECTIONS.filter((s) => draft.access?.includes(s.key) && !optIn.some((o) => o.key === s.key));
  const accessToSave = (): Access =>
    draft.access === null || !dropped.length ? draft.access : draft.access.filter((k) => !dropped.some((d) => d.key === k));
  const preset = PRESETS.find((p) => JSON.stringify([...(p.access ?? ["*"])].sort()) === JSON.stringify([...(draft.access ?? ["*"])].sort()));

  const save = async () => {
    setProblem(null);
    try {
      if (isNew) {
        if (!picked) return setProblem("Search for the person and choose them from the list.");
        await add({ userId: picked.id, role: draft.role, permissions: accessToSave() }).unwrap();
        toast.success("Added. They need to sign out and back in to see the admin panel.", { position: "top-right" });
      } else {
        await update({ id: target.id, role: draft.role, permissions: accessToSave() }).unwrap();
        toast.success("Access changed", { position: "top-right" });
      }
      onClose();
    } catch (err) {
      // Shown in the drawer, so it can't be missed
      setProblem(errorText(err, "Could not save. Try again."));
    }
  };

  const field = "w-full rounded-lg border-0 bg-white px-3 text-[13.5px] text-ink shadow-sm ring-1 ring-inset ring-rule focus:outline-none focus:ring-2 focus:ring-brand-900";

  return (
    <Drawer
      open
      onClose={onClose}
      title={isNew ? "Add staff" : "Change access"}
      subtitle={isNew ? "Choose someone who already has a TradelyX account." : target.email}
      footer={
        <div className="flex justify-end gap-2">
          <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
          <Btn onClick={save} loading={adding || updating} disabled={isNew && !picked}>{isNew ? "Add staff" : "Save"}</Btn>
        </div>
      }
    >
      {problem && (
        <p role="alert" className="mb-4 rounded-lg bg-danger-soft px-3 py-2.5 text-[13px] font-medium text-danger-deep">{problem}</p>
      )}

      {isNew && (
        <div className="mb-5">
          <label htmlFor="staff-search" className="mb-1.5 block text-[13px] font-semibold text-ink">Person</label>
          {picked ? (
            <div className="flex items-center justify-between gap-3 rounded-xl bg-brand-50/70 px-3 py-2.5 ring-1 ring-inset ring-brand-200">
              <span className="min-w-0">
                <span className="block truncate text-[13.5px] font-semibold text-ink">{personName(picked)}</span>
                <span className="block truncate text-[12px] text-ink-soft">{picked.email}{picked.role ? ` · ${picked.role}` : ""}</span>
              </span>
              <button type="button" onClick={() => setPicked(null)} aria-label="Choose someone else" className="grid h-7 w-7 shrink-0 cursor-pointer place-items-center rounded-full text-ink-soft hover:bg-white">
                <X size={14} />
              </button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
                <input
                  id="staff-search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name, email or phone"
                  autoComplete="off"
                  className={`${field} h-10 pl-9`}
                />
              </div>
              {debounced.length >= 2 && (
                <ul className="mt-1.5 max-h-64 overflow-y-auto rounded-xl ring-1 ring-inset ring-rule">
                  {searching && !matches ? (
                    <li className="px-3 py-2.5 text-[13px] text-ink-faint">Searching…</li>
                  ) : !matches?.length ? (
                    <li className="px-3 py-2.5 text-[13px] text-ink-faint">No account matches. They need to sign up on TradelyX first.</li>
                  ) : (
                    matches.map((m) => (
                      <li key={m.id}>
                        <button type="button" onClick={() => setPicked(m)} className="block w-full cursor-pointer px-3 py-2 text-left hover:bg-paper">
                          <span className="block truncate text-[13.5px] font-medium text-ink">{personName(m)}</span>
                          <span className="block truncate text-[12px] text-ink-soft">{[m.email, m.phone, m.role].filter(Boolean).join(" · ")}</span>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </>
          )}
        </div>
      )}

      <div className="mb-5">
        <p className="mb-1.5 text-[13px] font-semibold text-ink">Role</p>
        <div className="flex gap-2">
          {(["admin", "country_admin"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setDraft({ ...draft, role: r })}
              aria-pressed={draft.role === r}
              className={`cursor-pointer rounded-full px-3 py-1.5 text-[12.5px] font-semibold ${draft.role === r ? "bg-brand-950 text-white" : "bg-white text-ink-soft ring-1 ring-inset ring-rule"}`}
            >
              {r === "admin" ? "Admin" : "Country admin"}
            </button>
          ))}
        </div>
        {draft.role === "country_admin" && <p className="mt-1.5 text-[12px] text-ink-faint">Sees only users and listings in their own country.</p>}
      </div>

      <p className="mb-1.5 text-[13px] font-semibold text-ink">Start from</p>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => setDraft({ ...draft, access: p.access })}
            aria-pressed={preset?.label === p.label}
            className={`cursor-pointer rounded-full px-3 py-1.5 text-[12.5px] font-semibold ${preset?.label === p.label ? "bg-brand-950 text-white" : "bg-white text-ink-soft ring-1 ring-inset ring-rule hover:text-ink"}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <fieldset className="space-y-1.5">
        <legend className="mb-1.5 text-[13px] font-semibold text-ink">Can use</legend>
        {SECTIONS.map((s) => (
          <label key={s.key} className={`flex cursor-pointer gap-3 rounded-xl px-3 py-2.5 ring-1 ring-inset ${ticked(s.key) ? "bg-brand-50/70 ring-brand-200" : "ring-rule hover:bg-paper"}`}>
            <input type="checkbox" checked={ticked(s.key)} onChange={() => toggle(s.key)} className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-brand-900" />
            <span>
              <span className="block text-[13.5px] font-semibold text-ink">{s.label}</span>
              <span className="block text-[12px] text-ink-soft">{s.detail}</span>
            </span>
          </label>
        ))}
        {optIn.map((s) => (
          <label key={s.key} className={`flex cursor-pointer gap-3 rounded-xl px-3 py-2.5 ring-1 ring-inset ${ticked(s.key) ? "bg-attention-soft/70 ring-attention/30" : "ring-rule hover:bg-paper"}`}>
            <input type="checkbox" checked={ticked(s.key)} onChange={() => toggle(s.key)} className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-brand-900" />
            <span>
              <span className="flex items-center gap-2 text-[13.5px] font-semibold text-ink">
                {s.label}
                <span className="rounded-full bg-paper-deep px-1.5 py-px text-[10.5px] font-semibold uppercase tracking-[0.06em] text-ink-soft">Granted by name</span>
              </span>
              <span className="block text-[12px] text-ink-soft">{s.detail}</span>
              <span className="mt-0.5 block text-[12px] text-ink-faint">Not part of Full access or any preset. Can't be combined with View only.</span>
            </span>
          </label>
        ))}
      </fieldset>
      {!!dropped.length && (
        <p className="mt-3 rounded-lg bg-attention-soft px-3 py-2 text-[12.5px] text-attention-deep">
          {dropped.map((d) => d.label).join(", ")} will be removed when you save: {draft.role === "admin" ? "it is switched off right now" : "only admins can have it"}.
        </p>
      )}
      <p className="mt-3 text-[12px] text-ink-faint">Everyone on staff can see the dashboard and the activity log.</p>
    </Drawer>
  );
}
