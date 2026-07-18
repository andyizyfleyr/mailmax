import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const [contactsRes, listsRes, campaignsRes, recordsRes] = await Promise.all([
    supabase.from("contacts").select("id", { count: "exact", head: true }),
    supabase.from("lists").select("id", { count: "exact", head: true }),
    supabase.from("campaigns").select("name, stats_sent"),
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

  const recentActivity = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" });
    const dayStart = new Date(d); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(d); dayEnd.setHours(23, 59, 59, 999);
    const dayStartStr = dayStart.toISOString();
    const dayEndStr = dayEnd.toISOString();
    return {
      date: dateStr,
      sent: records.filter((r: any) => r.status === "sent" && r.timestamp >= dayStartStr && r.timestamp <= dayEndStr).length,
    };
  });

  const topCampaigns = campaigns.map((c: any) => ({
    name: c.name,
    sent: c.stats_sent || 0,
  }));

  return NextResponse.json({
    totalContacts, totalLists, totalCampaigns, totalSent,
    recentActivity, topCampaigns,
  });
}
