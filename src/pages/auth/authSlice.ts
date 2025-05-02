// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { RootState } from "@/store/store";
import { createSlice } from "@reduxjs/toolkit";
import { useSelector } from "react-redux";
import { LoginResponse } from "./auth.api";

export type AuthState = {
  isAuthenticated: boolean;
  loginResponse: LoginResponse | null;
};

const initialState: AuthState = {
  isAuthenticated: false,
  loginResponse: null,
};

const setAuthHandler = (state: AuthState, { payload: auth }: { payload: Partial<AuthState> }) => {
  if (auth.loginResponse === undefined) {
    auth.loginResponse = state.loginResponse;
  }

  return {
    ...state,
    ...auth,
  };
};

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setAuth: setAuthHandler,
    logout: () => {
      localStorage.clear();
      return initialState;
    },
  },
});

export const { logout, setAuth } = authSlice.actions;

export const useUserSlice = () => useSelector((state: RootState) => state.auth);

export default authSlice.reducer; // Don't forget to export the reducer
