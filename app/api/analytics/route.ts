import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getResendAnalytics } from "@/lib/resend-api";

export async function GET() {
  const [campaignsRes, resendData] = await Promise.all([
    supabase.from("campaigns").select("name, stats_opens, stats_clicks").order("created_at", { ascending: false }).limit(5),
    getResendAnalytics(),
  ]);

  if (campaignsRes.error) console.error("campaigns error:", campaignsRes.error);

  const campaigns = campaignsRes.data || [];
  const topCampaigns = campaigns.map((c: any) => ({
    name: c.name,
    opens: c.stats_opens,
    clicks: c.stats_clicks,
  }));

  return NextResponse.json({
    totalSent: resendData.totalSent,
    totalOpens: resendData.totalOpens,
    totalClicks: resendData.totalClicks,
    totalUnsubs: 0,
    openRate: resendData.openRate,
    clickRate: resendData.clickRate,
    recentActivity: resendData.recentActivity,
    topCampaigns: topCampaigns.length > 0 ? topCampaigns : resendData.topCampaigns,
  });
}
