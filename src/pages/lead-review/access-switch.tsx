import { useState } from "react";
import { useDebounce } from "react-use";
import { MapPin, Search } from "lucide-react";
import { toast } from "react-toastify";

import { Btn, Card, Pill, Skeleton, formatDate } from "@/common/ui/kit";
import { useUserSlice } from "@/pages/auth/authSlice";
import {
  INELIGIBLE_TEXT,
  messageOf,
  useGetLeadReviewAccessForQuery,
  useGetLeadReviewAccessListQuery,
  useGetLeadReviewMeQuery,
  useSearchLeadReviewCandidatesQuery,
  useSetLeadReviewAccessMutation,
} from "./lead-review-api";

/**
 * The "Lead review" switch for one person (B1/B2). Off by default; granted
 * one person at a time and never part of any section, preset or full access,
 * so turning it on or off changes nothing else (B7). Shown only to staff
 * managers (GET /lead-review/me canManageAccess); the server checks again.
 *
 * Self-grant is allowed (founder OQ2) and recorded in the activity log, so
 * the switch shows on your own record too.
 */
export const LEAD_REVIEW_HELP = "Review businesses found on Google Maps and turn them into prospects. Granted one person at a time.";

export default function LeadReviewAccessSwitch({ userId, className = "" }: { userId: string; className?: string }) {
  const { loginResponse } = useUserSlice();
  const self = loginResponse?.user?.id === userId;
  const { data: me } = useGetLeadReviewMeQuery();
  const manager = me?.canManageAccess === true;
  const { data, isLoading, isError } = useGetLeadReviewAccessForQuery(userId, { skip: !manager });
  const [set, { isLoading: saving }] = useSetLeadReviewAccessMutation();

  if (!manager) return null;

  const granted = data?.granted === true;
  // Removing always works, even for someone no longer eligible
  const blocked = !!data && !data.eligible && !granted;
  const reason = data?.ineligibleReason ? INELIGIBLE_TEXT[data.ineligibleReason] ?? "This person can't hold Lead review" : null;

  const toggle = async () => {
    if (!data || saving || blocked) return;
    try {
      await set({ userId, granted: !granted }).unwrap();
      toast.success(granted ? (self ? "You no longer have Lead review" : "Lead review removed") : self ? "You now have Lead review" : "Lead review given", { position: "top-right" });
    } catch (err) {
      toast.error(messageOf(err, "Couldn't change Lead review. Try again."), { position: "top-right" });
    }
  };

  return (
    <section className={className}>
      <div className={`flex items-start justify-between gap-4 rounded-xl px-4 py-3 ring-1 ring-inset ${granted ? "bg-brand-50/70 ring-brand-200" : "bg-paper ring-rule"}`}>
        <div className="flex min-w-0 gap-2.5">
          <MapPin size={18} className={`mt-0.5 shrink-0 ${granted ? "text-brand-900" : "text-ink-soft"}`} />
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 text-[13.5px] font-semibold text-ink" id={`lead-review-label-${userId}`}>
              Lead review
              <span className="rounded-full bg-paper-deep px-1.5 py-px text-[10.5px] font-semibold uppercase tracking-[0.06em] text-ink-soft">Granted by name</span>
            </p>
            <p className="mt-0.5 text-[12.5px] text-ink-soft">{LEAD_REVIEW_HELP}</p>
            {isError && <p className="mt-1 text-[12.5px] text-danger-deep">Couldn't load this person's Lead review access.</p>}
            {blocked && reason && <p className="mt-1 text-[12.5px] font-medium text-attention-deep">{reason}</p>}
            {self && !isError && <p className="mt-1 text-[12px] text-ink-faint">This is you. Changing your own access is recorded in the activity log.</p>}
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={granted}
          aria-labelledby={`lead-review-label-${userId}`}
          disabled={isLoading || isError || saving || blocked}
          onClick={toggle}
          className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${granted ? "bg-brand-900" : "bg-ink-faint/50"}`}
        >
          <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${granted ? "translate-x-[22px]" : "translate-x-0.5"}`} />
        </button>
      </div>
    </section>
  );
}

/**
 * Staff page card (founder OQ1): everyone who holds Lead review, with Remove,
 * and a picker to give it to anyone who can sign in to the admin panel,
 * including agents with no agent profile and yourself (OQ2).
 */
