import { toast } from "react-toastify";
import { baseApi } from "@/store/baseApi";
import { Methods } from "@/utils/enums";

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    updateUser: builder.mutation<any, any>({
      query: ({ id, data }) => ({
        url: `/profile/${id}`,
        method: Methods.Put,
        body: data,
      }),
      invalidatesTags: ["USERS"],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await queryFulfilled;
          toast.success("Updated Successfully", {
            position: "top-right",
          });
        } catch (err: any) {
          const errorMessage = err?.error?.data?.error || err?.error || "Failed to update ";
          toast.error(errorMessage, {
            position: "top-right",
          });
        }
      },
    }),
    getUser: builder.query<
      {
        data: any;
        success: boolean;
      },
      { id: string }
    >({
      query: ({ id }) => ({
        url: `profile/${id}`,
        method: Methods.Get,
      }),
      providesTags: ["USERS"],
    }),
    getSeller: builder.query<
      {
        data: SellerResponse;
        success: boolean;
      },
      { id: string }
    >({
      query: ({ id }) => ({
        url: `profile/seller/${id}`,
        method: Methods.Get,
      }),
      providesTags: ["USERS"],
    }),

    getUsers: builder.query<UsersResponse, GetUsersQueryParams>({
      query: (params) => {
        return {
          url: `profile`,
          method: Methods.Get,
          params,
        };
      },
      providesTags: ["USERS"],
    }),
  }),
});

export type UserRole = "superadmin" | "admin" | "agent" | null;

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "buyer" | "seller" | null;
  status: boolean;
  isKYCCompleted: boolean;
  isCompany: boolean;
  phone: string;
  state: string | null;
  country: string | null;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  profileImage: string;
}

interface Pagination {
  total: string | number;
  currentPage: number;
  totalPages: number;
  hasMore: boolean;
}

interface UsersResponse {
  data: User[];
  pagination: Pagination;
}

export interface Profile {
  id: string;
  agentId: string;
  agentFee: number;
  accountNumber: number;
  bankCode: string;
  accountName: string;
  payStackAccountNumber: string;
}
interface GetUsersQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  role?: string;
}
export interface PasswordResetArgs {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ResetPasswordResponse {
  message: string;
}
export interface SellerResponse {
  userId: string;
  personalInfo: PersonalInfo;
  companyInfo: CompanyInfo;
  businessDetails: BusinessDetails;
  documents: SellerDocuments;
}

export interface PersonalInfo {
  firstName: string;
  lastName: string;
  email: string;
  country: string;
  state: string | null;
}

export interface CompanyInfo {
  name: string;
  logo: string | null;
  banner: string | null;
  website: string | null;
  overview: string | null;
  incorporationDate: string | null;
  registrationNumber: string | null;
}

export interface BusinessDetails {
  totalStaff: string | null;
  estimatedAnnualRevenue: string | null;
  services: string[];
  mainMarkets: string[];
  languagesSpoken: string[];
}

export interface SellerDocuments {
  registrationDocuments: string[];
  exportLicenses: string | null;
  identityDocuments: string[];
  certifications: string[];
}

export const { useGetUserQuery, useUpdateUserMutation, useGetUsersQuery, useGetSellerQuery } =
  authApi;
