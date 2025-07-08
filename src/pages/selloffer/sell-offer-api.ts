//@ts-nocheck
import { toast } from "react-toastify";
import { baseApi } from "@/store/baseApi";
import { Methods } from "@/utils/enums";

// Interface for query parameters
interface SellOfferQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

// Interface for the response data
interface SellOffers {
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
      invalidatesTags: ["SELLOFFER"],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await queryFulfilled;
          toast.success("Product Created Successfully", {
            position: "top-right",
          });
        } catch (err: any) {
          const errorMessage = err?.error?.data?.error || "Failed to create product";
          toast.error(errorMessage, {
            position: "top-right",
          });
        }
      },
    }),

    updateSellOffer: builder.mutation<ProductResponse, { id: string; data: UpdateProductPayload }>({
      query: ({ id, data }) => ({
        url: `/sell-offer/sell-offers/${id}`,
        method: "put",
        body: data,
      }),
      invalidatesTags: ["SELLOFFER"],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await queryFulfilled;
          toast.success("Selloffer Updated Successfully", {
            position: "top-right",
          });
        } catch (err: any) {
          const errorMessage = err?.error?.data?.error || "Failed to update the offer";
          toast.error(errorMessage, {
            position: "top-right",
          });
        }
      },
    }),

    getSelloffer: builder.query<ProductResponse, { id: string }>({
      query: ({ id }) => ({
        url: `/sell-offer/${id}`,
        method: Methods.Get,
      }),
      providesTags: ["SELLOFFER"],

      transformResponse: (response: Product): ProductResponse => ({
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

    getSellOfferStats: builder.query<{ data: Product[] }, void>({
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
      invalidatesTags: ["SELLOFFER"],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await queryFulfilled;
          toast.success("Product Deleted Successfully", {
            position: "top-right",
          });
        } catch (err: any) {
          const errorMessage = err?.error?.data?.error || "Failed to delete product";
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
