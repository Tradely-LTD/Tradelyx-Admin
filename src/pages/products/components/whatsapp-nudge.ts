import type { ChangeRequest, QualityCode, QualityFlag } from "../product-api";

/**
 * The WhatsApp message staff send a seller about one listing, so the chat
 * opens with the issues already written (wa.me ?text=). Uses what staff
 * asked for (an open change request) first, else what the screening found,
 * else a friendly check-in. The fixes match the change-request email
 * (TradelyBackend services/listingQuality/rules.ts), shortened for a chat.
 */

const FIX: Record<QualityCode, string> = {
  contact_details: "Please remove phone numbers, emails and links from the photos and text. Buyers reach you through TradelyX, which keeps both sides protected.",
  screenshot: "Please upload the original photo of the product, not a screenshot.",
  low_quality_photo: "Please use a clear, well-lit photo (daylight and a plain background work best).",
  no_photo: "Please add at least one real photo of the product.",
  image_mismatch: "Please use a photo of the product named in the title.",
  multiple_products: "Please list one product per listing. Create a separate listing for each product.",
  missing_info: "Please complete the description, specification (grade, moisture, purity), minimum order and place of origin.",
  other: "",
};

const WEB_URL = "https://web.tradelyx.com";

export function whatsappNudge(input: {
  firstName?: string | null;
  productId: string;
  title: string;
  request?: ChangeRequest | null;
  flags?: QualityFlag[] | null;
  verified?: boolean;
}) {
  const hello = `Hello${input.firstName ? ` ${input.firstName.trim()}` : ""}, this is the TradelyX team.`;
  const edit = `${WEB_URL}/seller/products/${input.productId}/edit`;
  const pending = input.request && !input.request.resubmittedAt ? input.request : null;
  const codes: QualityCode[] = pending ? pending.reasons : (input.flags ?? []).map((f) => f.code);
  const fixes = [...new Set(codes)].map((c) => FIX[c]).filter(Boolean);
  const note = pending?.note?.trim();

  if (!fixes.length && !note) {
    return [
      hello,
      "",
      `Thank you for listing "${input.title}" on TradelyX.${input.verified ? " It's verified and visible to buyers." : " We're reviewing it now."}`,
      "If you need any help with your store, just reply here.",
      "",
      `Your listing: ${edit}`,
    ].join("\n");
  }

  return [
    hello,
    "",
    `We reviewed your listing "${input.title}". A few changes will get it verified and shown to buyers:`,
    "",
    ...fixes.map((f, i) => `${i + 1}. ${f}`),
    ...(note ? ["", `Note from our team: ${note}`] : []),
    "",
    `Edit it here: ${edit}`,
    "(You can also open TradelyX in your browser at web.tradelyx.com with the same email and password as the app.)",
    "",
    "Reply here if you need help. Thank you!",
  ].join("\n");
}

/** wa.me wants digits only, with the country code (Nigerian 0xxx → 234xxx). */
export const whatsappNumber = (phone: string) => phone.replace(/[^\d]/g, "").replace(/^0/, "234");
