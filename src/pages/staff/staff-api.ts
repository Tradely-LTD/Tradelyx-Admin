import { baseApi } from "@/store/baseApi";
import { Methods } from "@/utils/enums";

/**
 * Admin-panel sections (TradelyBackend services/staffPermissions). null = full
 * access to the six legacy sections only. Opt-in sections ("conversations")
 * are never part of full access: they count only when listed by name.
 */
export type LegacySection = "people" | "catalog" | "finance" | "growth" | "staff" | "view";
export type OptInSection = "conversations";
export type Section = LegacySection | OptInSection;
export type Access = Section[] | null;

export const SECTIONS: { key: LegacySection; label: string; detail: string }[] = [
  { key: "people", label: "People", detail: "Users, KYC review and certificates. Sees ID documents." },
  { key: "catalog", label: "Marketplace", detail: "Products, sell offers and buyer requests" },
  { key: "finance", label: "Finance", detail: "Escrow refunds, dispute decisions, agent commissions and payouts" },
  { key: "growth", label: "Growth", detail: "Prospects, outreach, push notifications, direct email, agents and referrals" },
  { key: "staff", label: "Staff", detail: "Add staff and change what they can do" },
  { key: "view", label: "View only", detail: "Open every other section to look, change nothing. Not KYC documents or staff." },
];

/**
 * Granted one person at a time, by name, and only while the backend offers
 * the section (GET /staff `sections`). Never in a preset, never implied by
 * full access, never for country admins or view-only staff.
 */
export const OPT_IN_SECTIONS: { key: OptInSection; label: string; detail: string }[] = [
  {
    key: "conversations",
    label: "Conversation review",
    detail: "Open buyer–seller conversations that are reported, flagged or in a dispute. Read-only; every view is logged.",
  },
];

const isOptIn = (s: Section) => OPT_IN_SECTIONS.some((o) => o.key === s);

/** Ready-made sets for the common jobs (legacy sections only, by design) */
export const PRESETS: { label: string; access: Access }[] = [
  { label: "Full access", access: null },
  { label: "Operations", access: ["people", "catalog"] },
  { label: "Finance", access: ["finance"] },
  { label: "Marketing & prospects", access: ["growth"] },
  { label: "Support (view only)", access: ["view"] },
  { label: "No access", access: [] },
];

/**
 * Full access (null) and "still loading" (undefined) pass the legacy sections
 * only: an opt-in section has to be listed by name, as the backend requires.
 */
export const can = (access: Access | undefined, ...sections: Section[]) =>
  access === undefined || access === null ? sections.some((s) => !isOptIn(s)) : sections.some((s) => access.includes(s));

/** May open buyer–seller conversations: an admin with "conversations" by name, not view-only. Mirrors the backend. */
export const canReviewConversations = (role: string | null | undefined, access: Access | undefined) =>
  role === "admin" && Array.isArray(access) && access.includes("conversations") && !access.includes("view");

const LEGACY_KEYS = (): LegacySection[] => SECTIONS.map((s) => s.key);

/**
 * The same collapse the backend does: exactly the six legacy sections and
 * nothing opt-in is full access (null). With an opt-in section the list stays
 * explicit, because null would drop it.
 */
export const normalizeAccess = (sections: Section[]): Access => {
  const unique = [...new Set(sections)];
  const legacy = LEGACY_KEYS();
  return unique.length === legacy.length && legacy.every((k) => unique.includes(k)) ? null : unique;
};

/**
 * Tick or untick one section in the staff drawer.
 * - Full access (null) is first expanded to the six legacy sections.
 * - Ticking Conversation review from full access keeps everything but
 *   View only (the two can't be combined) and adds it by name.
 * - Ticking View only drops Conversation review, and vice versa.
 */
export const toggleSection = (access: Access, key: Section): Access => {
  const current: Section[] = access === null ? LEGACY_KEYS() : access;
  if (current.includes(key)) return normalizeAccess(current.filter((k) => k !== key));
  if (key === "conversations") return normalizeAccess([...current.filter((k) => k !== "view"), "conversations"]);
  if (key === "view") return normalizeAccess([...current.filter((k) => k !== "conversations"), "view"]);
  return normalizeAccess([...current, key]);
};

/** What a staff member's access is called in the list */
export const accessLabel = (access: Access) => {
  if (access === null) return "Full access";
  if (!access.length) return "No access";
  return [...SECTIONS, ...OPT_IN_SECTIONS].filter((s) => access.includes(s.key)).map((s) => s.label).join(", ");
};

/** Can open the page at all: their section, or view-only for anything not sensitive (never an opt-in section) */
export const canSee = (access: Access | undefined, section: Section, sensitive = false) =>
  can(access, section) || (!sensitive && !isOptIn(section) && !!access?.includes("view"));

export type StaffMember = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  role: "admin" | "country_admin";
  staffPermissions: Access;
  operatingCountry: string | null;
  lastActiveAt: string | null;
};

export const staffApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /** The signed-in person's own sections, to shape the menu */
    getMyAccess: builder.query<Access, void>({
      query: () => ({ url: "/role" }),
      transformResponse: (r: { data?: { staffPermissions?: Access } }) => r?.data?.staffPermissions ?? null,
      providesTags: ["STAFF"],
    }),
    /** The staff list, and the sections that can be granted right now (opt-in ones only while their feature is on) */
    getStaff: builder.query<{ staff: StaffMember[]; sections: string[] }, void>({
      query: () => ({ url: "/staff" }),
      transformResponse: (r: { data: StaffMember[]; sections?: string[] }) => ({ staff: r.data, sections: r.sections ?? [] }),
      providesTags: ["STAFF"],
    }),
    /** Existing non-staff accounts matching a name, email or phone */
    searchCandidates: builder.query<Candidate[], string>({
      query: (q) => ({ url: "/staff/candidates", params: { q } }),
      transformResponse: (r: { data: Candidate[] }) => r.data,
    }),
    addStaff: builder.mutation<{ data: StaffMember }, { userId: string; role: string; permissions: Access }>({
      query: (body) => ({ url: "/staff", method: Methods.Post, body }),
      invalidatesTags: ["STAFF", "ACTIVITY"],
    }),
    updateStaff: builder.mutation<{ data: StaffMember }, { id: string; role: string; permissions: Access }>({
      query: ({ id, ...body }) => ({ url: `/staff/${id}`, method: Methods.Put, body }),
      invalidatesTags: ["STAFF", "ACTIVITY"],
    }),
  }),
});

export type Candidate = { id: string; firstName: string | null; lastName: string | null; email: string; phone: string | null; role: string | null };

export const { useGetMyAccessQuery, useGetStaffQuery, useAddStaffMutation, useUpdateStaffMutation, useSearchCandidatesQuery } = staffApi;
