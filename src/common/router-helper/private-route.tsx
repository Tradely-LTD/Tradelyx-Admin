import { useUserSlice } from "@/pages/auth/authSlice";
import { Fragment, ReactNode } from "react";
import { Navigate } from "react-router-dom";

function PrivateRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useUserSlice();

  return <Fragment>{isAuthenticated ? children : <Navigate replace to="/login" />}</Fragment>;
}

export default PrivateRoute;
