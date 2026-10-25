import { FileScan } from "lucide-react";

import { Card, formatNumber } from "@/common/ui/kit";
import { useGetReadingSummaryQuery } from "./requests-api";

/**
 * AI request posting at a glance (story 5.4): how many order documents
 * buyers had read in the last 30 days, how they came out, how many requests
 * were posted from them, and how often buyers corrected an AI-filled field,
 * which is the accuracy signal. Hidden until the first document is read.
 */
export function ReadingSummaryCard() {
  const { data } = useGetReadingSummaryQuery(30);
  const s = data?.data;
  if (!s || s.documents === 0) return null;

  const changedShare = s.fieldsFilled ? Math.round((s.fieldsChanged / s.fieldsFilled) * 100) : null;
  const stats = [
    { label: "Documents read", value: formatNumber(s.documents) },
    { label: "Read OK", value: `${formatNumber(s.ok)} · ${formatNumber(s.unreadable)} unreadable · ${formatNumber(s.failed)} failed` },
    { label: "Requests posted from them", value: `${formatNumber(s.requestsPosted)} of ${formatNumber(s.products)} products found` },
    { label: "AI-filled fields buyers changed", value: changedShare === null ? "—" : `${changedShare}%` },
  ];

  return (
    <Card className="mb-4 px-5 py-4">
      <div className="flex items-center gap-2">
        <FileScan size={16} className="text-brand" />
        <p className="text-[13px] font-semibold text-ink">Requests from documents · last {s.days} days</p>
        <p className="ml-auto text-[12px] text-ink-faint">{formatNumber(s.inputTokens + s.outputTokens)} tokens</p>
      </div>
      <dl className="mt-3 grid gap-3 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label}>
            <dt className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-ink-faint">{stat.label}</dt>
            <dd className="tnum mt-0.5 text-[14px] font-semibold text-ink">{stat.value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
