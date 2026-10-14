import { useState } from "react";
import { Calendar, ExternalLink, EyeOff, MapPin, Package, RotateCcw, Wallet } from "lucide-react";

import { Btn, Modal, Pill, Skeleton, formatDate, formatNumber } from "@/common/ui/kit";
import { useGetSellofferQuery, useUpdateSellOfferMutation } from "./sell-offer-api";

/**
 * One sell offer as the backend has it (GET /sell-offer/:id), and the one
 * thing staff do from here: take it down or put it back. That sends only
 * isActive to the staff route: sending the whole offer back used to rewrite
 * fields nobody touched (the ship-from place, now plain text "City, Country",
 * came back as an object) and logged a take-down as an edit.
 */

const WEB = "https://web.tradelyx.com";

type Offer = {
  id: string;
  title: string;
  productTitle?: string | null;
  productCategory?: string | null;
  detailedDescription?: string | null;
  tags?: string[] | null;
  companyName?: string | null;
  companyLogo?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  quantityAndUnit?: { quantity?: string; unit?: string } | null;
  basePrice?: { amount?: string | number; currency?: string } | null;
  packageType?: string | null;
  packageDescription?: string | null;
  paymentType?: string | null;
  offerValidityDate?: string | null;
  originLocation?: string | { city?: string; state?: string; country?: string } | null;
  landMark?: string | null;
  isDomestic?: boolean | null;
  isActive?: boolean | null;
  productImages?: string[] | null;
  thumbnail?: string | null;
  createdAt?: string | null;
};

const place = (o: Offer["originLocation"]) =>
  !o ? null : typeof o === "string" ? o : [o.city, o.state, o.country].filter(Boolean).join(", ") || null;

const price = (p: Offer["basePrice"]) => {
  if (!p?.amount) return null;
  const n = Number(p.amount);
  return `${p.currency ?? ""}${Number.isFinite(n) ? formatNumber(n) : p.amount}`;
};

