import { baseApi } from "@/store/baseApi";
import { Methods } from "@/utils/enums";

export const uploadsFile = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    uploadsFile: builder.mutation<{ data: string; success: boolean }, { file: File }>({
      query: (data) => ({
        url: `/uploads`,
        method: Methods.Post,
        body: data.file,
      }),
    }),
  }),
});

export const { useUploadsFileMutation } = uploadsFile;
