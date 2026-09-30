import { toast } from "react-toastify";
import { baseApi } from "@/store/baseApi";
import { Methods } from "@/utils/enums";

// Interfaces based on ProductsTable schema and backend responses
interface Product {
  id: string;
  creatorId: string;
  title: string;
  category: string;
  description: string;
  thumbnail?: string | null;
  tags?: string[] | null;
  certifications?: string | null;
  documents?: string[] | null;
  images?: string[] | null;
  specification?: string | null;
  supply_capacity?: Record<string, any> | null;
  minimum_order?: Record<string, any> | null;
  packaging_type?: string | null;
  relevant_documents?: string[] | null;
  year_of_origin?: string | null;
  place_of_origin?: string | null;
  land_mark?: string | null;
  delivery_date?: string | null;
  productVerified: boolean;
  createdAt: string;
}

interface Seller {
  id: string;
  name?: string | null;
  businessOverview?: string | null;
  companyWebsite?: string | null;
  companyLogo?: string | null;
  companyBanner?: string | null;
}

interface ProductResponse {
  data: Product & { seller?: Seller };
  success?: boolean;
}

/** A row of the admin list (GET /product/dashboard): the product plus who sells it. */
export interface AdminProduct extends Product {
  price?: { currency?: string; amount?: number | string } | null;
  priceNegotiable?: boolean | null;
  sellerCompany?: string | null;
  sellerFirstName?: string | null;
  sellerLastName?: string | null;
  sellerVerified?: boolean | null;
  creatorCountry?: string | null;
  sellerEmail?: string | null;
  sellerPhone?: string | null;
  uploadedBy?: string | null;
  uploaderFirstName?: string | null;
  uploaderLastName?: string | null;
  uploaderRole?: string | null;
}

export interface ProductStats {
  totalProducts: number;
  verifiedProducts: number;
  unverifiedProducts: number;
  recentProducts: number;
}

interface ProductsResponse {
  data: AdminProduct[];
  pagination: {
    total: number;
    currentPage: number;
    totalPages: number;
    hasMore: boolean;
  };
}

interface GetProductsQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  status?: string;
  sellerId?: string;
}

interface CreateProductPayload {
  title: string;
  category: string;
  description: string;
  thumbnail?: string;
  tags?: string[];
  certifications?: string;
  documents?: string[];
  images?: string[];
  specification?: string;
  supply_capacity?: Record<string, any>;
  minimum_order?: Record<string, any>;
  packaging_type?: string;
  relevant_documents?: string[];
  year_of_origin?: string;
  place_of_origin?: string;
  land_mark?: string;
  delivery_date?: string;
  productVerified?: boolean;
}

interface UpdateProductPayload extends Partial<CreateProductPayload> {}

export const productApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    createProduct: builder.mutation<ProductResponse, CreateProductPayload>({
      query: (data) => ({
        url: "/product/create",
        method: Methods.Post,
        body: data,
      }),
      invalidatesTags: ["PRODUCTS", "ACTIVITY"],
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

    updateProduct: builder.mutation<ProductResponse, { id: string; data: UpdateProductPayload }>({
      query: ({ id, data }) => ({
        url: `/product/${id}`,
        method: Methods.Put,
        body: data,
      }),
      invalidatesTags: ["PRODUCTS", "ACTIVITY"],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await queryFulfilled;
          toast.success("Product Updated Successfully", {
            position: "top-right",
          });
        } catch (err: any) {
          const errorMessage = err?.error?.data?.error || err?.error?.data?.message || "Failed to update product";
          toast.error(errorMessage, {
            position: "top-right",
          });
        }
      },
    }),

    getProduct: builder.query<ProductResponse, { id: string }>({
      query: ({ id }) => ({
        url: `/product/${id}`,
        method: Methods.Get,
      }),
      providesTags: ["PRODUCTS"],
    }),

    getProducts: builder.query<ProductsResponse, GetProductsQueryParams>({
      query: (params) => ({
        url: "/product/dashboard",
        method: Methods.Get,
        params,
      }),
      providesTags: ["PRODUCTS"],
    }),

    getProductStats: builder.query<ProductStats, void>({
      query: () => ({
        url: `/product/stats`,
        method: Methods.Get,
      }),
      providesTags: ["PRODUCTS"],
    }),

    // Staff only. Verification is the platform's call, so it has its own
    // route and is never part of a product edit.
    // The seller is emailed either way; `reason` explains a removal
    setProductVerified: builder.mutation<{ message: string }, { id: string; verified: boolean; reason?: string }>({
      query: ({ id, verified, reason }) => ({
        url: `/product/${id}/verify`,
        method: Methods.Post,
        body: { verified, reason },
      }),
      invalidatesTags: ["PRODUCTS", "ACTIVITY"],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          toast.success(data?.message ?? "Updated", { position: "top-right" });
        } catch (err: any) {
          toast.error(err?.error?.data?.error || err?.error?.data?.message || err?.error?.data?.message || "Could not update verification", { position: "top-right" });
        }
      },
    }),
    deleteProductById: builder.mutation<
      { message: string; deletedProductId: string },
      { id: string }
    >({
      query: ({ id }) => ({
        url: `/product/${id}`,
        method: Methods.Delete,
      }),
      invalidatesTags: ["PRODUCTS", "ACTIVITY"],
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
  useCreateProductMutation,
  useUpdateProductMutation,
  useGetProductQuery,
  useGetProductsQuery,
  useDeleteProductByIdMutation,
  useSetProductVerifiedMutation,
  useGetProductStatsQuery,
} = productApi;
