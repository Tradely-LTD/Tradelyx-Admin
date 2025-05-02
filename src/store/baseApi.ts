import {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
  createApi,
  fetchBaseQuery,
} from "@reduxjs/toolkit/query/react";
import { cacher } from "./rtkQueryCacheUtils";
import { RootState } from "./store";
import urls from "@/utils/config";
import { logout, setAuth } from "@/pages/auth/authSlice";

export const baseQuery = fetchBaseQuery({
  baseUrl: urls.API_BASE_URL,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState)?.auth?.loginResponse?.token ?? "";
    if (token) {
      headers.set("Authorization", `${token}`);
    }
    return headers;
  },
});

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions
) => {
  const result = await baseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    const refreshToken = (api.getState() as RootState)?.auth?.loginResponse?.token ?? "";
    // the refresh token endpoint is not available at the moment
    const refreshResult = await baseQuery(
      {
        url: `${urls.API_BASE_URL}/auth/refresh-token`,
        method: "POST",
        body: {
          refreshToken: refreshToken,
        },
      },
      api,
      extraOptions
    );

    if (refreshResult.data) {
      // const newToken = (api.getState() as RootState)?.auth?.loginResponse?.Authorization;
      // api.dispatch(setAuth({ loginResponse: refreshResult.data as AuthState, isAuthenticated: true }));
      api.dispatch(setAuth({ ...refreshResult.data, isAuthenticated: true }));
      await baseQuery(args, api, extraOptions);
      return result;
    } else {
      api.dispatch(logout());
    }
  }
  return result;
};

export const baseApi = createApi({
  baseQuery: baseQueryWithReauth,
  endpoints: () => ({}),
  refetchOnReconnect: false,
  refetchOnMountOrArgChange: true,
  // keepUnusedDataFor:4000,
  tagTypes: [...cacher.defaultTags],
});
