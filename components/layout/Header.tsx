import { RefreshCw } from "lucide-react";
import { View } from "./Sidebar";

const ICONS: Record<View, string> = {
  dashboard: "Dashboard",
  inbox: "Inbox",
  compose: "Compose",
  contacts: "Contacts",
  campaigns: "Campagnes",
  history: "Historique",
};

export function Header({ view, onRefresh, scrolled }: {
  view: View;
  onRefresh: () => void;
  scrolled: boolean;
}) {
  return (
    <header className={`sticky top-0 z-40 px-8 py-4 transition-all duration-200 ${scrolled ? "bg-[hsl(var(--bg)/0.8)] backdrop-blur-lg border-b border-[hsl(var(--border))]" : "bg-transparent"}`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-xl text-white">{ICONS[view]}</h2>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={onRefresh} className="w-9 h-9 rounded-lg flex items-center justify-center bg-[hsl(var(--s2))] border border-[hsl(var(--border))] text-[hsl(var(--dim))] hover:text-white transition-all">
            <RefreshCw size={16} />
          </button>
          <div className="flex items-center gap-3 pl-3 border-l border-[hsl(var(--border))]">
            <div className="w-8 h-8 rounded-lg bg-[hsl(var(--primary))] flex items-center justify-center text-xs font-bold text-white">
              AD
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
