import { useState } from "react";
import { Ban, Mail, RefreshCw, Reply } from "lucide-react";
import { toast } from "react-toastify";

import { Btn, Skeleton, formatDate } from "@/common/ui/kit";
import { ProspectDetail, SendResult, Thread, useEmailProspectMutation, useGetProspectThreadQuery, useReplyInExpleeMutation } from "./prospects-api";

/**
 * A hot lead from Explee (our cold-email platform): their live email
 * conversation, and two ways to answer.
 *
 * - Reply in this thread: sent by Explee from the mailbox that first wrote to
 *   them, so it lands in the same conversation. Plain text only, no banner.
 * - Send from TradelyX email: our own address with the TradelyX banner. Their
 *   answers then reach the TradelyX inbox, not this page, and Explee is told
 *   to stop its follow-ups.
 */

const field = "w-full rounded-lg border-0 bg-white px-3 text-[13.5px] text-ink shadow-sm ring-1 ring-inset ring-rule focus:outline-none focus:ring-2 focus:ring-brand-900";

const BLOCKED: Record<string, string> = {
  unsubscribe: "They unsubscribed, so Explee won't send replies. Email them from TradelyX only if they asked you to.",
  no_reply: "They haven't replied in this conversation yet, so there's nothing to answer here.",
};

/** Tell staff what happened to Explee's follow-ups after a send */
export function announce(result: SendResult, sent: string) {
  toast.success(result.data.suppressed ? `${sent} Explee won't email them again.` : sent, { position: "top-right" });
  if (result.data.warning) toast.warn(result.data.warning, { position: "top-right", autoClose: false });
}

export default function ExpleeConversation({ p }: { p: ProspectDetail }) {
  const { data: thread, isLoading, isError, refetch, isFetching } = useGetProspectThreadQuery(p.id);
  const [mode, setMode] = useState<"thread" | "tradelyx">("thread");
  const lastSubject = [...(thread?.messages ?? [])].reverse().find((m) => m.subject)?.subject ?? null;

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[14px] font-bold text-ink">Email conversation</h3>
        <button type="button" onClick={() => refetch()} className="inline-flex cursor-pointer items-center gap-1 text-[12.5px] text-ink-soft hover:text-ink" aria-label="Refresh the conversation">
          <RefreshCw size={13} className={isFetching ? "animate-spin" : ""} /> Refresh
        </button>
      </div>
      <p className="mb-3 text-[12.5px] text-ink-faint">
        A hot lead from Explee{p.explee?.hotAt ? `, ${formatDate(p.explee.hotAt, true)}` : ""}.
        {p.explee?.suppressedAt ? " Explee has stopped emailing them." : " Explee's follow-ups are still on."}
      </p>

      {isLoading ? (
        <Skeleton className="h-40" />
      ) : isError || !thread ? (
        <p className="rounded-lg bg-danger-soft px-3 py-2 text-[13px] text-danger-deep">Couldn't load the conversation from Explee. Try Refresh.</p>
      ) : (
        <Messages thread={thread} />
      )}

      <div className="mb-2 mt-4 flex flex-wrap gap-1.5">
        {([["thread", "Reply in this thread"], ["tradelyx", "Send from TradelyX email"]] as const).map(([k, label]) => (
          <button key={k} type="button" onClick={() => setMode(k)} aria-pressed={mode === k} className={`cursor-pointer rounded-full px-3 py-1.5 text-[12.5px] font-semibold ${mode === k ? "bg-brand-950 text-white" : "bg-white text-ink-soft ring-1 ring-inset ring-rule hover:text-ink"}`}>
            {label}
          </button>
        ))}
      </div>
      {mode === "thread" ? (
        <ThreadReply p={p} thread={thread} />
      ) : (
        <TradelyxEmail p={p} defaultSubject={lastSubject ? (/^re:/i.test(lastSubject) ? lastSubject : `Re: ${lastSubject}`) : ""} />
      )}
    </section>
  );
}

