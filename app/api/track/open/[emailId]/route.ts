import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// 1x1 transparent GIF
const PIXEL = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

export async function GET(req: NextRequest, { params }: { params: { emailId: string } }) {
  const { emailId } = params;
  
  const { data: record } = await supabase.from("email_records").select("*").eq("id", emailId).single();
  
  if (record) {
    // Call supabase RPC for atomic increments, or simple update for now
    await supabase.from("email_records").update({ opens: record.opens + 1 }).eq("id", emailId);
    
    if (record.campaign_id) {
      const { data: c } = await supabase.from("campaigns").select("stats_opens").eq("id", record.campaign_id).single();
      if (c) {
        await supabase.from("campaigns").update({ stats_opens: c.stats_opens + 1 }).eq("id", record.campaign_id);
      }
    }
    
    await supabase.from("analytics_events").insert({
      type: "open",
      email_id: emailId,
      campaign_id: record.campaign_id,
      email: record.to,
      timestamp: new Date().toISOString()
    });
  }
  return new NextResponse(PIXEL, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
