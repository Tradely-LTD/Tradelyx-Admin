import { useEffect, useState } from "react";

import Modal from "@/common/modal/modal";
import { Btn } from "@/common/ui/kit";
import { StaffRequest, useRemoveRequestLpoMutation } from "./requests-api";

/**
 * Staff take a purchase order (LPO) off a buyer request. The buyer is shown
 * the reason and the backend keeps it in the activity log, so a reason of
 * 5 to 500 characters is required (the same bounds the API enforces) and the
 * confirm button stays disabled until there is one.
 */

const MIN_REASON = 5;
const MAX_REASON = 500;

export default function RemoveLpoDialog({ request, onClose }: { request: StaffRequest | null; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const [removeLpo, { isLoading }] = useRemoveRequestLpoMutation();

  // A fresh, empty reason for every request the dialog opens on
  useEffect(() => setReason(""), [request?.id]);

  const trimmed = reason.trim();
  const valid = trimmed.length >= MIN_REASON && trimmed.length <= MAX_REASON;

  const submit = async () => {
    if (!request || !valid || isLoading) return;
    try {
      await removeLpo({ id: request.id, reason: trimmed }).unwrap();
      onClose();
    } catch {
      // The mutation toasts the backend's message; keep the dialog open to retry
    }
  };

  return (
    <Modal isOpen={!!request} onClose={() => !isLoading && onClose()} title="Remove the LPO?">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <p className="text-sm leading-relaxed text-ink-soft">
          <strong className="text-ink">{request?.title || request?.productName || "This request"}</strong>
          {request?.lpo.poNumber ? <> loses purchase order <strong className="text-ink">{request.lpo.poNumber}</strong></> : " loses its purchase order"}
          {" "}and its LPO badge. The request itself stays as it is. The buyer sees the reason you give.
        </p>
        <label className="mt-4 block text-[13px] font-semibold text-ink" htmlFor="lpo-remove-reason">
          Reason (required, kept in the activity log)
        </label>
        <textarea
          id="lpo-remove-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={MAX_REASON}
          rows={3}
          autoFocus
          placeholder="e.g. PO document is unreadable"
          aria-describedby="lpo-remove-reason-hint"
          className="mt-1.5 w-full rounded-lg border-0 bg-white px-3 py-2 text-sm text-ink ring-1 ring-inset ring-rule focus:outline-none focus:ring-2 focus:ring-brand-900"
        />
        <p id="lpo-remove-reason-hint" className={`mt-1 text-[12px] ${trimmed.length && !valid ? "text-danger" : "text-ink-faint"}`}>
          At least {MIN_REASON} characters ({trimmed.length}/{MAX_REASON}).
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Btn variant="secondary" onClick={onClose} disabled={isLoading}>Cancel</Btn>
          <Btn type="submit" variant="danger" disabled={!valid} loading={isLoading}>Remove LPO</Btn>
        </div>
      </form>
    </Modal>
  );
}