export function LeadReviewAccessCard() {
  const { loginResponse } = useUserSlice();
  const myId = loginResponse?.user?.id;
  const { data: me } = useGetLeadReviewMeQuery();
  const manager = me?.canManageAccess === true;
  const { data: holders, isLoading, isError } = useGetLeadReviewAccessListQuery(undefined, { skip: !manager });
  const [set] = useSetLeadReviewAccessMutation();
  const [pending, setPending] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  useDebounce(() => setDebounced(query.trim()), 300, [query]);
  const { data: matches, isFetching: searching } = useSearchLeadReviewCandidatesQuery(debounced, { skip: !manager || debounced.length < 2 });

  if (!manager) return null;

  const change = async (userId: string, granted: boolean, name: string) => {
    setPending(userId);
    try {
      await set({ userId, granted }).unwrap();
      const you = userId === myId;
      toast.success(granted ? (you ? "You now have Lead review" : `${name} now has Lead review`) : you ? "You no longer have Lead review" : `Removed Lead review from ${name}`, { position: "top-right" });
    } catch (err) {
      toast.error(messageOf(err, "Couldn't change Lead review. Try again."), { position: "top-right" });
    } finally {
      setPending(null);
    }
  };

  return (
    <Card className="mt-8 overflow-hidden">
      <div className="border-b border-rule px-5 py-4">
        <h2 className="flex items-center gap-2 text-[15px] font-bold text-ink">
          <MapPin size={16} className="text-brand-900" /> Lead review access
        </h2>
        <p className="mt-0.5 text-[13px] text-ink-soft">{LEAD_REVIEW_HELP} Not part of Full access or any preset; agents can hold it too. Every change is in the activity log.</p>
      </div>

      {isLoading ? (
        <div className="space-y-2 p-5">{[0, 1].map((i) => <Skeleton key={i} className="h-10" />)}</div>
      ) : isError ? (
        <p className="px-5 py-4 text-[13px] text-danger-deep">Couldn't load who holds Lead review.</p>
      ) : !holders?.length ? (
        <p className="px-5 py-4 text-[13px] text-ink-faint">Nobody holds Lead review yet.</p>
      ) : (
        <ul className="divide-y divide-rule">
          {holders.map((h) => (
            <li key={h.userId} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-semibold text-ink">
                  {h.name}
                  {h.userId === myId && <span className="ml-1.5 text-[12px] font-normal text-ink-faint">(you)</span>}
                  <span className="ml-2 align-middle">
                    <Pill tone={h.role === "agent" ? "orange" : h.role === "admin" ? "green" : "blue"}>{ROLE_WORD[h.role] ?? h.role}</Pill>
                  </span>
                </p>
                <p className="truncate text-[12.5px] text-ink-soft">
                  {h.email} · since {formatDate(h.grantedAt)}
                  {h.grantedBy ? ` · given by ${h.grantedBy.name}` : ""}
                </p>
              </div>
              <Btn size="sm" variant="danger" loading={pending === h.userId} disabled={pending !== null} onClick={() => change(h.userId, false, h.name)}>
                Remove
              </Btn>
            </li>
          ))}
        </ul>
      )}

      <div className="border-t border-rule bg-paper px-5 py-4">
        <label htmlFor="lead-review-grant" className="mb-1.5 block text-[13px] font-semibold text-ink">
          Give Lead review to
        </label>
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            id="lead-review-grant"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find an admin, country admin or agent by name or email"
            autoComplete="off"
            className="h-10 w-full rounded-lg border-0 bg-white pl-9 pr-3 text-[13.5px] text-ink shadow-sm ring-1 ring-inset ring-rule focus:outline-none focus:ring-2 focus:ring-brand-900"
          />
        </div>
        {debounced.length >= 2 && (
          <ul className="mt-1.5 max-h-72 divide-y divide-rule overflow-y-auto rounded-xl bg-white ring-1 ring-inset ring-rule">
            {searching && !matches ? (
              <li className="px-3 py-2.5 text-[13px] text-ink-faint">Searching…</li>
            ) : !matches?.length ? (
              <li className="px-3 py-2.5 text-[13px] text-ink-faint">Nobody who can sign in to the admin panel matches.</li>
            ) : (
              matches.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="min-w-0">
                    <span className="block truncate text-[13.5px] font-medium text-ink">
                      {m.name}
                      {m.id === myId && <span className="ml-1.5 text-[12px] font-normal text-ink-faint">(you)</span>}
                    </span>
                    <span className="block truncate text-[12px] text-ink-soft">
                      {m.email} · {ROLE_WORD[m.role] ?? m.role}
                    </span>
                    {!m.eligible && !m.granted && m.ineligibleReason && <span className="block text-[12px] font-medium text-attention-deep">{INELIGIBLE_TEXT[m.ineligibleReason] ?? "Can't hold Lead review"}</span>}
                  </span>
                  {m.granted ? (
                    <Pill tone="green">Has it</Pill>
                  ) : (
                    <Btn size="sm" variant="secondary" loading={pending === m.id} disabled={!m.eligible || pending !== null} onClick={() => change(m.id, true, m.name)}>
                      Give access
                    </Btn>
                  )}
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    </Card>
  );
}

const ROLE_WORD: Record<string, string> = { admin: "Admin", country_admin: "Country admin", agent: "Agent" };
