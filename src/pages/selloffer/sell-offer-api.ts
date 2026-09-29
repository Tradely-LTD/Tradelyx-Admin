import { toast } from "react-toastify";
import { baseApi } from "@/store/baseApi";
import { Methods } from "@/utils/enums";

// Interface for query parameters
interface SellOfferQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  /** active (on and within its date), inactive (taken down), expired */
  status?: string;
  sellerId?: string;
}

type Money = { currency?: string; amount?: number | string } | null;

/** GET /sell-offer/:id answers { data, success }; the form and preview read `data`. */
export type SellOfferDetail = Record<string, any>;
interface SellOfferDetailResponse {
  message: string;
  data: SellOfferDetail;
}

export interface SellOfferStats {
  totalOffers: number;
  activeOffers: number;
  inactiveOffers: number;
  recentOffers: number;
}

// Interface for the response data
export interface SellOffers {
  basePrice?: Money;
  quantityAndUnit?: { quantity?: number | string; unit?: string } | null;
  offerValidityDate?: string | null;
  originLocation?: { country?: string; state?: string; city?: string } | null;
  productImages?: string[] | null;
  sellerFirstName?: string | null;
  sellerLastName?: string | null;
  sellerVerified?: boolean | null;
  creatorCountry?: string | null;
  id: string;
  title: string;
  productCategory: string;
  detailedDescription: string;
  thumbnail: string | null;
  isActive: boolean;
  status: boolean;
  createdAt: string;
  creatorId: string;
  createdById: string;
  companyName: string | null;
  packageType: string;
}
interface GetSelloffersResponse {
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  data: SellOffers[];
  success: boolean;
}

export const sellOfferApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    createSellOffer: builder.mutation({
      query: (data) => ({
        url: "/sell-offer",
        method: Methods.Post,
        body: data,
      }),
      invalidatesTags: ["SELLOFFER", "ACTIVITY"],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await queryFulfilled;
          toast.success("Product Created Successfully", {
            position: "top-right",
          });
        } catch (err: any) {
          const errorMessage = err?.error?.data?.error || err?.error?.data?.message || "Failed to create product";
          toast.error(errorMessage, {
            position: "top-right",
          });
        }
      },
    }),

    updateSellOffer: builder.mutation<SellOfferDetailResponse, { id: string; data: Record<string, unknown> }>({
      query: ({ id, data }) => ({
        // Staff edit route: the sell-offers/:id route is the seller's repost and
        // applies only date, price, quantity and on/off
        url: `/sell-offer/admin/${id}`,
        method: "put",
        body: data,
      }),
      invalidatesTags: ["SELLOFFER", "ACTIVITY"],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await queryFulfilled;
          toast.success("Selloffer Updated Successfully", {
            position: "top-right",
          });
        } catch (err: any) {
          const errorMessage = err?.error?.data?.error || err?.error?.data?.message || "Failed to update the offer";
          toast.error(errorMessage, {
            position: "top-right",
          });
        }
      },
    }),

    getSelloffer: builder.query<SellOfferDetailResponse, { id: string }>({
      query: ({ id }) => ({
        url: `/sell-offer/${id}`,
        method: Methods.Get,
      }),
      providesTags: ["SELLOFFER"],

      transformResponse: (response: { data: SellOfferDetail }): SellOfferDetailResponse => ({
        message: "Product retrieved successfully",
        data: response.data,
      }),
    }),

    getSellOffers: builder.query<GetSelloffersResponse, SellOfferQueryParams>({
      query: (params) => ({
        url: "/sell-offer/dashboard",
        method: Methods.Get,
        params,
      }),
      providesTags: ["SELLOFFER"],
    }),

    getSellOfferStats: builder.query<{ success: boolean; data: SellOfferStats }, void>({
      query: () => ({
        url: `/sell-offer/dashboard/stats`,
        method: Methods.Get,
      }),
      providesTags: ["SELLOFFER"],
    }),

    deleteSellOfferById: builder.mutation<
      { message: string; deletedProductId: string },
      { id: string }
    >({
      query: ({ id }) => ({
        url: `/sell-offer/${id}`,
        method: Methods.Delete,
      }),
      invalidatesTags: ["SELLOFFER", "ACTIVITY"],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await queryFulfilled;
          toast.success("Product Deleted Successfully", {
            position: "top-right",
          });
        } catch (err: any) {
          const errorMessage = err?.error?.data?.error || err?.error?.data?.message || "Failed to delete product";
          toast.error(errorMessage, {
            position: "top-right",
          });
        }
      },
    }),
  }),
});

export const {
  useCreateSellOfferMutation,
  useDeleteSellOfferByIdMutation,
  useGetSellofferQuery,
  useGetSellOfferStatsQuery,
  useGetSellOffersQuery,
  useUpdateSellOfferMutation,
} = sellOfferApi;
