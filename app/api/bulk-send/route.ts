import { NextRequest, NextResponse } from "next/server";
import { runCampaign } from "@/lib/campaign-runner";

export async function POST(req: NextRequest) {
  const { campaignId } = await req.json();
  
  // Launch in background
  runCampaign(campaignId);

  return NextResponse.json({ success: true, message: "Campaign sending started in background" });
}
