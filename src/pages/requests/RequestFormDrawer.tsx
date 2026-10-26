import { useEffect, useMemo, useState } from "react";
import { useDebounce } from "react-use";
import { Search, UserRound, X } from "lucide-react";

import { Btn, Drawer } from "@/common/ui/kit";
import { ProductCategories, Units } from "@/constant";
import { useGetUsersQuery } from "@/pages/user-management/user-api";
import { StaffRequest, useEditStaffRequestMutation, usePostRequestForBuyerMutation } from "./requests-api";

/**
 * Staff help a buyer with their request (roadmap #11, staff part).
 *
 * New: pick the buyer, fill in the request, and it is posted under the
 * buyer's name and goes live straight away, like a product staff list for a
 * seller. Edit: the wording and closing date can change at any time; the
 * quantity, unit, category, delivery and budget only until the first quote,
 * because sellers price against them (the backend enforces the same). The
 * buyer is notified either way.
 */

type RfqType = "standard" | "domestic" | "international";
const TYPES: { value: RfqType; label: string }[] = [
  { value: "standard", label: "Quick" },
  { value: "domestic", label: "Domestic" },
  { value: "international", label: "Export" },
];
const INCOTERMS = ["EXW", "FCA", "FAS", "FOB", "CFR", "CIF", "CPT", "CIP", "DAP", "DPU", "DDP"];

type Form = {
  rfqType: RfqType;
  title: string;
  productName: string;
  productCategory: string;
  description: string;
  quantityRequired: string;
  unit: string;
  deliveryCountry: string;
  deliveryLocation: string;
  budget: string;
  budgetCurrency: string;
  incoterms: string;
  expiryDate: string;
};

const EMPTY: Form = {
  rfqType: "standard",
  title: "",
  productName: "",
  productCategory: "",
  description: "",
  quantityRequired: "",
  unit: "",
  deliveryCountry: "NG",
  deliveryLocation: "",
  budget: "",
  budgetCurrency: "NGN",
  incoterms: "",
  expiryDate: "",
};

const fromRequest = (r: StaffRequest): Form => ({
  rfqType: (r.type as RfqType) ?? "standard",
  title: r.title ?? "",
  productName: r.productName ?? "",
  productCategory: r.category ?? "",
  description: r.description ?? "",
  quantityRequired: r.quantity ? String(Number(r.quantity)) : "",
  unit: r.unit ?? "",
  deliveryCountry: r.deliveryCountry ?? "",
  deliveryLocation: r.deliveryLocation ?? "",
  budget: r.budget ?? "",
  budgetCurrency: r.budgetCurrency ?? "",
  incoterms: "",
  expiryDate: r.expiryDate ? r.expiryDate.slice(0, 10) : "",
});

/** Fields an edit may only change before the first quote. */
const BEFORE_QUOTES: (keyof Form)[] = ["quantityRequired", "unit", "productCategory", "deliveryLocation", "deliveryCountry", "budget", "budgetCurrency"];

type Buyer = { id: string; name: string; email: string };

