import { useState } from "react";
import { ExternalLink } from "lucide-react";

import Button from "@/common/button/button";
import { Loader } from "@/common/loader/loader";
import { useGetCertificationsQuery, useSetCertificationVerifiedMutation } from "./certificates-api";

const WEB_URL = "https://web.tradelyx.com";

const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" }) : "—";

/**
 * Certificates waiting for a check. Open the document, confirm it with the
 * issuer (NEPC, NAFDAC, SON…), then mark it verified.
 */
const CertificateReview: React.FC = () => {
  const [status, setStatus] = useState<"unverified" | "verified">("unverified");
  const { data, isLoading, isFetching } = useGetCertificationsQuery(status);
  const [setVerified, { isLoading: saving }] = useSetCertificationVerifiedMutation();
  const rows = data?.data ?? [];
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="min-h-screen py-5">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Store Certificates</h1>
        <p className="text-gray-600">
          Check each document with its issuer before marking it verified — buyers abroad rely on the seal.
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
              {rows.map((cert) => (
                <tr key={`${cert.sellerId}-${cert.id}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{cert.companyName || "Unnamed store"}</p>
                    {cert.storeSlug ? (
                      <a href={`${WEB_URL}/@${cert.storeSlug}`} target="_blank" rel="noreferrer" className="text-xs text-primary">
                        @{cert.storeSlug}
                      </a>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-gray-800">{cert.name}</p>
                    <p className="text-xs text-gray-500">{cert.typeLabel}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    <p>{cert.number || "—"}</p>
                    <p className="text-xs text-gray-500">{cert.issuer || "Issuer not given"}</p>
                  </td>
                  <td className={`px-4 py-3 ${cert.expiresAt && cert.expiresAt < today ? "text-red-600" : "text-gray-700"}`}>
                    {formatDate(cert.expiresAt)}
                  </td>
                  <td className="px-4 py-3">
                    {cert.fileUrl ? (
                      <a href={cert.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary">
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
                        loading={saving}
                        disabled={!cert.fileUrl}
                        onClick={() => setVerified({ sellerId: cert.sellerId, certId: cert.id, verified: true })}
                      >
                        Mark verified
                      </Button>
                    ) : (
                      <Button
                        size="small"
                        variant="outlined"
                        loading={saving}
                        onClick={() => setVerified({ sellerId: cert.sellerId, certId: cert.id, verified: false })}
                      >
                        Remove verification
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default CertificateReview;
