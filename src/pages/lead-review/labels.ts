/**
 * Lead review words, the keyboard map and small pure helpers. Kept free of
 * React and the store so the rules are easy to read in one place.
 */

export type RejectReason = "too_small" | "wrong_product" | "not_trader" | "duplicate" | "closed_unreachable" | "other";
export type LeadTab = "unreviewed" | "hidden" | "approved" | "rejected";
export type Country = "NG" | "EG";

/** Fallback when /config hasn't loaded; the order is the 1–6 key order. */
export const REJECT_REASONS: { key: RejectReason; label: string }[] = [
  { key: "too_small", label: "Too small" },
  { key: "wrong_product", label: "Wrong product" },
  { key: "not_trader", label: "Not a trader" },
  { key: "duplicate", label: "Duplicate" },
  { key: "closed_unreachable", label: "Closed / unreachable" },
  { key: "other", label: "Other" },
];

export const reasonLabel = (key: string | null | undefined, list = REJECT_REASONS) => list.find((r) => r.key === key)?.label ?? key ?? "";

export const COUNTRIES: { value: Country; label: string }[] = [
  { value: "NG", label: "Nigeria" },
  { value: "EG", label: "Egypt" },
];
export const countryLabel = (c: string) => COUNTRIES.find((x) => x.value === c)?.label ?? c;

export const SCRAPER_OFF = "Google Maps discovery isn't set up on this server. You can still review existing leads.";

export const TABS: { value: LeadTab; label: string }[] = [
  { value: "unreviewed", label: "Unreviewed" },
  { value: "hidden", label: "Hidden" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

/** The note for "Other" is required (Q3) and capped at 280 characters (server: NOTE_TOO_LONG). */
export const NOTE_MAX = 280;
/** Search phrase and location bounds (server: FIELD_INVALID). */
export const FIELD_MIN = 2;
export const FIELD_MAX = 80;
export const RULE_MAX = 80;
export const THRESHOLD_MAX = 500;

// ---------------------------------------------------------------- keyboard

export type ReviewAction = "buyer" | "seller" | "reject" | "skip" | "undo" | "maps" | "help";

/** Shown under the card and in the help overlay, in this order. */
export const KEY_MAP: { key: string; action: ReviewAction; label: string }[] = [
  { key: "B", action: "buyer", label: "Approve as buyer" },
  { key: "S", action: "seller", label: "Approve as seller" },
  { key: "R", action: "reject", label: "Reject (then 1–6 for the reason)" },
  { key: "N", action: "skip", label: "Skip to the next" },
  { key: "U", action: "undo", label: "Undo the last decision (while its toast shows)" },
  { key: "O", action: "maps", label: "Open on Google Maps" },
  { key: "?", action: "help", label: "Show or hide shortcuts" },
];

export type KeyContext = {
  /** The tab on screen: decisions only work on Unreviewed and Hidden (where only O works otherwise) */
  tab: LeadTab;
  /** A decision request is in flight: no double decisions */
  busy: boolean;
};

export type KeyEventLike = {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  target?: EventTarget | null;
};

/** True when the key press belongs to a text field (G6). */
export const isTypingTarget = (target: EventTarget | null | undefined) => {
  const el = target as (HTMLElement & { isContentEditable?: boolean }) | null | undefined;
  if (!el || typeof el.tagName !== "string") return false;
  const tag = el.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || el.isContentEditable === true || !!el.closest?.("[contenteditable='true'],[contenteditable='']");
};

/**
 * Which action a key press means on the review queue, or null for "not ours".
 * Ignores text fields, Ctrl/Meta/Alt, and decisions while one is in flight or
 * on the Approved/Rejected tabs. Skip only applies to unreviewed leads (the
 * server refuses it for hidden ones).
 */
export const resolveReviewKey = (e: KeyEventLike, ctx: KeyContext): ReviewAction | null => {
  if (e.ctrlKey || e.metaKey || e.altKey) return null;
  if (isTypingTarget(e.target)) return null;
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (k === "?") return "help";
  if (k === "o") return "maps";
  const decidable = ctx.tab === "unreviewed" || ctx.tab === "hidden";
  if (!decidable) return null;
  if (k === "u") return "undo";
  if (ctx.busy) return null;
  if (k === "b") return "buyer";
  if (k === "s") return "seller";
  if (k === "r") return "reject";
  if (k === "n" && ctx.tab === "unreviewed") return "skip";
  return null;
};

/** In the reason picker: 1–6 pick a reason by position; anything else is not a pick. */
export const reasonForKey = (key: string, list = REJECT_REASONS): RejectReason | null => {
  if (!/^[1-9]$/.test(key)) return null;
  return list[Number(key) - 1]?.key ?? null;
};

// ---------------------------------------------------------------- time

/**
 * Milliseconds since `since`, measured on the server's clock: the gap the
 * server saw when it answered (serverNow − since), plus the time that has
 * passed in this browser since the answer arrived. Browser clock drift
 * cancels out because only a local difference is used.
 */
export const elapsedMs = (since: string | null | undefined, serverNow: string, receivedAt: number | undefined, now: number) => {
  if (!since) return null;
  const base = Date.parse(serverNow) - Date.parse(since);
  if (Number.isNaN(base)) return null;
  const local = receivedAt ? Math.max(0, now - receivedAt) : 0;
  return Math.max(0, base + local);
};

export const formatElapsed = (ms: number | null) => {
  if (ms == null) return "";
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
};

// ---------------------------------------------------------------- lead fields

/** "2348031234567" → "+234 803 123 4567"; "201012345678" → "+20 101 234 5678"; anything else as given. */
export const formatPhone = (digits: string | null) => {
  if (!digits) return null;
  const d = digits.replace(/\D/g, "");
  if (d.startsWith("234") && d.length === 13) return `+234 ${d.slice(3, 6)} ${d.slice(6, 9)} ${d.slice(9)}`;
  if (d.startsWith("20") && d.length === 12) return `+20 ${d.slice(2, 5)} ${d.slice(5, 8)} ${d.slice(8)}`;
  return d.length > 6 ? `+${d}` : digits;
};

/** A link we are willing to render: http(s) only (the server already filters; this is belt and braces). */
export const safeHttpUrl = (url: string | null | undefined) => {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
};

/** Google Maps links only, for "Open on Google Maps". */
export const safeMapsUrl = (url: string | null | undefined) => {
  const safe = safeHttpUrl(url);
  if (!safe) return null;
  const host = new URL(safe).hostname;
  // google.com, google.com.ng, google.co.uk, google.ng (and their subdomains); nothing after the TLD
  return /^([a-z0-9-]+\.)*google\.(com|com\.[a-z]{2}|co\.[a-z]{2}|[a-z]{2})$/.test(host) || host === "maps.app.goo.gl" ? safe : null;
};

export const websiteLabel = (url: string) => url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
