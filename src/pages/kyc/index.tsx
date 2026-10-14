import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import Pagination from "rc-pagination";
import { Check, ExternalLink, FileText, ShieldCheck, X } from "lucide-react";

import { Btn, Card, EmptyState, Modal, PageHeader, Pill, Skeleton, Tabs, formatDate } from "@/common/ui/kit";
import {
  KycStatus,
  KycSubmission,
  useApproveKycMutation,
  useGetKycSubmissionQuery,
  useGetKycSubmissionsQuery,
  useRejectKycMutation,
} from "./kyc-api";

/**
 * The KYC queue. Oldest submission first, so nobody waits behind people who
 * applied after them. Approving a seller also marks their company verified
 * (TradelyBackend kyc/reviewRepo). /kyc?user=<id> opens one person's review,
 * e.g. from their full profile.
 */

const DOC_LABELS: Record<string, string> = {
  nin_slip: "NIN slip",
  passport: "International passport",
  drivers_license: "Driver's licence",
  voters_card: "Voter's card",
};

const fullName = (row: Pick<KycSubmission, "firstName" | "lastName" | "email">) =>
  [row.firstName, row.lastName].filter(Boolean).join(" ") || row.email || "Unnamed user";

const LIMIT = 20;

const KycReview: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const [status, setStatus] = useState<KycStatus>("pending");
  const [page, setPage] = useState(1);
  const openUserId = params.get("user");
  const open = (id: string | null) => setParams(id ? { user: id } : {}, { replace: true });

  const { data, isLoading, isFetching } = useGetKycSubmissionsQuery({ status, page, limit: LIMIT });
  const rows = data?.data ?? [];

  return (
    <>
      <PageHeader eyebrow="Trust" title="KYC review" description="Check each person's ID against the photo of them holding it, then approve, or say exactly what to fix." />

      <Card className="overflow-hidden">
        <div className="border-b border-rule px-5 py-4">
          <Tabs<KycStatus>
            value={status}
            onChange={(v) => (setStatus(v), setPage(1))}
            items={[
              { value: "pending", label: "Waiting for review", count: status === "pending" ? data?.pagination.total : undefined },
              { value: "approved", label: "Approved" },
              { value: "rejected", label: "Rejected" },
            ]}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-rule text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">
                <th className="px-5 py-2.5">Person</th>
                <th className="px-3 py-2.5">Business</th>
                <th className="px-3 py-2.5">ID</th>
                <th className="px-3 py-2.5">Submitted</th>
                {status !== "pending" && <th className="px-3 py-2.5">Decided</th>}
                <th className="px-5 py-2.5" />
              </tr>
            </thead>
            <tbody className={`divide-y divide-rule ${isFetching && !isLoading ? "opacity-60" : ""}`}>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6} className="px-5 py-3"><Skeleton className="h-7" /></td>
                  </tr>
                ))
              ) : !rows.length ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState icon={<ShieldCheck size={22} />} title={status === "pending" ? "Nothing waiting for review" : "Nothing here yet"} />
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.userId} onClick={() => open(row.userId)} className="cursor-pointer hover:bg-paper">
                    <td className="max-w-[240px] px-5 py-3">
                      <p className="truncate font-semibold text-ink">{fullName(row)}</p>
                      <p className="truncate text-[12px] text-ink-soft">{row.email}</p>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-ink">{row.companyName || "—"}</span>
                      {row.hasCompanyDocument && <Pill tone="green" className="ml-2">CAC sent</Pill>}
                    </td>
                    <td className="px-3 py-3">
                      <p className="text-ink">{DOC_LABELS[row.documentType ?? ""] ?? row.documentType ?? "—"}</p>
                      <p className="text-[12px] text-ink-soft">{row.docIssuingCountry}</p>
                    </td>
                    <td className="tnum whitespace-nowrap px-3 py-3 text-[12.5px] text-ink-soft">{formatDate(row.submittedAt, true)}</td>
                    {status !== "pending" && (
                      <td className="max-w-[240px] px-3 py-3 text-[12.5px] text-ink-soft">
                        {formatDate(row.reviewedAt, true)}
                        {row.rejectionReason && <p className="truncate text-danger" title={row.rejectionReason}>{row.rejectionReason}</p>}
                      </td>
                    )}
                    <td className="px-5 py-3 text-right">
                      <Btn size="sm" variant={status === "pending" ? "primary" : "secondary"} onClick={(e) => (e.stopPropagation(), open(row.userId))}>
                        {status === "pending" ? "Review" : "View"}
                      </Btn>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {data && data.pagination.totalPages > 1 && (
          <div className="flex justify-end border-t border-rule px-5 py-3">
            <Pagination current={page} total={data.pagination.total} pageSize={LIMIT} onChange={setPage} showSizeChanger={false} />
          </div>
        )}
      </Card>

      {openUserId && <ReviewModal userId={openUserId} onClose={() => open(null)} />}
    </>
  );
};

function ReviewModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const { data, isLoading, isError } = useGetKycSubmissionQuery(userId);
  const [approve, { isLoading: approving }] = useApproveKycMutation();
  const [reject, { isLoading: rejecting }] = useRejectKycMutation();
  const [rejecting_, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  const sub = data?.data;
  const pending = sub?.status === "pending";

  const footer = !pending ? undefined : rejecting_ ? (
    <div className="flex justify-end gap-2">
      <Btn variant="secondary" size="sm" onClick={() => setRejecting(false)} disabled={rejecting}>Back</Btn>
      <Btn
        variant="danger"
        size="sm"
        icon={<X size={14} />}
        loading={rejecting}
        disabled={reason.trim().length < 5}
        onClick={() => reject({ userId, reason: reason.trim() }).unwrap().then(onClose).catch(() => undefined)}
      >
        Send rejection
      </Btn>
    </div>
  ) : (
    <div className="flex justify-end gap-2">
      <Btn variant="secondary" size="sm" onClick={() => setRejecting(true)}>Reject…</Btn>
      <Btn size="sm" icon={<Check size={14} />} loading={approving} onClick={() => approve(userId).unwrap().then(onClose).catch(() => undefined)}>
        Approve
      </Btn>
    </div>
  );

  return (
    <Modal
      open
      onClose={onClose}
      width="max-w-4xl"
      title={sub ? fullName(sub) : "KYC submission"}
      subtitle={sub ? [sub.email, sub.companyName].filter(Boolean).join(" · ") : undefined}
      footer={footer}
    >
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      ) : isError || !sub ? (
        <p className="py-10 text-center text-[14px] text-ink-soft">Couldn't load this submission. They may not have submitted KYC yet.</p>
      ) : (
        <div className="space-y-5">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-[13.5px] sm:grid-cols-4">
            <Fact label="Phone" value={sub.phoneNo} />
            <Fact label="ID type" value={sub.documentTypeLabel} />
            <Fact label="Issued in" value={sub.docIssuingCountry} />
            <Fact label="Submitted" value={formatDate(sub.submittedAt, true)} />
          </dl>

          <div className="grid gap-4 md:grid-cols-2">
            <Document title="ID document" url={sub.documents.idDocumentUrl} />
            <Document title="Holding the ID" url={sub.documents.selfieUrl} />
            {sub.documents.companyDocUrl && <Document title="Company registration (CAC)" url={sub.documents.companyDocUrl} />}
          </div>
          <p className="text-[12px] text-ink-faint">Document links expire 15 minutes after this window opened. Close and reopen it for fresh ones.</p>

          {!pending ? (
            <p className={`rounded-xl px-4 py-3 text-[13.5px] ${sub.status === "approved" ? "bg-brand-50 text-brand-950" : "bg-danger-soft text-danger-deep"}`}>
              {sub.status === "approved" ? "Approved" : "Rejected"} {formatDate(sub.reviewedAt, true)}
              {sub.rejectionReason ? `: “${sub.rejectionReason}”` : ""}
            </p>
          ) : (
            rejecting_ && (
              <div>
                <label className="mb-1.5 block text-[13px] font-semibold text-ink" htmlFor="kyc-reason">
                  What should they fix? They see this exactly as written.
                </label>
                <textarea
                  id="kyc-reason"
                  autoFocus
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder="The ID photo is blurred. Upload a sharper one where the name and number can be read."
                  className="w-full rounded-lg border-0 bg-white px-3 py-2.5 text-sm text-ink shadow-sm ring-1 ring-inset ring-rule placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-brand-900"
                />
              </div>
            )
          )}
        </div>
      )}
    </Modal>
  );
}

function Fact({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-[11.5px] text-ink-faint">{label}</dt>
      <dd className="font-medium text-ink">{value || "—"}</dd>
    </div>
  );
}

function Document({ title, url }: { title: string; url: string | null }) {
  const isPdf = url ? /\.pdf(\?|$)/i.test(url) : false;
  return (
    <div className="rounded-xl p-3 ring-1 ring-rule">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[13px] font-semibold text-ink">{title}</p>
        {url && (
          <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand-900 hover:underline">
            Open <ExternalLink size={12} />
          </a>
        )}
      </div>
      {!url ? (
        <p className="grid h-40 place-items-center rounded-lg bg-paper text-[13px] text-ink-faint">Not provided</p>
      ) : isPdf ? (
        <a href={url} target="_blank" rel="noreferrer" className="grid h-40 place-items-center rounded-lg bg-paper text-[13px] font-semibold text-brand-900">
          <span className="inline-flex items-center gap-1.5"><FileText size={16} /> PDF: open to view</span>
        </a>
      ) : (
        <img src={url} alt={title} className="max-h-80 w-full rounded-lg bg-paper object-contain" />
      )}
    </div>
  );
}

export default KycReview;
