import { ReactNode, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  ArrowLeft,
  BadgeCheck,
  Banknote,
  EyeOff,
  FileText,
  Gavel,
  Image as ImageIcon,
  MessageSquare,
  MessagesSquare,
  Paperclip,
  PlayCircle,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";

import {
  AdminDispute,
  DisputeEntry,
  Evidence,
  MoneyResult,
  NoteKind,
  Outcome,
  refusalOf,
  requestId,
  useAddNoteMutation,
  useChangeDecisionMutation,
  useCompleteRefundMutation,
  useDecideMutation,
  useGetDisputeQuery,
  useLazyGetEvidenceLinkQuery,
  useRetryPayoutMutation,
  useStartReviewMutation,
} from "./disputes-api";
import { FinanceGate, LoadError } from "./finance-gate";
import {
  ENTRY_LABEL,
  NOTE_MAX,
  OUTCOME_LABEL,
  REASON_MAX,
  REASON_MIN,
  ROLE_LABEL,
  STATE,
  ageText,
  ageTone,
  categoryLabel,
  historyLabel,
  humanize,
  isOpenStatus,
  money,
} from "./labels";
import { Btn, Card, Confirm, Modal, Pill, Skeleton, formatDate } from "@/common/ui/kit";
import { useUserSlice } from "@/pages/auth/authSlice";
import { canReviewConversations, useGetMyAccessQuery } from "@/pages/staff/staff-api";
import { useGetConversationReviewSummaryQuery } from "@/pages/conversations/conversations-api";
import { threadPath } from "@/pages/conversations/labels";

/**
 * One dispute, for a finance admin: the order and its money, both sides'
 * statements and evidence, the full timeline (staff-only entries marked), and
 * the actions — start review, decide, change a release to a refund (a
 * different admin only), retry a failed payout, add a note.
 *
 * The server is the authority on every action: buttons are hidden or disabled
 * when the backend would refuse, and any refusal it still returns (another
 * admin got there first, the version changed…) is shown in its own words and
 * the dispute is reloaded.
 */

const PAYOUT_STARTED = ["payout_pending", "payout_processing", "disbursed"];
const MAX_PAYOUT_ATTEMPTS = 2;
/** Refund rows support can still mark sent (REFUND_UNDER_WAY_STATUSES minus refunded). */
const REFUND_WITH_SUPPORT = ["accepted", "awaiting_account", "awaiting_provider", "processing", "failed"];

export default function DisputeDetailPage() {
  const { id = "" } = useParams();
  return (
    <>
      <Link to="/disputes" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-soft hover:text-ink">
        <ArrowLeft size={15} /> All disputes
      </Link>
      <FinanceGate>{(myId) => <Detail id={id} myId={myId} />}</FinanceGate>
    </>
  );
}

/** A refusal that means the dispute changed under us: close the dialog, the cache reloads it. */
const stateRefusal = (err: unknown) => {
  const s = refusalOf(err)?.status;
  return s === 403 || s === 404 || s === 409;
};

function moneyToast(m: MoneyResult | null, prefix: string) {
  const opts = { position: "top-right" as const, autoClose: 8000 };
  if (!m) return toast.success(prefix, opts);
  if (m.kind === "refund") {
    return toast.success(`${prefix} The refund is with support to send and mark complete (${humanize(m.status).toLowerCase()}).${m.message ? ` ${m.message}` : ""}`, opts);
  }
  if (m.status === "disbursed") return toast.success(`${prefix} The seller has been paid.`, opts);
  if (m.status === "payout_pending" || m.status === "payout_processing") {
    return toast.success(`${prefix} The payout is with the provider; the dispute resolves when it lands.`, opts);
  }
  if (m.status === "failed") {
    return toast.error(
      `${prefix} But the payout failed: ${m.message ?? "the provider refused it"}. ${
        m.retryable ? "Retry it once the cause is fixed." : "Pay by hand, or have a different finance admin change the decision to a refund."
      }`,
      { ...opts, autoClose: false }
    );
  }
  return toast.warn(`${prefix} ${m.message ?? `Payout: ${humanize(m.status)}`}`, opts);
}

function Detail({ id, myId }: { id: string; myId: string | null }) {
  const { data: d, error, isLoading, isFetching, refetch } = useGetDisputeQuery(id, { skip: !id });
  const [loadLink] = useLazyGetEvidenceLinkQuery();
  const [opening, setOpening] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogKind | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24" />
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }
  if (error || !d) return <LoadError error={error} onRetry={refetch} />;

  // Open the tab synchronously inside the click so pop-up blockers allow it,
  // then point it at the short-lived signed link once it arrives.
  const openEvidence = async (e: Evidence) => {
    const tab = window.open("", "_blank");
    if (!tab) {
      toast.error("Allow pop-ups for this site to open evidence.", { position: "top-right" });
      return;
    }
    tab.opener = null;
    setOpening(e.id);
    try {
      const link = await loadLink({ id: d.id, evidenceId: e.id }).unwrap();
      if (!link?.url || !/^https:\/\//i.test(link.url)) throw new Error("Bad evidence link");
      tab.location.href = link.url;
    } catch (err) {
      tab.close();
      toast.error((err as { data?: { message?: string; error?: string } })?.data?.message || "Could not open the file. Try again.", {
        position: "top-right",
      });
    } finally {
      setOpening(null);
    }
  };

  const state = STATE[d.displayState] ?? { label: humanize(d.status), tone: "gray" as const };
  const open = isOpenStatus(d.status);
  const waiting = open && !d.decision;
  const actor = !d.callerIsParty;

  return (
    <div className={`transition-opacity ${isFetching ? "opacity-70" : ""}`}>
      <header className="mb-5">
        <p className="eyebrow mb-1.5">Dispute · order #{d.orderRef}</p>
        <h1 className="text-[24px] font-bold leading-tight tracking-[-0.02em] text-ink">{d.order.title}</h1>
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <Pill tone={state.tone} dot>{state.label}</Pill>
          <Pill tone={ageTone(d.businessDaysOpen, waiting)}>{ageText(d.businessDaysOpen)} open</Pill>
          {d.overdue && <Pill tone="red">Past the 5-day target</Pill>}
          {d.responseOverdue && <Pill tone="red">Response overdue</Pill>}
          <span className="text-[12.5px] text-ink-faint">
            Raised {formatDate(d.raisedAt, true)}
            {d.raisedBy && ` by ${d.raisedBy.name}`}
            {d.raisedByRole && ` (${ROLE_LABEL[d.raisedByRole].toLowerCase()})`}
            {d.arbitrator && ` · reviewing: ${d.arbitrator.name}`}
          </span>
        </div>
      </header>

      {d.callerIsParty && (
        <div className="mb-4 flex items-start gap-3 rounded-xl bg-attention-soft px-4 py-3 text-[13.5px] text-attention-deep">
          <ShieldAlert size={18} className="mt-0.5 shrink-0" />
          <p>You are the buyer or seller on this order, so you can read this dispute but not act on it. Another finance admin must handle it.</p>
        </div>
      )}

      <Actions d={d} myId={myId} actor={actor} onAction={setDialog} />

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-4">
          {d.decision && <DecisionCard d={d} />}
          <Statements d={d} opening={opening} onOpen={openEvidence} />
          <Timeline entries={d.entries} opening={opening} onOpen={openEvidence} />
        </div>
        <div className="space-y-4">
          <OrderFacts d={d} />
          <Parties d={d} />
          <History d={d} />
        </div>
      </div>

      {dialog === "review" && <ReviewDialog id={d.id} onClose={() => setDialog(null)} />}
      {(dialog === "decide" || dialog === "change") && <DecisionDialog d={d} mode={dialog} onClose={() => setDialog(null)} />}
      {dialog === "retry" && <RetryDialog d={d} onClose={() => setDialog(null)} />}
      {dialog === "refundSent" && <RefundSentDialog d={d} onClose={() => setDialog(null)} />}
      {dialog === "note" && <NoteDialog d={d} onClose={() => setDialog(null)} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

type DialogKind = "review" | "decide" | "change" | "retry" | "note" | "refundSent";

function Actions({ d, myId, actor, onAction }: { d: AdminDispute; myId: string | null; actor: boolean; onAction: (k: DialogKind) => void }) {
  const open = isOpenStatus(d.status);
  const decision = d.decision;
  const payout = d.payout;
  const payoutStarted = !!payout && PAYOUT_STARTED.includes(payout.status);
  const payoutStuck = !!payout && (payout.flagged || payout.attempts >= MAX_PAYOUT_ATTEMPTS);

  let next: ReactNode;
  if (!open) next = `Resolved ${formatDate(d.resolvedAt, true)}. Nothing more to do.`;
  else if (!decision && d.status === "open") next = "Start the review to let both parties know a TradelyX arbitrator is looking at it. You can decide once it's under review.";
  else if (!decision) next = "Read both sides and the evidence, then record one decision. It moves the money and both parties are told the reason.";
  else if (decision.outcome === "refund") next = "Refund decided. Send the refund to the buyer by hand, then use Mark refund sent; the dispute then resolves as Refunded. A refund decision is final.";
  else if (payoutStarted) next = "Release decided and the payout has started. The dispute resolves when the provider confirms it.";
  else next = "Release decided but the seller hasn't been paid yet. Retry the payout, or a different finance admin can change the decision to a refund.";

  const isDecider = !!decision?.decidedBy && decision.decidedBy.id === myId;
  const canChangeShape = open && decision?.outcome === "release";
  const changeBlock = isDecider
    ? "You made this decision; a different finance admin must change it."
    : payoutStarted
      ? "Payment to the seller has started, so the decision can't be changed."
      : null;
  const showRetry = open && decision?.outcome === "release" && (!payout || payout.status === "payout_failed");
  const showRefundSent = open && decision?.outcome === "refund" && !!d.refund && REFUND_WITH_SUPPORT.includes(d.refund.status);
  const retryBlock = payoutStuck ? "The payout failed twice and is with support. Pay by hand, or change the decision to a refund." : null;

  return (
    <Card className="p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <p className="max-w-2xl text-[13.5px] leading-relaxed text-ink-soft">{next}</p>
        {actor && (
          <div className="flex shrink-0 flex-wrap gap-2">
            <Btn variant="secondary" icon={<MessageSquare size={15} />} onClick={() => onAction("note")}>
              Add note
            </Btn>
            {open && !decision && d.status === "open" && (
              <Btn icon={<PlayCircle size={15} />} onClick={() => onAction("review")}>
                Start review
              </Btn>
            )}
            {open && !decision && d.status === "under_review" && (
              <Btn icon={<Gavel size={15} />} onClick={() => onAction("decide")}>
                Decide
              </Btn>
            )}
            {showRefundSent && (
              <Btn icon={<BadgeCheck size={15} />} onClick={() => onAction("refundSent")}>
                Mark refund sent
              </Btn>
            )}
            {showRetry && (
              <Btn variant="secondary" icon={<RefreshCw size={15} />} disabled={!!retryBlock} title={retryBlock ?? undefined} onClick={() => onAction("retry")}>
                Retry payout
              </Btn>
            )}
            {canChangeShape && (
              <Btn variant="danger" icon={<RotateCcw size={15} />} disabled={!!changeBlock} title={changeBlock ?? undefined} onClick={() => onAction("change")}>
                Change to refund
              </Btn>
            )}
          </div>
        )}
      </div>
      {actor && (changeBlock && canChangeShape || (showRetry && retryBlock)) && (
        <ul className="mt-3 space-y-1 border-t border-rule pt-3 text-[12.5px] text-ink-faint">
          {canChangeShape && changeBlock && <li>Change to refund: {changeBlock}</li>}
          {showRetry && retryBlock && <li>Retry payout: {retryBlock}</li>}
        </ul>
      )}
    </Card>
  );
}

function ReviewDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const [start, { isLoading }] = useStartReviewMutation();
  return (
    <Confirm
      open
      title="Start the review?"
      confirmLabel="Start review"
      loading={isLoading}
      onCancel={onClose}
      onConfirm={async () => {
        try {
          await start(id).unwrap();
          toast.success("Review started; both parties have been told", { position: "top-right" });
        } catch {
          /* toasted by the API slice; the dispute reloads */
        }
        onClose();
      }}
    >
      Both parties will see the dispute is under review by a TradelyX arbitrator, and you'll be recorded as the arbitrator. They can keep adding information until a decision.
    </Confirm>
  );
}

function ReasonField({ value, onChange, label, hint }: { value: string; onChange: (v: string) => void; label: string; hint: string }) {
  const n = value.trim().length;
  const tooShort = n > 0 && n < REASON_MIN;
  return (
    <label className="block">
      <span className="text-[13px] font-semibold text-ink">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={REASON_MAX}
        rows={5}
        className="mt-1.5 w-full rounded-lg px-3 py-2 text-sm text-ink ring-1 ring-inset ring-rule focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
      <span className={`mt-1 flex justify-between text-[12px] ${tooShort ? "text-danger-deep" : "text-ink-faint"}`}>
        <span>{tooShort ? `At least ${REASON_MIN} characters` : hint}</span>
        <span className="tnum">
          {n}/{REASON_MAX}
        </span>
      </span>
    </label>
  );
}

function DecisionDialog({ d, mode, onClose }: { d: AdminDispute; mode: "decide" | "change"; onClose: () => void }) {
  const [decide, { isLoading: deciding }] = useDecideMutation();
  const [change, { isLoading: changing }] = useChangeDecisionMutation();
  const [outcome, setOutcome] = useState<Outcome | null>(mode === "change" ? "refund" : null);
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);
  const busy = deciding || changing;
  const n = reason.trim().length;
  const valid = !!outcome && n >= REASON_MIN && n <= REASON_MAX;

  const submit = async () => {
    if (!outcome || !valid) return;
    const args = { id: d.id, outcome, reason: reason.trim(), expectedVersion: d.decisionVersion };
    try {
      const res = await (mode === "decide" ? decide(args) : change(args)).unwrap();
      moneyToast(res.money, mode === "decide" ? "Decision recorded; both parties have been told." : "Decision changed to a refund; both parties have been told.");
      onClose();
    } catch (err) {
      setConfirming(false);
      if (stateRefusal(err)) onClose();
    }
  };

  const amount = money(d.order.currency, d.order.amount);
  return (
    <>
      <Modal
        open
        onClose={onClose}
        title={mode === "decide" ? "Decide this dispute" : "Change the decision to a refund"}
        subtitle={`Order #${d.orderRef} · ${amount}`}
        footer={
          <div className="flex justify-end gap-2">
            <Btn variant="secondary" onClick={onClose} disabled={busy}>Cancel</Btn>
            <Btn icon={<Gavel size={15} />} disabled={!valid} loading={busy} onClick={() => setConfirming(true)}>
              {mode === "decide" ? "Record decision" : "Change to refund"}
            </Btn>
          </div>
        }
      >
        <div className="space-y-4">
          {mode === "change" ? (
            <p className="rounded-lg bg-attention-soft px-3.5 py-2.5 text-[13px] text-attention-deep">
              {d.decision?.decidedBy?.name ?? "Another admin"} decided a full release to the seller. Changing it to a full refund to the buyer cancels the seller's payout and hands the refund to support. This can't be changed back.
            </p>
          ) : (
            <fieldset>
              <legend className="text-[13px] font-semibold text-ink">Outcome</legend>
              <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
                {(["refund", "release"] as const).map((o) => (
                  <label
                    key={o}
                    className={`flex cursor-pointer items-start gap-2.5 rounded-lg p-3 ring-1 ring-inset transition-colors ${
                      outcome === o ? "bg-brand-50 ring-brand-500" : "ring-rule hover:bg-paper"
                    }`}
                  >
                    <input type="radio" name="outcome" className="mt-1" checked={outcome === o} onChange={() => setOutcome(o)} />
                    <span>
                      <span className="block text-sm font-semibold text-ink">{OUTCOME_LABEL[o]}</span>
                      <span className="block text-[12.5px] text-ink-soft">
                        {o === "refund"
                          ? `${d.parties.buyer.name} gets ${amount} back, platform fee included. Support sends it by hand.`
                          : `${d.parties.seller.name} is paid now. No refund.`}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <ReasonField
            value={reason}
            onChange={setReason}
            label="Reason (both parties see this)"
            hint={`${REASON_MIN}–${REASON_MAX} characters. Say what the evidence showed.`}
          />
        </div>
      </Modal>
      <Confirm
        open={confirming}
        title={mode === "decide" ? `${outcome ? OUTCOME_LABEL[outcome] : ""}?` : "Change to a full refund?"}
        confirmLabel={mode === "decide" ? "Yes, record it" : "Yes, change it"}
        loading={busy}
        onCancel={() => setConfirming(false)}
        onConfirm={submit}
      >
        This moves {amount} and can't be undone by you. {mode === "decide" && outcome === "release" && "Only a different finance admin can change a release to a refund, and only before the payout starts."}
      </Confirm>
    </>
  );
}

function RefundSentDialog({ d, onClose }: { d: AdminDispute; onClose: () => void }) {
  const [complete, { isLoading }] = useCompleteRefundMutation();
  const [reference, setReference] = useState("");
  const [confirming, setConfirming] = useState(false);
  const r = d.refund;

  const submit = async () => {
    if (isLoading) return;
    try {
      await complete({ escrowId: d.escrowId, providerRefundId: reference.trim() || undefined }).unwrap();
    } catch {
      /* toasted by the API slice; the dispute reloads */
    }
    onClose();
  };

  return (
    <>
      <Modal
        open
        onClose={onClose}
        title="Mark the refund sent"
        subtitle={`Order #${d.orderRef} · ${money(r?.currency ?? d.order.currency, r?.amount ?? d.order.amount)} to ${d.parties.buyer.name}`}
        width="max-w-lg"
        footer={
          <div className="flex justify-end gap-2">
            <Btn variant="secondary" onClick={onClose} disabled={isLoading}>Cancel</Btn>
            <Btn icon={<BadgeCheck size={15} />} loading={isLoading} onClick={() => setConfirming(true)}>
              Mark refund sent
            </Btn>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="rounded-lg bg-attention-soft px-3.5 py-2.5 text-[13px] font-semibold text-attention-deep">
            Only mark this after the money has actually reached the buyer.
          </p>
          {r?.status === "awaiting_account" && (
            <p className="text-[13px] text-danger-deep">The buyer hasn't given their account details for this refund yet. Check how it was paid before marking it sent.</p>
          )}
          <p className="text-[13px] text-ink-soft">
            The escrow becomes Refunded, the dispute resolves as Refunded, both parties are told and it's recorded in Activity. This can't be undone.
          </p>
          <label className="block">
            <span className="text-[13px] font-semibold text-ink">Bank or transfer reference (optional)</span>
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              maxLength={255}
              className="mt-1.5 h-10 w-full rounded-lg px-3 text-sm text-ink ring-1 ring-inset ring-rule focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </label>
        </div>
      </Modal>
      <Confirm
        open={confirming}
        title="Has the money reached the buyer?"
        confirmLabel="Yes, mark it sent"
        loading={isLoading}
        onCancel={() => setConfirming(false)}
        onConfirm={submit}
      >
        Only mark this after the money has actually reached the buyer. The dispute closes as Refunded and both parties are notified.
      </Confirm>
    </>
  );
}

function RetryDialog({ d, onClose }: { d: AdminDispute; onClose: () => void }) {
  const [retry, { isLoading }] = useRetryPayoutMutation();
  return (
    <Confirm
      open
      title="Retry the seller's payout?"
      confirmLabel="Retry payout"
      loading={isLoading}
      onCancel={onClose}
      onConfirm={async () => {
        try {
          const res = await retry({ id: d.id, expectedVersion: d.decisionVersion }).unwrap();
          moneyToast(res.money, "Payout retried.");
        } catch {
          /* toasted by the API slice; the dispute reloads */
        }
        onClose();
      }}
    >
      {d.payout?.failureReason ? `Last attempt failed: ${d.payout.failureReason}. ` : ""}
      Only retry once the cause is fixed. After {MAX_PAYOUT_ATTEMPTS} failed attempts the payout goes to support.
    </Confirm>
  );
}

function NoteDialog({ d, onClose }: { d: AdminDispute; onClose: () => void }) {
  const [add, { isLoading }] = useAddNoteMutation();
  const canAsk = isOpenStatus(d.status) && !d.decision;
  const [kind, setKind] = useState<NoteKind>(canAsk ? "info_request" : "staff_note");
  const [body, setBody] = useState("");
  // One id per draft, so a double click or retried request records it once
  const [clientRequestId] = useState(requestId);
  const n = body.trim().length;

  const submit = async () => {
    try {
      await add({ id: d.id, kind, body: body.trim(), clientRequestId }).unwrap();
      onClose();
    } catch (err) {
      if (stateRefusal(err)) onClose();
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Add a note"
      subtitle={`Order #${d.orderRef}`}
      width="max-w-lg"
      footer={
        <div className="flex justify-end gap-2">
          <Btn variant="secondary" onClick={onClose} disabled={isLoading}>Cancel</Btn>
          <Btn disabled={n < 1 || n > NOTE_MAX} loading={isLoading} onClick={submit}>
            {kind === "info_request" ? "Send to both parties" : "Add staff note"}
          </Btn>
        </div>
      }
    >
      <div className="space-y-4">
        <fieldset className="space-y-2">
          <label className={`flex items-start gap-2.5 rounded-lg p-3 ring-1 ring-inset ${kind === "info_request" ? "bg-brand-50 ring-brand-500" : "ring-rule"} ${canAsk ? "cursor-pointer" : "opacity-50"}`}>
            <input type="radio" name="kind" className="mt-1" disabled={!canAsk} checked={kind === "info_request"} onChange={() => setKind("info_request")} />
            <span>
              <span className="block text-sm font-semibold text-ink">Request for information</span>
              <span className="block text-[12.5px] text-ink-soft">
                {canAsk ? "Both parties see it and are notified; they can reply with notes and evidence." : "Not after a decision: the parties can't add anything now."}
              </span>
            </span>
          </label>
          <label className={`flex cursor-pointer items-start gap-2.5 rounded-lg p-3 ring-1 ring-inset ${kind === "staff_note" ? "bg-brand-50 ring-brand-500" : "ring-rule"}`}>
            <input type="radio" name="kind" className="mt-1" checked={kind === "staff_note"} onChange={() => setKind("staff_note")} />
            <span>
              <span className="block text-sm font-semibold text-ink">Staff note</span>
              <span className="block text-[12.5px] text-ink-soft">Only staff see it. Recorded in Activity.</span>
            </span>
          </label>
        </fieldset>
        <label className="block">
          <span className="text-[13px] font-semibold text-ink">{kind === "info_request" ? "What do you need from them?" : "Note"}</span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={NOTE_MAX}
            rows={5}
            className="mt-1.5 w-full rounded-lg px-3 py-2 text-sm text-ink ring-1 ring-inset ring-rule focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <span className="tnum mt-1 block text-right text-[12px] text-ink-faint">
            {n}/{NOTE_MAX}
          </span>
        </label>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Read-only sections
// ---------------------------------------------------------------------------

function Section({ title, icon, children, className }: { title: string; icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <Card className={`p-5 ${className ?? ""}`}>
      <h2 className="mb-3 flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.06em] text-ink-faint">
        {icon}
        {title}
      </h2>
      {children}
    </Card>
  );
}

function Facts({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-[13px]">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-ink-faint">{k}</dt>
          <dd className="text-right text-ink">{v ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

function DecisionCard({ d }: { d: AdminDispute }) {
  const decision = d.decision!;
  const r = d.refund;
  const p = d.payout;
  return (
    <Section title="Decision and money" icon={<Banknote size={15} />}>
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone={decision.outcome === "refund" ? "orange" : "blue"}>{OUTCOME_LABEL[decision.outcome]}</Pill>
        <span className="text-[12.5px] text-ink-faint">
          by {decision.decidedBy?.name ?? "staff"} · {formatDate(decision.decidedAt, true)}
        </span>
      </div>
      {decision.reason && <p className="mt-3 whitespace-pre-line rounded-lg bg-paper px-3.5 py-2.5 text-[13.5px] leading-relaxed text-ink">{decision.reason}</p>}
      <div className="mt-4 border-t border-rule pt-3">
        {decision.outcome === "refund" ? (
          r ? (
            <Facts
              rows={[
                ["Refund status", <Pill key="s" tone={r.status === "refunded" ? "green" : r.status === "failed" ? "red" : "orange"}>{humanize(r.status)}</Pill>],
                ["Amount", money(r.currency, r.amount)],
                ["Reference", r.refundReference],
                ...(r.failureReason ? ([["Failure", r.failureReason]] as [string, ReactNode][]) : []),
                ...(r.supportNote ? ([["Support note", r.supportNote]] as [string, ReactNode][]) : []),
                ...(r.flaggedForSupport ? ([["Support", "Flagged for support"]] as [string, ReactNode][]) : []),
              ]}
            />
          ) : (
            <p className="text-[13px] text-ink-soft">No refund row yet.</p>
          )
        ) : p ? (
          <Facts
            rows={[
              ["Payout status", <Pill key="s" tone={p.status === "disbursed" ? "green" : p.status === "payout_failed" ? "red" : "orange"}>{humanize(p.status.replace(/^payout_/, ""))}</Pill>],
              ["Amount", money(p.currency, p.amount)],
              ["Attempts", `${p.attempts} of ${MAX_PAYOUT_ATTEMPTS}`],
              ["Reference", p.reference],
              ...(p.failureReason ? ([["Failure", p.failureReason]] as [string, ReactNode][]) : []),
              ...(p.supportNote ? ([["Support note", p.supportNote]] as [string, ReactNode][]) : []),
              ...(p.flagged ? ([["Support", "Flagged: pay by hand or change to refund"]] as [string, ReactNode][]) : []),
              ["Updated", formatDate(p.updatedAt, true)],
            ]}
          />
        ) : (
          <p className="text-[13px] text-ink-soft">The seller's payout hasn't been recorded yet.</p>
        )}
      </div>
    </Section>
  );
}

function EvidenceList({ files, opening, onOpen }: { files: Evidence[]; opening: string | null; onOpen: (e: Evidence) => void }) {
  if (!files.length) return null;
  return (
    <div className="mt-2.5 flex flex-wrap gap-1.5">
      {files.map((f, i) => {
        const isPdf = f.mime === "application/pdf";
        return (
          <button
            key={f.id}
            onClick={() => onOpen(f)}
            disabled={opening === f.id}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-[12.5px] font-semibold text-brand-900 ring-1 ring-inset ring-rule hover:bg-brand-50 disabled:cursor-wait disabled:opacity-60"
            title={f.legacy ? "Uploaded from the old app: a public link" : "Opens a private link that works for 15 minutes"}
          >
            {opening === f.id ? (
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden />
            ) : isPdf ? (
              <FileText size={13} />
            ) : f.mime?.startsWith("image/") ? (
              <ImageIcon size={13} />
            ) : (
              <Paperclip size={13} />
            )}
            {isPdf ? "PDF" : f.mime?.startsWith("image/") ? "Image" : "File"} {i + 1}
            <span className="font-normal text-ink-faint">· {ROLE_LABEL[f.uploaderRole]}</span>
            {f.legacy && <span className="font-normal text-attention-deep">· old app (public link)</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Each side's statement: the raiser's description, then the other party's response. */
function Statements({ d, opening, onOpen }: { d: AdminDispute; opening: string | null; onOpen: (e: Evidence) => void }) {
  const raised = d.entries.find((e) => e.kind === "raised");
  const raiser = d.raisedByRole;
  const other = raiser === "buyer" ? "seller" : raiser === "seller" ? "buyer" : null;
  const response = d.entries.find((e) => e.kind === "response" && (!other || e.authorRole === other));

  const side = (role: "buyer" | "seller") => {
    const person = d.parties[role];
    if (role === raiser || (!raiser && d.raisedBy?.id === person.id)) {
      return (
        <Statement key={role} who={`${ROLE_LABEL[role]}: ${person.name}`} tag="Raised the dispute" at={d.raisedAt}>
          <p className="text-[12.5px] font-semibold text-ink-soft">{categoryLabel(d.category)}</p>
          <p className="mt-1 whitespace-pre-line text-[13.5px] leading-relaxed text-ink">{d.description || "No description."}</p>
          <EvidenceList files={raised?.evidence ?? []} opening={opening} onOpen={onOpen} />
        </Statement>
      );
    }
    const mine = response && response.authorRole === role ? response : d.entries.find((e) => e.kind === "response" && e.authorRole === role);
    return (
      <Statement key={role} who={`${ROLE_LABEL[role]}: ${person.name}`} tag={mine ? "Response" : "No response yet"} at={mine?.createdAt ?? null}>
        {mine ? (
          <>
            <p className="whitespace-pre-line text-[13.5px] leading-relaxed text-ink">{mine.body || "(evidence only)"}</p>
            <EvidenceList files={mine.evidence} opening={opening} onOpen={onOpen} />
          </>
        ) : (
          <p className="text-[13px] text-ink-soft">
            {d.responseDueAt ? `Response due ${formatDate(d.responseDueAt, true)}.` : "Not responded."}
            {d.responseOverdue && <span className="font-semibold text-danger-deep"> Overdue.</span>}
            {d.reminderSentAt && ` Reminder sent ${formatDate(d.reminderSentAt, true)}.`}
          </p>
        )}
      </Statement>
    );
  };

  return (
    <Section title="Both sides" icon={<MessagesSquare size={15} />}>
      <div className="grid gap-3 md:grid-cols-2">{(raiser === "seller" ? (["seller", "buyer"] as const) : (["buyer", "seller"] as const)).map(side)}</div>
      <p className="mt-3 text-[12px] text-ink-faint">Later notes and evidence from either side are in the timeline.</p>
    </Section>
  );
}

function Statement({ who, tag, at, children }: { who: string; tag: string; at: string | null; children: ReactNode }) {
  return (
    <div className="rounded-lg bg-paper p-3.5">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-1">
        <p className="text-[13.5px] font-bold text-ink">{who}</p>
        <p className="text-[11.5px] text-ink-faint">
          {tag}
          {at && ` · ${formatDate(at, true)}`}
        </p>
      </div>
      {children}
    </div>
  );
}

function entryTitle(e: DisputeEntry) {
  const outcome = e.data && typeof e.data.outcome === "string" ? (e.data.outcome as Outcome) : null;
  if ((e.kind === "decided" || e.kind === "decision_changed") && outcome && OUTCOME_LABEL[outcome]) {
    return `${ENTRY_LABEL[e.kind]}: ${OUTCOME_LABEL[outcome].toLowerCase()}`;
  }
  return ENTRY_LABEL[e.kind] ?? humanize(e.kind);
}

function Timeline({ entries, opening, onOpen }: { entries: DisputeEntry[]; opening: string | null; onOpen: (e: Evidence) => void }) {
  const sorted = [...entries].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return (
    <Section title="Timeline" icon={<Gavel size={15} />}>
      {!sorted.length ? (
        <p className="text-[13px] text-ink-soft">Nothing recorded yet.</p>
      ) : (
        <ol className="relative space-y-4 border-l border-rule pl-5">
          {sorted.map((e) => {
            const staffOnly = e.visibility === "staff";
            return (
              <li key={e.id} className="relative">
                <span className={`absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-white ${staffOnly ? "bg-ink-faint" : e.authorRole === "staff" ? "bg-brand-500" : "bg-attention"}`} aria-hidden />
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[13.5px] font-semibold text-ink">{entryTitle(e)}</p>
                  {staffOnly && (
                    <Pill tone="gray">
                      <EyeOff size={11} /> Staff only
                    </Pill>
                  )}
                  {e.kind === "payout_failed" && <Pill tone="red">Needs attention</Pill>}
                </div>
                <p className="text-[12px] text-ink-faint">
                  {e.author?.name ?? ROLE_LABEL[e.authorRole] ?? humanize(e.authorRole)}
                  {e.author && ` (${(ROLE_LABEL[e.authorRole] ?? e.authorRole).toLowerCase()})`} · {formatDate(e.createdAt, true)}
                </p>
                {e.body && <p className="mt-1.5 whitespace-pre-line rounded-lg bg-paper px-3 py-2 text-[13px] leading-relaxed text-ink">{e.body}</p>}
                <EvidenceList files={e.evidence} opening={opening} onOpen={onOpen} />
              </li>
            );
          })}
        </ol>
      )}
    </Section>
  );
}

function OrderFacts({ d }: { d: AdminDispute }) {
  const o = d.order;
  const t = o.items;
  const quantity = t ? (t.quantity !== null ? `${t.quantity}${t.unit ? ` ${t.unit}` : ""}` : t.legacyQuantity) : null;
  return (
    <Section title="Order">
      <Facts
        rows={[
          ["Amount paid", <span key="a" className="tnum font-semibold">{money(o.currency, o.amount)}</span>],
          ...(o.usdAmount !== null ? ([["Received (USD)", money("USD", o.usdAmount)]] as [string, ReactNode][]) : []),
          ["Provider", humanize(o.provider)],
          ["Escrow status", humanize(o.escrowStatus)],
          ["Status when raised", humanize(d.escrowStatusAtRaise)],
          ["Created", formatDate(o.createdAt, true)],
          ["Funded", formatDate(o.fundedAt, true)],
          ["Delivered", formatDate(o.deliveredAt, true)],
          ["Inspection ends", formatDate(o.inspectionDeadline, true)],
          ...(o.refundedAt ? ([["Refunded", formatDate(o.refundedAt, true)]] as [string, ReactNode][]) : []),
        ]}
      />
      {t && (
        <div className="mt-4 border-t border-rule pt-3">
          <p className="mb-2 text-[12px] font-semibold text-ink-soft">Accepted quote (version {t.versionNumber})</p>
          <Facts
            rows={[
              ["Quantity", quantity],
              ["Goods", money(t.currency, t.goodsPrice)],
              ["Delivery", t.incoterm ?? (t.deliveryTerm ? `${humanize(t.deliveryTerm)}${t.deliveryFee ? `, ${money(t.currency, t.deliveryFee)}` : ""}` : null)],
              ...(t.money
                ? ([
                    ["Platform fee", `${money(t.currency, t.money.platformFee)} (${t.feePayer} pays)`],
                    ["Buyer charged", money(t.currency, t.money.amountCharged)],
                    ["Seller receives", money(t.currency, t.money.sellerReceives)],
                  ] as [string, ReactNode][])
                : []),
              ["Inspection", t.inspectionWindowDays !== null ? `${t.inspectionWindowDays} days` : t.legacyInspectionPeriod],
              ...(t.paymentTerms ? ([["Payment terms", t.paymentTerms]] as [string, ReactNode][]) : []),
            ]}
          />
          {t.note && <p className="mt-2 whitespace-pre-line text-[12.5px] text-ink-soft">{t.note}</p>}
        </div>
      )}
    </Section>
  );
}

function Parties({ d }: { d: AdminDispute }) {
  // "View order chat" opens the buyer–seller conversation in conversation
  // review (the dispute is its access basis). Only for admins holding
  // Conversation review by name, and only while that feature answers (its
  // summary loads; switched off it is a 404). Everyone else sees it disabled.
  const { loginResponse } = useUserSlice();
  const role = loginResponse?.user?.roles ?? null;
  const { data: access } = useGetMyAccessQuery(undefined, { skip: role !== "admin" });
  const reviewer = canReviewConversations(role, access);
  const { isSuccess: reviewOn } = useGetConversationReviewSummaryQuery(undefined, { skip: !reviewer });
  const buyer = d.parties.buyer.id;
  const seller = d.parties.seller.id;
  const chatLink = reviewer && reviewOn && buyer && seller && buyer !== seller ? threadPath(buyer, seller) : null;
  return (
    <Section title="Parties">
      <div className="space-y-2.5">
        {(["buyer", "seller"] as const).map((r) => (
          <div key={r}>
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-ink-faint">{ROLE_LABEL[r]}</p>
            <p className="text-[13.5px] font-semibold text-ink">{d.parties[r].name}</p>
            {d.parties[r].email && <p className="text-[12.5px] text-ink-soft">{d.parties[r].email}</p>}
          </div>
        ))}
      </div>
      {chatLink ? (
        <Link to={chatLink} className="mt-4 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold text-brand-900 ring-1 ring-inset ring-rule hover:bg-paper">
          <MessagesSquare size={15} /> View order chat
        </Link>
      ) : (
        <Btn variant="secondary" size="sm" className="mt-4 w-full" disabled icon={<MessagesSquare size={15} />} title="Arrives with the chat review feature">
          View order chat
        </Btn>
      )}
    </Section>
  );
}

function History({ d }: { d: AdminDispute }) {
  return (
    <Section title="Escrow history">
      {!d.order.history.length ? (
        <p className="text-[13px] text-ink-soft">No dates recorded.</p>
      ) : (
        <ol className="space-y-1.5 text-[13px]">
          {d.order.history.map((h, i) => (
            <li key={`${h.event}-${i}`} className="flex justify-between gap-3">
              <span className="text-ink">{historyLabel(h.event)}</span>
              <span className="tnum shrink-0 text-ink-faint">{formatDate(h.at, true)}</span>
            </li>
          ))}
        </ol>
      )}
    </Section>
  );
}
