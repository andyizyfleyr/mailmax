import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const emailId = searchParams.get("id") || "";
  const url = searchParams.get("url") || "/";

  const { data: record } = await supabase.from("email_records").select("*").eq("id", emailId).single();

  if (record) {
    // Call supabase RPC for atomic increments, or simple update for now
    await supabase.from("email_records").update({ clicks: record.clicks + 1 }).eq("id", emailId);

    if (record.campaign_id) {
      const { data: c } = await supabase.from("campaigns").select("stats_clicks").eq("id", record.campaign_id).single();
      if (c) {
        await supabase.from("campaigns").update({ stats_clicks: c.stats_clicks + 1 }).eq("id", record.campaign_id);
      }
    }

    await supabase.from("analytics_events").insert({
      type: "click",
      email_id: emailId,
      campaign_id: record.campaign_id,
      email: record.to,
      url,
      timestamp: new Date().toISOString(),
    });
  }

  return NextResponse.redirect(url);
}
