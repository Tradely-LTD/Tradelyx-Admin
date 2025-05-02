import { toast } from "react-toastify";
import { setAuth } from "./authSlice";
import { baseApi } from "@/store/baseApi";
import { Methods } from "@/utils/enums";

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<LoginResponse, LoginRequest>({
      query: (data) => ({
        url: "/auth/login",
        method: Methods.Post,
        body: data,
      }),
      async onQueryStarted(_, { queryFulfilled, dispatch }) {
        try {
          const { data: registerData } = await queryFulfilled; // Extract response
          // Assuming registerData contains authToken and user details
          dispatch(
            setAuth({
              isAuthenticated: true,
              loginResponse: registerData,
            })
          );
          toast.success("Login Successfully", {
            position: "top-right",
          });
        } catch (err: any) {
          const errorMessage = err.error.data.error || err?.error || "Failed to create the account";

          toast.error(errorMessage, {
            position: "top-right",
          });
        }
      },
    }),
    register: builder.mutation<RegisterResponse, RegisterRequest>({
      query: (data) => ({
        url: "/auth/register",
        method: Methods.Post,
        body: data,
      }),
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await queryFulfilled;

          toast.success("Account created successfully", {
            position: "top-right",
          });
        } catch (err: any) {
          const errorMessage = err.error.data.error || err?.error || "Failed to create the account";

          toast.error(errorMessage, {
            position: "top-right",
          });
        }
      },
    }),
    logout: builder.mutation({
      query: () => ({
        url: "/authentication/logout",
        method: Methods.Put,
      }),
    }),
  }),
});

export interface LoginResponse {
  token: string;
  refreshToken: string;
  user: AuthUser;
  message: String;
}

export type UserRole = "superadmin" | "admin" | "agent" | null;

interface GetUsersParams {
  role?: UserRole;
}

export interface AuthUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  profileImage?: string;
  isKYCCompleted: boolean;
  isVerified: boolean;
  role: UserRole;
  status: boolean;
  lga: string;
  city: string;
  streetAddress?: string;
}

export interface LoginRequest {
  email: string; // Changed from `username` to `email`
  password: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  password: string;
  stateId: string;
  lgaId: string;
  city: string;
  marketId?: string;
  streetAddress?: string;
}

export interface RegisterResponse {
  message: string;
  token: string;
  user: AuthUser;
  success: boolean;
}

export interface Organisation {
  createdAt: string;
  id: string;
  logo: string;
  orgName: string;
  shortName: string;
  updatedAt: string;
}
export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  profileImage: string | null;
  isKYCCompleted: boolean;
  isVerified: boolean;
  stateId: string;
  lgaId: string;
  marketId: string;
  role: UserRole;
  status: boolean;
  union: string | null;
  city: string;
  streetAddress: string | null;
  organisationId: string;
  createdAt: string;
  updatedAt: string;
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

export interface PasswordResetArgs {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ResetPasswordResponse {
  message: string;
}

export interface RefreshTokenResponse extends LoginResponse {}

export const { useLoginMutation, useLogoutMutation, useRegisterMutation } = authApi;
