import { useState } from "react";
import { Check, Mail, Phone, UserPlus, UserX } from "lucide-react";

import { Btn, Card, EmptyState, PageHeader, Pill, Skeleton, Tabs, formatDate, formatNumber } from "@/common/ui/kit";
import { SignupStage, SignupWeek, UnfinishedSignup, useAddSignupToProspectsMutation, useGetUnfinishedSignupsQuery } from "./growth-api";

/**
 * People who started signing up and stopped. Two stages: they filled in the
 * whole form but never entered the emailed code (one step from an account),
 * or they only gave an email on the first screen. Both already get two
 * reminder emails on their own; this is for a person to call or write, and
 * "Add to Prospects" hands them to sales. They drop off the list when they
 * finish, or when their details expire (7 days for the form, 14 for an email).
 */

const STAGE: Record<SignupStage, { title: string; hint: string }> = {
  form: { title: "Filled the form", hint: "Filled in everything but never entered the code we emailed. One step from an account." },
  email: { title: "Gave an email only", hint: "Gave an email on the first screen and stopped. No name or phone yet." },
};

const ago = (iso: string) => {
  const hours = Math.round((Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
};

export default function UnfinishedSignupsPage() {
  const [stage, setStage] = useState<SignupStage>("form");
  const { data, isLoading, isError, isFetching } = useGetUnfinishedSignupsQuery();
  const list = (data?.data ?? []).filter((s) => s.stage === stage);

  return (
    <>
      <PageHeader
        eyebrow="People"
        title="Unfinished sign-ups"
        description="People who started signing up and stopped. They already get two reminder emails; call or write to them, or add them to Prospects for sales. Details are kept only until they finish or expire (7 days after the form, 14 after an email)."
      />

      {data ? <Weekly weeks={data.weekly} /> : null}

      <div className="mb-2 mt-5">
        <Tabs<SignupStage>
          value={stage}
          onChange={setStage}
          items={(["form", "email"] as SignupStage[]).map((s) => ({ value: s, label: STAGE[s].title, count: data?.counts[s] }))}
        />
      </div>
      <p className="mb-4 text-[13px] text-ink-soft">{STAGE[stage].hint}</p>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : isError ? (
        <Card>
          <EmptyState icon={<UserX size={20} />} title="Couldn't load unfinished sign-ups">
            Your staff account needs the Marketing & prospects section, or this isn't live on the API yet.
          </EmptyState>
        </Card>
      ) : !list.length ? (
        <Card>
          <EmptyState icon={<UserX size={20} />} title="Nobody here right now">
            {stage === "form" ? "Everyone who filled in the form has finished." : "Everyone who gave an email has moved on."}
          </EmptyState>
        </Card>
      ) : (
        <Card className={`overflow-hidden transition-opacity ${isFetching ? "opacity-60" : ""}`}>
          <ul className="divide-y divide-rule">
            {list.map((s) => <Row key={`${s.stage}-${s.id}`} signup={s} />)}
          </ul>
        </Card>
      )}
    </>
  );
}

function Row({ signup: s }: { signup: UnfinishedSignup }) {
  const [add, { isLoading }] = useAddSignupToProspectsMutation();
  return (
    <li className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-[14.5px] font-semibold text-ink">{s.name || s.email}</p>
          <Pill tone={s.role === "seller" ? "blue" : "green"}>{s.role === "seller" ? "Seller" : "Buyer"}</Pill>
          {s.unsubscribed ? <Pill tone="gray">Unsubscribed from reminders</Pill> : null}
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]">
          <a href={`mailto:${s.email}`} className="inline-flex items-center gap-1.5 text-ink-soft hover:text-ink">
            <Mail size={13} /> {s.email}
          </a>
          {s.phone ? (
            <a href={`tel:${s.phone}`} className="inline-flex items-center gap-1.5 font-semibold text-brand hover:underline">
              <Phone size={13} /> {s.phone}
            </a>
          ) : null}
        </p>
        <p className="mt-1 text-[12px] text-ink-faint">
          Started {ago(s.startedAt)} · {s.remindersSent} reminder{s.remindersSent === 1 ? "" : "s"} sent
          {s.codesSent ? ` · ${s.codesSent} code${s.codesSent === 1 ? "" : "s"} emailed` : ""}
          {s.expiresAt ? ` · details kept until ${formatDate(s.expiresAt)}` : ""}
        </p>
      </div>
      <div className="shrink-0">
        {s.prospectId ? (
          <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand">
            <Check size={14} /> In Prospects
          </span>
        ) : (
          <Btn size="sm" icon={<UserPlus size={14} />} loading={isLoading} onClick={() => add({ stage: s.stage, id: s.id })}>
            Add to Prospects
          </Btn>
        )}
      </div>
    </li>
  );
}

/** Started, reached the form and finished, by the week people started (8 weeks). */
function Weekly({ weeks }: { weeks: SignupWeek[] }) {
  if (!weeks.length) return null;
  const total = weeks.reduce((t, w) => ({ started: t.started + w.started, form: t.form + w.form, completed: t.completed + w.completed }), { started: 0, form: 0, completed: 0 });
  const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
  return (
    <Card className="px-5 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[15px] font-semibold text-ink">Started vs finished, last 8 weeks</h2>
        <p className="text-[13px] text-ink-soft">
          <span className="tnum font-semibold text-ink">{pct(total.completed, total.started)}%</span> of people who start finish signing up
        </p>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[480px] text-[13px]">
          <thead>
            <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-faint">
              <th className="py-2">Week of</th>
              <th className="py-2 text-right">Started</th>
              <th className="py-2 text-right">Filled the form</th>
              <th className="py-2 text-right">Finished</th>
              <th className="w-40 py-2 pl-4">Finish rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {[...weeks].reverse().map((w) => (
              <tr key={w.weekStart}>
                <td className="py-2 font-medium text-ink">{new Date(`${w.weekStart}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })}</td>
                <td className="tnum py-2 text-right">{formatNumber(w.started)}</td>
                <td className="tnum py-2 text-right">{formatNumber(w.form)}</td>
                <td className="tnum py-2 text-right font-semibold text-ink">{formatNumber(w.completed)}</td>
                <td className="py-2 pl-4">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper-deep">
                      <div className="h-full rounded-full bg-brand" style={{ width: `${pct(w.completed, w.started)}%` }} />
                    </div>
                    <span className="tnum w-9 text-right text-[12px] text-ink-faint">{pct(w.completed, w.started)}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[12px] text-ink-faint">Counted from 27 Oct 2026, when this started being recorded. Only a scrambled form of each email is kept for this count.</p>
    </Card>
  );
}
