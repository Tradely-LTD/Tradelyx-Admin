import { Methods } from "@/utils/enums";
import { baseApi } from "./baseApi";

const injectedUploadsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    uploadImage: builder.mutation({
      query: (file: { uri: string; name: string; type: string }) => {
        const formData = new FormData();
        formData.append("file", file);

        return {
          url: `/file/upload`,
          method: "POST",
          body: formData,
          headers: {
            "Content-Type": "multipart/form-data",
          },
        };
      },
    }),

    uploadsFile: builder.mutation<{ data: string; success: boolean }, { file: File }>({
      query: (data) => ({
        url: `/file/upload-file`,
        method: Methods.Post,
        body: data.file,
      }),
    }),
  }),
});

export const { useUploadImageMutation, useUploadsFileMutation } = injectedUploadsApi;
