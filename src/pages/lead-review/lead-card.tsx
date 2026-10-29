import { ReactNode } from "react";
import { ArrowUpRight, EyeOff, Globe, MapPin, Phone, Rocket, SkipForward, Star, Tag, Trash2 } from "lucide-react";
import { twMerge } from "tailwind-merge";

import { Card, Pill, formatDate, formatNumber } from "@/common/ui/kit";
import type { Lead } from "./lead-review-api";
import { type RejectReason, formatPhone, reasonLabel, safeHttpUrl, safeMapsUrl, websiteLabel } from "./labels";

/**
 * One business from Google Maps (G1/G2). Every field shows a plain empty
 * value when Maps had nothing for it. Names and addresses can be Arabic, so
 * they take their direction from their own text (dir="auto").
 *
 * Links: the website opens in a new tab with no referrer and nofollow; the
 * Maps link only if it really is a Google Maps link. Text is rendered as
 * text, never as HTML.
 */

type Props = {
  lead: Lead;
  /** The card being reviewed: larger, with every field */
  current?: boolean;
  /** Staff see a link to the existing prospect on auto-duplicates */
  isStaff: boolean;
  reasons?: { key: RejectReason; label: string }[];
  onOpenProspect?: (id: string) => void;
  actions?: ReactNode;
  className?: string;
};

