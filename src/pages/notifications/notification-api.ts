import { toast } from "react-toastify";
import { baseApi } from "@/store/baseApi";
import { Methods } from "@/utils/enums";

// Define notification interfaces
export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  thumbnail: string | null;
  createdAt: string; // ISO date string
}

interface NotificationsResponse {
  data: Notification[];
  pagination: any;
}

interface GetNotificationsQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  userId?: string;
}

export const notificationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // New notification endpoints
    getNotifications: builder.query<NotificationsResponse, GetNotificationsQueryParams>({
      query: (params) => ({
        url: `/notifications`,
        method: Methods.Get,
        params,
      }),
      providesTags: ["NOTIFICATIONS"],
    }),

    getNotification: builder.query<
      {
        data: Notification;
        success: boolean;
      },
      { id: string }
    >({
      query: ({ id }) => ({
        url: `/notifications/${id}`,
        method: Methods.Get,
      }),
      providesTags: ["NOTIFICATIONS"],
    }),

    createNotification: builder.mutation<any, { data: Partial<Notification> }>({
      query: ({ data }) => ({
        url: `/notifications`,
        method: Methods.Post,
        body: data,
      }),
      invalidatesTags: ["NOTIFICATIONS"],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await queryFulfilled;
          toast.success("Notification Created Successfully", {
            position: "top-right",
          });
        } catch (err: any) {
          const errorMessage =
            err?.error?.data?.error || err?.error || "Failed to create notification";
          toast.error(errorMessage, {
            position: "top-right",
          });
        }
      },
    }),

    updateNotification: builder.mutation<any, { id: string; data: Partial<Notification> }>({
      query: ({ id, data }) => ({
        url: `/notifications/${id}`,
        method: Methods.Put,
        body: data,
      }),
      invalidatesTags: ["NOTIFICATIONS"],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await queryFulfilled;
          toast.success("Notification Updated Successfully", {
            position: "top-right",
          });
        } catch (err: any) {
          const errorMessage =
            err?.error?.data?.error || err?.error || "Failed to update notification";
          toast.error(errorMessage, {
            position: "top-right",
          });
        }
      },
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useGetNotificationQuery,
  useCreateNotificationMutation,
  useUpdateNotificationMutation,
} = notificationApi;
