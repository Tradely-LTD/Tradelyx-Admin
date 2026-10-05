import type { Prospect } from "./prospects-api";

/**
 * The first message to a prospect, per channel and per kind (seller/buyer).
 * Short, personal, one link. The link carries the assignee's referral code
 * when they have one, so an agent is credited when the business signs up.
 */

const WEB = "https://web.tradelyx.com";

export const signupLink = (p: Prospect, channel: "instagram" | "whatsapp") => {
  const params = new URLSearchParams({ utm_source: channel, utm_medium: "dm", utm_campaign: "prospects" });
  if (p.assigneeReferralCode) params.set("ref", p.assigneeReferralCode);
  params.set("role", p.kind);
  return `${WEB}/register?${params.toString()}`;
};

const what = (p: Prospect) => p.product?.trim() || (p.kind === "seller" ? "your products" : "what you source");

export function firstMessage(p: Prospect, channel: "instagram" | "whatsapp") {
  const link = signupLink(p, channel);
  const name = p.businessName.replace(/^@/, "");
  if (p.kind === "buyer") {
    return [
      `Hello ${name}, I'm with TradelyX, a marketplace where businesses buy agro commodities from verified African suppliers.`,
      "",
      `If you're sourcing ${what(p)}, you can post what you need once and get quotes from verified suppliers. Payment goes through escrow, so the supplier is paid only when you confirm delivery.`,
      "",
      `It's free to join: ${link}`,
      "",
      "Happy to help you post your first request.",
    ].join("\n");
  }
  return [
    `Hello ${name}, I came across your page and ${p.product?.trim() ? `your ${p.product.trim()} caught my eye` : "liked what you sell"}.`,
    "",
    "I'm with TradelyX, a marketplace where verified buyers in Nigeria and abroad post what they need and suppliers send quotes. Payment goes through escrow, so you're paid safely.",
    "",
    `Listing your products is free: ${link}`,
    "",
    "Can I help you set up your store?",
  ].join("\n");
}

/** wa.me wants digits only, with the country code */
export const waNumber = (phone: string) => phone.replace(/\D/g, "").replace(/^0/, "234");
