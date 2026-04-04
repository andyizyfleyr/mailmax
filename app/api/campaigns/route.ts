import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/lib/supabase";
import { scheduledJobs, injectTracking } from "@/lib/store";
import { sendViaProvider } from "@/lib/sender";
import { runCampaign } from "@/lib/campaign-runner";

export async function GET() {
  const { data: campaignsRes } = await supabase.from("campaigns").select("*").order("created_at", { ascending: false });
  const campaigns = (campaignsRes || []).map(c => ({
    id: c.id, name: c.name, subject: c.subject, html: c.html,
    listId: c.list_id, provider: c.provider, fromName: c.from_name, fromEmail: c.from_email,
    status: c.status, scheduledAt: c.scheduled_at, sentAt: c.sent_at, createdAt: c.created_at,
    attachments: c.attachments || [],
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

  const { data: campaignData, error: insertError } = await supabase.from("campaigns").insert({
    name: body.name, subject: body.subject, html: body.html,
    list_id: body.listId, provider: body.provider,
    from_name: body.fromName, from_email: body.fromEmail,
    status: body.scheduledAt ? "scheduled" : "draft",
    scheduled_at: body.scheduledAt || null,
    attachments: body.attachments || [],
  }).select().single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 400 });

  const campaign = {
    id: campaignData.id, name: campaignData.name, subject: campaignData.subject, html: campaignData.html,
    listId: campaignData.list_id, provider: campaignData.provider, fromName: campaignData.from_name, fromEmail: campaignData.from_email,
    status: campaignData.status, scheduledAt: campaignData.scheduled_at, createdAt: campaignData.created_at,
    attachments: campaignData.attachments || [],
    stats: { total: 0, sent: 0, failed: 0, opens: 0, clicks: 0, unsubscribes: 0 },
  };

  // If scheduledAt, set up auto-send in background
  if (body.scheduledAt) {
    const delay = new Date(body.scheduledAt).getTime() - Date.now();
    if (delay > 0) {
      const job = setTimeout(() => {
        runCampaign(campaignData.id);
        scheduledJobs.delete(campaignData.id);
      }, delay);
      scheduledJobs.set(campaignData.id, job);
    }
  }

  return NextResponse.json(campaign);
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  const job = scheduledJobs.get(id);
  if (job) { clearTimeout(job); scheduledJobs.delete(id); }
  
  await supabase.from("campaigns").delete().eq("id", id);
  return NextResponse.json({ success: true });
}
