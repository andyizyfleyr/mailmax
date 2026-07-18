import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/lib/supabase";
import { injectTracking } from "@/lib/store";

export async function GET() {
  const { data: campaignsRes } = await supabase.from("campaigns").select("*").order("created_at", { ascending: false });
  const campaigns = (campaignsRes || []).map(c => ({
    id: c.id, name: c.name, subject: c.subject, html: c.html,
    listId: c.list_id, provider: c.provider, fromName: c.from_name, fromEmail: c.from_email,
    status: c.status, sentAt: c.sent_at, createdAt: c.created_at,
    errorMessage: c.error_message,
    stats: {
      total: c.stats_total, sent: c.stats_sent, failed: c.stats_failed,
      opens: c.stats_opens, clicks: c.stats_clicks, unsubscribes: c.stats_unsubscribes
    }
  }));
  return NextResponse.json(campaigns);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Log payload for debug (visible in Vercel logs)
  console.log("Campaign creation payload:", body);

  const { data: campaignData, error: insertError } = await supabase.from("campaigns").insert({
    name: body.name, 
    subject: body.subject, 
    html: body.html,
    list_id: body.listId, 
    provider: body.provider || "resend",
    from_name: body.fromName, 
    from_email: body.fromEmail,
    status: "draft",
    stats_total: 0,
    stats_sent: 0,
    stats_failed: 0,
    stats_opens: 0,
    stats_clicks: 0,
    stats_unsubscribes: 0
  }).select().single();

  if (insertError) {
    console.error("Supabase Insert Error:", insertError);
    return NextResponse.json({ error: insertError.message }, { status: 400 });
  }

  const campaign = {
    id: campaignData.id, name: campaignData.name, subject: campaignData.subject, html: campaignData.html,
    listId: campaignData.list_id, provider: campaignData.provider, fromName: campaignData.from_name, fromEmail: campaignData.from_email,
    status: campaignData.status, createdAt: campaignData.created_at,
    stats: { total: 0, sent: 0, failed: 0, opens: 0, clicks: 0, unsubscribes: 0 },
  };

  return NextResponse.json(campaign);
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();  
  await supabase.from("campaigns").delete().eq("id", id);
  return NextResponse.json({ success: true });
}
