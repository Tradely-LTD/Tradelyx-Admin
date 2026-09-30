import { useState } from "react";
import {
  AlertOctagon,
  AlertTriangle,
  BadgeCheck,
  Check,
  Edit2,
  ExternalLink,
  FileText,
  ImageOff,
  Mail,
  MessageSquareWarning,
  Phone,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react";

import { Btn, Pill, Skeleton, formatDate } from "@/common/ui/kit";
import { useUserSlice } from "@/pages/auth/authSlice";
import { useGetActivityQuery } from "@/pages/activity/activity-api";
import {
  AdminProduct,
  QUALITY_LABELS,
  QualityFlag,
  useGetProductQuery,
  useScreenProductMutation,
  useSetProductVerifiedMutation,
} from "../product-api";
import RequestChanges from "./request-changes";

/**
 * One product, laid out for the review decision: the photos first (most
 * problems are visible there), then what the automatic screening found and
 * any open change request, then who sells it and the listing's details.
 *
 * `listing` is the row from the admin list: it carries the seller's contact,
 * who uploaded it and the review fields, which the public product endpoint
 * leaves out.
 */

const WEB_URL = "https://web.tradelyx.com";

const label = (v: unknown) => (v && typeof v === "object" && "label" in (v as any) ? String((v as any).label) : v ? String(v) : "");
const qty = (v: any) => (v && (v.value || v.unit) ? `${v.value ?? ""} ${label(v.unit)}`.trim() : "");

function Field({ name, value }: { name: string; value?: string | null }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11.5px] font-semibold uppercase tracking-[0.05em] text-ink-faint">{name}</dt>
      <dd className={`mt-0.5 break-words text-[13.5px] ${value ? "text-ink" : "text-ink-faint"}`}>{value || "Not given"}</dd>
    </div>
  );
}

function Finding({ flag }: { flag: QualityFlag }) {
  const block = flag.severity === "block";
  return (
    <li className="flex gap-2.5 py-2">
      <span className={`mt-0.5 shrink-0 ${block ? "text-danger" : "text-attention-deep"}`}>
        {block ? <AlertOctagon size={16} /> : <AlertTriangle size={16} />}
      </span>
      <div className="min-w-0">
        <p className="text-[13.5px] font-semibold text-ink">
          {QUALITY_LABELS[flag.code] ?? flag.code}
          {flag.source === "ai" && (
            <span className="ml-1.5 inline-flex items-center gap-0.5 align-middle text-[11px] font-semibold text-sky-700">
              <Sparkles size={11} /> AI
            </span>
          )}
        </p>
        <p className="text-[12.5px] leading-snug text-ink-soft">{flag.detail}</p>
      </div>
    </li>
  );
}

