import type { Tone } from "@/common/ui/kit";
import type { AttentionReason, OrderStage } from "./orders-api";

export const STAGE: Record<OrderStage, { label: string; tone: Tone }> = {
  awaiting_payment: { label: "Awaiting payment", tone: "gray" },
  paid: { label: "Paid", tone: "blue" },
  dispatched: { label: "Dispatched", tone: "blue" },
  delivered: { label: "Delivered", tone: "orange" },
  released: { label: "Released", tone: "green" },
  disputed: { label: "Disputed", tone: "red" },
  refunding: { label: "Refunding", tone: "orange" },
  refunded: { label: "Refunded", tone: "gray" },
  cancelled: { label: "Cancelled", tone: "gray" },
};

export const ATTENTION: Record<AttentionReason, string> = {
  not_dispatched: "Not dispatched 3+ days after payment",
  inspection_overdue: "Inspection over, not released",
  disputed: "Disputed",
};

export const EVENT: Record<string, string> = {
  placed: "Order placed",
  dispatched: "Marked dispatched",
  tracking_updated: "Tracking updated",
  delivered: "Marked delivered",
  released: "Payment released",
  cancelled: "Cancelled",
  refunded: "Refunded",
  reminder_dispatch: "Seller reminded to dispatch",
  reminder_release: "Buyer reminded to release or dispute",
};

export const money = (amount: number | null, currency: string | null) => {
  if (amount === null) return "—";
  try {
    return new Intl.NumberFormat("en-NG", { style: "currency", currency: currency || "NGN", maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${currency ?? ""} ${amount.toLocaleString()}`.trim();
  }
};
