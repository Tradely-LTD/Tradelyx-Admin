import { toast } from "react-toastify";
import type { FieldErrors } from "react-hook-form";

/**
 * react-hook-form's "the form didn't pass validation" handler.
 *
 * The older admin forms show errors only under some fields; an error on a
 * nested or unrendered field (a select's { label, value }, supply capacity's
 * value) blocked the save with nothing on screen, so Edit looked broken.
 * This names every field that stopped it.
 */
const LABELS: Record<string, string> = {
  creatorId: "Seller",
  packaging_type: "Packaging",
  packageType: "Packaging",
  supply_capacity: "Supply capacity",
  minimum_order: "Minimum order",
  productCategory: "Category",
  paymentType: "Payment type",
  basePrice: "Price",
  quantityAndUnit: "Quantity",
  originLocation: "Origin",
};

const flatten = (errors: FieldErrors, prefix = ""): string[] =>
  Object.entries(errors ?? {}).flatMap(([key, value]: [string, any]) => {
    if (!value) return [];
    const name = LABELS[key] ?? (prefix ? `${prefix} ${key}` : key.replace(/([A-Z_])/g, " $1").replace(/_/g, "").trim());
    if (typeof value.message === "string" && value.message) return [`${LABELS[key] ?? name}: ${value.message}`];
    return typeof value === "object" ? flatten(value as FieldErrors, LABELS[key] ?? name) : [];
  });

export function reportInvalid(errors: FieldErrors) {
  const problems = flatten(errors);
  toast.error(problems.length ? `Can't save yet. ${problems.slice(0, 3).join("; ")}` : "Can't save yet: check the form", { position: "top-right" });
  console.warn("Form not valid:", errors);
}
