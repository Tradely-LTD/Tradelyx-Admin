import { useState } from "react";
import { useDebounce } from "react-use";
import Pagination from "rc-pagination";
import { Edit2, ExternalLink, EyeOff, Eye, Plus, RotateCcw, Search, ShellIcon, Store, Trash2, X } from "lucide-react";

import {
  SellOffers,
  useDeleteSellOfferByIdMutation,
  useGetSellOfferStatsQuery,
  useGetSellOffersQuery,
  useUpdateSellOfferMutation,
} from "./sell-offer-api";
import SellOfferForm from "./sell-offer-form";
import SellOfferPreview from "./sellOffer-preview";
import Modal from "@/common/modal/modal";
import TableDropdown from "@/common/dropdown";
import { useUserSlice } from "../auth/authSlice";
import { Btn, Card, Confirm, EmptyState, PageHeader, Pill, Skeleton, formatDate, formatNumber } from "@/common/ui/kit";

/**
 * Sell offers: stock sellers have ready, with a price and a quantity.
 *
 * What staff do here is keep the live list honest: take down an offer that
 * shouldn't be showing (and put it back), fix one, or remove it. "Live" means
 * what buyers can see: switched on and still within its validity date.
 * Every take-down, edit and removal is recorded in the activity log.
 */

const WEB_URL = "https://web.tradelyx.com";
type Filter = "active" | "expired" | "inactive" | "";

