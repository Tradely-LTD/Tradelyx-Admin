import { useState } from "react";

import Button from "@/common/button/button";
import Modal from "@/common/modal/modal";
import type { StoreCertification } from "./certificates-api";

interface VerifyPartnerDialogProps {
  cert: StoreCertification;
  saving: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const HOLDER_CONFIRMATION_TEXT = "I have contacted the licence holder and they confirmed this authorisation";

/**
 * Verifying a partner licence lets the seller list and quote on Solid
 * Minerals, so staff must confirm the authorisation with the licence holder
 * first. The server refuses without this confirmation too; the checkbox makes
 * the step explicit. Mount it fresh per certificate so the box starts unticked.
 */
const VerifyPartnerDialog: React.FC<VerifyPartnerDialogProps> = ({ cert, saving, onClose, onConfirm }) => {
  const [confirmed, setConfirmed] = useState(false);
  const partner = cert.partner;

  return (
    <Modal isOpen onClose={onClose} title="Verify partner licence">
      <div className="space-y-4 text-sm text-gray-700">
        <p>
          <span className="font-medium text-gray-800">{cert.companyName || "This store"}</span> says it operates under{" "}
          <span className="font-medium text-gray-800">{partner?.holderCompany ?? "another company"}</span>'s licence
          {partner ? (
            <>
              {" "}
              <span className="font-mono">{partner.licenceNumber}</span> ({partner.licenceTypeLabel})
            </>
          ) : null}
          .
        </p>
        {partner ? (
          <p>
            Contact {partner.contactName} on{" "}
            <a href={`tel:${partner.contactPhone}`} className="text-primary">
              {partner.contactPhone}
            </a>
            {partner.contactEmail ? (
              <>
                {" "}
                or{" "}
                <a href={`mailto:${partner.contactEmail}`} className="text-primary">
                  {partner.contactEmail}
                </a>
              </>
            ) : null}{" "}
            and check the letter before verifying. Verifying lets this store list and quote on Solid Minerals.
          </p>
        ) : null}

        <label className="flex items-start gap-3 rounded-md border border-gray-200 bg-gray-50 p-3">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          <span className="text-gray-800">{HOLDER_CONFIRMATION_TEXT}</span>
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <Button size="small" variant="outlined" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button size="small" onClick={onConfirm} disabled={!confirmed || saving} loading={saving}>
            Mark verified
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default VerifyPartnerDialog;
