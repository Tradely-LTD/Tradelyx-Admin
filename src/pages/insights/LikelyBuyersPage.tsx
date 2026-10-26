import { useState } from "react";
import { Flame, Mail, Phone, PhoneCall, Target } from "lucide-react";

import { Btn, Card, EmptyState, PageHeader, Pill, Skeleton, Tabs, formatDate } from "@/common/ui/kit";
import type { Tone } from "@/common/ui/kit";
import { IntentLabel, LikelyBuyer, useAddBuyerCallMutation, useGetLikelyBuyersQuery } from "./insights-api";

/**
 * Likely buyers (roadmap #12d): everyone active in the last 30 days, scored
 * on what they did (posted a request, has unpaid quotes, keeps looking at a
 * seller, asked about a product, ID verified, saved a product, active this
 * week). Points, not a model, so every buyer shows the reasons behind their
 * score. Hot buyers are also put on the call list automatically once a week;
 * "Add call" puts anyone on it now.
 */

const LABEL: Record<IntentLabel, { title: string; tone: Tone; hint: string }> = {
  hot: { title: "Hot", tone: "red", hint: "Score 60 or more: close to ordering. Call them." },
  warm: { title: "Warm", tone: "orange", hint: "Score 30 to 59: interested. A nudge helps." },
  cold: { title: "Cold", tone: "gray", hint: "Under 30: looking around, or gone quiet." },
};

export default function LikelyBuyersPage() {
  const [label, setLabel] = useState<IntentLabel>("hot");
  const { data, isLoading, isFetching, isError } = useGetLikelyBuyersQuery(label);
  const counts = data?.counts;

  return (
    <>
      <PageHeader
        eyebrow="Communication"
        title="Likely buyers"
        description="Buyers active in the last 30 days, scored on what they did. The reasons behind each score are shown, and a score fades after a week of quiet. Hot buyers are added to the call list on their own once a week."
      />

      <div className="mb-2">
        <Tabs<IntentLabel>
          value={label}
          onChange={setLabel}
          items={(["hot", "warm", "cold"] as IntentLabel[]).map((l) => ({ value: l, label: LABEL[l].title, count: counts?.[l] }))}
        />
      </div>
      <p className="mb-4 text-[13px] text-ink-soft">{LABEL[label].hint}</p>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : isError ? (
        <Card>
          <EmptyState icon={<Target size={20} />} title="Couldn't load likely buyers">
            Your staff account needs the Marketing & prospects section, or insights aren't live on the API yet.
          </EmptyState>
        </Card>
      ) : !data?.data.length ? (
        <Card>
          <EmptyState icon={<Flame size={20} />} title={`No ${LABEL[label].title.toLowerCase()} buyers right now`}>
            Scores update as buyers post requests, get quotes and browse sellers.
          </EmptyState>
        </Card>
      ) : (
        <ul className={`space-y-3 transition-opacity ${isFetching ? "opacity-60" : ""}`}>
          {data.data.map((b) => <BuyerCard key={b.userId} buyer={b} />)}
        </ul>
      )}
    </>
  );
}

function BuyerCard({ buyer }: { buyer: LikelyBuyer }) {
  const [addCall, { isLoading }] = useAddBuyerCallMutation();
  const [added, setAdded] = useState(false);
  const tone = LABEL[buyer.label].tone;

  const add = async () => {
    try {
      await addCall({
        subjectUserId: buyer.userId,
        title: buyer.lookingFor ? `Likely buyer: ${buyer.lookingFor}` : `Likely buyer: ${buyer.name}`,
        context: `Intent score ${buyer.score}. ${buyer.reasons.join("; ")}.`,
      }).unwrap();
      setAdded(true);
    } catch {
      // The mutation toasts why
    }
  };

  return (
    <li>
      <Card className="px-5 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          {/* Score: the number, the label and a bar out of 100 */}
          <div className="flex shrink-0 items-center gap-3 lg:w-28 lg:flex-col lg:items-start">
            <p className="tnum text-[28px] font-bold leading-none text-ink">{buyer.score}</p>
            <div className="flex flex-col gap-1.5">
              <Pill tone={tone} dot>{LABEL[buyer.label].title}</Pill>
              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-paper-deep" aria-hidden>
                <div className={`h-full rounded-full ${buyer.label === "hot" ? "bg-danger" : buyer.label === "warm" ? "bg-attention" : "bg-ink-faint"}`} style={{ width: `${Math.min(buyer.score, 100)}%` }} />
              </div>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold text-ink">
              {buyer.name || buyer.email || "Unnamed buyer"}
              {buyer.company ? <span className="font-normal text-ink-soft"> · {buyer.company}</span> : null}
            </p>
            {buyer.lookingFor ? (
              <p className="mt-0.5 text-[13px] text-ink-soft">
                Looking for <span className="font-semibold text-ink">{buyer.lookingFor}</span>
              </p>
            ) : null}
            <ul className="mt-2.5 flex flex-wrap gap-1.5" aria-label="Why this score">
              {buyer.reasons.map((r) => (
                <li key={r} className="rounded-full bg-paper px-2.5 py-1 text-[12px] text-ink-soft ring-1 ring-inset ring-rule">{r}</li>
              ))}
            </ul>
            <p className="mt-2.5 text-[12px] text-ink-faint">
              {buyer.lastActiveAt ? `Last active ${formatDate(buyer.lastActiveAt, true)}` : "Not seen recently"}
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2 lg:flex-col lg:items-end">
            {buyer.phone ? (
              <a href={`tel:${buyer.phone}`} className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-brand hover:underline">
                <Phone size={14} /> {buyer.phone}
              </a>
            ) : null}
            {buyer.email ? (
              <a href={`mailto:${buyer.email}`} className="inline-flex items-center gap-1.5 text-[13px] text-ink-soft hover:text-ink">
                <Mail size={14} /> {buyer.email}
              </a>
            ) : null}
            <Btn size="sm" variant={added ? "secondary" : "primary"} icon={<PhoneCall size={14} />} loading={isLoading} disabled={added} onClick={add}>
              {added ? "On the call list" : "Add call"}
            </Btn>
          </div>
        </div>
      </Card>
    </li>
  );
}
