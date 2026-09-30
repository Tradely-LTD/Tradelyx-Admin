import { useMemo, useState } from "react";
import { useDebounce } from "react-use";
import Pagination from "rc-pagination";
import { AlertOctagon, AlertTriangle, BadgeCheck, Check, Edit2, ExternalLink, Eye, MessageSquareWarning, Package, Plus, ScanSearch, Search, ShieldCheck, Store, Trash2, X } from "lucide-react";

import {
  AdminProduct,
  QUALITY_LABELS,
  useDeleteProductByIdMutation,
  useScreenPendingProductsMutation,
  useGetProductStatsQuery,
  useGetProductsQuery,
  useSetProductVerifiedMutation,
} from "./product-api";
import ProductForm from "./components/product-form";
import ProductPreview from "./components/product-preview";
import RequestChanges from "./components/request-changes";
import Modal from "@/common/modal/modal";
import TableDropdown from "@/common/dropdown";
import { useUserSlice } from "../auth/authSlice";
import { Btn, Card, Confirm, EmptyState, PageHeader, Pill, Skeleton, formatDate, formatNumber } from "@/common/ui/kit";

/**
 * Products: review what sellers list, verify the good ones, remove the bad.
 *
 * Opens on "Needs attention": listings the automatic screening flagged
 * (contact details, screenshots, small photos, several products in one) and
 * sellers' resubmissions after a change request. Staff verify the good ones
 * and send the rest back with "Request changes", which tells the seller
 * exactly what to fix. Every decision is recorded in the activity log.
 */

const WEB_URL = "https://web.tradelyx.com";

type Filter = "attention" | "unverified" | "changes_requested" | "verified" | "";

