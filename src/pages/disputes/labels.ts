import { formatNumber, type Tone } from "@/common/ui/kit";
import type { DisplayState } from "./disputes-api";

/** Same wording as the backend's CATEGORY_LABELS (rules.ts). */
export const CATEGORY_LABELS: Record<string, string> = {
  not_received: "Goods not received",
  not_as_described: "Not as described / quality",
  wrong_quantity: "Wrong quantity",
  damaged: "Damaged",
  late_delivery: "Late delivery",
  buyer_wont_release: "Buyer won't release payment",
  other: "Other",
};

/** Disputes raised from the old app have no category. */
export const categoryLabel = (c: string | null) => (c ? CATEGORY_LABELS[c] ?? c : "No category (old app)");

export const STATE: Record<DisplayState, { label: string; tone: Tone }> = {
  open: { label: "Open", tone: "orange" },
  under_review: { label: "Under review", tone: "blue" },
  decided_processing: { label: "Decided, money moving", tone: "blue" },
  resolved_refunded: { label: "Resolved: Refunded", tone: "green" },
  resolved_released: { label: "Resolved: Released", tone: "green" },
};

export const OUTCOME_LABEL = { refund: "Full refund to buyer", release: "Full release to seller" } as const;

export const ROLE_LABEL: Record<string, string> = { buyer: "Buyer", seller: "Seller", staff: "Staff", system: "System" };

/** Timeline entry kinds (dispute_entries.kind). */
export const ENTRY_LABEL: Record<string, string> = {
  raised: "Raised the dispute",
  response: "Responded",
  note: "Added a note",
  info_request: "Asked both parties for information",
  staff_note: "Staff note",
  review_started: "Started the review",
  decided: "Recorded the decision",
  decision_changed: "Changed the decision",
  refund_started: "Refund handed to support",
  payout_started: "Seller payout started",
  payout_retried: "Retried the seller payout",
  payout_failed: "Seller payout failed",
  money_completed: "Money moved",
  seller_marked_delivered: "Seller marked the order delivered",
  reminder_sent: "Response reminder sent",
};

const HISTORY_LABEL: Record<string, string> = {
  created: "Order created",
  funded: "Buyer paid into escrow",
  delivered: "Seller marked delivered",
  dispute_raised: "Dispute raised",
  refunded: "Escrow refunded",
  cancelled: "Order cancelled",
  dispute_resolved: "Dispute resolved",
};

/** Order history events; refund_* and payout_* carry the row's status. */
export const historyLabel = (event: string) => {
  if (HISTORY_LABEL[event]) return HISTORY_LABEL[event];
  if (event.startsWith("refund_")) return `Refund: ${humanize(event.slice(7))}`;
  if (event.startsWith("payout_")) return `Seller payout: ${humanize(event.slice(7))}`;
  return humanize(event);
};

export const humanize = (s: string | null | undefined) => (s ? s.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()) : "—");

export const money = (currency: string | null, amount: number | null) => {
  if (amount === null || amount === undefined) return "—";
  if (!currency) return formatNumber(amount);
  try {
    return new Intl.NumberFormat("en-NG", { style: "currency", currency, maximumFractionDigits: currency === "NGN" ? 0 : 2 }).format(amount);
  } catch {
    return `${currency} ${formatNumber(amount)}`;
  }
};

/**
 * Staff target: a decision within 5 business days. Amber from day 3, red
 * after day 5; only while the dispute still waits for a decision.
 */
export const ageTone = (businessDaysOpen: number, waiting: boolean): Tone =>
  !waiting ? "gray" : businessDaysOpen > 5 ? "red" : businessDaysOpen >= 3 ? "orange" : "gray";

export const ageText = (n: number) => `${n} business day${n === 1 ? "" : "s"}`;

export const isOpenStatus = (status: string) => status === "open" || status === "under_review";

export const REASON_MIN = 20;
export const REASON_MAX = 2000;
export const NOTE_MAX = 2000;