function Messages({ thread }: { thread: Thread }) {
  if (!thread.messages.length) return <p className="text-[13px] text-ink-faint">No messages yet.</p>;
  return (
    <ol className="max-h-[420px] space-y-2.5 overflow-y-auto rounded-xl bg-paper p-3">
      {thread.messages.map((m, i) => (
        <li key={m.id ?? i} className={`flex ${m.from === "us" ? "justify-end" : "justify-start"}`}>
          <div className={`max-w-[88%] rounded-xl px-3 py-2 text-[13px] shadow-sm ${m.from === "us" ? "bg-brand-50 text-ink ring-1 ring-inset ring-brand-100" : "bg-white text-ink ring-1 ring-inset ring-rule"}`}>
            <p className="mb-0.5 text-[11.5px] font-semibold text-ink-soft">
              {m.from === "us" ? "Us" : "Them"}
              {m.at ? ` · ${formatDate(m.at, true)}` : ""}
            </p>
            {m.subject && i === 0 && <p className="mb-1 text-[12px] font-semibold">{m.subject}</p>}
            <p className="whitespace-pre-line text-ink-soft">{m.body || "(no text)"}</p>
            {!!m.attachments.length && <p className="mt-1 text-[11.5px] text-ink-faint">Attached: {m.attachments.join(", ")}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

function ThreadReply({ p, thread }: { p: ProspectDetail; thread?: Thread }) {
  const [body, setBody] = useState("");
  const [send, { isLoading }] = useReplyInExpleeMutation();
  const blocked = thread && !thread.canReply ? BLOCKED[thread.blockedReason ?? ""] ?? "Explee won't send a reply in this conversation." : null;

  const submit = async (close: boolean) => {
    try {
      const result = await send({ id: p.id, body, close }).unwrap();
      setBody("");
      announce(result, close ? "Reply sent and marked not interested." : "Reply sent.");
    } catch (err: any) {
      toast.error(err?.data?.error || "The reply didn't send", { position: "top-right" });
    }
  };

  if (blocked) return <p className="rounded-lg bg-paper px-3 py-2 text-[13px] text-ink-soft">{blocked}</p>;
  return (
    <>
      <label htmlFor="explee-reply" className="sr-only">Your reply</label>
      <textarea id="explee-reply" value={body} onChange={(e) => setBody(e.target.value)} rows={7} placeholder="Write your reply. Sign it with the name they've been emailing with." className={`${field} py-2.5 leading-relaxed`} />
      <p className="mt-1.5 text-[12px] text-ink-faint">Sent in the same conversation, from the mailbox that first wrote to them. Plain text only: no TradelyX banner.</p>
      <div className="mt-2 flex flex-wrap justify-end gap-2">
        <Btn size="sm" variant="danger" icon={<Ban size={13} />} onClick={() => submit(true)} loading={isLoading} disabled={!body.trim()}>
          Send and close: not interested
        </Btn>
        <Btn size="sm" icon={<Reply size={13} />} onClick={() => submit(false)} loading={isLoading} disabled={!body.trim()}>
          Send reply
        </Btn>
      </div>
    </>
  );
}

/** Our own branded email. Also used from "Send a message" for prospects with an email address. */
export function TradelyxEmail({ p, defaultSubject, defaultBody = "", onSent }: { p: ProspectDetail; defaultSubject: string; defaultBody?: string; onSent?: () => void }) {
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [send, { isLoading }] = useEmailProspectMutation();

  const submit = async () => {
    try {
      const result = await send({ id: p.id, subject, body }).unwrap();
      setBody("");
      announce(result, `Email sent to ${p.email}.`);
      onSent?.();
    } catch (err: any) {
      toast.error(err?.data?.error || "The email didn't send", { position: "top-right" });
    }
  };

  return (
    <>
      <label className="mb-2 block text-[12.5px] font-semibold text-ink">
        Subject
        <input value={subject} onChange={(e) => setSubject(e.target.value)} className={`${field} mt-1 h-9 font-normal`} />
      </label>
      <label htmlFor="tradelyx-email" className="sr-only">Message</label>
      <textarea id="tradelyx-email" value={body} onChange={(e) => setBody(e.target.value)} rows={8} placeholder="Write your message." className={`${field} py-2.5 leading-relaxed`} />
      <p className="mt-1.5 text-[12px] text-ink-faint">
        Sent to {p.email} from TradelyX's own address, with the TradelyX banner. Their answer goes to the TradelyX inbox, not this page.
        {p.explee && !p.explee.suppressedAt ? " Explee will stop its follow-ups." : ""}
      </p>
      <div className="mt-2 flex justify-end">
        <Btn size="sm" icon={<Mail size={13} />} onClick={submit} loading={isLoading} disabled={!subject.trim() || !body.trim()}>
          Send from TradelyX
        </Btn>
      </div>
    </>
  );
}
