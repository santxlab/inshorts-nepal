"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Newspaper, Rss, LogOut,
  ChevronLeft, ChevronRight, Globe,
  BarChart3, Megaphone, Users, Share2, Bell,
} from "lucide-react";

const NAV_GROUPS = [
  {
    label: "Content",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
      { href: "/admin/articles", label: "Articles", icon: Newspaper },
      { href: "/admin/sources", label: "RSS Sources", icon: Rss },
    ],
  },
  {
    label: "Monetization",
    items: [
      { href: "/admin/campaigns", label: "Campaigns", icon: Megaphone },
    ],
  },
  {
    label: "Growth",
    items: [
      { href: "/admin/referrals", label: "Referrals", icon: Users },
      { href: "/admin/social", label: "Social Media", icon: Share2 },
    ],
  },
  {
    label: "Insights",
    items: [
      { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.push("/admin/login");
  };

  const isActive = (href: string, exact = false) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <aside
      className={`flex flex-col bg-gray-900 border-r border-gray-800 transition-all duration-300 flex-shrink-0 ${
        collapsed ? "w-16" : "w-56"
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-gray-800 flex-shrink-0">
        <div className="w-8 h-8 rounded-lg nepal-gradient flex items-center justify-center flex-shrink-0 shadow-lg">
          <span className="text-white text-sm">🇳🇵</span>
        </div>
        {!collapsed && (
          <div>
            <p className="text-sm font-black text-white leading-none">InShorts Nepal</p>
            <p className="text-[10px] text-gray-500 leading-none mt-0.5">Admin Panel</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-4 overflow-y-auto">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest px-3 mb-1">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href, item.exact);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${
                      active
                        ? "bg-red-600/20 text-red-400 border border-red-600/20"
                        : "text-gray-400 hover:bg-gray-800 hover:text-white"
                    }`}
                  >
                    <item.icon
                      className={`w-4 h-4 flex-shrink-0 ${active ? "text-red-400" : "text-gray-500 group-hover:text-white"}`}
                    />
                    {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="p-2 border-t border-gray-800 space-y-0.5">
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-400 hover:bg-gray-800 hover:text-white transition-all group"
        >
          <Globe className="w-4 h-4 flex-shrink-0 text-gray-500 group-hover:text-white" />
          {!collapsed && <span className="text-sm font-medium">View Site</span>}
        </Link>

        <button
          onClick={() => setCollapsed((c) => !c)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-400 hover:bg-gray-800 hover:text-white transition-all group"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4 flex-shrink-0" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm font-medium">Collapse</span>
            </>
          )}
        </button>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-400 hover:bg-red-600/20 hover:text-red-400 transition-all group"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Logout</span>}
        </button>
      </div>
    </aside>
  );
}
