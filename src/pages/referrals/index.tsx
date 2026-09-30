import { useUserSlice } from "../auth/authSlice";
import LegacyReferrals from "./legacy-referrals";
import Referrers from "./referrers";

/** Admins see every referrer and can make one an agent; other roles keep their referral list. */
export default function ReferralManagement() {
  const { loginResponse } = useUserSlice();
  return loginResponse?.user.roles === "admin" ? <Referrers /> : <LegacyReferrals />;
}
