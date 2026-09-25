import { toast } from "react-toastify";
import { baseApi } from "@/store/baseApi";
import { Methods } from "@/utils/enums";

/**
 * Licences and certificates sellers list on their storefront. Sellers write
 * them; an admin checks each document against its issuer and marks it
 * verified, which is what puts the "Verified by TradelyX" seal on the store.
 * A seller editing a verified certificate sends it back here unverified.
 */
export interface StoreCertification {
  id: string;
  type: string;
  typeLabel: string;
  name: string;
  number: string | null;
  issuer: string | null;
  expiresAt: string | null;
  fileUrl: string | null;
  verified: boolean;
  verifiedAt: string | null;
  sellerId: string;
  companyName: string | null;
  storeSlug: string | null;
}

export const certificatesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCertifications: builder.query<{ success: boolean; data: StoreCertification[] }, "unverified" | "verified">({
      query: (status) => ({ url: `/store/admin/certifications`, params: { status } }),
      providesTags: ["KYC"],
    }),
    setCertificationVerified: builder.mutation<unknown, { sellerId: string; certId: string; verified: boolean }>({
      query: ({ sellerId, certId, verified }) => ({
        url: `/store/admin/${sellerId}/certifications/${certId}`,
        method: Methods.Post,
        body: { verified },
      }),
      invalidatesTags: ["KYC"],
      async onQueryStarted({ verified }, { queryFulfilled }) {
        try {
          await queryFulfilled;
          toast.success(verified ? "Marked verified" : "Verification removed", { position: "top-right" });
        } catch (err) {
          toast.error(
            (err as { error?: { data?: { error?: string } } })?.error?.data?.error || "Could not update",
            { position: "top-right" }
          );
        }
      },
    }),
  }),
});

export const { useGetCertificationsQuery, useSetCertificationVerifiedMutation } = certificatesApi;
