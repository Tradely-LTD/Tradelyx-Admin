import { Fragment, ReactNode, useEffect, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { AlertTriangle, ArrowLeft, CheckCircle2, ClipboardList, Contact, Eye, FileText, Flag, Lock, RefreshCw, Scale } from "lucide-react";

import { Btn, Card, Confirm, EmptyState, Pill, Skeleton } from "@/common/ui/kit";
import {
  Participant,
  RevealedContact,
  ReviewOutcome,
  ThreadItem,
  ThreadMessage,
  ThreadPage,
  ThreadReport,
  refusalOf,
  refusalMessage,
  useLazyGetConversationPageQuery,
  useRevealContactMutation,
  useReviewItemMutation,
} from "./conversations-api";
import {
  BASIS_LABEL,
  OUTCOME_HINT,
  OUTCOME_LABEL,
  REVIEW_NOTE_MAX,
  charCount,
  flagLabel,
  localTime,
  outcomeLabel,
  reasonLabel,
  timeZoneName,
} from "./labels";
import { NoAccess, ReviewerGate } from "./reviewer-gate";

/**
 * One buyer–seller conversation, read-only, for a reviewer: every message
 * between the two (oldest first, all pages), flagged messages marked with the
 * rule they matched, what the conversation is about, its reports and past
 * reviews, and two actions: reveal the two people's contact details (logged)
 * and mark the open item reviewed. Nothing here writes to either user.
 *
 * Opening the page is a logged view (the backend refuses to show anything it
 * couldn't log). Later pages reuse that view's id; if it has expired the
 * whole conversation is reopened once, as a new logged view.
 */

export default function ConversationThreadPage() {
  const { userA = "", userB = "" } = useParams();
  return (
    <ReviewerGate>
      {() => (
        <>
          <Link to="/conversations" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-soft hover:text-ink">
            <ArrowLeft size={15} /> Flagged & reported conversations
          </Link>
          <Thread key={`${userA}|${userB}`} userA={userA} userB={userB} />
        </>
      )}
    </ReviewerGate>
  );
}

type Load =
  | { state: "loading"; loaded: number; total: number | null }
  | { state: "ready" }
  | { state: "error"; error: unknown; partial: boolean };

function Thread({ userA, userB }: { userA: string; userB: string }) {
  const [fetchPage] = useLazyGetConversationPageQuery();
  const [first, setFirst] = useState<ThreadPage | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [items, setItems] = useState<ThreadItem[]>([]);
  const [reports, setReports] = useState<ThreadReport[]>([]);
  const [load, setLoad] = useState<Load>({ state: "loading", loaded: 0, total: null });
  const [attempt, setAttempt] = useState(0);
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  // The load that is current. Guards against StrictMode's double effect
  // (which would log two views) and against a stale load finishing late.
  const started = useRef<string | null>(null);

  useEffect(() => {
    const key = `${userA}|${userB}|${attempt}`;
    if (started.current === key) return;
    started.current = key;
    const live = () => started.current === key;

    (async () => {
      let reopened = false;
      for (;;) {
        setFirst(null);
        setMessages([]);
        setLoad({ state: "loading", loaded: 0, total: null });
        let got = 0;
        try {
          const p1 = await fetchPage({ userA, userB, page: 1 }).unwrap();
          if (!live()) return;
          setFirst(p1);
          setItems(p1.items ?? []);
          setReports(p1.reports ?? []);
          setOpenedAt(new Date().toISOString());
          let all = p1.messages;
          got = all.length;
          setMessages(all);
          setLoad({ state: "loading", loaded: all.length, total: p1.page.total });
          let page = p1;
          while (page.page.hasMore) {
            page = await fetchPage({ userA, userB, page: page.page.number + 1, view: p1.viewId }).unwrap();
            if (!live()) return;
            all = all.concat(page.messages);
            got = all.length;
            setMessages(all);
            setLoad({ state: "loading", loaded: all.length, total: page.page.total });
          }
          setLoad({ state: "ready" });
          return;
        } catch (err) {
          if (!live()) return;
          if (refusalOf(err)?.data?.code === "VIEW_EXPIRED" && !reopened) {
            reopened = true;
            continue;
          }
          setLoad({ state: "error", error: err, partial: got > 0 });
          return;
        }
      }
    })();
  }, [userA, userB, attempt, fetchPage]);

  const reload = () => setAttempt((n) => n + 1);

  if (load.state === "error" && !load.partial) return <ThreadError error={load.error} onRetry={reload} />;
  if (!first) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20" />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Skeleton className="h-[480px]" />
          <Skeleton className="h-[480px]" />
        </div>
      </div>
    );
  }

  const [a, b] = first.conversation.participants;
  const people = new Map<string, Participant>([
    [a.id, a],
    [b.id, b],
  ]);
  const openItem = items.find((i) => i.status === "new") ?? null;
  const reviewed = items.filter((i) => i.status === "reviewed");
  const flagged = messages.filter((m) => m.flags.length).length;

  const onReviewed = (item: ThreadItem) => {
    setItems((list) => list.map((i) => (i.id === item.id ? item : i)));
    setReports((list) => list.map((r) => (r.itemId === item.id ? { ...r, status: "reviewed" } : r)));
  };

  return (
    <>
      <Card className="mb-4 p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <p className="eyebrow mb-1">Conversation · read-only</p>
            <h1 className="text-[22px] font-bold leading-tight tracking-[-0.02em] text-ink">
              {a.displayName} <span className="font-normal text-ink-faint">and</span> {b.displayName}
            </h1>
            <p className="mt-1 text-[13px] text-ink-soft">
              Opened because of{" "}
              {first.bases.map((basis, i) => (
                <Fragment key={basis}>
                  {i > 0 && " "}
                  <Pill tone={BASIS_LABEL[basis]?.tone ?? "gray"}>{BASIS_LABEL[basis]?.label ?? basis}</Pill>
                </Fragment>
              ))}
            </p>
          </div>
          <div className="shrink-0 rounded-lg bg-paper px-3 py-2 text-[12px] text-ink-soft md:text-right">
            <p className="flex items-center gap-1.5 font-semibold text-ink md:justify-end">
              <Eye size={13} /> This view is logged in Activity
            </p>
            <p className="tnum">Opened {localTime(openedAt)}</p>
            <p>Times shown in {timeZoneName()}</p>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="flex min-w-0 flex-col overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule px-5 py-3">
            <h2 className="text-[13px] font-bold uppercase tracking-[0.06em] text-ink-faint">Messages</h2>
            <span className="tnum text-[12.5px] text-ink-soft">
              {first.page.total} {first.page.total === 1 ? "message" : "messages"}
              {flagged > 0 && <span className="text-attention-deep"> · {flagged} flagged</span>}
            </span>
          </div>
          {load.state === "loading" && load.total !== null && load.loaded < load.total && (
            <p className="tnum border-b border-rule bg-sky-50 px-5 py-2 text-[12.5px] text-sky-800" role="status">
              Loading the rest of the conversation: {load.loaded} of {load.total}…
            </p>
          )}
          {load.state === "error" && load.partial && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule bg-danger-soft px-5 py-2 text-[12.5px] text-danger-deep" role="alert">
              <span>
                Only {messages.length} of {first.page.total} messages loaded. {refusalMessage(load.error, "The rest didn't load.")}
              </span>
              <Btn size="sm" variant="secondary" icon={<RefreshCw size={13} />} onClick={reload}>
                Open again
              </Btn>
            </div>
          )}
          <Messages messages={messages} people={people} leftId={a.id} />
        </Card>

        <div className="space-y-4">
          <ReviewCard item={openItem} onReviewed={onReviewed} onReload={reload} />
          <ParticipantsCard userA={userA} userB={userB} participants={[a, b]} />
          <ReportsCard reports={reports} people={people} />
          <ContextCard context={first.context} people={people} />
          <HistoryCard items={reviewed} />
        </div>
      </div>
    </>
  );
}

