"use client";

import { useState } from "react";
import { Eye, MousePointer, History, RefreshCw } from "lucide-react";
import { EmailRecord } from "@/types";
import { Card, Badge, Button } from "@/components/ui";

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return "À l'instant";
  if (diff < 3600000) return `il y a ${Math.floor(diff / 60000)}min`;
  if (diff < 86400000) return `il y a ${Math.floor(diff / 3600000)}h`;
  return new Date(iso).toLocaleDateString("fr-FR");
}

const STATUS_VARIANTS: Record<string, "success" | "danger" | "warning"> = {
  sent: "success",
  failed: "danger",
  scheduled: "warning",
};

export function HistoryView({ records, onRefresh }: { records: EmailRecord[]; onRefresh: () => void }) {
  const [filter, setFilter] = useState("all");
  const filtered = records.filter(r => filter === "all" || r.status === filter);

  return (
    <div className="pb-12">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display font-bold text-xl text-white">Journal d'Activité</h2>
          <p className="text-sm text-[hsl(var(--muted))] mt-0.5">Historique des envois</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-[hsl(var(--s1))] rounded-lg border border-[hsl(var(--border))] p-0.5">
            {["all", "sent", "failed", "scheduled"].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-all ${filter === f ? "bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]" : "text-[hsl(var(--dim))] hover:text-white"}`}>
                {f === "all" ? "Tous" : f}
              </button>
            ))}
          </div>
          <Button variant="ghost" onClick={onRefresh}><RefreshCw size={15} /></Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="table-row font-medium text-[11px] uppercase tracking-wider text-[hsl(var(--dim))] bg-[hsl(var(--s1)/0.5)]"
             style={{ gridTemplateColumns: "80px 1.5fr 2fr 80px 80px 100px 120px" }}>
          <span>Source</span><span>Expéditeur</span><span>Objet</span><span className="text-center">Ouvert</span><span className="text-center">Clic</span><span>Statut</span><span className="text-right">Date</span>
        </div>

        {filtered.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center text-center">
            <History size={36} className="text-[hsl(var(--dim))] mb-4 opacity-30" />
            <h3 className="font-display font-bold text-lg text-white mb-1">Aucun enregistrement</h3>
            <p className="text-sm text-[hsl(var(--muted))]">L'historique apparaîtra après vos envois.</p>
          </div>
        ) : (
          <div className="divide-y divide-[hsl(var(--border)/0.5)]">
            {filtered.map((r, i) => (
              <div key={r.id} className="table-row hover:bg-[hsl(var(--s2)/0.2)]"
                   style={{ gridTemplateColumns: "80px 1.5fr 2fr 80px 80px 100px 120px" }}>
                <span className="text-xs font-medium text-[hsl(var(--primary))]">{r.provider}</span>
                <span className="truncate text-xs text-[hsl(var(--muted))]">{r.from}</span>
                <span className="truncate text-sm font-medium text-white">{r.subject}</span>
                <span className="flex items-center justify-center gap-1.5 text-xs">
                  <Eye size={12} className={r.opens > 0 ? "text-[hsl(var(--primary))]" : "text-[hsl(var(--dim))]"} />
                  <span className={r.opens > 0 ? "text-white font-medium" : "text-[hsl(var(--dim))]"}>{r.opens}</span>
                </span>
                <span className="flex items-center justify-center gap-1.5 text-xs">
                  <MousePointer size={12} className={r.clicks > 0 ? "text-[hsl(var(--success))]" : "text-[hsl(var(--dim))]"} />
                  <span className={r.clicks > 0 ? "text-white font-medium" : "text-[hsl(var(--dim))]"}>{r.clicks}</span>
                </span>
                <span><Badge variant={STATUS_VARIANTS[r.status] || "muted"}>{r.status}</Badge></span>
                <span className="text-xs text-[hsl(var(--dim))] text-right font-mono">{relTime(r.timestamp)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