export default function RequestFormDrawer({ open, request, onClose }: { open: boolean; request: StaffRequest | null; onClose: () => void }) {
  const editing = !!request;
  const [form, setForm] = useState<Form>(EMPTY);
  const [buyer, setBuyer] = useState<Buyer | null>(null);
  const [postForBuyer, { isLoading: posting }] = usePostRequestForBuyerMutation();
  const [editRequest, { isLoading: saving }] = useEditStaffRequestMutation();

  // A fresh form for every request (or new post) the drawer opens on
  useEffect(() => {
    if (!open) return;
    setForm(request ? fromRequest(request) : EMPTY);
    setBuyer(null);
  }, [open, request]);

  const set = (key: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const quoted = editing && (request?.quotes ?? 0) > 0;
  const locked = (key: keyof Form) => quoted && BEFORE_QUOTES.includes(key);
  const isExport = form.rfqType === "international";

  const changes = useMemo(() => {
    if (!request) return {};
    const before = fromRequest(request);
    return Object.fromEntries(
      (Object.keys(form) as (keyof Form)[])
        .filter((k) => k !== "rfqType" && k !== "incoterms" && form[k] !== before[k] && !locked(k))
        .map((k) => [k, k === "expiryDate" && form[k] ? new Date(`${form[k]}T23:59:00`).toISOString() : form[k]])
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, request]);

  const canPost = !!buyer && form.title.trim() && form.productCategory && form.description.trim() && form.quantityRequired && form.unit && (!isExport || form.incoterms);
  const canSave = Object.keys(changes).length > 0;

  const submit = async () => {
    try {
      if (editing && request) {
        await editRequest({ id: request.id, changes }).unwrap();
      } else if (buyer) {
        await postForBuyer({
          buyerId: buyer.id,
          schemaVersion: 2,
          rfqType: form.rfqType,
          title: form.title.trim(),
          productName: form.productName.trim() || undefined,
          productCategory: form.productCategory,
          description: form.description.trim(),
          quantityRequired: Number(form.quantityRequired),
          unit: form.unit,
          deliveryCountry: form.deliveryCountry || undefined,
          deliveryLocation: form.deliveryLocation.trim() || undefined,
          budget: form.budget.trim() || undefined,
          budgetCurrency: isExport ? "USD" : form.budgetCurrency || undefined,
          incoterms: isExport ? form.incoterms : undefined,
          expiryDate: form.expiryDate ? new Date(`${form.expiryDate}T23:59:00`).toISOString() : undefined,
        }).unwrap();
      }
      onClose();
    } catch {
      // The mutation toasts the backend's own message; keep the form to fix it
    }
  };

  return (
    <Drawer
      open={open}
      onClose={() => !(posting || saving) && onClose()}
      title={editing ? "Edit request" : "Post a request for a buyer"}
      subtitle={
        editing
          ? `${request?.buyerName || request?.buyerEmail || "The buyer"} is notified of what you change.`
          : "It's posted under the buyer's name and goes live straight away. The buyer is notified."
      }
      footer={
        <div className="flex justify-end gap-2">
          <Btn variant="secondary" onClick={onClose} disabled={posting || saving}>Cancel</Btn>
          <Btn onClick={submit} loading={posting || saving} disabled={editing ? !canSave : !canPost}>
            {editing ? "Save changes" : "Post request"}
          </Btn>
        </div>
      }
    >
      <div className="space-y-4">
        {!editing && <BuyerPicker value={buyer} onChange={setBuyer} />}

        {!editing && (
          <Field label="Type">
            <div className="flex gap-1.5" role="group" aria-label="Request type">
              {TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, rfqType: t.value }))}
                  aria-pressed={form.rfqType === t.value}
                  className={`cursor-pointer rounded-full px-3 py-1.5 text-[12.5px] font-semibold ${
                    form.rfqType === t.value ? "bg-brand-950 text-white" : "bg-white text-ink-soft ring-1 ring-inset ring-rule hover:text-ink"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </Field>
        )}

        <Field label="Title" hint='What they need, e.g. "20 tonnes of hulled sesame"'>
          <input value={form.title} onChange={set("title")} maxLength={255} className={INPUT} />
        </Field>
        <Field label="Product">
          <input value={form.productName} onChange={set("productName")} maxLength={255} placeholder="e.g. Hulled sesame" className={INPUT} />
        </Field>
        <Field label="Description" hint="Grade or variety, packaging, anything a supplier must know (at least 15 characters)">
          <textarea value={form.description} onChange={set("description")} rows={4} maxLength={5000} className={`${INPUT} h-auto py-2`} />
        </Field>

        {quoted && (
          <p className="rounded-lg bg-attention-soft px-3 py-2 text-[12.5px] text-attention-deep">
            Sellers have quoted on this request, so the quantity, category, delivery and budget are locked. For those, close it and post a new one.
          </p>
        )}

        <Field label="Category">
          <select value={form.productCategory} onChange={set("productCategory")} disabled={locked("productCategory")} className={INPUT}>
            <option value="">Choose a category</option>
            {/* Keep an older category the request already has, even if it's no longer in the list */}
            {form.productCategory && !ProductCategories.some((c) => c.value === form.productCategory) && (
              <option value={form.productCategory}>{form.productCategory}</option>
            )}
            {ProductCategories.map((c) => <option key={c.value} value={c.value}>{c.title}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Quantity">
            <input value={form.quantityRequired} onChange={set("quantityRequired")} inputMode="decimal" disabled={locked("quantityRequired")} className={INPUT} />
          </Field>
          <Field label="Unit">
            <select value={form.unit} onChange={set("unit")} disabled={locked("unit")} className={INPUT}>
              <option value="">Unit</option>
              {form.unit && !Units.some((u) => u.value === form.unit) && <option value={form.unit}>{form.unit}</option>}
              {Units.map((u) => <option key={u.value} value={u.value}>{u.title}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Deliver to (country)" hint="Country name or code, e.g. NG">
            <input value={form.deliveryCountry} onChange={set("deliveryCountry")} disabled={locked("deliveryCountry")} className={INPUT} />
          </Field>
          <Field label="Delivery place">
            <input value={form.deliveryLocation} onChange={set("deliveryLocation")} maxLength={255} disabled={locked("deliveryLocation")} placeholder="City or port" className={INPUT} />
          </Field>
        </div>
        {isExport && !editing && (
          <Field label="Incoterm">
            <select value={form.incoterms} onChange={set("incoterms")} className={INPUT}>
              <option value="">Choose an Incoterm</option>
              {INCOTERMS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Budget (optional)">
            <input value={form.budget} onChange={set("budget")} maxLength={50} disabled={locked("budget")} className={INPUT} />
          </Field>
          <Field label="Currency">
            <input
              value={isExport ? "USD" : form.budgetCurrency}
              onChange={set("budgetCurrency")}
              maxLength={3}
              disabled={isExport || locked("budgetCurrency")}
              className={`${INPUT} uppercase`}
            />
          </Field>
        </div>
        <Field label="Closes on (optional)">
          <input type="date" value={form.expiryDate} onChange={set("expiryDate")} className={INPUT} />
        </Field>
      </div>
    </Drawer>
  );
}

const INPUT =
  "h-10 w-full rounded-lg border-0 bg-white px-3 text-[13.5px] text-ink ring-1 ring-inset ring-rule placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-brand-900 disabled:bg-paper-deep disabled:text-ink-faint";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[13px] font-semibold text-ink">{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint && <span className="mt-1 block text-[12px] text-ink-faint">{hint}</span>}
    </label>
  );
}

/** Search buyers by name, email or phone; staff accounts aren't listed. */
function BuyerPicker({ value, onChange }: { value: Buyer | null; onChange: (b: Buyer | null) => void }) {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  useDebounce(() => setDebounced(search.trim()), 300, [search]);
  const { data, isFetching } = useGetUsersQuery({ search: debounced, limit: 8 }, { skip: debounced.length < 2 });

  if (value) {
    return (
      <Field label="Buyer">
        <div className="flex items-center gap-2 rounded-lg bg-paper-deep px-3 py-2">
          <UserRound size={16} className="text-ink-faint" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13.5px] font-semibold text-ink">{value.name}</p>
            <p className="truncate text-[12px] text-ink-faint">{value.email}</p>
          </div>
          <button type="button" onClick={() => onChange(null)} aria-label="Choose another buyer" className="cursor-pointer text-ink-faint hover:text-ink">
            <X size={16} />
          </button>
        </div>
      </Field>
    );
  }
  return (
    <Field label="Buyer" hint="Type at least 2 letters of their name, email or phone">
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search buyers" className={`${INPUT} pl-9`} />
      </div>
      {debounced.length >= 2 && (
        <ul className="mt-1.5 max-h-56 overflow-auto rounded-lg ring-1 ring-inset ring-rule">
          {isFetching ? (
            <li className="px-3 py-2 text-[12.5px] text-ink-faint">Searching…</li>
          ) : !data?.data.length ? (
            <li className="px-3 py-2 text-[12.5px] text-ink-faint">No one matches</li>
          ) : (
            data.data.map((u) => {
              const name = [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email;
              return (
                <li key={u.id}>
                  <button
                    type="button"
                    onClick={() => onChange({ id: u.id, name, email: u.email })}
                    className="flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-2 text-left hover:bg-paper-deep"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[13.5px] font-semibold text-ink">{name}</span>
                      <span className="block truncate text-[12px] text-ink-faint">{[u.email, u.phone].filter(Boolean).join(" · ")}</span>
                    </span>
                    <span className="shrink-0 text-[12px] capitalize text-ink-faint">{u.role ?? ""}</span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      )}
    </Field>
  );
}
