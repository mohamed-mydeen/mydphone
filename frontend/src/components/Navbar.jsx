import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  UsersIcon,
  ShieldExclamationIcon,
  UserCircleIcon,
  ArrowUpTrayIcon,
  ArrowRightStartOnRectangleIcon,
  SunIcon,
  MoonIcon,
} from "@heroicons/react/24/outline";
import {
  UsersIcon as UsersSolid,
  ShieldExclamationIcon as ShieldSolid,
  UserCircleIcon as UserCircleSolid,
  ArrowUpTrayIcon as UploadSolid,
} from "@heroicons/react/24/solid";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import Avatar from "./Avatar";

const NAV = [
  { to: "/contacts",  label: "Contacts",   Icon: UsersIcon,            IconActive: UsersSolid },
  { to: "/emergency", label: "Emergency",  Icon: ShieldExclamationIcon, IconActive: ShieldSolid },
  { to: "/profile",   label: "Profile",    Icon: UserCircleIcon,        IconActive: UserCircleSolid },
  { to: "/import",    label: "Import CSV", Icon: ArrowUpTrayIcon,       IconActive: UploadSolid },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const { dark, toggleTheme } = useTheme();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => { await logout(); navigate("/login"); };

  return (
    <>
      {/* ── Desktop Sidebar ── */}
      <aside
        className="hidden md:flex fixed top-0 bottom-0 left-0 z-40 flex-col"
        style={{
          width: "var(--sidebar-w)",
          background: "var(--surface)",
          borderRight: "1px solid var(--border)",
        }}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-2.5 px-5 h-14 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--brand)" }}
          >
            <ShieldExclamationIcon className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-sm font-bold tracking-tight" style={{ color: "var(--text)" }}>
            Contact Vault
          </span>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {NAV.map(({ to, label, Icon, IconActive }) => {
            const active = pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className="relative flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-150"
                style={
                  active
                    ? { background: "var(--brand-l)", color: "var(--brand)", fontWeight: 600 }
                    : { color: "var(--text-3)" }
                }
                onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = "var(--surface-2)"; e.currentTarget.style.color = "var(--text-2)"; } }}
                onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = ""; e.currentTarget.style.color = "var(--text-3)"; } }}
              >
                {/* Active indicator bar */}
                {active && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 rounded-r-full"
                    style={{
                      height: "60%",
                      background: "var(--brand)",
                      animation: "scaleInY 0.18s cubic-bezier(0.22,1,0.36,1) both",
                    }}
                  />
                )}
                {active
                  ? <IconActive className="w-4 h-4 flex-shrink-0" />
                  : <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} />
                }
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="p-3 flex-shrink-0" style={{ borderTop: "1px solid var(--border)" }}>
          {/* User info */}
          <div className="flex items-center gap-2.5 px-2 py-2 mb-2">
            <Avatar name={user?.name} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate" style={{ color: "var(--text)" }}>{user?.name}</p>
              <p className="text-2xs truncate" style={{ color: "var(--text-4)" }}>{user?.email}</p>
            </div>
          </div>
          {/* Actions */}
          <div className="flex gap-1">
            <button
              onClick={toggleTheme}
              className="btn-icon flex-1 justify-center text-xs gap-2 py-2"
              title={dark ? "Light mode" : "Dark mode"}
            >
              {dark
                ? <SunIcon className="w-4 h-4" style={{ color: "#f59e0b" }} strokeWidth={2} />
                : <MoonIcon className="w-4 h-4" strokeWidth={2} />
              }
            </button>
            <button
              onClick={handleLogout}
              className="btn-icon flex-1 justify-center text-xs gap-2 py-2"
              title="Sign out"
              style={{ color: "#ef4444" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,.08)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = ""; }}
            >
              <ArrowRightStartOnRectangleIcon className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Mobile Bottom Tabs ── */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 flex"
        style={{
          background: "var(--surface)",
          borderTop: "1px solid var(--border)",
          boxShadow: "0 -4px 12px rgba(0,0,0,.06)",
          height: "60px",
        }}
      >
        {NAV.map(({ to, label, Icon, IconActive }) => {
          const active = pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className="flex-1 flex flex-col items-center justify-center gap-1 transition-colors relative"
              style={{ color: active ? "var(--brand)" : "var(--text-4)" }}
            >
              {active
                ? <IconActive className="w-5 h-5" />
                : <Icon className="w-5 h-5" strokeWidth={1.75} />
              }
              <span className="text-2xs font-medium">{label.split(" ")[0]}</span>
              {active && (
                <span
                  className="absolute bottom-1 w-1 h-1 rounded-full"
                  style={{
                    background: "var(--brand)",
                    animation: "dotPop 0.2s cubic-bezier(0.22,1,0.36,1) both",
                  }}
                />
              )}
            </Link>
          );
        })}
        <button
          onClick={handleLogout}
          className="flex-1 flex flex-col items-center justify-center gap-1 transition-colors"
          style={{ color: "var(--text-4)" }}
        >
          <ArrowRightStartOnRectangleIcon className="w-5 h-5" strokeWidth={1.75} />
          <span className="text-2xs font-medium">Sign out</span>
        </button>
      </nav>
    </>
  );
}
