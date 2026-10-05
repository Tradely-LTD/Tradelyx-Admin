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
  contactName: string | null;
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

export type ProspectEvent = { id: string; kind: "sent" | "reply" | "note"; channel: string | null; body: string | null; at: string; author: string | null };
export type ProspectDetail = Prospect & { events: ProspectEvent[] };
export type Channel = "instagram" | "whatsapp" | "email";

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
    markContacted: builder.mutation<unknown, { id: string; via: string; message?: string }>({
      query: ({ id, via, message }) => ({ url: `/prospects/${id}/contacted`, method: Methods.Post, body: { via, message } }),
      invalidatesTags: ["PROSPECTS"],
    }),
    getProspect: builder.query<ProspectDetail, string>({
      query: (id) => ({ url: `/prospects/${id}` }),
      transformResponse: (r: { data: ProspectDetail }) => r.data,
      providesTags: ["PROSPECTS"],
    }),
    editProspect: builder.mutation<{ data: ProspectDetail }, { id: string } & Partial<Record<"businessName" | "instagram" | "phone" | "email" | "product" | "location" | "contactName" | "kind", string | null>>>({
      query: ({ id, ...body }) => ({ url: `/prospects/${id}`, method: Methods.Put, body }),
      invalidatesTags: ["PROSPECTS"],
    }),
    addProspectEvent: builder.mutation<{ data: ProspectDetail }, { id: string; kind: "reply" | "note"; body: string; channel?: string | null; contactName?: string | null }>({
      query: ({ id, ...body }) => ({ url: `/prospects/${id}/events`, method: Methods.Post, body }),
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
  useGetProspectQuery,
  useEditProspectMutation,
  useAddProspectEventMutation,
} = prospectsApi;
