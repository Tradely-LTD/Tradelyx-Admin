import { AlertTriangle, Mail } from "lucide-react";

import { useGetEmailStatusQuery } from "../outreach-api";
import { formatDate, formatNumber } from "@/common/ui/kit";

/**
 * How much of the email allowance is used, and whether campaigns are being
 * held back so sign-in and reset codes can still go out. On 2026-09-30 a
 * campaign used up the monthly allowance and reset codes stopped with it;
 * staff now see it coming before they send.
 */
export default function EmailAllowance() {
  const { data } = useGetEmailStatusQuery(undefined, { pollingInterval: 60_000 });
  if (!data) return null;

  const paused = !!data.pausedUntil;
  const limit = data.dailyLimit ?? null;
  const used = data.today ?? 0;
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : null;
  const low = limit != null && used >= limit - data.reserve;

  if (paused || low) {
    return (
      <div className="mb-5 flex gap-3 rounded-xl bg-attention-soft px-4 py-3 ring-1 ring-inset ring-attention/25" role="status">
        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-attention-deep" />
        <div className="text-[13px] leading-relaxed text-ink">
          <p className="font-semibold">Campaign emails are on hold</p>
          <p className="text-ink-soft">
            {paused
              ? `The email provider refused on quota, so campaigns and notifications wait until ${formatDate(data.pausedUntil, true)}.`
              : `Today's allowance is nearly used (${formatNumber(used)} of ${formatNumber(limit)}), so what's left is kept for sign-in and reset codes.`}{" "}
            Emails already queued stay queued and go out automatically later.
            {!data.fallback.email && " There is no backup provider set up for codes (BREVO_API_KEY)."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-ink-soft">
      <span className="inline-flex items-center gap-1.5">
        <Mail size={14} className="text-brand-900" />
        <span className="tnum">{formatNumber(used)}</span> emails sent today
        {limit ? <span className="tnum">of {formatNumber(limit)} ({pct}%)</span> : null}
      </span>
      {data.month != null && (
        <span className="tnum">
          {formatNumber(data.month)} this month{data.monthlyLimit ? ` of ${formatNumber(data.monthlyLimit)}` : ""}
        </span>
      )}
    </div>
  );
}