export default function SellOfferPreview({ offerId, onClose }: { offerId: string; onClose: () => void }) {
  const { data, isLoading, isError } = useGetSellofferQuery({ id: offerId });
  const [update, { isLoading: saving }] = useUpdateSellOfferMutation();
  const offer = data?.data as Offer | undefined;
  const images = [offer?.thumbnail, ...(offer?.productImages ?? [])].filter((x, i, all): x is string => !!x && all.indexOf(x) === i);
  const [shown, setShown] = useState(0);
  const expired = offer?.offerValidityDate ? new Date(offer.offerValidityDate) < new Date() : false;
  const seller = [offer?.firstName, offer?.lastName].filter(Boolean).join(" ");

  const toggle = () =>
    update({ id: offerId, data: { isActive: !offer?.isActive } })
      .unwrap()
      .then(onClose)
      .catch(() => undefined);

  return (
    <Modal
      open
      onClose={onClose}
      width="max-w-4xl"
      title={offer?.title ?? "Sell offer"}
      subtitle={offer ? [offer.productCategory, offer.companyName].filter(Boolean).join(" · ") : undefined}
      footer={
        offer && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <a href={`${WEB}/offers/${offerId}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[13px] font-semibold text-brand-900 hover:underline">
              See it on TradelyX <ExternalLink size={12} />
            </a>
            <div className="flex gap-2">
              <Btn variant="secondary" size="sm" onClick={onClose}>Close</Btn>
              {offer.isActive ? (
                <Btn variant="danger" size="sm" icon={<EyeOff size={14} />} loading={saving} onClick={toggle}>Take down</Btn>
              ) : (
                <Btn size="sm" icon={<RotateCcw size={14} />} loading={saving} onClick={toggle}>Put back up</Btn>
              )}
            </div>
          </div>
        )
      }
    >
      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="aspect-square" />
          <div className="space-y-3">
            <Skeleton className="h-8" />
            <Skeleton className="h-24" />
            <Skeleton className="h-32" />
          </div>
        </div>
      ) : isError || !offer ? (
        <p className="py-10 text-center text-[14px] text-ink-soft">Couldn't load this sell offer.</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="min-w-0">
            {images.length ? (
              <>
                <a href={images[shown]} target="_blank" rel="noopener noreferrer" className="block aspect-square overflow-hidden rounded-xl bg-paper ring-1 ring-rule">
                  <img src={images[shown]} alt={offer.title} className="h-full w-full object-cover" />
                </a>
                {images.length > 1 && (
                  <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                    {images.map((src, i) => (
                      <button
                        key={src}
                        type="button"
                        onClick={() => setShown(i)}
                        aria-label={`Photo ${i + 1}`}
                        className={`h-14 w-14 shrink-0 cursor-pointer overflow-hidden rounded-lg ring-2 ${i === shown ? "ring-brand-900" : "ring-transparent opacity-70 hover:opacity-100"}`}
                      >
                        <img src={src} alt="" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="grid aspect-square place-items-center rounded-xl bg-paper text-[13px] text-ink-faint ring-1 ring-rule">No photos</div>
            )}
          </div>

          <div className="min-w-0 space-y-5">
            <div className="flex flex-wrap gap-1.5">
              <Pill tone={offer.isActive ? "green" : "gray"} dot>{offer.isActive ? "Live" : "Taken down"}</Pill>
              {expired && <Pill tone="orange">Validity date passed</Pill>}
              <Pill tone="gray">{offer.isDomestic ? "Domestic" : "Export"}</Pill>
            </div>

            <dl className="grid grid-cols-2 gap-x-5 gap-y-4">
              <Fact icon={Wallet} label="Price" value={price(offer.basePrice) ?? "On request"} />
              <Fact icon={Package} label="Quantity" value={[offer.quantityAndUnit?.quantity, offer.quantityAndUnit?.unit].filter(Boolean).join(" ") || "—"} />
              <Fact icon={MapPin} label="Ships from" value={place(offer.originLocation) ?? "—"} />
              <Fact icon={Calendar} label="Valid until" value={formatDate(offer.offerValidityDate)} />
              <Fact icon={Package} label="Packaging" value={[offer.packageType, offer.packageDescription].filter(Boolean).join(": ") || "—"} />
              <Fact icon={Wallet} label="Payment" value={offer.paymentType || "—"} />
            </dl>
            {offer.landMark && <p className="text-[12.5px] text-ink-soft">Landmark: {offer.landMark}</p>}

            {offer.detailedDescription && (
              <div>
                <p className="mb-1.5 text-[11.5px] text-ink-faint">Description</p>
                <p className="whitespace-pre-line rounded-xl bg-paper px-4 py-3 text-[13.5px] leading-relaxed text-ink-soft">{offer.detailedDescription}</p>
              </div>
            )}

            {!!offer.tags?.length && (
              <div className="flex flex-wrap gap-1.5">
                {offer.tags.map((t) => (
                  <span key={t} className="rounded-full bg-paper-deep px-2.5 py-0.5 text-[12px] font-medium text-ink-soft">{t}</span>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3 rounded-xl px-4 py-3 ring-1 ring-rule">
              {offer.companyLogo ? (
                <img src={offer.companyLogo} alt="" className="h-10 w-10 rounded-lg object-cover" />
              ) : (
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-brand-50 text-sm font-bold text-brand-950">{(offer.companyName || seller || "?").charAt(0)}</div>
              )}
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-semibold text-ink">{offer.companyName || "Seller"}</p>
                <p className="truncate text-[12px] text-ink-soft">{[seller, offer.createdAt && `posted ${formatDate(offer.createdAt)}`].filter(Boolean).join(" · ")}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

function Fact({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon size={15} className="mt-0.5 shrink-0 text-ink-faint" />
      <div className="min-w-0">
        <dt className="text-[11.5px] text-ink-faint">{label}</dt>
        <dd className="break-words text-[13.5px] font-medium text-ink">{value}</dd>
      </div>
    </div>
  );
}
