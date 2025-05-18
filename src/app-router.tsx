import { BrowserRouter, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/auth/login/login";
import { appPaths } from "./utils/app-paths";
// import PrivateRoute from "./common/router-helper/private-route";
import AdminDashboard from "./pages/dashboard";
import Layout from "./common/ui/layout";
import UserManagement from "./pages/user-management";
import ProductManagement from "./pages/products";

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path={appPaths.login} element={<LoginPage />} />

        <Route path={appPaths.dashboard} element={<Layout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="product" element={<ProductManagement />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default AppRouter;
