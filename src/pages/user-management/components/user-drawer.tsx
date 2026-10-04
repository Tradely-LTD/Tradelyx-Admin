import { Link } from "react-router-dom";
import { Activity, Building2, Check, Edit2, Eye, HandHelping, Mail, MailX, Phone, MapPin, Calendar } from "lucide-react";

import { useGetUserOverviewQuery } from "@/pages/outreach/outreach-api";
import { useGetActivityQuery } from "@/pages/activity/activity-api";
import { ActivityRow } from "@/pages/activity";
import { Btn, Drawer, Pill, Skeleton, formatDate, initials } from "@/common/ui/kit";
import type { User } from "../user-api";

/** Which ready-made email fixes each unfinished step (TradelyBackend outreach/templates.ts) */
const NUDGE: Record<string, string> = {
  buying_profile: "buyer_complete_profile",
  first_request: "buyer_first_request",
  store: "seller_finish_store",
  listing: "seller_add_products",
  certifications: "seller_add_certifications",
};
const nudgeFor = (check: string, kind: "buyer" | "seller") =>
  check === "kyc" ? (kind === "seller" ? "seller_verify_identity" : "buyer_verify_identity") : NUDGE[check];

/** "3 hours ago", or the date when it was a while back */
export const lastActive = (value?: string | null) => {
  if (!value) return "Not seen since 4 Oct 2026";
  const minutes = Math.round((Date.now() - new Date(value).getTime()) / 60_000);
  if (minutes < 15) return "Just now";
  if (minutes < 60) return `${minutes} minutes ago`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)} hours ago`;
  if (minutes < 60 * 24 * 14) return `${Math.round(minutes / 1440)} days ago`;
  return formatDate(value);
};

const KIND_DOT: Record<string, string> = {
  signup: "bg-ink-faint",
  kyc: "bg-sky-500",
  product: "bg-brand-700",
  offer: "bg-brand-700",
  request: "bg-attention",
  quote: "bg-attention",
  escrow: "bg-brand-950",
  staff: "bg-ink-soft",
};

export const roleTone = (role?: string | null) =>
  role === "seller" ? "blue" : role === "buyer" ? "green" : role ? "gray" : "orange";

type Props = {
  user: (User & { companyName?: string | null }) | null;
  canOutreach: boolean;
  onClose: () => void;
  onEdit: () => void;
  onProfile: () => void;
  onOnboard: () => void;
};

export default function UserDrawer({ user, canOutreach, onClose, onEdit, onProfile, onOnboard }: Props) {
  const { data, isLoading, isError } = useGetUserOverviewQuery(user?.id ?? "", { skip: !user || !canOutreach });
  const { data: activity } = useGetActivityQuery({ targetType: "user", targetId: user?.id, limit: 10 }, { skip: !user || !canOutreach });
  if (!user) return null;
  const name = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email;
  const done = data?.checks.filter((c) => c.done).length ?? 0;
  const total = data?.checks.length ?? 0;
  const kind: "buyer" | "seller" = data?.isSeller ? "seller" : "buyer";

  return (
    <Drawer
      open
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          {user.profileImage ? (
            <img src={user.profileImage} alt="" className="h-11 w-11 rounded-full object-cover" />
          ) : (
            <div className="grid h-11 w-11 place-items-center rounded-full bg-brand-50 text-sm font-bold text-brand-950">{initials(user.firstName, user.lastName)}</div>
          )}
          <div className="min-w-0">
            <p className="truncate">{name}</p>
            <p className="truncate text-[13px] font-normal text-ink-soft">{user.email}</p>
          </div>
        </div>
      }
      footer={
        <div className="flex flex-wrap gap-2">
          <Btn variant="secondary" size="sm" icon={<Eye size={14} />} onClick={onProfile}>Full profile</Btn>
          <Btn variant="secondary" size="sm" icon={<Edit2 size={14} />} onClick={onEdit}>Edit</Btn>
          {user.role === "seller" && <Btn variant="secondary" size="sm" icon={<HandHelping size={14} />} onClick={onOnboard}>Onboard as seller</Btn>}
        </div>
      }
    >
      <div className="flex flex-wrap gap-1.5">
        <Pill tone={roleTone(user.role)}>{user.role ?? "No role yet"}</Pill>
        <Pill tone={user.isKYCCompleted ? "green" : "gray"} dot>{user.isKYCCompleted ? "KYC verified" : "Not KYC verified"}</Pill>
        {user.isCompany && <Pill tone="gray">Company</Pill>}
        {data?.optedOutAt && <Pill tone="orange">Unsubscribed from outreach</Pill>}
      </div>

      <dl className="mt-5 grid grid-cols-1 gap-3 text-[13.5px] sm:grid-cols-2">
        <Fact icon={Phone} label="Phone" value={user.phone || "—"} />
        <Fact icon={MapPin} label="Country" value={[user.state, user.country].filter(Boolean).join(", ") || "—"} />
        <Fact icon={Calendar} label="Joined" value={formatDate(user.createdAt)} />
        <Fact icon={Activity} label="Last active" value={lastActive(data?.lastActiveAt ?? user.lastActiveAt)} />
        {user.companyName && <Fact icon={Building2} label="Company" value={user.companyName} />}
      </dl>

      {canOutreach && (
        <section className="mt-7">
          <div className="mb-3 flex items-baseline justify-between">
            <h3 className="text-[14px] font-bold text-ink">Onboarding as a {kind}</h3>
            {total > 0 && <span className="tnum text-[12.5px] text-ink-soft">{done} of {total} done</span>}
          </div>
          {total > 0 && (
            <div className="mb-3 flex gap-1" aria-hidden>
              {data!.checks.map((c) => (
                <span key={c.key} className={`h-1.5 flex-1 rounded-full ${c.done ? "bg-brand-700" : "bg-paper-deep"}`} />
              ))}
            </div>
          )}
          {isLoading ? (
            <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : isError ? (
            <p className="text-[13px] text-ink-soft">Couldn't load the checklist.</p>
          ) : (
            <ul className="divide-y divide-rule rounded-xl ring-1 ring-rule">
              {data?.checks.map((c) => {
                const template = nudgeFor(c.key, kind);
                return (
                  <li key={c.key} className="flex items-center gap-3 px-4 py-3">
                    <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${c.done ? "bg-brand-900 text-white" : "ring-2 ring-inset ring-rule"}`}>
                      {c.done && <Check size={13} strokeWidth={3} />}
                    </span>
                    <span className={`flex-1 text-[13.5px] ${c.done ? "text-ink-soft" : "font-medium text-ink"}`}>{c.label}</span>
                    {!c.done && template && !data.optedOutAt && (
                      <Link
                        to={`/outreach?template=${template}&user=${user.id}&name=${encodeURIComponent(name)}`}
                        className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[12px] font-semibold text-brand-900 hover:bg-brand-50"
                      >
                        <Mail size={12} /> Nudge
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {canOutreach && (
        <section className="mt-7">
          <h3 className="mb-3 text-[14px] font-bold text-ink">What they've done</h3>
          {isLoading ? (
            <Skeleton className="h-24" />
          ) : !data?.activity?.length ? (
            <p className="text-[13px] text-ink-faint">Nothing yet</p>
          ) : (
            <ol className="relative space-y-3 border-l border-rule pl-4">
              {data.activity.map((a, i) => (
                <li key={`${a.at}-${i}`} className="relative text-[13px]">
                  <span className={`absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-white ${KIND_DOT[a.kind] ?? "bg-ink-faint"}`} />
                  <span className="block text-ink">{a.text}</span>
                  <span className="text-[12px] text-ink-faint">{formatDate(a.at, true)}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}

      {canOutreach && (
        <section className="mt-7">
          <h3 className="mb-3 text-[14px] font-bold text-ink">Emails from staff</h3>
          {!data?.emails.length ? (
            <p className="flex items-center gap-2 text-[13px] text-ink-faint">
              <MailX size={15} /> None yet
            </p>
          ) : (
            <ul className="space-y-2.5">
              {data.emails.map((e) => (
                <li key={e.id} className="flex items-start justify-between gap-3 text-[13px]">
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-ink">{e.subject}</span>
                    <span className="text-[12px] text-ink-faint">{formatDate(e.sentAt ?? e.createdAt, true)}</span>
                  </span>
                  <Pill tone={e.status === "sent" ? "green" : e.status === "failed" ? "red" : "gray"}>{e.status}</Pill>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      {canOutreach && (
        <section className="mt-7">
          <h3 className="mb-1 text-[14px] font-bold text-ink">Staff actions</h3>
          {!activity?.data.length ? (
            <p className="text-[13px] text-ink-faint">None yet</p>
          ) : (
            <ol className="divide-y divide-rule">
              {activity.data.map((a) => (
                <ActivityRow key={a.id} a={a} compact />
              ))}
            </ol>
          )}
        </section>
      )}
    </Drawer>
  );
}

function Fact({ icon: Icon, label, value }: { icon: typeof Phone; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon size={15} className="mt-0.5 shrink-0 text-ink-faint" />
      <div className="min-w-0">
        <dt className="text-[11.5px] text-ink-faint">{label}</dt>
        <dd className="truncate font-medium text-ink">{value}</dd>
      </div>
    </div>
  );
}
