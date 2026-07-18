import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const [contactsRes, listsRes, campaignsRes, recordsRes] = await Promise.all([
    supabase.from("contacts").select("id", { count: "exact", head: true }),
    supabase.from("lists").select("id", { count: "exact", head: true }),
    supabase.from("campaigns").select("name, stats_sent").order("created_at", { ascending: false }).limit(5),
    supabase.from("email_records").select("status, timestamp"),
  ]);

  if (contactsRes.error) console.error("contacts error:", contactsRes.error);
  if (listsRes.error) console.error("lists error:", listsRes.error);
  if (campaignsRes.error) console.error("campaigns error:", campaignsRes.error);
  if (recordsRes.error) console.error("email_records error:", recordsRes.error);

  const totalContacts = contactsRes.count ?? 0;
  const totalLists = listsRes.count ?? 0;
  const totalCampaigns = campaignsRes.data?.length ?? 0;

  const records = recordsRes.data || [];
  const totalSent = records.filter((r: any) => r.status === "sent").length;

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

  const campaigns = campaignsRes.data || [];
  const topCampaigns = campaigns.map((c: any) => ({
    name: c.name,
    sent: c.stats_sent,
  }));

  return NextResponse.json({
    totalContacts, totalLists, totalCampaigns, totalSent,
    recentActivity, topCampaigns,
  });
}
