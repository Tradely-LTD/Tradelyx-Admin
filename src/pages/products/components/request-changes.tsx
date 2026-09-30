import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { MessageSquareWarning } from "lucide-react";

import { Btn } from "@/common/ui/kit";
import { QUALITY_LABELS, QualityCode, QualityFlag, useRequestProductChangesMutation } from "../product-api";

/**
 * Ask a seller to fix their listing. Staff tick what's wrong; the seller is
 * emailed each reason with how to fix it (the wording lives in the backend,
 * services/listingQuality/rules.ts), and their next edit comes back to the
 * "Needs attention" list as a resubmission.
 *
 * Reasons the screening found are ticked to start with.
 */

const ORDER: QualityCode[] = [
  "contact_details",
  "screenshot",
  "low_quality_photo",
  "no_photo",
  "image_mismatch",
  "multiple_products",
  "missing_info",
  "other",
];

export default function RequestChanges({
  product,
  onClose,
  onDone,
}: {
  product: { id: string; title: string; qualityFlags?: QualityFlag[] | null } | null;
  onClose: () => void;
  onDone?: () => void;
}) {
  const [reasons, setReasons] = useState<Set<QualityCode>>(new Set());
  const [note, setNote] = useState("");
  const [send, { isLoading }] = useRequestProductChangesMutation();

  useEffect(() => {
    if (!product) return;
    setReasons(new Set((product.qualityFlags ?? []).map((f) => f.code)));
    setNote("");
  }, [product]);

  useEffect(() => {
    if (!product) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [product, onClose]);

  if (!product) return null;

  const found = new Map((product.qualityFlags ?? []).map((f) => [f.code, f]));
  const needsNote = reasons.has("other") && !note.trim();
  const toggle = (code: QualityCode) =>
    setReasons((current) => {
      const next = new Set(current);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });

  const submit = async () => {
    try {
      await send({ id: product.id, reasons: [...reasons], note: note.trim() || undefined }).unwrap();
      onDone?.();
      onClose();
    } catch {
      // the toast says why
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[70] grid place-items-center p-4 font-sans" role="dialog" aria-modal="true" aria-labelledby="request-changes-title">
      <div className="absolute inset-0 animate-fade bg-ink/50" onClick={onClose} />
      <div className="relative flex max-h-[90vh] w-full max-w-lg animate-rise flex-col rounded-2xl bg-white shadow-lift">
        <div className="flex gap-3 border-b border-rule px-6 py-5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-attention-soft text-attention-deep">
            <MessageSquareWarning size={19} />
          </span>
          <div className="min-w-0">
            <h2 id="request-changes-title" className="text-lg font-bold text-ink">Ask the seller to fix this</h2>
            <p className="truncate text-[13px] text-ink-soft">{product.title}</p>
          </div>
        </div>

        <div className="overflow-y-auto px-6 py-4">
          <p className="mb-3 text-[13px] leading-relaxed text-ink-soft">
            The seller gets an email and an in-app message listing each reason with how to fix it. The listing leaves the verified list until they do.
          </p>
          <fieldset className="space-y-1.5">
            <legend className="sr-only">What needs fixing</legend>
            {ORDER.map((code) => {
              const flag = found.get(code);
              const checked = reasons.has(code);
              return (
                <label
                  key={code}
                  className={`flex cursor-pointer gap-3 rounded-xl px-3 py-2.5 ring-1 ring-inset transition-colors ${
                    checked ? "bg-brand-50/70 ring-brand-200" : "ring-rule hover:bg-paper"
                  }`}
                >
                  <input type="checkbox" checked={checked} onChange={() => toggle(code)} className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-brand-900" />
                  <span className="min-w-0">
                    <span className="block text-[13.5px] font-semibold text-ink">{QUALITY_LABELS[code]}</span>
                    {flag && (
                      <span className="mt-0.5 block text-[12px] leading-snug text-ink-soft">
                        {flag.source === "ai" ? "Screening (AI): " : "Screening: "}
                        {flag.detail}
                      </span>
                    )}
                  </span>
                </label>
              );
            })}
          </fieldset>

          <label htmlFor="request-note" className="mt-4 block text-[13px] font-semibold text-ink">
            Note to the seller {reasons.has("other") ? <span className="text-danger">(required)</span> : <span className="font-normal text-ink-faint">(optional)</span>}
          </label>
          <textarea
            id="request-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="e.g. Please list the sesame and the soybeans as two products"
            className="mt-1.5 w-full rounded-lg border-0 bg-white p-3 text-[13.5px] text-ink shadow-sm ring-1 ring-inset ring-rule placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-brand-900"
          />
        </div>

        <div className="flex justify-end gap-2 border-t border-rule px-6 py-4">
          <Btn variant="secondary" onClick={onClose} disabled={isLoading}>Cancel</Btn>
          <Btn onClick={submit} loading={isLoading} disabled={reasons.size === 0 || needsNote}>
            Send to seller
          </Btn>
        </div>
      </div>
    </div>,
    document.body
  );
}
