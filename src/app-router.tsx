import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/auth/login/login";
import { appPaths } from "./utils/app-paths";
import PrivateRoute from "./common/router-helper/private-route";
import AdminDashboard from "./pages/dashboard";
import Layout from "./common/ui/layout";
import UserManagement from "./pages/user-management";
import ProductManagement from "./pages/products";
import SellOfferManagement from "./pages/selloffer";
import NotificationManagement from "./pages/notifications";
import ReferralManagement from "./pages/referrals";
import ReferralRewardsPage from "./pages/referral-rewards";
import EmailLandingPage from "./pages/email";
import EmailComposePage from "./pages/email/compose";
import KycReview from "./pages/kyc";
import CertificateReview from "./pages/certificates";
import OutreachPage from "./pages/outreach";
import ActivityPage from "./pages/activity";
import RequestsPage from "./pages/requests";
import AgentsPage from "./pages/agents";
import DisputesPage from "./pages/disputes";
import DisputeDetailPage from "./pages/disputes/detail";
import OrdersPage from "./pages/orders";
import OrderDetailPage from "./pages/orders/detail";
import StaffPage from "./pages/staff";
import ConversationsPage from "./pages/conversations";
import ConversationThreadPage from "./pages/conversations/thread";
import ProspectsPage from "./pages/prospects";
import SearchesPage from "./pages/searches";

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path={appPaths.login} element={<LoginPage />} />

        <Route
          path={appPaths.dashboard}
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="product" element={<ProductManagement />} />
          <Route path="sell-offer" element={<SellOfferManagement />} />
          <Route path="referrals" element={<ReferralManagement />} />
          <Route path="referral-rewards" element={<ReferralRewardsPage />} />
          <Route path="kyc" element={<KycReview />} />
          <Route path="certificates" element={<CertificateReview />} />
          <Route path="notifications" element={<NotificationManagement />} />
          <Route path="outreach" element={<OutreachPage />} />
          <Route path="activity" element={<ActivityPage />} />
          <Route path="requests" element={<RequestsPage />} />
          <Route path="agents" element={<AgentsPage />} />
          <Route path="disputes" element={<DisputesPage />} />
          <Route path="disputes/:id" element={<DisputeDetailPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="orders/:id" element={<OrderDetailPage />} />
          <Route path="conversations" element={<ConversationsPage />} />
          <Route path="conversations/:userA/:userB" element={<ConversationThreadPage />} />
          <Route path="staff" element={<StaffPage />} />
          <Route path="prospects" element={<ProspectsPage />} />
          <Route path="searches" element={<SearchesPage />} />
          <Route path="emails" element={<EmailLandingPage />} />
          <Route path="emails/compose" element={<EmailComposePage />} />
          <Route path="*" element={<Navigate replace to="/" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default AppRouter;
