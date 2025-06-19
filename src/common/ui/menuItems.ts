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

export const getMenuItems = (userRole?: string | null): MenuItem[] => {
  // If no user role is provided or user is not admin/country_admin, return empty array
  if (!userRole || (userRole !== "admin" && userRole !== "country_admin")) {
    return [];
  }

  const allMenuItems: MenuItem[] = [
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
      privilege: ["SUPER_ADMIN"], // Only admin can access notifications
    },
    {
      icon: LogOut,
      label: "Logout",
      path: "/login",
      description: "Sign out of the application",
    },
  ];

  // Filter menu items based on user role
  return allMenuItems.filter((item) => {
    // If no privilege is specified, all admin/country_admin can access
    if (!item.privilege) {
      return true;
    }

    // Check if user role matches the required privileges
    if (userRole === "admin" && item.privilege.includes("SUPER_ADMIN")) {
      return true;
    }

    if (userRole === "country_admin" && item.privilege.includes("ADMIN")) {
      return true;
    }

    return false;
  });
};
