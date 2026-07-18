"use client";

import { View } from "./Sidebar";

const LABELS: Record<View, string> = {
  dashboard: "Dashboard",
  inbox: "Inbox",
  compose: "Compose",
  contacts: "Contacts",
  campaigns: "Campagnes",
  history: "Historique",
};

export function Header({ view, scrolled }: {
  view: View;
  scrolled: boolean;
}) {
  return (
    <header className={`sticky top-0 z-40 px-8 py-4 transition-all duration-200 ${scrolled ? "bg-[hsl(var(--bg)/0.8)] backdrop-blur-lg border-b border-[hsl(var(--border))]" : "bg-transparent"}`}>
      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold text-xl text-white">{LABELS[view]}</h2>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[hsl(var(--primary))] flex items-center justify-center text-xs font-bold text-white">
            AD
          </div>
        </div>
      </div>
    </header>
  );
}
