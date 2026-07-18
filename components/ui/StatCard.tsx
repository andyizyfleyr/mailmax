import { TrendingUp } from "lucide-react";

export function StatCard({ value, label, icon, color, delta, trend = "up" }: {
  value: string | number; label: string; icon: React.ReactNode; color: string; delta?: string; trend?: "up" | "down";
}) {
  return (
    <div className="stat-card" style={{ borderLeft: `3px solid hsl(${color})` }}>
      <div className="flex items-start justify-between">
        <div>
          <div className="stat-label">{label}</div>
          <div className="stat-value">{value}</div>
          {delta && (
            <div className="stat-delta" style={{ color: trend === "up" ? "hsl(var(--success))" : "hsl(var(--danger))" }}>
              <TrendingUp size={13} className={trend === "down" ? "rotate-180" : ""} />
              {delta}
            </div>
          )}
        </div>
        <div className="w-11 h-11 rounded-xl flex items-center justify-center"
             style={{ background: `hsl(${color} / 0.1)`, color: `hsl(${color})` }}>
          {icon}
        </div>
      </div>
    </div>
  );
}
