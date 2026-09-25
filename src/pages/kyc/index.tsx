import { useState } from "react";
import Pagination from "rc-pagination";
import { ExternalLink } from "lucide-react";

import Button from "@/common/button/button";
import Modal from "@/common/modal/modal";
import { Loader } from "@/common/loader/loader";
import {
  KycStatus,
  KycSubmission,
  useApproveKycMutation,
  useGetKycSubmissionQuery,
  useGetKycSubmissionsQuery,
  useRejectKycMutation,
} from "./kyc-api";

const TABS: { value: KycStatus; label: string }[] = [
  { value: "pending", label: "Waiting for review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const DOC_LABELS: Record<string, string> = {
  nin_slip: "NIN slip",
  passport: "International passport",
  drivers_license: "Driver's licence",
  voters_card: "Voter's card",
};

const formatDate = (value: string | null) =>
  value
    ? new Date(value).toLocaleString([], {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const fullName = (row: KycSubmission) =>
  [row.firstName, row.lastName].filter(Boolean).join(" ") || row.email || "Unnamed user";

/**
 * The KYC queue. Oldest submission first, so nobody waits behind people who
 * applied after them.
 */
const KycReview: React.FC = () => {
  const [status, setStatus] = useState<KycStatus>("pending");
  const [page, setPage] = useState(1);
  const [openUserId, setOpenUserId] = useState<string | null>(null);
  const limit = 20;

  const { data, isLoading, isFetching } = useGetKycSubmissionsQuery({ status, page, limit });
  const rows = data?.data ?? [];

  return (
    <div className="min-h-screen py-5">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">KYC Review</h1>
        <p className="text-gray-600">
          Check each seller's ID against the photo of them holding it, then approve or say what to fix.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => {
              setStatus(tab.value);
              setPage(1);
            }}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              status === tab.value ? "bg-primary text-white" : "bg-white text-gray-600 border border-gray-200"
            }`}
          >
            {tab.label}
            {tab.value === status && data ? ` (${data.pagination.total})` : ""}
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
            {status === "pending" ? "Nothing waiting for review." : "Nothing here yet."}
          </p>
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Seller</th>
                <th className="px-4 py-3">Business</th>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Submitted</th>
                {status !== "pending" ? <th className="px-4 py-3">Decided</th> : null}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row) => (
                <tr key={row.userId}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{fullName(row)}</p>
                    <p className="text-xs text-gray-500">{row.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    {row.companyName || "—"}
                    {row.hasCompanyDocument ? (
                      <span className="ml-2 rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700">
                        CAC sent
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    {DOC_LABELS[row.documentType ?? ""] ?? row.documentType ?? "—"}
                    <p className="text-xs text-gray-500">{row.docIssuingCountry}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(row.submittedAt)}</td>
                  {status !== "pending" ? (
                    <td className="px-4 py-3 text-gray-600">
                      {formatDate(row.reviewedAt)}
                      {row.rejectionReason ? (
                        <p className="max-w-xs truncate text-xs text-red-600" title={row.rejectionReason}>
                          {row.rejectionReason}
                        </p>
                      ) : null}
                    </td>
                  ) : null}
                  <td className="px-4 py-3 text-right">
                    <Button size="small" variant="outlined" onClick={() => setOpenUserId(row.userId)}>
                      {status === "pending" ? "Review" : "View"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {data && data.pagination.totalPages > 1 ? (
        <div className="mt-4 flex justify-end">
          <Pagination
            current={page}
            total={data.pagination.total}
            pageSize={limit}
            onChange={setPage}
          />
        </div>
      ) : null}

      {openUserId ? (
        <ReviewModal userId={openUserId} onClose={() => setOpenUserId(null)} />
      ) : null}
    </div>
  );
};

function ReviewModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const { data, isLoading, isError } = useGetKycSubmissionQuery(userId);
  const [approve, { isLoading: approving }] = useApproveKycMutation();
  const [reject, { isLoading: rejecting }] = useRejectKycMutation();
  const [showReject, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");

  const sub = data?.data;
  const decided = sub && sub.status !== "pending";

  return (
    <Modal isOpen onClose={onClose} title="KYC submission" className="!max-w-4xl">
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader />
        </div>
      ) : isError || !sub ? (
        <p className="py-8 text-center text-gray-500">Could not load this submission.</p>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="grid gap-3 text-sm sm:grid-cols-3">
            <Fact label="Name" value={fullName(sub)} />
            <Fact label="Email" value={sub.email} />
            <Fact label="Phone" value={sub.phoneNo} />
            <Fact label="Business" value={sub.companyName} />
            <Fact label="ID type" value={sub.documentTypeLabel} />
            <Fact label="Issued in" value={sub.docIssuingCountry} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Document title="ID document" url={sub.documents.idDocumentUrl} />
            <Document title="Holding the ID" url={sub.documents.selfieUrl} />
            {sub.documents.companyDocUrl ? (
              <Document title="Company registration (CAC)" url={sub.documents.companyDocUrl} />
            ) : null}
          </div>
          <p className="text-xs text-gray-500">
            Document links expire 15 minutes after this window opened. Close and reopen it to get fresh ones.
          </p>

          {decided ? (
            <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
              {sub.status === "approved" ? "Approved" : "Rejected"} {formatDate(sub.reviewedAt)}
              {sub.rejectionReason ? ` — “${sub.rejectionReason}”` : ""}
            </p>
          ) : showReject ? (
            <div className="flex flex-col gap-3">
              <label className="text-sm font-semibold text-gray-800" htmlFor="kyc-reason">
                What should the seller fix? They will see this exactly as written.
              </label>
              <textarea
                id="kyc-reason"
                className="min-h-24 rounded-lg border border-gray-300 p-3 text-sm"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="The ID photo is blurred — upload a sharper one where the name and number can be read."
              />
              <div className="flex gap-2">
                <Button
                  loading={rejecting}
                  disabled={reason.trim().length < 5}
                  onClick={async () => {
                    await reject({ userId, reason: reason.trim() }).unwrap().then(onClose).catch(() => undefined);
                  }}
                  className="!bg-red-600"
                >
                  Send rejection
                </Button>
                <Button variant="ghost" onClick={() => setRejectOpen(false)}>
                  Back
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button
                loading={approving}
                onClick={async () => {
                  await approve(userId).unwrap().then(onClose).catch(() => undefined);
                }}
              >
                Approve
              </Button>
              <Button variant="outlined" onClick={() => setRejectOpen(true)}>
                Reject…
              </Button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

function Fact({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs uppercase text-gray-500">{label}</p>
      <p className="text-gray-800">{value || "—"}</p>
    </div>
  );
}

function Document({ title, url }: { title: string; url: string | null }) {
  const isPdf = url ? /\.pdf(\?|$)/i.test(url) : false;
  return (
    <div className="rounded-lg border border-gray-200 p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-800">{title}</p>
        {url ? (
          <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-primary">
            Open <ExternalLink size={12} />
          </a>
        ) : null}
      </div>
      {!url ? (
        <p className="py-10 text-center text-sm text-gray-400">Not provided</p>
      ) : isPdf ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="block rounded bg-gray-50 py-10 text-center text-sm text-primary"
        >
          PDF — open to view
        </a>
      ) : (
        <img src={url} alt={title} className="max-h-80 w-full rounded bg-gray-50 object-contain" />
      )}
    </div>
  );
}

export default KycReview;
