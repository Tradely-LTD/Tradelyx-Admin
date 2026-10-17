import { Fragment, useState } from "react";
import { ExternalLink } from "lucide-react";
import { toast } from "react-toastify";

import Button from "@/common/button/button";
import { Loader } from "@/common/loader/loader";
import {
  PARTNER_LICENCE_TYPE,
  StoreCertification,
  useGetCertificationsQuery,
  useLazyGetCertificationLetterQuery,
  useSetCertificationVerifiedMutation,
} from "./certificates-api";
import VerifyPartnerDialog from "./VerifyPartnerDialog";

const WEB_URL = "https://web.tradelyx.com";
const COLUMNS = 6;

// Certificate dates are calendar dates (YYYY-MM-DD); format them in UTC so
// they never shift a day with the viewer's timezone.
const formatDate = (value: string | null) =>
  value
    ? new Date(value).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
    : "—";

const certKey = (cert: StoreCertification) => `${cert.sellerId}-${cert.id}`;

const isPartner = (cert: StoreCertification) => cert.type === PARTNER_LICENCE_TYPE && cert.partner !== null;

const Detail: React.FC<{ label: string; children: React.ReactNode; className?: string }> = ({
  label,
  children,
  className,
}) => (
  <div>
    <dt className="text-xs uppercase text-gray-500">{label}</dt>
    <dd className={`text-gray-800 ${className ?? ""}`}>{children}</dd>
  </div>
);

/**
 * Certificates waiting for a check. Open the document, confirm it with the
 * issuer (NEPC, NAFDAC, SON…), then mark it verified. Partner licences are
 * confirmed with the licence holder, using the contact details the seller
 * gave and the authorisation letter.
 */
