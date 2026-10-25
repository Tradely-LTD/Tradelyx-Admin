import { Award, PhoneCall, MessageSquareWarning, Scale, BarChart2, FileQuestion, Handshake, History, BellIcon, KeyRound, Mail, Target, Megaphone, Package, Search, ShellIcon, ShieldCheck, Users, Share2 } from "lucide-react";

import { canSee, type Access, type OptInSection, type Section } from "@/pages/staff/staff-api";

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
  /** Admin-panel section needed (staff permissions); agents are not limited by these */
  section?: Section;
  /** Hidden from view-only staff (ID documents, staff list, disputes) */
  sensitive?: boolean;
  /**
   * An opt-in section, granted by name (never by full access). The layout
   * decides: the item shows only when the staff member holds it and the
   * feature answers (its summary loads; switched off it is a 404).
   */
  optIn?: OptInSection;
  /** Key into the live counts the layout fetches, shown as a badge */
  badge?: "kycPending" | "agentsApplied" | "conversationsNew";
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
      { icon: Users, label: "Users", path: "/users", description: "Everyone on TradelyX, and how far each person has got with setting up", section: "people" },
      { icon: ShieldCheck, label: "KYC review", path: "/kyc", description: "Approve or reject identity documents", roles: ["admin"], section: "people", sensitive: true, badge: "kycPending" },
      { icon: Award, label: "Certificates", path: "/certificates", description: "Verify the licences and certificates sellers show on their stores", roles: ["admin"], section: "people" },
      { icon: Handshake, label: "Agents", path: "/agents", description: "Applications, what each agent has brought in and earned, payouts", roles: ["admin"], section: "growth", badge: "agentsApplied" },
      // Admins see every referrer and can make one an agent; other roles see their list
      { icon: Share2, label: "Referrals", path: "/referrals", description: "Everyone whose referral code brought people in" },
    ],
  },
  {
    label: "Marketplace",
    items: [
      { icon: FileQuestion, label: "Buyer requests", path: "/requests", description: "What buyers asked for; unclear requests flagged", roles: ["admin", "country_admin"], section: "catalog" },
      { icon: Search, label: "Searches", path: "/searches", description: "What people search for on the marketplace, and what they don't find", roles: ["admin"], section: "growth" },
      { icon: Package, label: "Products", path: "/product", description: "Every product listed on TradelyX", section: "catalog" },
      { icon: ShellIcon, label: "Sell offers", path: "/sell-offer", description: "Stock sellers have ready, with price and quantity", section: "catalog" },
    ],
  },
  {
    label: "Finance",
    items: [
      { icon: Scale, label: "Disputes", path: "/disputes", description: "Buyers and sellers who disagree about an escrowed order; review and decide refund or release", roles: ["admin"], section: "finance", sensitive: true },
    ],
  },
  {
    label: "Trust & safety",
    items: [
      {
        icon: MessageSquareWarning,
        label: "Flagged & reported conversations",
        path: "/conversations",
        description: "Buyer–seller conversations a participant reported or that shared contact details; read-only, every view logged",
        roles: ["admin"],
        optIn: "conversations",
        badge: "conversationsNew",
      },
    ],
  },
  {
    label: "Communication",
    items: [
      { icon: PhoneCall, label: "Calls", path: "/calls", description: "Who to phone today and what to ask; created from unpaid quotes, unanswered messages and more", roles: ["admin", "country_admin", "agent"], section: "growth" },
      { icon: Target, label: "Prospects", path: "/prospects", description: "Businesses to bring onto TradelyX, contacted one at a time", roles: ["admin", "country_admin", "agent"], section: "growth" },
      { icon: Megaphone, label: "Outreach", path: "/outreach", description: "Ready-made emails that get people to finish setting up", roles: ["admin"], section: "growth" },
      { icon: Mail, label: "Direct email", path: "/emails", description: "Write to one person or a hand-picked list, and the send history", roles: ["admin"], section: "growth" },
      { icon: BellIcon, label: "Push notifications", path: "/notifications", description: "Broadcast in-app notifications", roles: ["admin"], section: "growth" },
    ],
  },
  {
    label: "Team",
    items: [
      { icon: KeyRound, label: "Staff", path: "/staff", description: "Who is staff and which sections each can use", roles: ["admin"], section: "staff", sensitive: true },
    ],
  },
];

export const isStaffRole = (role?: string | null): role is StaffRole =>
  role === "admin" || role === "country_admin" || role === "agent";

/**
 * `access` is the signed-in staff member's sections (undefined while loading =
 * show by role). `conversationReview`: the layout has confirmed this person
 * may review conversations and the feature is on; opt-in items need it.
 */
export const getMenuGroups = (role?: string | null, access?: Access, conversationReview = false): MenuGroup[] => {
  if (!isStaffRole(role)) return [];
  const sectionOk = (i: MenuItem) => role === "agent" || !i.section || canSee(access, i.section, i.sensitive);
  const optInOk = (i: MenuItem) => !i.optIn || (i.optIn === "conversations" && conversationReview);
  return ALL_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => (!i.roles || i.roles.includes(role)) && sectionOk(i) && optInOk(i)) })).filter(
    (g) => g.items.length
  );
};

/** The menu item a path belongs to, for the page title. Sub-paths match their parent. */
export const findMenuItem = (path: string) =>
  ALL_GROUPS.flatMap((g) => g.items)
    .filter((i) => (i.path === "/" ? path === "/" : path === i.path || path.startsWith(`${i.path}/`)))
    .sort((a, b) => b.path.length - a.path.length)[0];