export default function ProductPreview({
  productId,
  onClose,
  onEdit,
  listing,
}: {
  productId: string;
  onClose: () => void;
  onEdit?: () => void;
  listing?: AdminProduct;
}) {
  const [photo, setPhoto] = useState(0);
  const [askReason, setAskReason] = useState(false);
  const [reason, setReason] = useState("");
  const [requesting, setRequesting] = useState(false);

  const { data, isLoading } = useGetProductQuery({ id: productId });
  const [setVerified, { isLoading: verifying }] = useSetProductVerifiedMutation();
  const [screen, { isLoading: screening }] = useScreenProductMutation();
  const { loginResponse } = useUserSlice();
  const role = loginResponse?.user.roles;
  const canModerate = role === "admin" || role === "country_admin";

  // Who last changed verification, from the activity log (admins only)
  const { data: activity } = useGetActivityQuery(
    { targetType: "product", targetId: productId, action: "product.", limit: 5 },
    { skip: role !== "admin" }
  );
  const lastDecision = activity?.data?.find((a: any) =>
    ["product.verified", "product.unverified", "product.changes_requested"].includes(a.action)
  );

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-64" />
        <Skeleton className="h-24" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  const product: any = data?.data ?? listing;
  if (!product) return <p className="p-6 text-sm text-ink-soft">This product could not be loaded.</p>;

  const photos: string[] = [product.thumbnail, ...(product.images ?? [])].filter(
    (u: unknown, i: number, all: unknown[]): u is string => typeof u === "string" && !!u && all.indexOf(u) === i
  );
  const documents: string[] = [...(product.documents ?? []), ...(product.relevant_documents ?? [])].filter(Boolean);
  const flags = listing?.qualityFlags ?? [];
  const request = listing?.changesRequested ?? null;
  const verified = !!product.productVerified;

  const sellerName =
    listing?.sellerCompany || [listing?.sellerFirstName, listing?.sellerLastName].filter(Boolean).join(" ") || product.seller?.name || "Seller";
  const uploader =
    listing?.uploadedBy && listing.uploadedBy !== listing.creatorId
      ? `${[listing.uploaderFirstName, listing.uploaderLastName].filter(Boolean).join(" ") || "Staff"}${
          listing.uploaderRole && listing.uploaderRole !== "seller" ? ` (${listing.uploaderRole.replace("_", " ")})` : ""
        }`
      : "The seller";
  const phone = (listing?.sellerPhone || "").replace(/[^\d+]/g, "");

  const verify = async (next: boolean) => {
    // Taking the tick away: say why first, so the seller's email explains it
    if (!next && !askReason) {
      setAskReason(true);
      return;
    }
    try {
      await setVerified({ id: productId, verified: next, reason: next ? undefined : reason.trim() || undefined }).unwrap();
      setAskReason(false);
      onClose();
    } catch {
      // the toast says why
    }
  };

  return (
    // Cancels the modal's own padding so the action bar spans the width and
    // sits flush with the bottom while the details scroll behind it
    <div className="-mx-6 -my-4 font-sans">
      <div className="space-y-5 p-5 sm:p-6">
        {/* Photos: the biggest source of problems, so they lead */}
        <div className="grid gap-4 md:grid-cols-[1.35fr_1fr]">
          <div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-paper-deep">
              {photos.length ? (
                <a href={photos[photo]} target="_blank" rel="noreferrer" title="Open the full-size photo">
                  <img src={photos[photo]} alt={`${product.title}, photo ${photo + 1}`} className="h-full w-full object-contain" />
                </a>
              ) : (
                <div className="grid h-full place-items-center text-ink-faint">
                  <div className="text-center">
                    <ImageOff size={28} className="mx-auto" />
                    <p className="mt-2 text-[13px]">No photo</p>
                  </div>
                </div>
              )}
            </div>
            {photos.length > 1 && (
              <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                {photos.map((src, i) => (
                  <button
                    key={src}
                    onClick={() => setPhoto(i)}
                    aria-label={`Show photo ${i + 1}`}
                    aria-pressed={photo === i}
                    className={`h-14 w-14 shrink-0 cursor-pointer overflow-hidden rounded-lg ring-2 transition ${photo === i ? "ring-brand-900" : "ring-transparent opacity-70 hover:opacity-100"}`}
                  >
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              {verified ? (
                <Pill tone="green" dot>Verified</Pill>
              ) : request && !request.resubmittedAt ? (
                <Pill tone="orange" dot>Changes requested</Pill>
              ) : request?.resubmittedAt ? (
                <Pill tone="blue" dot>Resubmitted</Pill>
              ) : (
                <Pill tone="orange" dot>Awaiting review</Pill>
              )}
              {label(product.category) && <Pill>{label(product.category)}</Pill>}
            </div>
            <h2 className="mt-2 text-xl font-bold leading-snug tracking-[-0.01em] text-ink">{product.title}</h2>
            <p className="mt-2 max-h-40 overflow-y-auto whitespace-pre-line text-[13.5px] leading-relaxed text-ink-soft">
              {product.description || "No description."}
            </p>
            <a
              href={`${WEB_URL}/product/${product.id}`}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-semibold text-brand-900 hover:underline"
            >
              See it on TradelyX <ExternalLink size={12} />
            </a>
          </div>
        </div>

        {/* What the screening found, and any open change request */}
        {canModerate && (
          <section className="rounded-xl ring-1 ring-inset ring-rule">
            <div className="flex items-center justify-between gap-3 border-b border-rule px-4 py-2.5">
              <div>
                <h3 className="text-[13.5px] font-bold text-ink">Quality check</h3>
                <p className="text-[12px] text-ink-faint">
                  {listing?.qualityCheckedAt ? `Screened ${formatDate(listing.qualityCheckedAt, true)}` : "Not screened yet"}
                </p>
              </div>
              <Btn size="sm" variant="ghost" icon={<RefreshCw size={14} />} loading={screening} onClick={() => screen({ id: productId })}>
                Screen again
              </Btn>
            </div>
            <div className="px-4">
              {flags.length ? (
                <ul className="divide-y divide-rule">{flags.map((f) => <Finding key={f.code} flag={f} />)}</ul>
              ) : (
                <p className="flex items-center gap-2 py-3 text-[13px] text-ink-soft">
                  <BadgeCheck size={16} className="text-brand-900" />
                  {listing?.qualityCheckedAt ? "Nothing found. Still look at the photos before verifying." : "Findings appear here within a few minutes."}
                </p>
              )}
            </div>
            {request && (
              <div className={`border-t border-rule px-4 py-3 ${request.resubmittedAt ? "bg-sky-50/60" : "bg-attention-soft/50"}`}>
                <p className="text-[13px] font-semibold text-ink">
                  {request.resubmittedAt
                    ? `The seller edited it on ${formatDate(request.resubmittedAt, true)}, after being asked on ${formatDate(request.at)}`
                    : `Changes asked for on ${formatDate(request.at, true)}; waiting for the seller`}
                </p>
                <p className="mt-0.5 text-[12.5px] text-ink-soft">
                  {request.reasons.map((r) => QUALITY_LABELS[r] ?? r).join(" · ")}
                  {request.note ? ` — "${request.note}"` : ""}
                </p>
              </div>
            )}
          </section>
        )}

        {/* Who sells it, how to reach them, who put it up */}
        <section className="grid gap-4 rounded-xl bg-paper px-4 py-3.5 sm:grid-cols-3">
          <div className="min-w-0">
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.05em] text-ink-faint">Seller</p>
            <p className="truncate text-[13.5px] font-semibold text-ink">{sellerName}</p>
            {listing && <p className="text-[12px] text-ink-soft">{listing.sellerVerified ? "KYC verified" : "Not KYC verified"}</p>}
          </div>
          <div className="min-w-0 space-y-0.5">
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.05em] text-ink-faint">Contact</p>
            {listing?.sellerEmail ? (
              <a href={`mailto:${listing.sellerEmail}`} className="flex items-center gap-1.5 truncate text-[13px] text-brand-900 hover:underline">
                <Mail size={13} className="shrink-0" /> <span className="truncate">{listing.sellerEmail}</span>
              </a>
            ) : (
              <p className="text-[13px] text-ink-faint">No email</p>
            )}
            {phone && (
              <p className="flex items-center gap-1.5 text-[13px]">
                <Phone size={13} className="shrink-0 text-brand-900" />
                <a href={`tel:${phone}`} className="text-brand-900 hover:underline">{listing?.sellerPhone}</a>
                <span className="text-ink-faint">·</span>
                <a
                  href={`https://wa.me/${phone.replace(/^\+/, "").replace(/^0/, "234")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand-900 hover:underline"
                >
                  WhatsApp
                </a>
              </p>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.05em] text-ink-faint">Uploaded by</p>
            <p className="truncate text-[13.5px] font-medium text-ink">{uploader}</p>
            <p className="text-[12px] text-ink-soft">on {formatDate(product.createdAt ?? listing?.createdAt)}</p>
          </div>
        </section>

        {/* The listing's details: what a buyer needs to quote */}
        <section>
          <h3 className="mb-2.5 text-[13.5px] font-bold text-ink">Listing details</h3>
          <dl className="grid grid-cols-2 gap-x-5 gap-y-3.5 sm:grid-cols-3">
            <Field name="Specification" value={product.specification} />
            <Field name="Minimum order" value={qty(product.minimum_order)} />
            <Field name="Supply capacity" value={qty(product.supply_capacity)} />
            <Field name="Packaging" value={label(product.packaging_type)} />
            <Field name="Place of origin" value={product.place_of_origin} />
            <Field name="Year of origin" value={product.year_of_origin} />
            <Field name="Landmark" value={product.land_mark} />
            <Field name="Delivery date" value={product.delivery_date ? formatDate(product.delivery_date) : null} />
            <Field name="Certifications" value={product.certifications} />
          </dl>
          {product.tags?.length ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {product.tags.map((t: string) => <Pill key={t}>{t}</Pill>)}
            </div>
          ) : null}
        </section>

        {documents.length > 0 && (
          <section>
            <h3 className="mb-2 text-[13.5px] font-bold text-ink">Documents</h3>
            <div className="flex flex-wrap gap-2">
              {documents.map((doc, i) => (
                <a
                  key={`${doc}-${i}`}
                  href={doc}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex max-w-[260px] items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[12.5px] font-medium text-ink ring-1 ring-inset ring-rule hover:bg-paper"
                  title={doc.split("/").pop()}
                >
                  <FileText size={14} className="shrink-0 text-ink-soft" />
                  <span className="truncate">{decodeURIComponent(doc.split("/").pop() || `Document ${i + 1}`)}</span>
                </a>
              ))}
            </div>
          </section>
        )}
      </div>

      {askReason && (
        <div className="border-t border-rule bg-attention-soft/60 px-5 py-4 sm:px-6">
          <label className="block text-[13.5px] font-semibold text-ink" htmlFor="unverify-reason">
            Why is the verified tick coming off?
          </label>
          <p className="mb-2 text-[12px] text-ink-soft">The seller is emailed this, so they know what to fix.</p>
          <textarea
            id="unverify-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="e.g. The photos show a different product from the title"
            className="w-full rounded-lg border-0 bg-white p-2.5 text-[13.5px] ring-1 ring-inset ring-rule focus:outline-none focus:ring-2 focus:ring-brand-900"
          />
        </div>
      )}

      <div className="sticky -bottom-4 z-10 flex flex-wrap items-center justify-end gap-2 border-t border-rule bg-white/95 px-5 py-3.5 backdrop-blur sm:px-6">
        {lastDecision && (
          <p className="mr-auto text-[12px] text-ink-soft">
            {lastDecision.action === "product.verified"
              ? "Verified"
              : lastDecision.action === "product.unverified"
                ? "Verification removed"
                : "Changes asked for"}{" "}
            by <strong className="text-ink">{lastDecision.actorName ?? "staff"}</strong> on {formatDate(lastDecision.createdAt)}
          </p>
        )}
        <Btn variant="ghost" onClick={onClose}>Close</Btn>
        {onEdit && (
          <Btn variant="secondary" icon={<Edit2 size={14} />} onClick={onEdit}>
            Edit
          </Btn>
        )}
        {canModerate && (
          <>
            <Btn variant="attention" icon={<MessageSquareWarning size={14} />} onClick={() => setRequesting(true)}>
              Request changes
            </Btn>
            {verified ? (
              <Btn variant="danger" icon={<X size={14} />} loading={verifying} onClick={() => verify(false)}>
                {askReason ? "Remove and email seller" : "Remove verification"}
              </Btn>
            ) : (
              <Btn icon={<Check size={14} />} loading={verifying} onClick={() => verify(true)}>
                Verify
              </Btn>
            )}
          </>
        )}
      </div>

      <RequestChanges
        product={requesting ? { id: productId, title: product.title, qualityFlags: flags } : null}
        onClose={() => setRequesting(false)}
        onDone={onClose}
      />
    </div>
  );
}
