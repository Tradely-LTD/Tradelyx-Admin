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

interface ProductsResponse {
  data: Product[];
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

interface ApiError {
  error: string;
  details?: string;
}

export const productApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    createProduct: builder.mutation<ProductResponse, CreateProductPayload>({
      query: (data) => ({
        url: "/product/create",
        method: Methods.Post,
        body: data,
      }),
      invalidatesTags: ["PRODUCTS"],
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

    updateProduct: builder.mutation<ProductResponse, { id: string; data: UpdateProductPayload }>({
      query: ({ id, data }) => ({
        url: `/product/${id}`,
        method: Methods.Put,
        body: data,
      }),
      invalidatesTags: ["PRODUCTS"],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await queryFulfilled;
          toast.success("Product Updated Successfully", {
            position: "top-right",
          });
        } catch (err: any) {
          const errorMessage = err?.error?.data?.error || "Failed to update product";
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
        url: "/product",
        method: Methods.Get,
        params,
      }),
      providesTags: ["PRODUCTS"],
    }),

    getProductsByCreator: builder.query<{ data: Product[] }, { creatorId: string }>({
      query: ({ creatorId }) => ({
        url: `/products/creator/${creatorId}`,
        method: Methods.Get,
      }),
      providesTags: ["PRODUCTS"],
    }),
    getProductStats: builder.query<{ data: Product[] }, void>({
      query: () => ({
        url: `/product/stats`,
        method: Methods.Get,
      }),
      providesTags: ["PRODUCTS"],
    }),

    deleteProductById: builder.mutation<
      { message: string; deletedProductId: string },
      { id: string }
    >({
      query: ({ id }) => ({
        url: `/product/${id}`,
        method: Methods.Delete,
      }),
      invalidatesTags: ["PRODUCTS"],
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
  useCreateProductMutation,
  useUpdateProductMutation,
  useGetProductQuery,
  useGetProductsQuery,
  useGetProductsByCreatorQuery,
  useDeleteProductByIdMutation,
  useGetProductStatsQuery,
} = productApi;
