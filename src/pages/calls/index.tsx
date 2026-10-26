import { useState } from "react";
import { PhoneCall } from "lucide-react";

import { Btn, Card, EmptyState, PageHeader, Pill, Skeleton, formatDate } from "@/common/ui/kit";
import type { Tone } from "@/common/ui/kit";
import { useUserSlice } from "@/pages/auth/authSlice";
import { CallTask, Outcome, TaskKind, TaskView, useAssignCallMutation, useGetAssigneesQuery, useGetCallsQuery, useRecordOutcomeMutation } from "./calls-api";

/**
 * Today's calls (roadmap #12c): who to ring, why, what to ask, and what came
 * of it. Most calls appear on their own from what's happening on TradelyX;
 * staff hand them out, and an agent only ever sees the calls given to them.
 */

const KIND: Record<TaskKind, { label: string; tone: Tone }> = {
  quote_unpaid: { label: "Quotes not paid", tone: "orange" },
  no_quotes: { label: "No quotes yet", tone: "blue" },
  message_unanswered: { label: "Message unanswered", tone: "red" },
  kyc_stuck: { label: "ID check stuck", tone: "orange" },
  order_lapsed: { label: "Order lapsed", tone: "red" },
  hot_buyer: { label: "Likely buyer", tone: "green" },
  manual: { label: "Added by staff", tone: "gray" },
};

const OUTCOMES: { value: Outcome; label: string }[] = [
  { value: "reached", label: "Reached" },
  { value: "no_answer", label: "No answer" },
  { value: "call_back", label: "Call back…" },
  { value: "not_interested", label: "Not interested" },
  { value: "wrong_number", label: "Wrong number" },
];

