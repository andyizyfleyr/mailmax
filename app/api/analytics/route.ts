import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getResendAnalytics } from "@/lib/resend-api";

export async function GET() {
  const [recordsRes, eventsRes, campaignsRes, resendData] = await Promise.all([
    supabase.from("email_records").select("status, timestamp"),
    supabase.from("analytics_events").select("type, timestamp"),
    supabase.from("campaigns").select("name, stats_opens, stats_clicks").order("created_at", { ascending: false }).limit(5),
    getResendAnalytics().catch(() => null),
  ]);

  if (recordsRes.error) console.error("email_records error:", recordsRes.error);
  if (eventsRes.error) console.error("analytics_events error:", eventsRes.error);
  if (campaignsRes.error) console.error("campaigns error:", campaignsRes.error);

  const records = recordsRes.data || [];
  const events = eventsRes.data || [];
  const campaigns = campaignsRes.data || [];

  const totalSent = records.filter((r: any) => r.status === "sent").length;

  let totalOpens: number;
  let totalClicks: number;
  let openRate: number;
  let clickRate: number;
  let recentActivity: { date: string; sent: number; opens: number; clicks: number }[];

  if (resendData) {
    totalOpens = resendData.totalOpens;
    totalClicks = resendData.totalClicks;
    openRate = resendData.openRate;
    clickRate = resendData.clickRate;
    recentActivity = resendData.recentActivity;

    const sentForRate = Math.max(totalSent, resendData.totalSent);
    openRate = sentForRate > 0 ? Math.round((totalOpens / sentForRate) * 100) : 0;
    clickRate = sentForRate > 0 ? Math.round((totalClicks / sentForRate) * 100) : 0;
  } else {
    totalOpens = events.filter((e: any) => e.type === "open").length;
    totalClicks = events.filter((e: any) => e.type === "click").length;
    openRate = totalSent > 0 ? Math.round((totalOpens / totalSent) * 100) : 0;
    clickRate = totalSent > 0 ? Math.round((totalClicks / totalSent) * 100) : 0;

    recentActivity = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dateStr = d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" });
      const dayStart = new Date(d); dayStart.setHours(0, 0, 0, 0); const dayStartStr = dayStart.toISOString();
      const dayEnd = new Date(d); dayEnd.setHours(23, 59, 59, 999); const dayEndStr = dayEnd.toISOString();
      return {
        date: dateStr,
        sent: records.filter((r: any) => r.status === "sent" && r.timestamp >= dayStartStr && r.timestamp <= dayEndStr).length,
        opens: events.filter((e: any) => e.type === "open" && e.timestamp >= dayStartStr && e.timestamp <= dayEndStr).length,
        clicks: events.filter((e: any) => e.type === "click" && e.timestamp >= dayStartStr && e.timestamp <= dayEndStr).length,
      };
    });
  }

  const topCampaigns = campaigns.map((c: any) => ({
    name: c.name,
    opens: c.stats_opens,
    clicks: c.stats_clicks,
  }));

  return NextResponse.json({
    totalSent,
    totalOpens,
    totalClicks,
    totalUnsubs: 0,
    openRate,
    clickRate,
    recentActivity,
    topCampaigns,
  });
}
