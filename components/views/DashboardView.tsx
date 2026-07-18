"use client";

import { Send, Eye, MousePointer, UserMinus, BarChart2, TrendingUp } from "lucide-react";
import { DashboardStats } from "@/types";
import { StatCard, Card } from "@/components/ui";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

function fmt(n: number) { return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n); }

export function DashboardView({ stats }: { stats: DashboardStats | null }) {
  if (!stats) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <div className="w-10 h-10 rounded-full border-2 border-[hsl(var(--primary))] border-t-transparent animate-spin" />
      <p className="text-xs text-[hsl(var(--muted))]">Chargement...</p>
    </div>
  );

  return (
    <div className="pb-12 space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="font-display font-bold text-xl text-white">Dashboard</h2>
          <p className="text-sm text-[hsl(var(--muted))] mt-0.5">Vue d'ensemble de votre activité</p>
        </div>
        <div className="flex bg-[hsl(var(--s1))] rounded-lg border border-[hsl(var(--border))] p-0.5">
          {["7J", "30J", "YTD"].map(d => (
            <button key={d} className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-all ${d === "7J" ? "bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]" : "text-[hsl(var(--dim))] hover:text-white"}`}>
              {d}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard value={fmt(stats.totalSent)} label="Emails envoyés" icon={<Send size={18} />} color="var(--primary)" />
        <StatCard value={fmt(stats.totalOpens)} label="Ouvertures" icon={<Eye size={18} />} color="var(--info)" />
        <StatCard value={fmt(stats.totalClicks)} label="Clics" icon={<MousePointer size={18} />} color="var(--success)" />
        <StatCard value={fmt(stats.totalUnsubs)} label="Désabonnements" icon={<UserMinus size={18} />} color="var(--danger)" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="font-display font-bold text-base text-white">Performance</h3>
                <p className="text-xs text-[hsl(var(--muted))] mt-0.5">Activité des 7 derniers jours</p>
              </div>
              <span className="text-xs text-[hsl(var(--success))] font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--success))]" />
                En direct
              </span>
            </div>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.recentActivity} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gSent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gOpens" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--info))" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="hsl(var(--info))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.5} />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--dim))", fontSize: 11 }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--dim))", fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--s1))", border: "1px solid hsl(var(--border))", borderRadius: "10px", fontSize: "13px" }}
                    cursor={{ stroke: "hsl(var(--primary) / 0.3)", strokeWidth: 1 }}
                  />
                  <Area type="monotone" dataKey="sent" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#gSent)" name="Envoyés" />
                  <Area type="monotone" dataKey="opens" stroke="hsl(var(--info))" strokeWidth={2.5} fill="url(#gOpens)" name="Ouverts" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card className="p-6 flex-1">
            <h3 className="font-display font-bold text-base text-white mb-1">Top Campagnes</h3>
            <p className="text-xs text-[hsl(var(--muted))] mb-6">Par taux d'ouverture</p>
            {stats.topCampaigns.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 opacity-30 gap-2 border border-dashed border-[hsl(var(--border))] rounded-lg">
                <BarChart2 size={28} />
                <p className="text-xs">Aucune campagne</p>
              </div>
            ) : (
              <div className="space-y-5">
                {stats.topCampaigns.slice(0, 4).map((c, i) => (
                  <div key={i}>
                    <div className="flex justify-between items-center mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold" style={{ color: i === 0 ? "hsl(var(--primary))" : "hsl(var(--dim))" }}>
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="text-sm font-medium text-white truncate max-w-[130px]">{c.name}</span>
                      </div>
                      <span className="text-xs text-[hsl(var(--muted))]">{c.opens} ouvs</span>
                    </div>
                    <div className="h-1.5 bg-[hsl(var(--s2))] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, (c.opens / (stats.totalSent || 1)) * 100)}%`, background: i === 0 ? "hsl(var(--primary))" : "hsl(var(--info))" }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <div className="grid grid-cols-1 gap-4">
            {[
              { icon: <TrendingUp size={16} />, title: "Taux d'ouverture", value: "Objectif: 30%+", color: "var(--primary)", desc: "Objets courts et personnalisés." },
              { icon: <MousePointer size={16} />, title: "Taux de clic", value: "Objectif: 7%+", color: "var(--success)", desc: "Un seul CTA visible." },
            ].map((t, i) => (
              <Card key={i} className="p-4 flex items-start gap-4">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `hsl(${t.color} / 0.1)`, color: `hsl(${t.color})` }}>
                  {t.icon}
                </div>
                <div>
                  <div className="text-xs font-medium text-[hsl(var(--muted))]">{t.title}</div>
                  <div className="text-sm font-bold text-white">{t.value}</div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
