import { useUserSlice } from "@/pages/auth/authSlice";
import React from "react";
import { Navigate } from "react-router-dom";

const withRoleAccess = (allowedRoles: string[]) => (WrappedComponent: React.ElementType) => {
  return (props: any) => {
    const { loginResponse, isAuthenticated } = useUserSlice();
    const userRole = loginResponse?.user.role;

    // Check if the user is authenticated and has a valid role
    if (!isAuthenticated || !userRole || !allowedRoles.includes(userRole)) {
      return <Navigate to="/unauthorized" replace />;
    }

    return <WrappedComponent {...props} />;
  };
};

export default withRoleAccess;
