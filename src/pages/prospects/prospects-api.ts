import { baseApi } from "@/store/baseApi";
import { Methods } from "@/utils/enums";

export type ProspectStatus = "new" | "contacted" | "replied" | "signed_up" | "not_interested" | "already_user";

export type Prospect = {
  id: string;
  businessName: string;
  instagram: string | null;
  phone: string | null;
  email: string | null;
  product: string | null;
  location: string | null;
  kind: "seller" | "buyer";
  source: string;
  notes: string | null;
  status: ProspectStatus;
  assignedTo: string | null;
  assigneeName: string | null;
  assigneeRole: string | null;
  assigneeReferralCode: string | null;
  contactedAt: string | null;
  contactedVia: string | null;
  signedUpAt: string | null;
  createdAt: string;
};

export type Assignee = { id: string; name: string; role: string; referralCode: string | null };
export type ProspectStats = {
  byStatus: Partial<Record<ProspectStatus, number>>;
  byAssignee: { id: string | null; name: string; total: number; contacted: number; signed_up: number }[];
};
export type ImportRow = { businessName?: string; instagram?: string; phone?: string; email?: string; product?: string; location?: string; kind?: string };
export type ImportResult = { added: number; duplicates: number; alreadyUsers: number; skipped: { row: number; reason: string }[] };

export const prospectsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getProspects: builder.query<{ data: Prospect[]; pagination: { total: number; currentPage: number; totalPages: number } }, { page: number; limit: number; status?: string; search?: string; assignee?: string }>({
      query: (params) => ({ url: "/prospects", params }),
      providesTags: ["PROSPECTS"],
    }),
    getProspectStats: builder.query<ProspectStats, void>({
      query: () => ({ url: "/prospects/stats" }),
      transformResponse: (r: { data: ProspectStats }) => r.data,
      providesTags: ["PROSPECTS"],
    }),
    getAssignees: builder.query<Assignee[], void>({
      query: () => ({ url: "/prospects/assignees" }),
      transformResponse: (r: { data: Assignee[] }) => r.data,
    }),
    importProspects: builder.mutation<{ data: ImportResult }, { rows: ImportRow[]; assignedTo?: string | null }>({
      query: (body) => ({ url: "/prospects/import", method: Methods.Post, body }),
      invalidatesTags: ["PROSPECTS", "ACTIVITY"],
    }),
    updateProspect: builder.mutation<unknown, { id: string; status?: string; notes?: string | null; assignedTo?: string | null }>({
      query: ({ id, ...body }) => ({ url: `/prospects/${id}`, method: "PATCH", body }),
      invalidatesTags: ["PROSPECTS"],
    }),
    markContacted: builder.mutation<unknown, { id: string; via: string }>({
      query: ({ id, via }) => ({ url: `/prospects/${id}/contacted`, method: Methods.Post, body: { via } }),
      invalidatesTags: ["PROSPECTS"],
    }),
    assignProspects: builder.mutation<unknown, { ids: string[]; assignedTo: string | null }>({
      query: (body) => ({ url: "/prospects/assign", method: Methods.Post, body }),
      invalidatesTags: ["PROSPECTS"],
    }),
  }),
});

export const {
  useGetProspectsQuery,
  useGetProspectStatsQuery,
  useGetAssigneesQuery,
  useImportProspectsMutation,
  useUpdateProspectMutation,
  useMarkContactedMutation,
  useAssignProspectsMutation,
} = prospectsApi;
