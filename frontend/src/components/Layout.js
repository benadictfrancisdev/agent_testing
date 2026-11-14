import { NavLink, useLocation } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  LayoutDashboard, FolderKanban, Cpu, Database,
  ScrollText, Settings, Bug, ChevronLeft, ChevronRight,
  Zap
} from "lucide-react";
import { useState } from "react";

const NAV_ITEMS = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/projects", icon: FolderKanban, label: "Projects" },
  { to: "/providers", icon: Cpu, label: "AI Providers" },
  { to: "/models", icon: Database, label: "Model Registry" },
  { to: "/audit", icon: ScrollText, label: "Audit Logs" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

function Sidebar({ collapsed, setCollapsed }) {
  const location = useLocation();

  const isActive = (path) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <aside
      data-testid="sidebar-navigation"
      className={`fixed top-0 left-0 h-screen border-r border-[#27272a] bg-[#09090b] z-40 flex flex-col transition-[width] duration-200 ${collapsed ? "w-16" : "w-56"}`}
    >
      <div className="flex items-center gap-2 px-4 h-14 border-b border-[#27272a] shrink-0">
        <div className="w-7 h-7 rounded-md bg-[#00f0ff]/15 flex items-center justify-center shrink-0">
          <Bug className="w-4 h-4 text-[#00f0ff]" />
        </div>
        {!collapsed && (
          <span className="heading-font text-sm font-bold text-[#f4f4f5] tracking-tight truncate">
            RegressAI
          </span>
        )}
      </div>

      <ScrollArea className="flex-1 py-3 px-2">
        <nav className="flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
              className={`sidebar-nav-item ${isActive(item.to) ? "active" : ""}`}
              end={item.to === "/"}
              title={item.label}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          ))}
        </nav>
      </ScrollArea>

      <div className="border-t border-[#27272a] px-2 py-2 shrink-0">
        <button
          data-testid="sidebar-toggle"
          onClick={() => setCollapsed(!collapsed)}
          className="sidebar-nav-item w-full justify-center"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}

function TopBar() {
  return (
    <header
      data-testid="top-bar"
      className="h-14 border-b border-[#27272a] bg-[#09090b]/85 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-30"
    >
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-[#00f0ff]" />
        <span className="text-xs mono-font uppercase tracking-[0.2em] text-[#a1a1aa]">
          AI Testing Platform
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#121215] border border-[#27272a]">
          <div className="status-dot active" />
          <span className="text-xs text-[#a1a1aa]">System Online</span>
        </div>
        <div className="w-8 h-8 rounded-full bg-[#00f0ff]/15 flex items-center justify-center">
          <span className="text-xs font-medium text-[#00f0ff]">SA</span>
        </div>
      </div>
    </header>
  );
}

export default function Layout({ children }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-[#09090b]">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <div className={`transition-[margin-left] duration-200 ${collapsed ? "ml-16" : "ml-56"}`}>
        <TopBar />
        <main className="p-4 sm:p-6 lg:p-8 page-enter">
          {children}
        </main>
      </div>
    </div>
  );
}
