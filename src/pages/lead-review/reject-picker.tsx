import { useEffect, useRef, useState } from "react";

import { Btn } from "@/common/ui/kit";
import { NOTE_MAX, type RejectReason, isTypingTarget, reasonForKey } from "./labels";

/**
 * Reject needs exactly one reason (H5); "Other" needs a short note (Q3).
 * Keys: 1–6 pick a reason, Esc cancels. Picking Other moves focus into the
 * note, where keys type text (G6); Enter there submits, but not while the
 * note is empty, and Esc there cancels.
 */
export default function RejectPicker({
  reasons,
  busy,
  onPick,
  onCancel,
}: {
  reasons: { key: RejectReason; label: string }[];
  busy: boolean;
  onPick: (reason: RejectReason, note?: string) => void;
  onCancel: () => void;
}) {
  const [other, setOther] = useState(false);
  const [note, setNote] = useState("");
  const noteRef = useRef<HTMLInputElement>(null);
  const trimmed = note.trim();

  const choose = (key: RejectReason) => {
    if (busy) return;
    if (key === "other") {
      setOther(true);
      return;
    }
    onPick(key);
  };
  const chooseRef = useRef(choose);
  chooseRef.current = choose;
  const cancelRef = useRef(onCancel);
  cancelRef.current = onCancel;

  useEffect(() => {
    if (other) noteRef.current?.focus();
  }, [other]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      if (isTypingTarget(e.target)) return; // the note handles its own Enter and Esc
      if (e.key === "Escape") {
        e.preventDefault();
        cancelRef.current();
        return;
      }
      const key = reasonForKey(e.key, reasons);
      if (key) {
        e.preventDefault();
        chooseRef.current(key);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [reasons]);

  return (
    <div className="mt-4 rounded-xl bg-danger-soft/60 p-4 ring-1 ring-inset ring-danger/20" role="group" aria-label="Why reject this lead?">
      <p className="mb-2.5 text-[13px] font-semibold text-ink">Why reject it? Press a number, or Esc to cancel.</p>
      <div className="flex flex-wrap gap-1.5">
        {reasons.map((r, i) => (
          <button
            key={r.key}
            type="button"
            disabled={busy}
            onClick={() => choose(r.key)}
            aria-pressed={other && r.key === "other"}
            className={`inline-flex cursor-pointer items-center gap-2 rounded-full px-3 py-1.5 text-[12.5px] font-semibold ring-1 ring-inset disabled:cursor-not-allowed disabled:opacity-50 ${
              other && r.key === "other" ? "bg-brand-950 text-white ring-brand-950" : "bg-white text-ink ring-rule hover:ring-ink-faint"
            }`}
          >
            <kbd className="grid h-5 min-w-5 place-items-center rounded bg-paper-deep px-1 font-sans text-[11px] font-bold text-ink-soft">{i + 1}</kbd>
            {r.label}
          </button>
        ))}
      </div>

      {other && (
        <form
          className="mt-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (trimmed && !busy) onPick("other", trimmed);
          }}
        >
          <label htmlFor="lead-reject-note" className="mb-1 block text-[12.5px] font-semibold text-ink">
            A short note (required for Other)
          </label>
          <div className="flex gap-2">
            <input
              id="lead-reject-note"
              ref={noteRef}
              value={note}
              maxLength={NOTE_MAX}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  e.stopPropagation();
                  onCancel();
                }
              }}
              dir="auto"
              autoComplete="off"
              placeholder="e.g. Sells farm equipment, not crops"
              className="h-9 min-w-0 flex-1 rounded-lg border-0 bg-white px-3 text-[13.5px] text-ink ring-1 ring-inset ring-rule focus:outline-none focus:ring-2 focus:ring-brand-900"
            />
            <Btn type="submit" size="sm" variant="danger" className="h-9" disabled={!trimmed} loading={busy}>
              Reject
            </Btn>
          </div>
          <p className="mt-1 text-[11.5px] text-ink-faint">
            Enter to reject, Esc to cancel · {trimmed.length}/{NOTE_MAX}
          </p>
        </form>
      )}
      <div className="mt-3 text-right">
        <button type="button" onClick={onCancel} className="cursor-pointer text-[12.5px] font-semibold text-ink-soft hover:text-ink">
          Cancel (Esc)
        </button>
      </div>
    </div>
  );
}
