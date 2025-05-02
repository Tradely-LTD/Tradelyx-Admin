import { baseApi } from "@/store/baseApi";
import { Methods } from "@/utils/enums";

export const paymentApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    initiatePayment: builder.mutation<PaymentResponse, PaymentRequest>({
      query: (data) => ({
        url: `/payment/initiate-payment`,
        method: Methods.Post,
        body: data,
      }),
      //   invalidatesTags: [""],
    }),
  }),
});

export const { useInitiatePaymentMutation } = paymentApi;

interface PaymentRequest {
  stateId: string;
  amount: number; // Convert to kobo by * 100
  agentAccountNumber: string;
  agentBankCode: string;
}

interface PaymentResponse {
  amount: string;
  split_code: string;
}