function ThreadError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const r = refusalOf(error);
  // The thread route has no 404 of its own: 404 is the feature switched off since the page opened
  if (r?.status === 404) return <Navigate replace to="/" />;
  if (r?.status === 403) return <NoAccess>{r.data?.message || undefined}</NoAccess>;
  const invalid = r?.status === 400;
  return (
    <Card>
      <EmptyState icon={<Lock size={20} />} title={invalid ? "That isn't a conversation link" : "Could not open this conversation"}>
        {refusalMessage(error, "Check your connection and try again.")}
        {!invalid && (
          <button onClick={onRetry} className="mt-3 block w-full cursor-pointer font-semibold text-brand-900 hover:underline">
            Try again
          </button>
        )}
      </EmptyState>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

const dayOf = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
};

const timeOf = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZoneName: "short" });
};

function Messages({ messages, people, leftId }: { messages: ThreadMessage[]; people: Map<string, Participant>; leftId: string }) {
  if (!messages.length) return <EmptyState title="No messages">These two haven't written to each other.</EmptyState>;
  let lastDay = "";
  return (
    <ol className="max-h-[calc(100dvh-220px)] min-h-[320px] space-y-2.5 overflow-y-auto bg-paper px-4 py-4 sm:px-5" aria-label="Messages, oldest first">
      {messages.map((m) => {
        const day = dayOf(m.createdAt);
        const divider = day !== lastDay;
        lastDay = day;
        const left = m.senderId === leftId;
        const sender = people.get(m.senderId);
        const isFlagged = m.flags.length > 0;
        return (
          <Fragment key={m.id}>
            {divider && (
              <li className="flex items-center gap-3 py-1 text-[11.5px] font-semibold text-ink-faint" aria-hidden>
                <span className="h-px flex-1 bg-rule" />
                {day}
                <span className="h-px flex-1 bg-rule" />
              </li>
            )}
            <li className={`flex [content-visibility:auto] ${left ? "justify-start" : "justify-end"}`}>
              <div
                className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-[13.5px] shadow-sm ring-1 ring-inset ${
                  isFlagged ? "bg-attention-soft ring-attention/40" : left ? "bg-white ring-rule" : "bg-brand-50 ring-brand-100"
                }`}
              >
                <p className="mb-0.5 flex flex-wrap items-center gap-x-1.5 text-[11.5px] font-semibold text-ink-soft">
                  <span className={sender?.deleted ? "italic" : ""}>{sender?.displayName ?? "Unknown"}</span>
                  <span className="tnum font-normal text-ink-faint">{timeOf(m.createdAt)}</span>
                </p>
                {m.title && <p className="mb-1 text-[12px] font-semibold text-ink">{m.title}</p>}
                <p className="whitespace-pre-wrap break-words text-ink">{m.body || <span className="text-ink-faint">(no text)</span>}</p>
                {isFlagged && (
                  <p className="mt-1.5 flex flex-wrap items-center gap-1 text-[11.5px] font-semibold text-attention-deep">
                    <Flag size={12} aria-hidden /> Flagged:
                    {m.flags.map((f) => (
                      <span key={f} className="rounded-full bg-white/70 px-1.5 py-px ring-1 ring-inset ring-attention/30">
                        {flagLabel(f)}
                      </span>
                    ))}
                  </p>
                )}
              </div>
            </li>
          </Fragment>
        );
      })}
    </ol>
  );
}

// ---------------------------------------------------------------------------
// Side panels
// ---------------------------------------------------------------------------

function Panel({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <Card className="p-5">
      <h2 className="mb-3 flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.06em] text-ink-faint">
        {icon}
        {title}
      </h2>
      {children}
    </Card>
  );
}

function ReviewCard({ item, onReviewed, onReload }: { item: ThreadItem | null; onReviewed: (item: ThreadItem) => void; onReload: () => void }) {
  const [outcome, setOutcome] = useState<ReviewOutcome | "">("");
  const [note, setNote] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [taken, setTaken] = useState(false);
  const [review, { isLoading }] = useReviewItemMutation();

  if (!item) {
    return (
      <Panel title="Review" icon={<ClipboardList size={14} />}>
        <p className="text-[13px] text-ink-soft">Nothing open for this conversation. It's here through a dispute, or its items have all been reviewed.</p>
      </Panel>
    );
  }

  const length = charCount(note.trim());
  const submit = async () => {
    setProblem(null);
    if (!outcome) return setProblem("Choose an outcome.");
    if (!note.trim()) return setProblem("Add a note saying what you found.");
    if (length > REVIEW_NOTE_MAX) return setProblem(`Keep the note to ${REVIEW_NOTE_MAX} characters or fewer.`);
    try {
      const updated = await review({ id: item.id, outcome, note: note.trim() }).unwrap();
      onReviewed(updated);
      setNote("");
      setOutcome("");
      toast.success("Marked reviewed. Nobody is notified.", { position: "top-right" });
    } catch (err) {
      const r = refusalOf(err);
      if (r?.status === 409 || r?.status === 404) setTaken(true);
      setProblem(refusalMessage(err, "Could not save the review. Try again."));
    }
  };

  return (
    <Panel title="Mark reviewed" icon={<ClipboardList size={14} />}>
      <p className="mb-3 text-[12.5px] text-ink-soft">
        Open since {localTime(item.openedAt)}. Marking it reviewed takes no action against anyone and tells nobody.
      </p>
      {problem && (
        <p role="alert" className="mb-3 rounded-lg bg-danger-soft px-3 py-2 text-[12.5px] font-medium text-danger-deep">
          {problem}
        </p>
      )}
      {taken ? (
        <Btn size="sm" variant="secondary" icon={<RefreshCw size={13} />} onClick={onReload}>
          Open again to see the latest
        </Btn>
      ) : (
        <>
          <fieldset className="space-y-1.5">
            <legend className="mb-1.5 text-[13px] font-semibold text-ink">Outcome</legend>
            {(Object.keys(OUTCOME_LABEL) as ReviewOutcome[]).map((o) => (
              <label
                key={o}
                className={`flex cursor-pointer gap-3 rounded-xl px-3 py-2 ring-1 ring-inset ${outcome === o ? "bg-brand-50/70 ring-brand-200" : "ring-rule hover:bg-paper"}`}
              >
                <input type="radio" name="review-outcome" value={o} checked={outcome === o} onChange={() => setOutcome(o)} className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-brand-900" />
                <span>
                  <span className="block text-[13.5px] font-semibold text-ink">{OUTCOME_LABEL[o]}</span>
                  <span className="block text-[12px] text-ink-soft">{OUTCOME_HINT[o]}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <label htmlFor="review-note" className="mb-1 mt-3 block text-[13px] font-semibold text-ink">
            Note <span className="font-normal text-ink-faint">(required)</span>
          </label>
          <textarea
            id="review-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            aria-describedby="review-note-count"
            placeholder="What you found and why"
            className="w-full rounded-lg border-0 bg-white px-3 py-2 text-[13.5px] leading-relaxed text-ink shadow-sm ring-1 ring-inset ring-rule focus:outline-none focus:ring-2 focus:ring-brand-900"
          />
          <p id="review-note-count" className={`tnum mt-1 text-right text-[11.5px] ${length > REVIEW_NOTE_MAX ? "font-semibold text-danger-deep" : "text-ink-faint"}`}>
            {length}/{REVIEW_NOTE_MAX}
          </p>
          <Btn className="mt-2 w-full" icon={<CheckCircle2 size={15} />} onClick={submit} loading={isLoading} disabled={!outcome || !note.trim() || length > REVIEW_NOTE_MAX}>
            Mark reviewed
          </Btn>
        </>
      )}
    </Panel>
  );
}

function ParticipantsCard({ userA, userB, participants }: { userA: string; userB: string; participants: [Participant, Participant] }) {
  const [confirming, setConfirming] = useState(false);
  const [contacts, setContacts] = useState<RevealedContact[] | null>(null);
  const [reveal, { isLoading }] = useRevealContactMutation();

  const doReveal = async () => {
    try {
      setContacts(await reveal({ userA, userB }).unwrap());
      setConfirming(false);
    } catch (err) {
      setConfirming(false);
      toast.error(refusalMessage(err, "Could not reveal the contact details"), { position: "top-right" });
    }
  };

  return (
    <Panel title="Participants" icon={<Contact size={14} />}>
      <ul className="space-y-3">
        {participants.map((p) => {
          const c = contacts?.find((x) => x.id === p.id);
          return (
            <li key={p.id}>
              <p className={`text-[13.5px] font-semibold ${p.deleted ? "italic text-ink-faint" : "text-ink"}`}>{p.displayName}</p>
              {p.businessName && <p className="text-[12.5px] text-ink-soft">{p.businessName}</p>}
              {c && (
                <p className="mt-0.5 break-all text-[12.5px] text-ink">
                  {c.email ?? "No email"} · {c.phone ?? "No phone"}
                </p>
              )}
            </li>
          );
        })}
      </ul>
      {!contacts && (
        <>
          <Btn variant="secondary" size="sm" className="mt-4 w-full" icon={<Eye size={14} />} onClick={() => setConfirming(true)}>
            Reveal contact
          </Btn>
          <p className="mt-1.5 text-[11.5px] text-ink-faint">Emails and phones are hidden. Revealing them is recorded in Activity.</p>
        </>
      )}
      <Confirm
        open={confirming}
        title="Reveal their contact details?"
        confirmLabel="Reveal"
        loading={isLoading}
        onConfirm={doReveal}
        onCancel={() => setConfirming(false)}
      >
        Both people's email and phone number will show here. The reveal is recorded in Activity under your name. Only do this if you need to reach them about this conversation.
      </Confirm>
    </Panel>
  );
}

function ReportsCard({ reports, people }: { reports: ThreadReport[]; people: Map<string, Participant> }) {
  if (!reports.length) return null;
  const name = (id: string) => people.get(id)?.displayName ?? "Deleted user";
  return (
    <Panel title={`Reports (${reports.length})`} icon={<AlertTriangle size={14} />}>
      <ol className="space-y-3">
        {reports.map((r) => (
          <li key={r.id} className="rounded-lg bg-paper px-3 py-2.5">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[13px] font-semibold text-ink">{reasonLabel(r.reason)}</p>
              <Pill tone={r.status === "new" ? "orange" : "gray"}>{r.status === "new" ? "New" : "Reviewed"}</Pill>
            </div>
            <p className="mt-0.5 text-[12px] text-ink-soft">
              {name(r.reporterId)} reported {name(r.reportedUserId)}
            </p>
            {r.note && <p className="mt-1.5 whitespace-pre-wrap break-words text-[12.5px] text-ink">"{r.note}"</p>}
            <p className="tnum mt-1 text-[11.5px] text-ink-faint">{localTime(r.createdAt)}</p>
          </li>
        ))}
      </ol>
    </Panel>
  );
}

function ContextCard({ context, people }: { context: ThreadPage["context"]; people: Map<string, Participant> }) {
  const name = (id: string | null) => (id ? people.get(id)?.displayName ?? "Deleted user" : "—");
  const empty =
    !context ||
    !(context.disputes.length || context.orders.length || context.rfqs.length || context.quotes.length || context.sellOffers.length || context.products.length);
  return (
    <Panel title="What it's about" icon={<FileText size={14} />}>
      {empty || !context ? (
        <p className="text-[13px] text-ink-soft">No linked requests, quotes, listings, orders or disputes.</p>
      ) : (
        <div className="space-y-4 text-[13px]">
          {!!context.disputes.length && (
            <Group title="Disputes">
              {context.disputes.map((d) => (
                <li key={d.disputeId} className="flex items-start justify-between gap-2">
                  <span className="min-w-0">
                    <Link to={`/disputes/${encodeURIComponent(d.disputeId)}`} className="inline-flex items-center gap-1 font-semibold text-brand-900 hover:underline">
                      <Scale size={12} /> Dispute
                    </Link>
                    <span className="block text-[11.5px] text-ink-faint">
                      Raised {localTime(d.createdAt)}
                      {d.raisedBy ? ` by ${name(d.raisedBy)}` : ""}
                      {d.resolvedAt ? ` · resolved ${localTime(d.resolvedAt)}` : ""}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <Pill tone={d.isOpen ? "orange" : "gray"}>{d.isOpen ? "Open" : "Resolved"}</Pill>
                    {!d.givesBasis && <span className="text-[11px] text-ink-faint">Over 12 months</span>}
                  </span>
                </li>
              ))}
            </Group>
          )}
          {!!context.orders.length && (
            <Group title="Orders">
              {context.orders.map((o) => (
                <li key={o.id}>
                  <p className="font-semibold text-ink">{o.title || "Order"}</p>
                  <p className="text-[11.5px] text-ink-faint">
                    {name(o.buyerId)} bought from {name(o.sellerId)}
                    {o.status ? ` · ${o.status.replace(/_/g, " ")}` : ""}
                    {o.createdAt ? ` · ${localTime(o.createdAt)}` : ""}
                  </p>
                </li>
              ))}
            </Group>
          )}
          {!!context.rfqs.length && (
            <Group title="Buyer requests">
              {context.rfqs.map((r) => (
                <li key={r.id}>
                  <p className="font-semibold text-ink">{r.title}</p>
                  <p className="text-[11.5px] text-ink-faint">
                    by {name(r.buyerId)}
                    {r.status ? ` · ${r.status.replace(/_/g, " ")}` : ""}
                  </p>
                </li>
              ))}
            </Group>
          )}
          {!!context.quotes.length && (
            <Group title="Quotes">
              {context.quotes.map((q) => (
                <li key={q.id}>
                  <p className="font-semibold text-ink">Quote from {name(q.replierId)}</p>
                  <p className="text-[11.5px] text-ink-faint">
                    to {name(q.posterId)}
                    {q.createdAt ? ` · ${localTime(q.createdAt)}` : ""}
                  </p>
                </li>
              ))}
            </Group>
          )}
          {!!context.sellOffers.length && (
            <Group title="Sell offers">
              {context.sellOffers.map((s) => (
                <li key={s.id}>
                  <p className="font-semibold text-ink">{s.title}</p>
                  <p className="text-[11.5px] text-ink-faint">by {name(s.creatorId)}</p>
                </li>
              ))}
            </Group>
          )}
          {!!context.products.length && (
            <Group title="Products">
              {context.products.map((p) => (
                <li key={p.id}>
                  <p className="font-semibold text-ink">{p.title}</p>
                  <p className="text-[11.5px] text-ink-faint">by {name(p.creatorId)}</p>
                </li>
              ))}
            </Group>
          )}
        </div>
      )}
    </Panel>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-1.5 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-ink-faint">{title}</h3>
      <ul className="space-y-2">{children}</ul>
    </section>
  );
}

function HistoryCard({ items }: { items: ThreadItem[] }) {
  if (!items.length) return null;
  return (
    <Panel title="Review history" icon={<CheckCircle2 size={14} />}>
      <ol className="space-y-3">
        {items.map((i) => (
          <li key={i.id} className="rounded-lg bg-paper px-3 py-2.5">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[13px] font-semibold text-ink">{outcomeLabel(i.outcome)}</p>
              <Pill tone={i.outcome === "concern_noted" ? "orange" : "green"}>Reviewed</Pill>
            </div>
            <p className="mt-0.5 text-[12px] text-ink-soft">
              by {i.reviewedBy?.displayName ?? "—"} · <span className="tnum">{localTime(i.reviewedAt)}</span>
            </p>
            {i.reviewNote && <p className="mt-1.5 whitespace-pre-wrap break-words text-[12.5px] text-ink">{i.reviewNote}</p>}
          </li>
        ))}
      </ol>
    </Panel>
  );
}
