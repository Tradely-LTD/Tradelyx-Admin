import { toast } from "react-toastify";
import { baseApi } from "@/store/baseApi";
import { Methods } from "@/utils/enums";

/**
 * The Agent Program for staff (TradelyBackend modules/agents, admin only):
 * applications, agents, their people and commission, and payouts.
 */
export type AgentStatus = "applied" | "approved" | "suspended" | "rejected";
export type Balances = Record<string, { holding: number; payable: number; paid: number }>;

export interface AgentRow {
  id: string;
  status: AgentStatus;
  region: string | null;
  pitch: string | null;
  appliedAt: string | null;
  approvedAt: string | null;
  commissionRate: number | null;
  bankName: string | null;
  accountNumber: string | null;
  accountName: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  kycCompleted: boolean;
  country: string | null;
  people: number;
  sellers: number;
  balances: Balances;
}

export interface AgentPerson {
  id: string;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  isSeller: boolean;
  kycCompleted: boolean;
  listings: number;
  requests: number;
  sales: number;
  joinedAt: string | null;
  expiresAt: string | null;
  source: string;
}

export interface LedgerRow {
  id: string;
  escrowId: string;
  sides: "buyer" | "seller" | "both";
  baseFee: number;
  rate: number;
  amount: number;
  currency: string;
  status: "pending" | "paid" | "reversed";
  availableAt: string;
  paidAt: string | null;
  reversalReason: string | null;
  createdAt: string;
  orderTitle: string | null;
}

export interface AgentDetail extends Omit<AgentRow, "people" | "sellers"> {
  referralCode: string | null;
  link: string | null;
  stats: { sellers: number; buyers: number; sellersListing: number; sellersVerified: number; sales: number; earnedNgn: number };
  achievements: { key: string; title: string; earned: boolean; progress: number; target: number }[];
  people: AgentPerson[];
  ledger: LedgerRow[];
  payouts: { id: string; currency: string; amount: number; reference: string; note: string | null; paidAt: string }[];
}

export interface PayoutDue {
  agentId: string;
  name: string;
  phone: string | null;
  bankName: string | null;
  accountNumber: string | null;
  accountName: string | null;
  currency: string;
  payable: number;
  holding: number;
  meetsMinimum: boolean;
}

export interface Referrer {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  role: string | null;
  kycCompleted: boolean;
  code: string;
  agentStatus: AgentStatus | null;
  signups: number;
  sellers: number;
  recent: number;
  lastSignup: string | null;
}

export interface ReferredPerson {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  isSeller: boolean;
  kycCompleted: boolean;
  joinedAt: string | null;
  sales: number;
}

export interface Terms {
  rate: number;
  windowMonths: number;
  holdDays: number;
  minimumPayout: Record<string, number>;
}

const fail = (err: any, fallback: string) =>
  toast.error(err?.error?.data?.error || err?.error?.data?.message || fallback, { position: "top-right" });

const action = (success: string, fallback: string) =>
  async function onQueryStarted(_: unknown, { queryFulfilled }: { queryFulfilled: Promise<unknown> }) {
    try {
      await queryFulfilled;
      toast.success(success, { position: "top-right" });
    } catch (err) {
      fail(err, fallback);
    }
  };

