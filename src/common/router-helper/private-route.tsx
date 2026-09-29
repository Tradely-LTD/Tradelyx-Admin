import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";

import { logout, useUserSlice } from "@/pages/auth/authSlice";
import { isStaffRole } from "@/common/ui/menuItems";

/**
 * Staff only. Signed out → the login page. Signed in with a buyer or seller
 * account → told plainly, with a way out, instead of an empty admin shell.
 */
function PrivateRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, loginResponse } = useUserSlice();
  const location = useLocation();
  const dispatch = useDispatch();

  if (!isAuthenticated || !loginResponse?.token) {
    return <Navigate replace to="/login" state={{ from: location.pathname }} />;
  }
  if (!isStaffRole(loginResponse.user?.roles)) {
    return (
      <div className="grid min-h-dvh place-items-center bg-paper p-6">
        <div className="max-w-sm text-center">
          <h1 className="text-xl font-bold text-ink">This account isn't a staff account</h1>
          <p className="mt-2 text-sm text-ink-soft">
            The admin panel is for TradelyX staff. Buyers and sellers can use web.tradelyx.com.
          </p>
          <button onClick={() => dispatch(logout())} className="mt-6 h-10 cursor-pointer rounded-lg bg-brand-900 px-4 text-sm font-semibold text-white hover:bg-brand-950">
            Sign in with another account
          </button>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

export default PrivateRoute;
