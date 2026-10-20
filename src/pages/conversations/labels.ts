import type { Tone } from "@/common/ui/kit";

/** Same reasons as the web's report dialog (chatSafety.reason.*). */
export const REASON_LABEL: Record<string, string> = {
  scam_fraud: "Scam or fraud",
  pay_outside: "Asked to pay outside TradelyX",
  abuse_harassment: "Abusive or harassing",
  spam: "Spam",
  other: "Something else",
};

/** The off-platform contact rules a message can be flagged for at send time. */
export const FLAG_LABEL: Record<string, string> = {
  phone: "Phone number",
  email: "Email address",
  link: "Link",
  contact_words: "Contact app words (WhatsApp, Telegram…)",
};

export const BASIS_LABEL: Record<string, { label: string; tone: Tone }> = {
  dispute: { label: "Dispute", tone: "blue" },
  report: { label: "Report", tone: "red" },
  flag: { label: "Flag", tone: "orange" },
};

export const OUTCOME_LABEL: Record<string, string> = {
  not_a_concern: "Not a concern",
  concern_noted: "Concern noted",
};

export const OUTCOME_HINT: Record<string, string> = {
  not_a_concern: "Nothing wrong, for example a legitimate business number.",
  concern_noted: "Something worth remembering if this pair comes up again.",
};

export const REVIEW_NOTE_MAX = 1000;

export const reasonLabel = (r: string) => REASON_LABEL[r] ?? r;
export const flagLabel = (f: string) => FLAG_LABEL[f] ?? f;
export const outcomeLabel = (o: string | null | undefined) => (o ? OUTCOME_LABEL[o] ?? o : "—");

/** Characters as the backend counts them (code points), so the counter agrees with its limit. */
export const charCount = (s: string) => [...s].length;

/** The viewer's time zone, e.g. "Africa/Lagos", shown next to times. */
export const timeZoneName = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "local time";
  } catch {
    return "local time";
  }
};

/** A date and time in the viewer's time zone, with the zone's short name (e.g. "14 Oct 2026, 09:12 WAT"). */
export const localTime = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "short" });
};

/** Thread route for a pair; the backend accepts the two ids in either order. */
export const threadPath = (userA: string, userB: string) => `/conversations/${encodeURIComponent(userA)}/${encodeURIComponent(userB)}`;