const CertificateReview: React.FC = () => {
  const [status, setStatus] = useState<"unverified" | "verified">("unverified");
  const { data, isLoading, isFetching } = useGetCertificationsQuery(status);
  const [setVerified, { isLoading: saving }] = useSetCertificationVerifiedMutation();
  const [loadLetter] = useLazyGetCertificationLetterQuery();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [openingLetter, setOpeningLetter] = useState<string | null>(null);
  const [partnerToVerify, setPartnerToVerify] = useState<StoreCertification | null>(null);
  const rows = data?.data ?? [];
  const today = new Date().toISOString().slice(0, 10);

  const update = async (cert: StoreCertification, verified: boolean, holderConfirmed = false) => {
    setPendingKey(certKey(cert));
    try {
      await setVerified({
        sellerId: cert.sellerId,
        certId: cert.id,
        verified,
        // The server refuses a verify if the certificate changed since this
        // list loaded; un-verifying needs no version.
        ...(verified ? { version: cert.version } : {}),
        ...(holderConfirmed ? { holderConfirmed: true } : {}),
      }).unwrap();
      setPartnerToVerify(null);
    } catch (err) {
      // The toast is shown by the mutation. On 409 the list reloads, so the
      // dialog would be showing stale details — close it.
      if ((err as { status?: number })?.status === 409) setPartnerToVerify(null);
    } finally {
      setPendingKey(null);
    }
  };

  // Open the tab synchronously inside the click so pop-up blockers allow it,
  // then point it at the signed link once it arrives.
  const openLetter = async (cert: StoreCertification) => {
    const tab = window.open("", "_blank");
    if (!tab) {
      toast.error("Allow pop-ups for this site to open the letter.", { position: "top-right" });
      return;
    }
    tab.opener = null;
    setOpeningLetter(certKey(cert));
    try {
      const res = await loadLetter({ sellerId: cert.sellerId, certId: cert.id }).unwrap();
      const url = res?.data?.url;
      if (!url || !/^https:\/\//i.test(url)) throw new Error("Bad letter link");
      tab.location.href = url;
    } catch (err) {
      tab.close();
      toast.error((err as { data?: { error?: string } })?.data?.error || "Could not open the letter. Try again.", {
        position: "top-right",
      });
    } finally {
      setOpeningLetter(null);
    }
  };

  const renderPartnerDetails = (cert: StoreCertification) => {
    const partner = cert.partner!;
    const lapsed = partner.effectiveExpiresAt < today;
    const ownStores = cert.sameNumber?.ownLicenceStores ?? 0;
    const partnerStores = cert.sameNumber?.partnerStores ?? 0;
    return (
      <tr className="bg-amber-50/40">
        <td colSpan={COLUMNS} className="px-4 pb-4 pt-1">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-md border border-amber-100 bg-white p-4 md:grid-cols-4">
            <Detail label="Licence holder">{partner.holderCompany}</Detail>
            <Detail label="Licence number" className="font-mono">
              {partner.licenceNumber}
            </Detail>
            <Detail label="Licence type">{partner.licenceTypeLabel}</Detail>
            <Detail label="Licence expiry">{formatDate(partner.licenceExpiresAt)}</Detail>
            <Detail label="Authorisation ends">
              {partner.authorisationEndsAt ? formatDate(partner.authorisationEndsAt) : "No end date"}
            </Detail>
            <Detail label="Effective expiry" className={lapsed ? "font-medium text-red-600" : ""}>
              {formatDate(partner.effectiveExpiresAt)}
              {lapsed ? " (passed)" : ""}
            </Detail>
            <Detail label="Holder contact">{partner.contactName}</Detail>
            <Detail label="Phone">
              <a href={`tel:${partner.contactPhone}`} className="text-primary">
                {partner.contactPhone}
              </a>
            </Detail>
            <Detail label="Email">
              {partner.contactEmail ? (
                <a href={`mailto:${partner.contactEmail}`} className="break-all text-primary">
                  {partner.contactEmail}
                </a>
              ) : (
                <span className="text-gray-400">Not given</span>
              )}
            </Detail>
            <Detail label="Authorisation letter">
              {partner.hasLetter ? (
                <button
                  type="button"
                  onClick={() => openLetter(cert)}
                  disabled={openingLetter === certKey(cert)}
                  className="inline-flex items-center gap-1 text-primary disabled:opacity-50"
                >
                  {openingLetter === certKey(cert) ? "Opening…" : "Open letter"} <ExternalLink size={12} />
                </button>
              ) : (
                <span className="text-red-600">No letter</span>
              )}
            </Detail>
            <div className="col-span-2 space-y-1 text-sm">
              <p className="text-gray-700">
                Other stores claiming this licence as partner: <span className="font-medium">{partnerStores}</span>
              </p>
              <p className={ownStores > 0 ? "rounded bg-amber-100 px-2 py-1 font-medium text-amber-900" : "text-gray-700"}>
                Stores listing it as their own licence: {ownStores}
                {ownStores > 0 ? " — holder may be on TradelyX" : ""}
              </p>
            </div>
          </dl>
        </td>
      </tr>
    );
  };

  return (
    <div className="min-h-screen py-5">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Store Certificates</h1>
        <p className="text-gray-600">
          Check each document with its issuer before marking it verified — buyers abroad rely on the seal. For partner
          licences, contact the licence holder to confirm the authorisation.
        </p>
      </div>

      <div className="mb-4 flex gap-2">
        {(["unverified", "verified"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setStatus(value)}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              status === value ? "bg-primary text-white" : "border border-gray-200 bg-white text-gray-600"
            }`}
          >
            {value === "unverified" ? "Waiting for check" : "Verified"}
            {status === value && data ? ` (${rows.length})` : ""}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        {isLoading || isFetching ? (
          <div className="flex justify-center py-16">
            <Loader />
          </div>
        ) : rows.length === 0 ? (
          <p className="py-16 text-center text-gray-500">
            {status === "unverified" ? "Nothing waiting for a check." : "No verified certificates yet."}
          </p>
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Store</th>
                <th className="px-4 py-3">Certificate</th>
                <th className="px-4 py-3">Number / issuer</th>
                <th className="px-4 py-3">Expires</th>
                <th className="px-4 py-3">Document</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((cert) => {
                const partner = isPartner(cert) ? cert.partner : null;
                const expiresAt = partner ? partner.effectiveExpiresAt : cert.expiresAt;
                const rowSaving = saving && pendingKey === certKey(cert);
                return (
                  <Fragment key={certKey(cert)}>
                    <tr>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{cert.companyName || "Unnamed store"}</p>
                        {cert.storeSlug ? (
                          <a
                            href={`${WEB_URL}/@${cert.storeSlug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-primary"
                          >
                            @{cert.storeSlug}
                          </a>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-gray-800">{cert.name}</p>
                        <p className="text-xs text-gray-500">{partner ? partner.licenceTypeLabel : cert.typeLabel}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {partner ? (
                          <>
                            <p className="font-mono">{partner.licenceNumber}</p>
                            <p className="text-xs text-gray-500">Held by {partner.holderCompany}</p>
                          </>
                        ) : (
                          <>
                            <p>{cert.number || "—"}</p>
                            <p className="text-xs text-gray-500">{cert.issuer || "Issuer not given"}</p>
                          </>
                        )}
                      </td>
                      <td className={`px-4 py-3 ${expiresAt && expiresAt < today ? "text-red-600" : "text-gray-700"}`}>
                        {formatDate(expiresAt)}
                      </td>
                      <td className="px-4 py-3">
                        {partner ? (
                          <span className={partner.hasLetter ? "text-gray-500" : "text-red-600"}>
                            {partner.hasLetter ? "Letter below" : "No letter"}
                          </span>
                        ) : cert.fileUrl ? (
                          <a
                            href={cert.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-primary"
                          >
                            Open <ExternalLink size={12} />
                          </a>
                        ) : (
                          <span className="text-gray-400">No file</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {status === "unverified" ? (
                          <Button
                            size="small"
                            loading={rowSaving}
                            disabled={saving || (partner ? !partner.hasLetter : !cert.fileUrl)}
                            onClick={() => (partner ? setPartnerToVerify(cert) : update(cert, true))}
                          >
                            Mark verified
                          </Button>
                        ) : (
                          <Button
                            size="small"
                            variant="outlined"
                            loading={rowSaving}
                            disabled={saving}
                            onClick={() => update(cert, false)}
                          >
                            Remove verification
                          </Button>
                        )}
                      </td>
                    </tr>
                    {partner ? renderPartnerDetails(cert) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {partnerToVerify ? (
        <VerifyPartnerDialog
          key={certKey(partnerToVerify)}
          cert={partnerToVerify}
          saving={saving}
          onClose={() => setPartnerToVerify(null)}
          onConfirm={() => update(partnerToVerify, true, true)}
        />
      ) : null}
    </div>
  );
};

export default CertificateReview;