const money = (p: SellOffers["basePrice"]) => {
  const amount = Number(p?.amount);
  if (!p || !Number.isFinite(amount) || amount <= 0) return null;
  try {
    return new Intl.NumberFormat("en-NG", { style: "currency", currency: p.currency || "NGN", maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${p.currency ?? ""} ${formatNumber(amount)}`.trim();
  }
};

const isExpired = (o: SellOffers) => Boolean(o.offerValidityDate && new Date(o.offerValidityDate).getTime() < Date.now());

export default function SellOfferManagement() {
  const { loginResponse } = useUserSlice();
  const role = loginResponse?.user.roles;
  const canModerate = role === "admin" || role === "country_admin";

  const [filter, setFilter] = useState<Filter>("active");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [seller, setSeller] = useState<{ id: string; name: string } | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [formFor, setFormFor] = useState<{ id?: string } | null>(null);
  const [deleting, setDeleting] = useState<SellOffers | null>(null);
  const [takingDown, setTakingDown] = useState<SellOffers | null>(null);

  useDebounce(() => { setDebounced(search.trim()); setPage(1); }, 350, [search]);

  const { data, isLoading, isFetching } = useGetSellOffersQuery({ page, limit, search: debounced || undefined, status: filter || undefined, sellerId: seller?.id });
  const { data: stats, isLoading: statsLoading } = useGetSellOfferStatsQuery();
  const [updateOffer, { isLoading: updating }] = useUpdateSellOfferMutation();
  const [deleteOffer, { isLoading: deletingNow }] = useDeleteSellOfferByIdMutation();

  const rows = data?.data ?? [];
  const total = Number(data?.pagination?.total ?? 0);
  const s = stats?.data;

  const setLive = async (offer: SellOffers, isActive: boolean) => {
    try {
      await updateOffer({ id: offer.id, data: { isActive } }).unwrap();
      setTakingDown(null);
    } catch {
      // toast says why
    }
  };

  const tiles = [
    { label: "All offers", value: s?.totalOffers },
    { label: "Switched on", value: s?.activeOffers },
    { label: "Taken down", value: s?.inactiveOffers },
    { label: "Added in 30 days", value: s?.recentOffers },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Marketplace"
        title="Sell offers"
        description="Stock sellers have ready, priced and counted. Keep the live list honest: take down what shouldn't show, fix or remove it."
        actions={
          canModerate && (
            <Btn icon={<Plus size={16} />} onClick={() => setFormFor({})}>
              Post an offer for a seller
            </Btn>
          )
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <Card key={t.label} className="px-4 py-3.5">
            <p className="text-[12px] text-ink-soft">{t.label}</p>
            {statsLoading ? <Skeleton className="mt-1 h-5 w-10" /> : <p className="tnum text-lg font-bold text-ink">{formatNumber(t.value)}</p>}
          </Card>
        ))}
      </div>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter">
          {([
            ["active", "Live"],
            ["expired", "Expired"],
            ["inactive", "Taken down"],
            ["", "All"],
          ] as [Filter, string][]).map(([value, label]) => (
            <button
              key={label}
              onClick={() => { setFilter(value); setPage(1); }}
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
            placeholder="Search offer, category or company"
            aria-label="Search sell offers"
            className="h-10 w-full rounded-lg border-0 bg-white pl-9 pr-3 text-[13.5px] text-ink shadow-sm ring-1 ring-inset ring-rule placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-brand-900"
          />
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-[13.5px]">
            <thead>
              <tr className="border-b border-rule bg-paper text-[11.5px] font-semibold uppercase tracking-[0.06em] text-ink-faint">
                <th className="px-5 py-3">Offer</th>
                <th className="px-3 py-3">Seller</th>
                <th className="px-3 py-3">Price</th>
                <th className="px-3 py-3">Quantity</th>
                <th className="px-3 py-3">Valid until</th>
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
                    <EmptyState icon={<ShellIcon size={20} />} title="No sell offers match">Try another filter or search.</EmptyState>
                  </td>
                </tr>
              ) : (
                rows.map((o) => {
                  const sellerName = o.companyName || [o.sellerFirstName, o.sellerLastName].filter(Boolean).join(" ") || "Seller";
                  const image = o.thumbnail || o.productImages?.[0];
                  const expired = isExpired(o);
                  const qty = o.quantityAndUnit?.quantity ? `${formatNumber(Number(o.quantityAndUnit.quantity))} ${o.quantityAndUnit.unit ?? ""}`.trim() : "—";
                  return (
                    <tr key={o.id} className="cursor-pointer transition-colors hover:bg-brand-50/40" onClick={() => setPreviewId(o.id)}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          {image ? (
                            <img src={image} alt="" loading="lazy" className="h-11 w-11 shrink-0 rounded-lg bg-paper-deep object-cover" />
                          ) : (
                            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-paper-deep text-ink-faint"><ShellIcon size={17} /></div>
                          )}
                          <div className="min-w-0">
                            <p className="max-w-[260px] truncate font-semibold text-ink">{o.title}</p>
                            <p className="truncate text-[12.5px] text-ink-soft">
                              {[o.productCategory, o.originLocation?.state || o.originLocation?.country].filter(Boolean).join(" · ")}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <p className="max-w-[190px] truncate text-ink">{sellerName}</p>
                        <p className="text-[12px]">{o.sellerVerified ? <span className="text-brand-900">KYC verified</span> : <span className="text-ink-faint">Not KYC verified</span>}</p>
                      </td>
                      <td className="tnum whitespace-nowrap px-3 py-3 text-ink-soft">{money(o.basePrice) ?? "—"}</td>
                      <td className="tnum whitespace-nowrap px-3 py-3 text-ink-soft">{qty}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-ink-soft">{formatDate(o.offerValidityDate)}</td>
                      <td className="px-3 py-3">
                        {!o.isActive ? <Pill tone="gray" dot>Taken down</Pill> : expired ? <Pill tone="orange" dot>Expired</Pill> : <Pill tone="green" dot>Live</Pill>}
                      </td>
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <TableDropdown
                          items={[
                            { label: "Open", icon: <Eye size={16} />, action: () => setPreviewId(o.id) },
                            { label: "See on TradelyX", icon: <ExternalLink size={16} />, action: () => window.open(`${WEB_URL}/offers/${o.id}`, "_blank", "noopener") },
                            { label: "This seller's offers", icon: <Store size={16} />, action: () => { setSeller({ id: o.creatorId, name: sellerName }); setPage(1); } },
                            ...(canModerate
                              ? [
                                  o.isActive
                                    ? { label: "Take down", icon: <EyeOff size={16} />, action: () => setTakingDown(o) }
                                    : { label: "Put back", icon: <RotateCcw size={16} />, action: () => setLive(o, true) },
                                  { label: "Edit", icon: <Edit2 size={16} />, action: () => setFormFor({ id: o.id }) },
                                  { label: "Remove", icon: <Trash2 size={16} />, action: () => setDeleting(o), danger: true },
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
            <span className="tnum">{formatNumber(total)} {total === 1 ? "offer" : "offers"}</span>
          </div>
          <Pagination current={page} total={total} pageSize={limit} onChange={setPage} showSizeChanger={false} />
        </div>
      </Card>

      <Modal isOpen={!!previewId} onClose={() => setPreviewId(null)} title="Sell offer" className="!max-w-[860px]">
        {previewId && <SellOfferPreview offerId={previewId} onClose={() => setPreviewId(null)} />}
      </Modal>

      <Modal isOpen={!!formFor} onClose={() => setFormFor(null)} title={formFor?.id ? "Edit sell offer" : "Post an offer for a seller"} className="!max-w-[860px]">
        {formFor && <SellOfferForm id={formFor.id} onClose={() => setFormFor(null)} />}
      </Modal>

      <Confirm
        open={!!takingDown}
        title="Take this offer down?"
        confirmLabel="Take down"
        loading={updating}
        onCancel={() => setTakingDown(null)}
        onConfirm={() => takingDown && setLive(takingDown, false)}
      >
        <strong className="text-ink">{takingDown?.title}</strong> stops showing to buyers. Nothing is deleted, and you can put it back from "Taken down".
      </Confirm>

      <Confirm
        open={!!deleting}
        title="Remove this offer?"
        confirmLabel="Remove offer"
        loading={deletingNow}
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await deleteOffer({ id: deleting.id }).unwrap();
            setDeleting(null);
          } catch {
            // toast says why
          }
        }}
      >
        <strong className="text-ink">{deleting?.title}</strong> is deleted for good. To hide it for now, take it down instead.
      </Confirm>
    </>
  );
}
