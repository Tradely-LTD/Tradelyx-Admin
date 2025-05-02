import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { Drama, Menu, ChevronDown, ChevronRight } from "lucide-react";

import { getMenuItems } from "./menuItems";
import { logout } from "@/pages/auth/authSlice";
import { useDispatch } from "react-redux";

function Layout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const [expandedSubmenu, setExpandedSubmenu] = useState(null);
  const sidebarRef = useRef(null);

  const menuItems = getMenuItems();

  // Check if clicked outside sidebar (for mobile view)
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        isMobile &&
        !isSidebarCollapsed &&
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target)
      ) {
        // Only close if we're on mobile and the sidebar is open
        setIsSidebarCollapsed(true);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMobile, isSidebarCollapsed]);

  // Improved resize handler with debounce
  useEffect(() => {
    let resizeTimer;

    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const newIsMobile = window.innerWidth < 768;
        setIsMobile(newIsMobile);

        // Auto-collapse sidebar on mobile
        if (newIsMobile) {
          setIsSidebarCollapsed(true);
        } else {
          setIsSidebarCollapsed(false);
        }
      }, 100);
    };

    // Set initial state
    handleResize();

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(resizeTimer);
    };
  }, []);

  const handleMenuClick = (item) => {
    if (item.hasSubmenu) {
      setExpandedSubmenu(expandedSubmenu === item.label ? null : item.label);
    } else {
      navigate(item.path);
      if (isMobile) setIsSidebarCollapsed(true); // Collapse sidebar on mobile after navigation
      if (item.path === "/login") {
        dispatch(logout());
      }
    }
  };

  const handleSubmenuClick = (subItem) => {
    navigate(subItem.path);
    if (isMobile) setIsSidebarCollapsed(true); // Collapse sidebar on mobile after navigation
  };

  const isPathActive = (itemPath) => {
    if (itemPath === "/") {
      return location.pathname === "/";
    }

    // Ensure exact match by splitting and comparing path segments
    const currentPath = location.pathname.split("/").filter(Boolean);
    const itemPathSegments = itemPath?.split("/").filter(Boolean);

    return (
      currentPath.length === itemPathSegments?.length &&
      currentPath.every((segment, index) => segment === itemPathSegments[index])
    );
  };

  // Backdrop for mobile view when sidebar is open
  const renderBackdrop = () => {
    if (isMobile && !isSidebarCollapsed) {
      return (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20"
          onClick={() => setIsSidebarCollapsed(true)}
        />
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top Header - Fixed on all screen sizes */}
      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 w-full z-20">
        <div className="flex items-center">
          <button
            onClick={() => setIsSidebarCollapsed((prev) => !prev)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="ml-4 text-xl font-semibold truncate">
            {menuItems.find((item) => isPathActive(item.path))?.label || "Dashboard"}
          </h1>
        </div>
      </header>

      {/* Main Content Area - Includes both sidebar and content */}
      <div className="flex flex-1 relative overflow-hidden">
        {/* Backdrop for mobile */}
        {renderBackdrop()}

        {/* Sidebar */}
        <aside
          ref={sidebarRef}
          className={`h-[calc(100vh-4rem)] bg-white transition-all duration-300 ease-in-out border-r border-gray-200 z-30
            ${isMobile ? "fixed left-0" : "relative"} 
            ${isMobile && isSidebarCollapsed ? "-translate-x-full" : "translate-x-0"}
            ${isSidebarCollapsed && !isMobile ? "w-16" : "w-64"}`}
        >
          {/* Logo */}
          <div className="flex items-center h-16 px-4 border-b border-gray-200 bg-[#143085]">
            <Drama color="#fff" />
            <span
              className={`ml-2 font-semibold text-xl text-cyan-50 transition-opacity duration-200
              ${isSidebarCollapsed && !isMobile ? "opacity-0 hidden" : "opacity-100"}`}
            >
              Tradely
            </span>
          </div>

          {/* Navigation Menu - Added overflow control */}
          <nav className="p-2 bg-[#143085] h-[calc(100%-4rem)] overflow-y-auto">
            {menuItems.map((item, index) => (
              <div key={index}>
                <div
                  onClick={() => handleMenuClick(item)}
                  className={`flex items-center px-4 py-2 my-1 rounded-lg cursor-pointer
                    ${
                      isPathActive(item.path)
                        ? "bg-blue-50 text-black"
                        : "hover:bg-gray-100 text-white"
                    }
                    transition-all duration-200 ease-in-out`}
                >
                  <item.icon
                    className={`h-5 w-5 min-w-5 ${
                      item.label === "Logout"
                        ? "text-red-500"
                        : isPathActive(item.path)
                        ? "text-black"
                        : "text-white"
                    }`}
                  />
                  <span
                    className={`ml-3 transition-opacity duration-200 font-medium whitespace-nowrap
                    ${isSidebarCollapsed && !isMobile ? "opacity-0 hidden" : "opacity-100"}
                    ${
                      item.label === "Logout"
                        ? "text-red-500"
                        : isPathActive(item.path)
                        ? "text-black"
                        : "text-white"
                    }`}
                  >
                    {item.label}
                  </span>
                  {item.hasSubmenu && !(isSidebarCollapsed && !isMobile) && (
                    <span className="ml-auto">
                      {expandedSubmenu === item.label ? (
                        <ChevronDown
                          className={`h-4 w-4 ${
                            isPathActive(item.path) ? "text-black" : "text-white"
                          }`}
                        />
                      ) : (
                        <ChevronRight
                          className={`h-4 w-4 ${
                            isPathActive(item.path) ? "text-black" : "text-white"
                          }`}
                        />
                      )}
                    </span>
                  )}
                </div>

                {/* Submenu */}
                {item.hasSubmenu &&
                  expandedSubmenu === item.label &&
                  !(isSidebarCollapsed && !isMobile) && (
                    <div className="ml-1 mt-1">
                      {item?.submenuItems?.map((subItem, subIndex) => (
                        <div
                          key={subIndex}
                          onClick={() => handleSubmenuClick(subItem)}
                          className={`flex items-center p-3 my-2 text-sm rounded-lg cursor-pointer
                        ${
                          isPathActive(subItem.path)
                            ? "bg-green-50 text-black"
                            : "hover:bg-gray-100 text-white"
                        }`}
                        >
                          {subItem.icon && <subItem.icon className="h-4 w-4 mr-2" />}
                          <span className="truncate">{subItem.label}</span>
                        </div>
                      ))}
                    </div>
                  )}

                {/* Collapsed/Desktop Submenu - Icons only */}
                {item.hasSubmenu &&
                  expandedSubmenu === item.label &&
                  isSidebarCollapsed &&
                  !isMobile && (
                    <div className="ml-1 mt-1">
                      {item?.submenuItems?.map((subItem, subIndex) => (
                        <div
                          key={subIndex}
                          onClick={() => handleSubmenuClick(subItem)}
                          className={`flex items-center justify-center p-2 my-1 text-sm rounded-lg cursor-pointer
                        ${
                          isPathActive(subItem.path)
                            ? "bg-green-50 text-black"
                            : "hover:bg-gray-100 text-white"
                        }`}
                        >
                          {subItem.icon && <subItem.icon className="h-5 w-5" />}
                        </div>
                      ))}
                    </div>
                  )}
              </div>
            ))}
          </nav>
        </aside>

        {/* Main Content Area with proper padding and overflow control */}
        <main className="flex-1 bg-gray-100 h-[calc(100vh-4rem)] overflow-y-auto transition-all duration-300 ease-in-out">
          {/* Page Content with proper padding */}
          <div className="p-5 min-h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default Layout;