export const agentsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAgents: builder.query<{ data: AgentRow[]; terms: Terms }, AgentStatus | void>({
      query: (status) => ({ url: "/agents/admin", params: status ? { status } : {} }),
      providesTags: ["AGENTS"],
    }),
    getAgent: builder.query<AgentDetail, string>({
      query: (id) => ({ url: `/agents/admin/${id}` }),
      transformResponse: (r: { data: AgentDetail }) => r.data,
      providesTags: ["AGENTS"],
    }),
    getLeaderboard: builder.query<{ month: string; agents: LeaderRow[] }, string>({
      query: (month) => ({ url: "/agents/admin/leaderboard", params: { month } }),
      transformResponse: (r: { data: { month: string; agents: LeaderRow[] } }) => r.data,
      providesTags: ["AGENTS"],
    }),
    getStatement: builder.query<Statement, { id: string; month: string }>({
      query: ({ id, month }) => ({ url: `/agents/admin/${id}/statement`, params: { month } }),
      transformResponse: (r: { data: Statement }) => r.data,
    }),
    getPayoutsDue: builder.query<{ data: PayoutDue[]; minimums: Record<string, number> }, void>({
      query: () => ({ url: "/agents/admin/payouts/due" }),
      providesTags: ["AGENTS"],
    }),
    approveAgent: builder.mutation<{ data: { referralCode: string; backfilled: number; earning: number } }, string>({
      query: (id) => ({ url: `/agents/admin/${id}/approve`, method: Methods.Post }),
      invalidatesTags: ["AGENTS", "ACTIVITY"],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          const n = data.data.backfilled;
          toast.success(n ? `Done: ${n} people who used their code are now linked to them` : "Done: they can switch to Agent now", { position: "top-right" });
        } catch (err) {
          fail(err, "Could not approve");
        }
      },
    }),
    getReferrers: builder.query<{ data: Referrer[]; windowMonths: number }, void>({
      query: () => ({ url: "/agents/admin/referrers" }),
      providesTags: ["AGENTS"],
    }),
    getReferredPeople: builder.query<ReferredPerson[], string>({
      query: (id) => ({ url: `/agents/admin/referrers/${id}/people` }),
      transformResponse: (r: { data: ReferredPerson[] }) => r.data,
      providesTags: ["AGENTS"],
    }),
    enrollAgent: builder.mutation<{ data: { referralCode: string; backfilled: number; earning: number } }, string>({
      query: (id) => ({ url: `/agents/admin/referrers/${id}/enroll`, method: Methods.Post }),
      invalidatesTags: ["AGENTS", "ACTIVITY"],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          toast.success(`Now an agent: ${data.data.backfilled} people linked, ${data.data.earning} still earning commission`, { position: "top-right" });
        } catch (err) {
          fail(err, "Could not make them an agent");
        }
      },
    }),
    rejectAgent: builder.mutation<unknown, { id: string; reason?: string }>({
      query: ({ id, reason }) => ({ url: `/agents/admin/${id}/reject`, method: Methods.Post, body: { reason } }),
      invalidatesTags: ["AGENTS", "ACTIVITY"],
      onQueryStarted: action("Application declined", "Could not decline"),
    }),
    suspendAgent: builder.mutation<unknown, { id: string; reason?: string }>({
      query: ({ id, reason }) => ({ url: `/agents/admin/${id}/suspend`, method: Methods.Post, body: { reason } }),
      invalidatesTags: ["AGENTS", "ACTIVITY"],
      onQueryStarted: action("Agent paused", "Could not pause"),
    }),
    setAgentRate: builder.mutation<unknown, { id: string; rate: number | null }>({
      query: ({ id, rate }) => ({ url: `/agents/admin/${id}/rate`, method: Methods.Post, body: { rate } }),
      invalidatesTags: ["AGENTS", "ACTIVITY"],
      onQueryStarted: action("Commission rate saved", "Could not save the rate"),
    }),
    linkPerson: builder.mutation<unknown, { id: string; userId: string }>({
      query: ({ id, userId }) => ({ url: `/agents/admin/${id}/attribute`, method: Methods.Post, body: { userId } }),
      invalidatesTags: ["AGENTS", "ACTIVITY"],
      onQueryStarted: action("Linked to the agent", "Could not link"),
    }),
    payAgent: builder.mutation<unknown, { id: string; currency: string; reference: string; note?: string }>({
      query: ({ id, ...body }) => ({ url: `/agents/admin/${id}/payouts`, method: Methods.Post, body }),
      invalidatesTags: ["AGENTS", "ACTIVITY"],
      onQueryStarted: action("Payout recorded", "Could not record the payout"),
    }),
    reverseCommission: builder.mutation<unknown, { id: string; reason: string }>({
      query: ({ id, reason }) => ({ url: `/agents/admin/commissions/${id}/reverse`, method: Methods.Post, body: { reason } }),
      invalidatesTags: ["AGENTS", "ACTIVITY"],
      onQueryStarted: action("Commission reversed", "Could not reverse"),
    }),
  }),
});

export type AgentFlag = { code: "burst" | "inactive" | "lookalike_emails"; detail: string };
export type LeaderRow = { id: string; name: string; peopleMonth: number; peopleTotal: number; activeTotal: number; earnedMonth: number; prospectsMonth: number; flags: AgentFlag[] };
export type Statement = {
  month: string;
  agent: { id: string; name: string; email: string; phone: string | null; referralCode: string | null; bank: string | null; accountName: string | null };
  people: { name: string; role: string | null; joinedAt: string; active: boolean }[];
  commissions: { created_at: string; order_title: string | null; sides: string; base_fee: number; rate: number; amount: number; currency: string; status: string }[];
  payouts: { paid_at: string; amount: number; currency: string; reference: string }[];
  totals: Record<string, { earned: number; reversed: number; paid: number }>;
};

export const {
  useGetLeaderboardQuery,
  useLazyGetStatementQuery,
  useGetAgentsQuery,
  useGetAgentQuery,
  useGetPayoutsDueQuery,
  useApproveAgentMutation,
  useGetReferrersQuery,
  useGetReferredPeopleQuery,
  useEnrollAgentMutation,
  useRejectAgentMutation,
  useSuspendAgentMutation,
  useSetAgentRateMutation,
  useLinkPersonMutation,
  usePayAgentMutation,
  useReverseCommissionMutation,
} = agentsApi;
