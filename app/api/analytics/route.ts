import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const [recordsRes, eventsRes, campaignsRes] = await Promise.all([
    supabase.from("email_records").select("status, timestamp"),
    supabase.from("analytics_events").select("type, timestamp"),
    supabase.from("campaigns").select("name, stats_opens, stats_clicks").order("created_at", { ascending: false }).limit(5),
  ]);

  if (recordsRes.error) console.error("email_records error:", recordsRes.error);
  if (eventsRes.error) console.error("analytics_events error:", eventsRes.error);
  if (campaignsRes.error) console.error("campaigns error:", campaignsRes.error);

  if (recordsRes.error || eventsRes.error) {
    return NextResponse.json({
      error: "Erreur de chargement des données",
      details: recordsRes.error?.message || eventsRes.error?.message,
    }, { status: 500 });
  }

  const records = recordsRes.data || [];
  const events = eventsRes.data || [];
  const campaigns = campaignsRes.data || [];

  const totalSent = records.filter((r: any) => r.status === "sent").length;
  const totalOpens = events.filter((e: any) => e.type === "open").length;
  const totalClicks = events.filter((e: any) => e.type === "click").length;
  const totalUnsubs = events.filter((e: any) => e.type === "unsubscribe").length;

  const openRate = totalSent > 0 ? Math.round((totalOpens / totalSent) * 100) : 0;
  const clickRate = totalSent > 0 ? Math.round((totalClicks / totalSent) * 100) : 0;
  const unsubscribeRate = totalSent > 0 ? Math.round((totalUnsubs / totalSent) * 100) : 0;

  // Last 7 days activity
  const recentActivity = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" });
    const dayStart = new Date(d); dayStart.setHours(0, 0, 0, 0); const dayStartStr = dayStart.toISOString();
    const dayEnd = new Date(d); dayEnd.setHours(23, 59, 59, 999); const dayEndStr = dayEnd.toISOString();
    
    return {
      date: dateStr,
      sent: records.filter((r: any) => r.timestamp >= dayStartStr && r.timestamp <= dayEndStr).length,
      opens: events.filter((e: any) => e.type === "open" && e.timestamp >= dayStartStr && e.timestamp <= dayEndStr).length,
      clicks: events.filter((e: any) => e.type === "click" && e.timestamp >= dayStartStr && e.timestamp <= dayEndStr).length,
    };
  });

  const topCampaigns = campaigns.map((c: any) => ({
    name: c.name,
    opens: c.stats_opens,
    clicks: c.stats_clicks,
  }));

  return NextResponse.json({ totalSent, totalOpens, totalClicks, totalUnsubs, openRate, clickRate, recentActivity, topCampaigns });
}