const price = (p: AdminProduct["price"]) => {
  if (!p || p.amount == null || p.amount === "") return null;
  const amount = Number(p.amount);
  if (!Number.isFinite(amount)) return null;
  try {
    return new Intl.NumberFormat("en-NG", { style: "currency", currency: p.currency || "NGN", maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${p.currency ?? ""} ${formatNumber(amount)}`.trim();
  }
};

export default function ProductManagement() {
  const { loginResponse } = useUserSlice();
  const role = loginResponse?.user.roles;
  const canModerate = role === "admin" || role === "country_admin";

  const [filter, setFilter] = useState<Filter>(canModerate ? "attention" : "");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [seller, setSeller] = useState<{ id: string; name: string } | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [formFor, setFormFor] = useState<{ id?: string } | null>(null);
  const [deleting, setDeleting] = useState<AdminProduct | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [requesting, setRequesting] = useState<AdminProduct | null>(null);

  useDebounce(() => { setDebounced(search.trim()); setPage(1); }, 350, [search]);

  const { data, isLoading, isFetching } = useGetProductsQuery({
    page,
    limit,
    search: debounced || undefined,
    status: filter || undefined,
    sellerId: seller?.id,
  });
  const { data: stats, isLoading: statsLoading } = useGetProductStatsQuery();
  const [setVerified, { isLoading: verifying }] = useSetProductVerifiedMutation();
  const [deleteProduct, { isLoading: deletingNow }] = useDeleteProductByIdMutation();
  const [screenPending, { isLoading: screeningAll }] = useScreenPendingProductsMutation();

  const rows = useMemo(() => data?.data ?? [], [data]);
  const total = Number(data?.pagination?.total ?? 0);
  const allOnPage = rows.length > 0 && rows.every((r) => selected.has(r.id));

  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const verifySelected = async () => {
    setBulkBusy(true);
    try {
      // One at a time: each is its own verification in the activity log
      for (const id of selected) await setVerified({ id, verified: true }).unwrap().catch(() => undefined);
      setSelected(new Set());
    } finally {
      setBulkBusy(false);
    }
  };

  const tiles: { label: string; value?: number; icon: typeof Package; attention?: boolean; filter: Filter }[] = [
    { label: "Needs attention", value: stats?.needsAttention, icon: AlertTriangle, attention: true, filter: "attention" },
    { label: "Awaiting review", value: stats?.unverifiedProducts, icon: ShieldCheck, filter: "unverified" },
    { label: "Waiting on seller", value: stats?.changesRequested, icon: MessageSquareWarning, filter: "changes_requested" },
    { label: "Verified", value: stats?.verifiedProducts, icon: BadgeCheck, filter: "verified" },
    { label: "All products", value: stats?.totalProducts, icon: Package, filter: "" },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Marketplace"
        title="Products"
        description="Check what sellers list. Verified products carry the verified tick buyers look for."
        actions={
          canModerate && (
            <>
              <Btn variant="secondary" icon={<ScanSearch size={16} />} loading={screeningAll} onClick={() => screenPending()}>
                Screen unchecked listings
              </Btn>
              <Btn icon={<Plus size={16} />} onClick={() => setFormFor({})}>
                Add product for a seller
              </Btn>
            </>
          )
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {tiles.map((t) => (
          <Card
            key={t.label}
            role="button"
            tabIndex={0}
            aria-pressed={filter === t.filter}
            onClick={() => { setFilter(t.filter); setPage(1); setSelected(new Set()); }}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setFilter(t.filter); setPage(1); setSelected(new Set()); } }}
            className={`flex cursor-pointer items-center gap-3 px-4 py-3.5 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900 ${filter === t.filter ? "ring-2 ring-brand-900" : ""}`}
          >
            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${t.attention && t.value ? "bg-attention-soft text-attention-deep" : "bg-brand-50 text-brand-900"}`}>
              <t.icon size={17} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[12px] text-ink-soft">{t.label}</p>
              {statsLoading ? <Skeleton className="mt-1 h-5 w-10" /> : <p className="tnum text-lg font-bold leading-tight text-ink">{formatNumber(t.value)}</p>}
            </div>
          </Card>
        ))}
      </div>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter">
          {([
            ["attention", "Needs attention"],
            ["unverified", "Awaiting review"],
            ["changes_requested", "Waiting on seller"],
            ["verified", "Verified"],
            ["", "All"],
          ] as [Filter, string][]).map(([value, label]) => (
            <button
              key={label}
              onClick={() => { setFilter(value); setPage(1); setSelected(new Set()); }}
              aria-pressed={filter === value}
              className={`cursor-pointer rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
                filter === value ? "bg-brand-950 text-white" : "bg-white text-ink-soft ring-1 ring-inset ring-rule hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
          {seller && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 py-1.5 pl-3 pr-1.5 text-[12.5px] font-semibold text-sky-800 ring-1 ring-inset ring-sky-200">
              <Store size={13} /> {seller.name}
              <button onClick={() => { setSeller(null); setPage(1); }} aria-label="Show every seller" className="grid h-5 w-5 cursor-pointer place-items-center rounded-full hover:bg-sky-100">
                <X size={12} />
              </button>
            </span>
          )}
        </div>
        <div className="relative lg:ml-auto lg:w-80">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search product, category or seller"
            aria-label="Search products"
            className="h-10 w-full rounded-lg border-0 bg-white pl-9 pr-3 text-[13.5px] text-ink shadow-sm ring-1 ring-inset ring-rule placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-brand-900"
          />
        </div>
      </div>

      {canModerate && selected.size > 0 && (
        <div className="mb-3 flex animate-rise items-center justify-between gap-3 rounded-xl bg-brand-950 px-4 py-2.5 text-white">
          <span className="text-[13.5px] font-semibold">
            {selected.size} selected
          </span>
          <div className="flex gap-2">
            <Btn size="sm" variant="ghost" className="text-white/80 hover:bg-white/10 hover:text-white" onClick={() => setSelected(new Set())}>
              Clear
            </Btn>
            <Btn size="sm" icon={<Check size={14} />} loading={bulkBusy} onClick={verifySelected} className="bg-white text-brand-950 hover:bg-brand-50">
              Verify selected
            </Btn>
          </div>
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-[13.5px]">
            <thead>
              <tr className="border-b border-rule bg-paper text-[11.5px] font-semibold uppercase tracking-[0.06em] text-ink-faint">
                {canModerate && (
                  <th className="w-10 py-3 pl-5">
                    <input
                      type="checkbox"
                      aria-label="Select every product on this page"
                      checked={allOnPage}
                      onChange={() => setSelected(allOnPage ? new Set() : new Set(rows.map((r) => r.id)))}
                      className="h-4 w-4 cursor-pointer accent-brand-900"
                    />
                  </th>
                )}
                <th className="px-4 py-3">Product</th>
                <th className="px-3 py-3">Seller</th>
                <th className="px-3 py-3">Price</th>
                <th className="px-3 py-3">Added</th>
                <th className="px-3 py-3">Status</th>
                <th className="w-12 px-3 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className={`divide-y divide-rule transition-opacity ${isFetching && !isLoading ? "opacity-60" : ""}`}>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}><td colSpan={7} className="px-5 py-3"><Skeleton className="h-11" /></td></tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      icon={<Package size={20} />}
                      title={filter === "attention" ? "Nothing flagged" : filter === "unverified" ? "Nothing waiting for review" : "No products match"}
                    >
                      {filter === "attention"
                        ? "The screening found nothing to fix. Check Awaiting review for listings that still need a look."
                        : filter === "unverified"
                          ? "Every product has been checked."
                          : "Try another search or filter."}
                    </EmptyState>
                  </td>
                </tr>
              ) : (
                rows.map((p) => {
                  const sellerName = p.sellerCompany || [p.sellerFirstName, p.sellerLastName].filter(Boolean).join(" ") || "Seller";
                  const cost = price(p.price);
                  return (
                    <tr key={p.id} className={`cursor-pointer transition-colors hover:bg-brand-50/40 ${selected.has(p.id) ? "bg-brand-50/60" : ""}`} onClick={() => setPreviewId(p.id)}>
                      {canModerate && (
                        <td className="py-3 pl-5" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" aria-label={`Select ${p.title}`} checked={selected.has(p.id)} onChange={() => toggle(p.id)} className="h-4 w-4 cursor-pointer accent-brand-900" />
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {p.thumbnail || p.images?.[0] ? (
                            <img src={p.thumbnail || p.images![0]} alt="" loading="lazy" className="h-11 w-11 shrink-0 rounded-lg bg-paper-deep object-cover" />
                          ) : (
                            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-paper-deep text-ink-faint"><Package size={17} /></div>
                          )}
                          <div className="min-w-0">
                            <p className="max-w-[280px] truncate font-semibold text-ink">{p.title}</p>
                            <p className="truncate text-[12.5px] text-ink-soft">{[p.category, p.place_of_origin].filter(Boolean).join(" · ")}</p>
                            {!!p.qualityFlags?.length && (
                              <div className="mt-1 flex max-w-[320px] flex-wrap gap-1">
                                {p.qualityFlags.slice(0, 2).map((f) => (
                                  <span
                                    key={f.code}
                                    title={f.detail}
                                    className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${
                                      f.severity === "block" ? "bg-danger-soft text-danger-deep" : "bg-attention-soft text-attention-deep"
                                    }`}
                                  >
                                    {f.severity === "block" ? <AlertOctagon size={11} /> : <AlertTriangle size={11} />}
                                    {QUALITY_LABELS[f.code] ?? f.code}
                                  </span>
                                ))}
                                {p.qualityFlags.length > 2 && (
                                  <span className="rounded-md bg-paper-deep px-1.5 py-0.5 text-[11px] font-semibold text-ink-soft" title={p.qualityFlags.slice(2).map((f) => QUALITY_LABELS[f.code]).join(", ")}>
                                    +{p.qualityFlags.length - 2}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <p className="max-w-[200px] truncate text-ink">{sellerName}</p>
                        <p className="text-[12px]">{p.sellerVerified ? <span className="text-brand-900">KYC verified</span> : <span className="text-ink-faint">Not KYC verified</span>}</p>
                        {p.uploadedBy && p.uploadedBy !== p.creatorId && (
                          <p className="truncate text-[11.5px] text-ink-faint">
                            uploaded by {[p.uploaderFirstName, p.uploaderLastName].filter(Boolean).join(" ") || "staff"}
                          </p>
                        )}
                      </td>
                      <td className="tnum whitespace-nowrap px-3 py-3 text-ink-soft">
                        {cost ?? <span className="text-ink-faint">Ask for a quote</span>}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-ink-soft">{formatDate(p.createdAt)}</td>
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        {p.productVerified ? (
                          <Pill tone="green" dot>Verified</Pill>
                        ) : p.changesRequested && !p.changesRequested.resubmittedAt ? (
                          <Pill tone="orange" dot>Waiting on seller</Pill>
                        ) : canModerate ? (
                          <Btn size="sm" variant="secondary" icon={<Check size={14} />} disabled={verifying} onClick={() => setVerified({ id: p.id, verified: true })}>
                            Verify
                          </Btn>
                        ) : (
                          <Pill tone="orange" dot>Awaiting review</Pill>
                        )}
                      </td>
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <TableDropdown
                          items={[
                            { label: "Open", icon: <Eye size={16} />, action: () => setPreviewId(p.id) },
                            { label: "See on TradelyX", icon: <ExternalLink size={16} />, action: () => window.open(`${WEB_URL}/product/${p.id}`, "_blank", "noopener") },
                            { label: "This seller's products", icon: <Store size={16} />, action: () => { setSeller({ id: p.creatorId, name: sellerName }); setPage(1); } },
                            ...(canModerate
                              ? [
                                  { label: "Request changes", icon: <MessageSquareWarning size={16} />, action: () => setRequesting(p) },
                                  ...(p.productVerified ? [{ label: "Remove verification", icon: <X size={16} />, action: () => setVerified({ id: p.id, verified: false }) }] : []),
                                  { label: "Edit", icon: <Edit2 size={16} />, action: () => setFormFor({ id: p.id }) },
                                  { label: "Remove", icon: <Trash2 size={16} />, action: () => setDeleting(p), danger: true },
                                ]
                              : []),
                          ]}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule px-5 py-3">
          <div className="flex items-center gap-3 text-[12.5px] text-ink-soft">
            <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }} aria-label="Rows per page" className="h-8 cursor-pointer rounded-lg border-0 bg-white pl-2 pr-7 text-[12.5px] ring-1 ring-inset ring-rule">
              {[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n} per page</option>)}
            </select>
            <span className="tnum">{formatNumber(total)} {total === 1 ? "product" : "products"}</span>
          </div>
          <Pagination current={page} total={total} pageSize={limit} onChange={setPage} showSizeChanger={false} />
        </div>
      </Card>

      <Modal isOpen={!!previewId} onClose={() => setPreviewId(null)} title="Product" className="!max-w-[860px]">
        {previewId && (
          <ProductPreview
            productId={previewId}
            listing={rows.find((r) => r.id === previewId)}
            onClose={() => setPreviewId(null)}
            onEdit={canModerate ? () => { const id = previewId; setPreviewId(null); setFormFor({ id }); } : undefined}
          />
        )}
      </Modal>

      <Modal isOpen={!!formFor} onClose={() => setFormFor(null)} title={formFor?.id ? "Edit product" : "Add a product for a seller"} className="!max-w-[860px]">
        {formFor && <ProductForm id={formFor.id} onClose={() => setFormFor(null)} />}
      </Modal>

      <RequestChanges product={requesting} onClose={() => setRequesting(null)} />

      <Confirm
        open={!!deleting}
        title="Remove this product?"
        confirmLabel="Remove product"
        loading={deletingNow}
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await deleteProduct({ id: deleting.id }).unwrap();
            setDeleting(null);
          } catch {
            // toast says why
          }
        }}
      >
        <strong className="text-ink">{deleting?.title}</strong> disappears from the marketplace and the seller's store. The seller isn't told
        automatically; this can't be undone. It is recorded in the activity log.
      </Confirm>
    </>
  );
}
