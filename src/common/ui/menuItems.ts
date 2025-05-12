import { BarChart2, FileText, LogOut, User } from "lucide-react";

export const UserRoles = {
  AGENT: "agent",
  ADMIN: "admin",
  SUPER_ADMIN: "superadmin",
} as const;

interface SubmenuItem {
  label: string;
  path: string;
  icon: typeof FileText;
}

interface MenuItem {
  icon: typeof FileText;
  label: string;
  path: string;
  description: string;
  // privilege: (typeof UserRoles)[UserRoleType][];
  hasSubmenu?: boolean;
  submenuItems?: SubmenuItem[];
}

export const getMenuItems = (): MenuItem[] => {
  return [
    {
      icon: BarChart2,
      label: "Dashboard",
      path: "/",
      description: "Overview of key metrics and performance",
    },

    {
      icon: User,
      label: "User Management",
      path: "/users",
      description: "System and user monitoring",
      // privilege: [UserRoles.ADMIN, UserRoles.SUPER_ADMIN],
    },
    // {
    //   icon: PieChart,
    //   label: "Commission Tracker",
    //   path: "/commission",
    //   description: "Track and manage delivery commissions",
    //   privilege: [UserRoles.ADMIN, UserRoles.SUPER_ADMIN],
    // },
    {
      icon: LogOut,
      label: "Logout",
      path: "/login",
      description: "Logout",
    },
  ];
};
