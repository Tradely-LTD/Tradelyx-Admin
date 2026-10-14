import { useState } from "react";
import { useDebounce } from "react-use";
import { Check, Search, X } from "lucide-react";

import { Pill, initials } from "@/common/ui/kit";
import { useGetUsersQuery } from "@/pages/user-management/user-api";
import { roleTone } from "@/pages/user-management/components/user-drawer";

/** Someone picked to receive a Direct email */
export type Picked = { id: string; name: string; email: string };

export const MAX_PICKED = 200; // TradelyBackend outreach/controller.ts

const field =
  "w-full rounded-lg border-0 bg-white px-3 text-sm text-ink shadow-sm ring-1 ring-inset ring-rule placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-brand-900";

/** Search people by name or email and pick who gets the email. */
export default function PeoplePicker({ picked, onChange }: { picked: Picked[]; onChange: (next: Picked[]) => void }) {
  const [term, setTerm] = useState("");
  const [search, setSearch] = useState("");
  useDebounce(() => setSearch(term.trim()), 300, [term]);
  const { data, isFetching } = useGetUsersQuery({ page: 1, limit: 8, search: search || undefined }, { skip: !search });
  const chosen = new Set(picked.map((p) => p.id));
  const full = picked.length >= MAX_PICKED;

  const toggle = (p: Picked) => onChange(chosen.has(p.id) ? picked.filter((x) => x.id !== p.id) : full ? picked : [...picked, p]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search by name or email"
          aria-label="Search people"
          className={`${field} h-10 pl-9`}
        />
        {isFetching && <span className="absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 animate-spin rounded-full border-2 border-ink-faint border-r-transparent" aria-label="Searching" />}
      </div>

      {search && (
        <ul className="max-h-64 divide-y divide-rule overflow-y-auto rounded-lg ring-1 ring-rule" role="listbox" aria-label="People found">
          {!data?.data.length && !isFetching ? (
            <li className="px-4 py-3 text-[13px] text-ink-faint">Nobody matches “{search}”.</li>
          ) : (
            data?.data.map((u) => {
              const name = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email;
              const on = chosen.has(u.id);
              return (
                <li key={u.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={on}
                    disabled={!on && full}
                    onClick={() => toggle({ id: u.id, name, email: u.email })}
                    className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left hover:bg-paper disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-bold ${on ? "bg-brand-900 text-white" : "bg-brand-50 text-brand-950"}`}>
                      {on ? <Check size={14} strokeWidth={3} /> : initials(u.firstName, u.lastName)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-semibold text-ink">{name}</span>
                      <span className="block truncate text-[12px] text-ink-soft">{u.email}</span>
                    </span>
                    {u.role && <Pill tone={roleTone(u.role)}>{u.role}</Pill>}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      )}

      {picked.length > 0 ? (
        <div>
          <div className="mb-2 flex items-center justify-between text-[12.5px]">
            <span className="font-semibold text-ink">
              {picked.length} picked{full && ` (the most for one email)`}
            </span>
            <button type="button" onClick={() => onChange([])} className="cursor-pointer text-ink-soft hover:text-ink hover:underline">
              Clear all
            </button>
          </div>
          <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
            {picked.map((p) => (
              <span key={p.id} title={p.email} className="inline-flex items-center gap-1 rounded-full bg-brand-50 py-1 pl-3 pr-1 text-[12.5px] font-medium text-brand-950 ring-1 ring-inset ring-brand-100">
                {p.name}
                <button type="button" onClick={() => toggle(p)} aria-label={`Remove ${p.name}`} className="grid h-5 w-5 cursor-pointer place-items-center rounded-full hover:bg-brand-100">
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        </div>
      ) : (
        !search && <p className="text-[12.5px] text-ink-faint">Nobody picked yet. For a whole group (all sellers with nothing listed, say), use Outreach instead.</p>
      )}
    </div>
  );
}
