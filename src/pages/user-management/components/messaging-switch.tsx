import { useEffect, useState } from "react";
import { MessageSquareOff, MessagesSquare } from "lucide-react";

import Modal from "@/common/modal/modal";
import { Btn, Pill, formatDate } from "@/common/ui/kit";
import { useDisableChatMutation, useEnableChatMutation, useGetChatStateQuery } from "../chat-switch-api";

/**
 * Messaging on/off for one person, in the user drawer. Turning it off needs a
 * reason (5–500 characters, the API's bounds): the person is told it, and it
 * goes in the activity log. Hidden for staff without the People section (the
 * state request is refused).
 */
const MIN_REASON = 5;
const MAX_REASON = 500;

export default function MessagingSwitch({ userId, name }: { userId: string; name: string }) {
  const { data, isLoading, isError } = useGetChatStateQuery(userId);
  const [disable, { isLoading: disabling }] = useDisableChatMutation();
  const [enable, { isLoading: enabling }] = useEnableChatMutation();
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState("");
  useEffect(() => setReason(""), [asking]);

  if (isLoading || isError || !data) return null;
  const state = data.data;
  const trimmed = reason.trim();
  const valid = trimmed.length >= MIN_REASON && trimmed.length <= MAX_REASON;

  return (
    <section className="mt-7">
      <h3 className="mb-2 text-[14px] font-bold text-ink">Messaging</h3>
      <div className={`flex flex-wrap items-start justify-between gap-3 rounded-xl px-4 py-3 ring-1 ring-inset ${state.disabled ? "bg-danger-soft ring-danger/20" : "bg-paper ring-rule"}`}>
        <div className="flex min-w-0 gap-2.5">
          {state.disabled ? <MessageSquareOff size={18} className="mt-0.5 shrink-0 text-danger-deep" /> : <MessagesSquare size={18} className="mt-0.5 shrink-0 text-ink-soft" />}
          <div className="min-w-0">
            <p className="text-[13.5px] font-semibold text-ink">
              {state.disabled ? "Off" : "On"} <Pill tone={state.disabled ? "red" : "green"} dot>{state.disabled ? "Can't send or receive" : "Can chat"}</Pill>
            </p>
            {state.disabled ? (
              <p className="mt-1 text-[12.5px] text-ink-soft">
                Turned off {state.at ? formatDate(state.at, true) : ""}. Reason: <span className="text-ink">{state.reason}</span>
              </p>
            ) : (
              <p className="mt-1 text-[12.5px] text-ink-soft">Turn off to stop them sending messages and stop others messaging them. Their conversations stay.</p>
            )}
          </div>
        </div>
        {state.disabled ? (
          <Btn size="sm" variant="secondary" loading={enabling} onClick={() => enable({ id: userId })}>Turn back on</Btn>
        ) : (
          <Btn size="sm" variant="danger" onClick={() => setAsking(true)}>Turn off messaging</Btn>
        )}
      </div>

      <Modal isOpen={asking} onClose={() => !disabling && setAsking(false)} title="Turn off messaging?">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!valid) return;
            try {
              await disable({ id: userId, reason: trimmed }).unwrap();
              setAsking(false);
            } catch {
              // The mutation toasts the API's reason; keep the form open
            }
          }}
        >
          <p className="text-sm leading-relaxed text-ink-soft">
            <strong className="text-ink">{name}</strong> won't be able to send messages, and nobody will be able to message them. They can still read their conversations, and you can turn it back on at any time.
          </p>
          <label className="mt-4 block text-[13px] font-semibold text-ink" htmlFor="chat-off-reason">Reason (they see it; kept in the activity log)</label>
          <textarea
            id="chat-off-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={MAX_REASON}
            rows={3}
            autoFocus
            placeholder="e.g. Asked buyers to pay outside TradelyX escrow"
            className="mt-1.5 w-full rounded-lg border-0 bg-white px-3 py-2 text-sm text-ink ring-1 ring-inset ring-rule focus:outline-none focus:ring-2 focus:ring-brand-900"
          />
          <p className={`mt-1 text-[12px] ${trimmed.length && !valid ? "text-danger" : "text-ink-faint"}`}>At least {MIN_REASON} characters ({trimmed.length}/{MAX_REASON}).</p>
          <div className="mt-5 flex justify-end gap-2">
            <Btn variant="secondary" onClick={() => setAsking(false)} disabled={disabling}>Cancel</Btn>
            <Btn type="submit" variant="danger" disabled={!valid} loading={disabling}>Turn off messaging</Btn>
          </div>
        </form>
      </Modal>
    </section>
  );
}
