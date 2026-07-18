"use client";

import { LayoutDashboard, Send, Users, Megaphone, Zap, ChevronRight, AlignLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export type View = "dashboard" | "compose" | "contacts" | "campaigns";

const NAV = [
  { id: "dashboard" as View, label: "Dashboard", icon: <LayoutDashboard size={20} /> },
  { id: "compose" as View, label: "Compose", icon: <Send size={20} /> },
  { id: "contacts" as View, label: "Contacts", icon: <Users size={20} /> },
  { id: "campaigns" as View, label: "Campagnes", icon: <Megaphone size={20} /> },
];

export function Sidebar({ view, collapsed, onToggle }: {
  view: View;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const router = useRouter();

  return (
    <aside className={`fixed inset-y-0 left-0 flex flex-col z-50 border-r border-[hsl(var(--border))] bg-[hsl(var(--bg))] transition-all duration-200 ${collapsed ? "w-[68px]" : "w-60"}`}>
      <div className={`flex items-center gap-3 p-5 border-b border-[hsl(var(--border))] ${collapsed ? "justify-center px-0" : ""}`}>
        <div className="w-9 h-9 rounded-lg bg-[hsl(var(--primary)/0.12)] flex items-center justify-center shrink-0">
          <Zap size={18} className="text-[hsl(var(--primary))]" />
        </div>
        {!collapsed && (
          <div>
            <h1 className="font-display font-bold text-lg text-white leading-tight">MailMax</h1>
            <p className="text-[9px] text-[hsl(var(--dim))] font-medium leading-tight">Email Platform</p>
          </div>
        )}
      </div>

      <nav className="flex-1 px-2 py-4 space-y-1">
        {NAV.map(n => (
          <button key={n.id} onClick={() => { router.push(`/${n.id}`); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className={`nav-item w-full ${collapsed ? "justify-center px-0 py-3 group" : ""} ${view === n.id ? "active" : ""}`}>
            <span className={view === n.id ? "" : "opacity-70"}>{n.icon}</span>
            {!collapsed && <span>{n.label}</span>}
            {collapsed && (
              <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-[hsl(var(--s3))] text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-lg border border-[hsl(var(--border))]">
                {n.label}
              </div>
            )}
          </button>
        ))}
      </nav>

      <div className="p-2 border-t border-[hsl(var(--border))]">
        <button onClick={onToggle}
          className="w-full h-10 flex items-center justify-center rounded-lg bg-[hsl(var(--s2))] hover:bg-[hsl(var(--s3))] border border-[hsl(var(--border))] text-[hsl(var(--dim))] hover:text-white transition-all">
          {collapsed ? <ChevronRight size={18} /> : <AlignLeft size={18} />}
        </button>
      </div>
    </aside>
  );
}
