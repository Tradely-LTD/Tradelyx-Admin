import { toast } from "react-toastify";
import { baseApi } from "@/store/baseApi";
import { Methods } from "@/utils/enums";

/**
 * Licences and certificates sellers list on their storefront. Sellers write
 * them; an admin checks each document against its issuer and marks it
 * verified, which is what puts the "Verified by TradelyX" seal on the store.
 * A seller editing a verified certificate sends it back here unverified.
 */

/** Type key of a certificate held under another company's licence. */
export const PARTNER_LICENCE_TYPE = "partner_licence";

/**
 * A seller operating under another company's licence. Staff phone or email
 * the holder before verifying; contact details are never shown to buyers.
 * The letter itself is private — only `hasLetter` comes in the list, the file
 * is opened through a short-lived signed link.
 */
export interface PartnerLicenceDetails {
  holderCompany: string;
  licenceNumber: string;
  licenceType: "mining_licence" | "mineral_export";
  licenceTypeLabel: string;
  licenceExpiresAt: string;
  authorisationEndsAt: string | null;
  /** The earlier of licence expiry and authorisation end. */
  effectiveExpiresAt: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string | null;
  hasLetter: boolean;
}

/** Other stores using the same licence number (case, spaces and punctuation ignored). */
export interface SameLicenceNumber {
  /** Other stores claiming it as a partner licence, verified or not. */
  partnerStores: number;
  /** Stores listing it as their own mining licence / export permit — the holder may be on TradelyX. */
  ownLicenceStores: number;
}

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
  /**
   * Fingerprint of the certificate as loaded. Sent back on verify so the
   * server refuses if the seller changed it since this list was fetched.
   */
  version: string;
  sellerId: string;
  companyName: string | null;
  storeSlug: string | null;
  partner: PartnerLicenceDetails | null;
  sameNumber: SameLicenceNumber | null;
}

export interface SetCertificationVerifiedArgs {
  sellerId: string;
  certId: string;
  verified: boolean;
  /** Required when verifying (any type); not needed to remove verification. */
  version?: string;
  /** Partner licences only: staff confirmed the authorisation with the holder. */
  holderConfirmed?: boolean;
}

interface ApiError {
  status?: number | string;
  data?: { error?: string; code?: string };
}

const errorOf = (err: unknown): ApiError | undefined => (err as { error?: ApiError })?.error;

export const certificatesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCertifications: builder.query<{ success: boolean; data: StoreCertification[] }, "unverified" | "verified">({
      query: (status) => ({ url: `/store/admin/certifications`, params: { status } }),
      providesTags: ["KYC"],
    }),
    setCertificationVerified: builder.mutation<unknown, SetCertificationVerifiedArgs>({
      query: ({ sellerId, certId, verified, version, holderConfirmed }) => ({
        url: `/store/admin/${sellerId}/certifications/${certId}`,
        method: Methods.Post,
        body: {
          verified,
          ...(version !== undefined ? { version } : {}),
          ...(holderConfirmed ? { holderConfirmed: true } : {}),
        },
      }),
      // A 409 means the certificate changed (or lost its letter) since the
      // list loaded, so reload it — staff must look at the current version.
      invalidatesTags: (_result, error) =>
        !error ? ["KYC", "ACTIVITY"] : (error as ApiError).status === 409 ? ["KYC"] : [],
      async onQueryStarted({ verified }, { queryFulfilled }) {
        try {
          await queryFulfilled;
          toast.success(verified ? "Marked verified" : "Verification removed", { position: "top-right" });
        } catch (err) {
          toast.error(errorOf(err)?.data?.error || "Could not update", { position: "top-right" });
        }
      },
    }),
    getCertificationLetter: builder.query<
      { success: boolean; data: { url: string; expiresInSeconds: number } },
      { sellerId: string; certId: string }
    >({
      query: ({ sellerId, certId }) => ({ url: `/store/admin/${sellerId}/certifications/${certId}/letter` }),
      // Never reuse a cached answer: the signed link expires after 15 minutes
      keepUnusedDataFor: 0,
    }),
  }),
});

export const { useGetCertificationsQuery, useSetCertificationVerifiedMutation, useLazyGetCertificationLetterQuery } =
  certificatesApi;
