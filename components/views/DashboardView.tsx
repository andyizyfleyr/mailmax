"use client";

import { useState, useEffect } from "react";
import { Send, Users, Layers, Megaphone, BarChart2 } from "lucide-react";
import { DashboardStats } from "@/types";
import { StatCard, Card } from "@/components/ui";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

function fmt(n: number) { return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n); }

export function DashboardView({ stats }: { stats: DashboardStats | null }) {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimate(true), 100);
    return () => clearTimeout(t);
  }, []);

  if (!stats) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <div className="w-10 h-10 rounded-full border-2 border-[hsl(var(--primary))] border-t-transparent animate-spin" />
      <p className="text-xs text-[hsl(var(--muted))]">Chargement...</p>
    </div>
  );

  const maxSent = Math.max(...stats.recentActivity.map(d => d.sent), 1);

  return (
    <div className="pb-12 space-y-8">
      <div>
        <h2 className="font-display font-bold text-xl text-white">Dashboard</h2>
        <p className="text-sm text-[hsl(var(--muted))] mt-0.5">Vue d'ensemble de votre activité</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard value={fmt(stats.totalContacts)} label="Contacts" icon={<Users size={18} />} color="var(--primary)" />
        <StatCard value={fmt(stats.totalLists)} label="Listes" icon={<Layers size={18} />} color="var(--info)" />
        <StatCard value={fmt(stats.totalCampaigns)} label="Campagnes" icon={<Megaphone size={18} />} color="var(--success)" />
        <StatCard value={fmt(stats.totalSent)} label="Emails envoyés" icon={<Send size={18} />} color="var(--warning)" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="font-display font-bold text-base text-white">Activité</h3>
                <p className="text-xs text-[hsl(var(--muted))] mt-0.5">Emails envoyés par jour</p>
              </div>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.recentActivity} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gSent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4f8cff" stopOpacity={animate ? 0.35 : 0} />
                      <stop offset="50%" stopColor="#4f8cff" stopOpacity={animate ? 0.12 : 0} />
                      <stop offset="100%" stopColor="#4f8cff" stopOpacity={0} />
                    </linearGradient>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="2" result="blur" />
                      <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.2} />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--dim))", fontSize: 10 }} dy={8} interval="preserveStartEnd" />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--dim))", fontSize: 10 }} width={25} domain={[0, maxSent]} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--s1))", border: "1px solid hsl(var(--border))", borderRadius: "10px", fontSize: "13px" }}
                    cursor={{ stroke: "#4f8cff", strokeWidth: 1, strokeDasharray: "4 4" }}
                  />
                  <Area type="monotone" dataKey="sent" stroke="#4f8cff" strokeWidth={2.5} fill="url(#gSent)" name="Envoyés"
                    isAnimationActive={true} animationDuration={1500} animationEasing="ease-out" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card className="p-6 flex-1">
            <h3 className="font-display font-bold text-base text-white mb-1">Top Campagnes</h3>
            <p className="text-xs text-[hsl(var(--muted))] mb-6">Par nombre d'envois</p>
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
                      <span className="text-xs text-[hsl(var(--muted))]">{c.sent} env.</span>
                    </div>
                    <div className="h-1.5 bg-[hsl(var(--s2))] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, (c.sent / (Math.max(...stats.topCampaigns.map(x => x.sent), 1))) * 100)}%`, background: i === 0 ? "hsl(var(--primary))" : "hsl(var(--info))" }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