export default function CallsPage() {
  const { loginResponse } = useUserSlice();
  const isAgent = loginResponse?.user.roles === "agent";
  const [view, setView] = useState<TaskView>("mine");
  const [today, setToday] = useState(true);
  const [status, setStatus] = useState<"open" | "done">("open");
  const { data, isLoading, isError, isFetching } = useGetCallsQuery({ view: isAgent ? "mine" : view, status, today: status === "open" && today });

  const views: { value: TaskView; label: string }[] = isAgent
    ? [{ value: "mine", label: "My calls" }]
    : [
        { value: "mine", label: "My calls" },
        { value: "unassigned", label: "Unassigned" },
        { value: "all", label: "Everyone's" },
      ];

  return (
    <>
      <PageHeader
        eyebrow="Communication"
        title="Calls"
        description="Who to phone today and what to ask. Calls appear on their own when quotes go unpaid, requests get no quotes, messages go unanswered, ID checks get stuck or orders lapse. Record what happened so the next person knows."
      />
      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {views.map((v) => (
          <Chip key={v.value} active={(isAgent ? "mine" : view) === v.value} onClick={() => setView(v.value)}>{v.label}</Chip>
        ))}
        <span className="mx-1 h-5 w-px bg-rule" aria-hidden />
        <Chip active={status === "open" && today} onClick={() => { setStatus("open"); setToday(true); }}>Due today</Chip>
        <Chip active={status === "open" && !today} onClick={() => { setStatus("open"); setToday(false); }}>All open</Chip>
        <Chip active={status === "done"} onClick={() => setStatus("done")}>Done</Chip>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-36" />)}</div>
      ) : isError ? (
        <Card><EmptyState icon={<PhoneCall size={20} />} title="Couldn't load calls">Calls need the Marketing & prospects section, or they aren't live on the API yet.</EmptyState></Card>
      ) : !data?.data.length ? (
        <Card><EmptyState icon={<PhoneCall size={20} />} title={status === "done" ? "No finished calls yet" : "No calls due"} /></Card>
      ) : (
        <ul className={`space-y-3 transition-opacity ${isFetching ? "opacity-60" : ""}`}>
          {data.data.map((task) => <CallCard key={task.id} task={task} canAssign={!isAgent} />)}
        </ul>
      )}
    </>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`cursor-pointer rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
        active ? "bg-brand-950 text-white" : "bg-white text-ink-soft ring-1 ring-inset ring-rule hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function CallCard({ task, canAssign }: { task: CallTask; canAssign: boolean }) {
  const [outcome, setOutcome] = useState<Outcome | "">("");
  const [note, setNote] = useState("");
  const [callBackAt, setCallBackAt] = useState("");
  const [record, { isLoading: saving }] = useRecordOutcomeMutation();
  const [assign] = useAssignCallMutation();
  const { data: assignees } = useGetAssigneesQuery(undefined, { skip: !canAssign });

  const save = async () => {
    if (!outcome) return;
    await record({ id: task.id, outcome, note: note.trim() || undefined, callBackAt: outcome === "call_back" && callBackAt ? new Date(callBackAt).toISOString() : undefined });
    setOutcome("");
    setNote("");
    setCallBackAt("");
  };

  return (
    <li>
      <Card className="px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone={KIND[task.kind].tone}>{KIND[task.kind].label}</Pill>
              {task.overdue ? <Pill tone="red">Overdue</Pill> : null}
              <span className="text-[12px] text-ink-faint">Due {formatDate(task.dueAt, true)}{task.attempts ? ` · ${task.attempts} tr${task.attempts === 1 ? "y" : "ies"}` : ""}</span>
            </div>
            <p className="mt-1.5 text-[15px] font-semibold text-ink">{task.title}</p>
            {task.context ? <p className="text-[13px] text-ink-soft">{task.context}</p> : null}
          </div>
          <div className="text-right text-[13.5px]">
            <p className="font-semibold text-ink">{task.subject.name}{task.subject.company ? ` · ${task.subject.company}` : ""}</p>
            <p className="text-ink-faint capitalize">{task.subject.role ?? ""}</p>
            {task.subject.phone ? (
              <a href={`tel:${task.subject.phone}`} className="font-semibold text-brand">{task.subject.phone}</a>
            ) : (
              <span className="text-ink-faint">No phone</span>
            )}
          </div>
        </div>

        <details className="mt-3">
          <summary className="cursor-pointer text-[13px] font-semibold text-brand">What to ask</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] text-ink-soft">
            {task.questions.map((q) => <li key={q}>{q}</li>)}
          </ul>
        </details>

        {task.status === "done" ? (
          <p className="mt-3 text-[13px] text-ink-soft">
            <span className="font-semibold text-ink">{OUTCOMES.find((o) => o.value === task.outcome)?.label ?? task.outcome}</span>
            {task.outcomeNote ? ` · ${task.outcomeNote}` : ""}
          </p>
        ) : (
          <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-rule pt-3">
            <select value={outcome} onChange={(e) => setOutcome(e.target.value as Outcome)} className="h-9 rounded-lg bg-white px-2 text-[13px] ring-1 ring-inset ring-rule" aria-label="What happened">
              <option value="">What happened?</option>
              {OUTCOMES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {outcome === "call_back" ? (
              <input type="datetime-local" value={callBackAt} onChange={(e) => setCallBackAt(e.target.value)} className="h-9 rounded-lg bg-white px-2 text-[13px] ring-1 ring-inset ring-rule" aria-label="Call back at" />
            ) : null}
            <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} placeholder="Note (what they said)" className="h-9 min-w-[12rem] flex-1 rounded-lg bg-white px-3 text-[13px] ring-1 ring-inset ring-rule" />
            <Btn size="sm" loading={saving} disabled={!outcome || (outcome === "call_back" && !callBackAt)} onClick={save}>Save</Btn>
            {canAssign ? (
              <select
                value={task.assigneeId ?? ""}
                onChange={(e) => assign({ id: task.id, assigneeId: e.target.value || null })}
                className="h-9 rounded-lg bg-white px-2 text-[13px] ring-1 ring-inset ring-rule"
                aria-label="Assign to"
              >
                <option value="">Unassigned</option>
                {(assignees?.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}{p.role === "agent" ? " (agent)" : ""}</option>)}
              </select>
            ) : null}
          </div>
        )}
      </Card>
    </li>
  );
}
