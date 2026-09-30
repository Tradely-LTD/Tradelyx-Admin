import { Award, BarChart2, FileQuestion, Handshake, History, BellIcon, Mail, Megaphone, Package, ShellIcon, ShieldCheck, Users, Share2 } from "lucide-react";

/**
 * The sidebar, grouped by the job a staff member is doing. `roles` limits an
 * item to those roles; the API enforces the same limits, so hiding an item is
 * a courtesy, not the protection.
 */

export type StaffRole = "admin" | "country_admin" | "agent";

export interface MenuItem {
  icon: typeof Users;
  label: string;
  path: string;
  description: string;
  roles?: StaffRole[];
  /** Key into the live counts the layout fetches, shown as a badge */
  badge?: "kycPending" | "agentsApplied";
}

export interface MenuGroup {
  label: string;
  items: MenuItem[];
}

const ALL_GROUPS: MenuGroup[] = [
  {
    label: "Overview",
    items: [
      { icon: BarChart2, label: "Dashboard", path: "/", description: "What needs attention today, and how the platform is growing" },
      { icon: History, label: "Activity", path: "/activity", description: "What staff have done, to whom and when", roles: ["admin"] },
    ],
  },
  {
    label: "People",
    items: [
      { icon: Users, label: "Users", path: "/users", description: "Everyone on TradelyX, and how far each person has got with setting up" },
      { icon: ShieldCheck, label: "KYC review", path: "/kyc", description: "Approve or reject identity documents", roles: ["admin"], badge: "kycPending" },
      { icon: Award, label: "Certificates", path: "/certificates", description: "Verify the licences and certificates sellers show on their stores", roles: ["admin"] },
      { icon: Handshake, label: "Agents", path: "/agents", description: "Applications, what each agent has brought in and earned, payouts", roles: ["admin"], badge: "agentsApplied" },
      // Admins see every referrer and can make one an agent; other roles see their list
      { icon: Share2, label: "Referrals", path: "/referrals", description: "Everyone whose referral code brought people in" },
    ],
  },
  {
    label: "Marketplace",
    items: [
      { icon: FileQuestion, label: "Buyer requests", path: "/requests", description: "What buyers asked for; unclear requests flagged", roles: ["admin", "country_admin"] },
      { icon: Package, label: "Products", path: "/product", description: "Every product listed on TradelyX" },
      { icon: ShellIcon, label: "Sell offers", path: "/sell-offer", description: "Stock sellers have ready, with price and quantity" },
    ],
  },
  {
    label: "Communication",
    items: [
      { icon: Megaphone, label: "Outreach", path: "/outreach", description: "Ready-made emails that get people to finish setting up", roles: ["admin"] },
      { icon: Mail, label: "Direct email", path: "/emails", description: "Write to one person or a hand-picked list, and the send history", roles: ["admin"] },
      { icon: BellIcon, label: "Push notifications", path: "/notifications", description: "Broadcast in-app notifications", roles: ["admin"] },
    ],
  },
];

export const isStaffRole = (role?: string | null): role is StaffRole =>
  role === "admin" || role === "country_admin" || role === "agent";

export const getMenuGroups = (role?: string | null): MenuGroup[] => {
  if (!isStaffRole(role)) return [];
  return ALL_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => !i.roles || i.roles.includes(role)) })).filter((g) => g.items.length);
};

/** The menu item a path belongs to, for the page title. Sub-paths match their parent. */
export const findMenuItem = (path: string) =>
  ALL_GROUPS.flatMap((g) => g.items)
    .filter((i) => (i.path === "/" ? path === "/" : path === i.path || path.startsWith(`${i.path}/`)))
    .sort((a, b) => b.path.length - a.path.length)[0];
