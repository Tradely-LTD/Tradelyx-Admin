import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";
import { LogOut, Menu, X } from "lucide-react";

import { logout, useUserSlice } from "@/pages/auth/authSlice";
import { useGetKycSubmissionsQuery } from "@/pages/kyc/kyc-api";
import { useGetAgentsQuery } from "@/pages/agents/agents-api";
import { findMenuItem, getMenuGroups } from "./menuItems";
import { initials } from "./kit";

const roleLabel: Record<string, string> = { admin: "Administrator", country_admin: "Country admin", agent: "Agent" };

const Layout = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const { loginResponse } = useUserSlice();
  const user = loginResponse?.user;
  const role = user?.roles ?? null;
  const groups = getMenuGroups(role);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Live counts for the badges; only admins can read the KYC queue
  const { data: kyc } = useGetKycSubmissionsQuery({ status: "pending", page: 1, limit: 1 }, { skip: role !== "admin", pollingInterval: 120_000 });
  const { data: applied } = useGetAgentsQuery("applied", { skip: role !== "admin", pollingInterval: 300_000 });
  const badges = { kycPending: kyc?.pagination?.total ?? 0, agentsApplied: applied?.data.length ?? 0 };

  useEffect(() => setMobileOpen(false), [location.pathname]);

  const current = findMenuItem(location.pathname);
  useEffect(() => {
    document.title = current ? `${current.label} · TradelyX Admin` : "TradelyX Admin";
  }, [current]);

  const sidebar = (
    <div className="hatch flex h-full flex-col bg-brand-950 text-white/80">
      <div className="flex h-16 shrink-0 items-center gap-2.5 px-5">
        <span className="text-[19px] font-extrabold tracking-[-0.03em] text-white">Tradely<span className="text-brand-300">X</span></span>
        <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-brand-200">Admin</span>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-6 pt-2" aria-label="Main">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="mb-1.5 px-3 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-white/35">{group.label}</p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const count = item.badge ? badges[item.badge] : 0;
                return (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      end={item.path === "/"}
                      className={({ isActive }) =>
                        `group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors duration-150 ${
                          isActive ? "bg-white/[0.09] text-white" : "hover:bg-white/[0.05] hover:text-white"
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && <span className="absolute inset-y-2 left-0 w-[3px] rounded-r bg-brand-500" aria-hidden />}
                          <item.icon size={17} strokeWidth={isActive ? 2.2 : 1.8} className={isActive ? "text-brand-300" : "text-white/50 group-hover:text-white/80"} />
                          <span className="flex-1">{item.label}</span>
                          {count > 0 && (
                            <span className="tnum rounded-full bg-attention px-1.5 py-px text-[10.5px] font-bold text-white" aria-label={`${count} waiting`}>
                              {count > 99 ? "99+" : count}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-900 text-[13px] font-bold text-white ring-2 ring-white/10">
            {initials(user?.firstName, user?.lastName)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-white">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="truncate text-[11.5px] text-white/45">{roleLabel[role ?? ""] ?? role}</p>
          </div>
          <button
            onClick={() => dispatch(logout())}
            className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg text-white/50 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-dvh overflow-hidden bg-paper">
      <aside className="hidden w-[248px] shrink-0 lg:block">{sidebar}</aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 animate-fade bg-ink/50" onClick={() => setMobileOpen(false)} />
          <div className="relative h-full w-[264px] animate-rise">{sidebar}</div>
          <button onClick={() => setMobileOpen(false)} aria-label="Close menu" className="absolute left-[276px] top-4 grid h-10 w-10 place-items-center rounded-full bg-white text-ink">
            <X size={18} />
          </button>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-rule bg-white px-4 lg:hidden">
          <button onClick={() => setMobileOpen(true)} aria-label="Open menu" className="grid h-10 w-10 place-items-center rounded-lg text-ink hover:bg-paper-deep">
            <Menu size={20} />
          </button>
          <span className="font-semibold text-ink">{current?.label ?? "TradelyX Admin"}</span>
        </header>
        <main className="flex-1 overflow-y-auto" id="main">
          <div key={location.pathname} className="mx-auto w-full max-w-[1320px] animate-rise px-4 py-6 sm:px-6 lg:px-10 lg:py-9">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