export default function LeadCard({ lead, current, isStaff, reasons, onOpenProspect, actions, className }: Props) {
  const maps = safeMapsUrl(lead.mapsUrl);
  const site = safeHttpUrl(lead.website);
  const phone = formatPhone(lead.phone);

  return (
    <Card className={twMerge(current ? "p-6" : "p-4", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {lead.purged || !lead.name ? (
            <p className={`${current ? "text-xl" : "text-[15px]"} font-bold text-ink-soft`}>Details deleted after 12 months</p>
          ) : (
            <h2 dir="auto" className={`${current ? "text-xl" : "text-[15px]"} break-words font-bold tracking-[-0.01em] text-ink`}>
              {lead.name}
            </h2>
          )}
          <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-ink-soft">
            <Tag size={13} className="shrink-0 text-ink-faint" />
            {lead.category ? <span dir="auto">{lead.category}</span> : <Empty>No category</Empty>}
          </p>
        </div>
        <Badges lead={lead} />
      </div>

      <dl className={`mt-4 grid gap-x-6 gap-y-2.5 text-[13.5px] ${current ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-4"}`}>
        <Field icon={<MapPin size={14} />} label="Address" wide={current}>
          {lead.address ? <span dir="auto">{lead.address}</span> : <Empty>No address</Empty>}
        </Field>
        <Field icon={<Phone size={14} />} label="Phone">
          {phone ? (
            <a href={`tel:+${lead.phone}`} className="tnum font-medium text-ink hover:underline" dir="ltr">
              {phone}
            </a>
          ) : (
            <Empty>No phone</Empty>
          )}
        </Field>
        <Field icon={<Globe size={14} />} label="Website">
          {site ? (
            <a href={site} target="_blank" rel="noopener noreferrer nofollow" className="break-all font-medium text-brand-900 hover:underline" dir="ltr">
              {websiteLabel(site)}
            </a>
          ) : (
            <Empty>No website</Empty>
          )}
        </Field>
        <Field icon={<Star size={14} />} label="Rating">
          {lead.rating != null ? (
            <span className="tnum text-ink">
              ★ {lead.rating.toFixed(1)}{" "}
              <span className="text-ink-soft">({lead.reviewCount != null ? `${formatNumber(lead.reviewCount)} ${lead.reviewCount === 1 ? "review" : "reviews"}` : "no review count"})</span>
            </span>
          ) : (
            <Empty>No rating</Empty>
          )}
        </Field>
        {lead.email && (
          <Field label="Email">
            <span className="break-all text-ink">{lead.email}</span>
          </Field>
        )}
      </dl>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        {maps ? (
          <a href={maps} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[13px] font-semibold text-brand-900 hover:underline">
            Open on Google Maps <ArrowUpRight size={14} />
          </a>
        ) : (
          <Empty>No Google Maps link</Empty>
        )}
        {actions}
      </div>

      <Decision lead={lead} isStaff={isStaff} reasons={reasons} onOpenProspect={onOpenProspect} />
    </Card>
  );
}

function Badges({ lead }: { lead: Lead }) {
  const hiddenNow = lead.status === "hidden";
  return (
    <div className="flex flex-wrap gap-1.5">
      {lead.boosted && (
        <Pill tone="green">
          <Rocket size={11} /> Boosted{lead.boostTerm ? `: ${lead.boostTerm}` : ""}
        </Pill>
      )}
      {lead.hiddenReason && (
        <Pill tone={hiddenNow ? "orange" : "gray"}>
          <EyeOff size={11} /> {hiddenNow ? "Hidden" : "Was hidden"}: {lead.hiddenReason}
        </Pill>
      )}
      {lead.skipCount > 0 && (
        <Pill tone="gray">
          <SkipForward size={11} /> Skipped ×{lead.skipCount}
        </Pill>
      )}
      {lead.purged && (
        <Pill tone="gray">
          <Trash2 size={11} /> Details deleted
        </Pill>
      )}
    </div>
  );
}

function Decision({ lead, isStaff, reasons, onOpenProspect }: Pick<Props, "lead" | "isStaff" | "reasons" | "onOpenProspect">) {
  if (lead.status !== "approved" && lead.status !== "rejected") return null;
  const who = lead.decidedBy?.name ?? (lead.autoRejected ? "TradelyX" : "Someone");
  const when = lead.decidedAt ? formatDate(lead.decidedAt, true) : "";
  const linkBtn = (id: string, label: string) =>
    onOpenProspect ? (
      <button type="button" onClick={() => onOpenProspect(id)} className="cursor-pointer font-semibold text-brand-900 hover:underline">
        {label}
      </button>
    ) : null;

  return (
    <div className="mt-4 space-y-1 rounded-lg bg-paper px-3.5 py-2.5 text-[13px]">
      {lead.status === "approved" ? (
        <p className="text-ink">
          <span className="font-semibold">Approved as {lead.decision === "seller" ? "seller" : "buyer"}</span>
          <span className="text-ink-soft">
            {" "}
            by {who}
            {when && ` · ${when}`}
          </span>
          {lead.prospectId && <> · {linkBtn(lead.prospectId, "Open prospect")}</>}
        </p>
      ) : (
        <>
          <p className="text-ink">
            <span className="font-semibold">Rejected: {reasonLabel(lead.rejectReason, reasons)}</span>
            <span className="text-ink-soft">
              {" "}
              {lead.autoRejected ? "automatically, when" : "by"} {lead.autoRejected && lead.decidedBy ? `${lead.decidedBy.name} approved it` : who}
              {when && ` · ${when}`}
            </span>
          </p>
          {lead.rejectNote && (
            <p className="text-ink-soft" dir="auto">
              “{lead.rejectNote}”
            </p>
          )}
        </>
      )}
      {lead.duplicateOf && (
        <p className="text-ink-soft">
          Already on TradelyX: <span dir="auto" className="font-medium text-ink">{lead.duplicateOf.name}</span>
          {lead.duplicateOf.type === "user" ? " (a registered user)" : ""}
          {isStaff && lead.duplicateOf.type === "prospect" && <> · {linkBtn(lead.duplicateOf.id, "Open the existing prospect")}</>}
        </p>
      )}
    </div>
  );
}

function Field({ icon, label, children, wide }: { icon?: ReactNode; label: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={`flex min-w-0 gap-2 ${wide ? "sm:col-span-2" : ""}`}>
      {icon && <span className="mt-0.5 shrink-0 text-ink-faint">{icon}</span>}
      <div className="min-w-0">
        <dt className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-ink-faint">{label}</dt>
        <dd className="mt-0.5 break-words">{children}</dd>
      </div>
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <span className="italic text-ink-faint">{children}</span>;
}
