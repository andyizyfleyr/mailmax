import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const [contactsRes, listsRes, campaignsRes, recordsRes] = await Promise.all([
    supabase.from("contacts").select("id", { count: "exact", head: true }),
    supabase.from("lists").select("id", { count: "exact", head: true }),
    supabase.from("campaigns").select("id, name, stats_sent, sent_at"),
    supabase.from("email_records").select("status, campaign_id, timestamp"),
  ]);

  if (contactsRes.error) console.error("contacts error:", contactsRes.error);
  if (listsRes.error) console.error("lists error:", listsRes.error);
  if (campaignsRes.error) console.error("campaigns error:", campaignsRes.error);
  if (recordsRes.error) console.error("email_records error:", recordsRes.error);

  const totalContacts = contactsRes.count ?? 0;
  const totalLists = listsRes.count ?? 0;

  const campaigns = campaignsRes.data || [];
  const totalCampaigns = campaigns.length;

  const campaignSent = campaigns.reduce((sum: number, c: any) => sum + (c.stats_sent || 0), 0);

  const records = recordsRes.data || [];
  const composeSent = records.filter((r: any) => r.status === "sent" && !r.campaign_id).length;

  const totalSent = campaignSent + composeSent;

  const dailyMap = new Map<string, number>();
  const campaignIdsInRecords = new Set(records.filter(r => r.campaign_id).map(r => r.campaign_id));

  for (const r of records) {
    if (r.status !== "sent") continue;
    const day = (r.timestamp as string).slice(0, 10);
    dailyMap.set(day, (dailyMap.get(day) || 0) + 1);
  }

  for (const c of campaigns) {
    if (c.sent_at && c.stats_sent > 0 && !campaignIdsInRecords.has(c.id)) {
      const day = (c.sent_at as string).slice(0, 10);
      dailyMap.set(day, (dailyMap.get(day) || 0) + c.stats_sent);
    }
  }

  const allDays = Array.from(dailyMap.entries()).sort(([a], [b]) => a.localeCompare(b));

  const activity = allDays.map(([dateStr, count]) => {
    const d = new Date(dateStr + "T00:00:00Z");
    const label = d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" });
    return { date: label, sent: count };
  });

  if (activity.length === 0) {
    activity.push({ date: "Aujourd'hui", sent: 0 });
  }

  const topCampaigns = campaigns.map((c: any) => ({
    name: c.name,
    sent: c.stats_sent || 0,
  }));

  return NextResponse.json({
    totalContacts, totalLists, totalCampaigns, totalSent,
    recentActivity: activity, topCampaigns,
  });
}
