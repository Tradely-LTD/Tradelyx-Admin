//@ts-nocheck
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { Drama, Menu, ChevronDown, ChevronRight, Search, Bell, User } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";

import { logout } from "@/pages/auth/authSlice";
import { getMenuItems } from "./menuItems";
import { RootState } from "@/store/store";
import { Logout } from "iconsax-react";

const Layout: React.FC = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [expandedSubmenu, setExpandedSubmenu] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const sidebarRef = useRef<HTMLElement>(null);

  // Get current user from Redux store
  const { loginResponse } = useSelector((state: RootState) => state.auth);
  const userRole = loginResponse?.user?.roles;

  // Get menu items based on user role
  const menuItems = getMenuItems(userRole);

  // Check if user has access to sidebar (only admin and country_admin)
  const hasSidebarAccess =
    userRole === "admin" || userRole === "country_admin" || userRole === "agent";

  // Handle clicks outside sidebar for mobile view
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isMobile &&
        !isSidebarCollapsed &&
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node)
      ) {
        setIsSidebarCollapsed(true);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMobile, isSidebarCollapsed]);

  // Handle window resize with debounce
  useEffect(() => {
    let resizeTimer: NodeJS.Timeout;

    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const newIsMobile = window.innerWidth < 768;
        setIsMobile(newIsMobile);
        setIsSidebarCollapsed(newIsMobile);
      }, 100);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(resizeTimer);
    };
  }, []);

  const handleMenuClick = (item: MenuItem) => {
    if (item.hasSubmenu) {
      setExpandedSubmenu(expandedSubmenu === item.label ? null : item.label);
    } else {
      navigate(item.path);
      if (isMobile) setIsSidebarCollapsed(true);
      if (item.path === "/login") {
        dispatch(logout());
      }
    }
  };

  const handleSubmenuClick = (subItem: SubmenuItem) => {
    navigate(subItem.path);
    if (isMobile) setIsSidebarCollapsed(true);
  };

  const isPathActive = (itemPath: string): boolean => {
    if (itemPath === "/") {
      return location.pathname === "/";
    }

    const currentPath = location.pathname.split("/").filter(Boolean);
    const itemPathSegments = itemPath.split("/").filter(Boolean);

    return (
      currentPath.length === itemPathSegments.length &&
      currentPath.every((segment, index) => segment === itemPathSegments[index])
    );
  };

  const renderBackdrop = () => {
    if (isMobile && !isSidebarCollapsed) {
      return (
        <div
          className="fixed inset-0 bg-black/50 z-20 transition-opacity duration-300"
          onClick={() => setIsSidebarCollapsed(true)}
        />
      );
    }
    return null;
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {hasSidebarAccess && renderBackdrop()}

      {/* Full Height Sidebar - Only show for admin and country_admin */}
      {hasSidebarAccess && (
        <aside
          ref={sidebarRef}
          className={`h-full bg-primary transition-all duration-300 ease-in-out border-r border-gray-200 z-30
            ${isMobile ? "fixed left-0 top-0" : "relative"} 
            ${isMobile && isSidebarCollapsed ? "-translate-x-full" : "translate-x-0"}
            ${isSidebarCollapsed && !isMobile ? "w-16" : "w-64"} shadow-lg`}
        >
          {/* Logo */}
          <div className="flex items-center h-16 px-4 border-b border-slate-700">
            <div className="p-2 rounded-lg bg-primary">
              <Drama className="h-6 w-6 text-white" />
            </div>
            <span
              className={`ml-3 font-semibold text-xl text-white transition-opacity duration-200
              ${isSidebarCollapsed && !isMobile ? "opacity-0 hidden" : "opacity-100"}`}
            >
              <img src="./tradelyx_logo.svg" className="w-[120px]" />
            </span>
          </div>

          {/* Navigation */}
          <nav className="p-2 h-[calc(100%-4rem)] overflow-y-auto">
            {menuItems.map((item, index) => (
              <div key={index}>
                <div
                  onClick={() => handleMenuClick(item)}
                  className={`flex items-center px-4 py-3 my-1 rounded-lg cursor-pointer transition-all duration-200 group relative
                    ${
                      isPathActive(item.path)
                        ? "bg-black text-white shadow-lg"
                        : "text-slate-300 hover:bg-slate-700 hover:text-white"
                    }`}
                >
                  <item.icon className="h-5 w-5 min-w-5" />
                  <span
                    className={`ml-3 font-medium whitespace-nowrap transition-opacity duration-200
                      ${isSidebarCollapsed && !isMobile ? "opacity-0 hidden" : "opacity-100"}`}
                  >
                    {item.label}
                  </span>
                  {item.hasSubmenu && !(isSidebarCollapsed && !isMobile) && (
                    <span className="ml-auto">
                      {expandedSubmenu === item.label ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </span>
                  )}
                  {/* Tooltip for collapsed sidebar */}
                  {isSidebarCollapsed && !isMobile && (
                    <span className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50">
                      {item.label}
                    </span>
                  )}
                </div>

                {/* Submenu */}
                {item.hasSubmenu &&
                  expandedSubmenu === item.label &&
                  !(isSidebarCollapsed && !isMobile) && (
                    <div className="ml-4 mt-1">
                      {item.submenuItems?.map((subItem, subIndex) => (
                        <div
                          key={subIndex}
                          onClick={() => handleSubmenuClick(subItem)}
                          className={`flex items-center p-3 my-1 text-sm rounded-lg cursor-pointer transition-all duration-200
                            ${
                              isPathActive(subItem.path)
                                ? "bg-black text-white"
                                : "text-slate-300 hover:bg-slate-700 hover:text-white"
                            }`}
                        >
                          {subItem.icon && <subItem.icon className="h-4 w-4 mr-2" />}
                          <span className="truncate">{subItem.label}</span>
                        </div>
                      ))}
                    </div>
                  )}

                {/* Collapsed Submenu (Icons only) */}
                {item.hasSubmenu &&
                  expandedSubmenu === item.label &&
                  isSidebarCollapsed &&
                  !isMobile && (
                    <div className="ml-1 mt-1">
                      {item.submenuItems?.map((subItem, subIndex) => (
                        <div
                          key={subIndex}
                          onClick={() => handleSubmenuClick(subItem)}
                          className={`flex items-center justify-center p-2 my-1 rounded-lg cursor-pointer transition-all duration-200 relative group
                            ${
                              isPathActive(subItem.path)
                                ? "bg-black text-white"
                                : "text-slate-300 hover:bg-slate-700 hover:text-white"
                            }`}
                        >
                          {subItem.icon && <subItem.icon className="h-5 w-5" />}
                          <span className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50">
                            {subItem.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
              </div>
            ))}
          </nav>
        </aside>
      )}

      {/* Main Content Area */}
      <div className={`flex flex-col flex-1 overflow-hidden ${!hasSidebarAccess ? "w-full" : ""}`}>
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 w-full z-20 shadow-sm">
          <div className="flex items-center space-x-4">
            {hasSidebarAccess && (
              <button
                onClick={() => setIsSidebarCollapsed((prev) => !prev)}
                className="p-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors duration-200 shadow-sm"
                aria-label="Toggle sidebar"
              >
                <Menu className="h-5 w-5" />
              </button>
            )}
            <h1 className="text-xl font-semibold text-gray-800">
              {menuItems.find((item) => isPathActive(item.path))?.label || "Dashboard"}
            </h1>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                dispatch(logout());
              }}
              className="p-2 rounded-lg bg-red-500 text-white transition-colors duration-200 "
            >
              <Logout className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 bg-gray-50 overflow-y-auto transition-all duration-300 ease-in-out">
          <div className="p-6 min-h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
