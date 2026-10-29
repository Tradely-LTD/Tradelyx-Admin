import { ImageUp } from "lucide-react";

import { Card, formatNumber } from "@/common/ui/kit";
import { useGetListingReadingSummaryQuery } from "../product-api";

/**
 * AI listing posting at a glance (listing story 5.5): how many seller
 * readings ran in the last 30 days (new listings and "Improve with AI"),
 * how they came out, how many listings were posted from them, how often
 * sellers corrected an AI-filled field (the accuracy signal), and whether
 * the early photo warnings work: of the posted products whose photos were
 * warned about, how many staff still held back. Hidden until the first
 * reading.
 */
export function ListingReadingCard() {
  const { data } = useGetListingReadingSummaryQuery(30);
  const s = data?.data;
  if (!s || s.readings === 0) return null;

  const changedShare = s.fieldsFilled ? Math.round((s.fieldsChanged / s.fieldsFilled) * 100) : null;
  const stats = [
    { label: "Seller readings", value: `${formatNumber(s.readings)} · ${formatNumber(s.created)} new · ${formatNumber(s.improved)} improve` },
    { label: "Read OK", value: `${formatNumber(s.ok)} · ${formatNumber(s.unreadable)} unreadable · ${formatNumber(s.failed)} failed` },
    { label: "Listings posted from them", value: `${formatNumber(s.listingsPosted)} of ${formatNumber(s.found)} found` },
    { label: "AI-filled fields sellers changed", value: changedShare === null ? "—" : `${changedShare}%` },
    {
      label: "Photo warnings",
      value: `${formatNumber(s.photoWarnings)} shown · ${formatNumber(s.warnedHeldBack)} of ${formatNumber(s.warnedPosted)} warned products held back`,
    },
  ];

  return (
    <Card className="mb-4 px-5 py-4">
      <div className="flex items-center gap-2">
        <ImageUp size={16} className="text-brand" />
        <p className="text-[13px] font-semibold text-ink">Listings from photos and documents · last {s.days} days</p>
        <p className="ml-auto text-[12px] text-ink-faint">
          {formatNumber(s.products)} product · {formatNumber(s.sellOffers)} offer readings · {formatNumber(s.inputTokens + s.outputTokens)} tokens
        </p>
      </div>
      <dl className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
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
