import { NextRequest, NextResponse } from "next/server";
import { runCampaign } from "@/lib/campaign-runner";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { campaignId } = await req.json();
  
  // Set to sending immediately so UI reflects it
  await supabase.from("campaigns").update({ status: "sending" }).eq("id", campaignId);

  // Run campaign. If it's a small list, await it. 
  // For long lists, we should use a queue, but here we'll await as a safeguard.
  await runCampaign(campaignId);

  return NextResponse.json({ success: true, message: "Campaign sending completed" });
}
