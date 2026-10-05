import { baseApi } from "@/store/baseApi";
import { Methods } from "@/utils/enums";

/** Admin-panel sections (TradelyBackend services/staffPermissions). null = full access. */
export type Section = "people" | "catalog" | "finance" | "growth" | "staff" | "view";
export type Access = Section[] | null;

export const SECTIONS: { key: Section; label: string; detail: string }[] = [
  { key: "people", label: "People", detail: "Users, KYC review and certificates. Sees ID documents." },
  { key: "catalog", label: "Marketplace", detail: "Products, sell offers and buyer requests" },
  { key: "finance", label: "Finance", detail: "Escrow refunds, agent commissions and payouts" },
  { key: "growth", label: "Growth", detail: "Prospects, outreach, push notifications, direct email, agents and referrals" },
  { key: "staff", label: "Staff", detail: "Add staff and change what they can do" },
  { key: "view", label: "View only", detail: "Open every other section to look, change nothing. Not KYC documents or staff." },
];

/** Ready-made sets for the common jobs */
export const PRESETS: { label: string; access: Access }[] = [
  { label: "Full access", access: null },
  { label: "Operations", access: ["people", "catalog"] },
  { label: "Finance", access: ["finance"] },
  { label: "Marketing & prospects", access: ["growth"] },
  { label: "Support (view only)", access: ["view"] },
  { label: "No access", access: [] },
];

export const can = (access: Access | undefined, ...sections: Section[]) =>
  access === undefined || access === null || sections.some((s) => access.includes(s));

/** Can open the page at all: their section, or view-only for anything not sensitive */
export const canSee = (access: Access | undefined, section: Section, sensitive = false) =>
  can(access, section) || (!sensitive && !!access?.includes("view"));

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
    getStaff: builder.query<StaffMember[], void>({
      query: () => ({ url: "/staff" }),
      transformResponse: (r: { data: StaffMember[] }) => r.data,
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
