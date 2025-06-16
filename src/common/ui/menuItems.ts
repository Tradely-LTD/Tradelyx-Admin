import { BarChart2, FileText, LogOut, Package, ShellIcon, User, BellIcon } from "lucide-react";
import { IoTimeSharp } from "react-icons/io5";

// Define user roles as a constant enum-like object
export const UserRoles = {
  AGENT: "agent",
  SUPER_ADMIN: "admin",
  ADMIN: "country_admin",
} as const;

// Type for user role keys
type UserRoleType = keyof typeof UserRoles;

// Interface for submenu items
interface SubmenuItem {
  label: string;
  path: string;
  icon: typeof FileText;
  color?: string; // Optional color for submenu items
}

// Interface for menu items
interface MenuItem {
  icon: typeof FileText | typeof IoTimeSharp;
  label: string;
  path: string;
  description: string;
  privilege?: UserRoleType[]; // Optional roles that can access this menu
  hasSubmenu?: boolean;
  submenuItems?: SubmenuItem[];
}

export const getMenuItems = (): MenuItem[] => {
  return [
    {
      icon: BarChart2,
      label: "Dashboard",
      path: "/",
      description: "Overview of key metrics and performance indicators",
    },
    {
      icon: User,
      label: "User Management",
      path: "/users",
      description: "Manage and monitor system users",
    },
    {
      icon: Package,
      label: "Product",
      path: "/product",
      description: "Manage product inventory and details",
    },
    {
      icon: ShellIcon,
      label: "Sell Offers",
      path: "/sell-offer",
      description: "Manage sell offer inventory and details",
    },
    {
      icon: BellIcon,
      label: "Notifications",
      path: "/notifications",
      description: "Manage notification inventory and details",
    },
    {
      icon: LogOut,
      label: "Logout",
      path: "/login",
      description: "Sign out of the application",
    },
  ];
};
