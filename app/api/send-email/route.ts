import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { SendPayload } from "@/types";
import { supabase } from "@/lib/supabase";
import { scheduledJobs, injectTracking } from "@/lib/store";
import { sendViaProvider } from "@/lib/sender";

export async function POST(req: NextRequest) {
  const body: SendPayload = await req.json();
  const { provider, from, to, subject, html, attachments, scheduledAt } = body;
  const id = uuidv4();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const trackedHtml = injectTracking(html, id, baseUrl, to);

  // Scheduled
  if (scheduledAt) {
    const delay = new Date(scheduledAt).getTime() - Date.now();
    if (delay > 0) {
      await supabase.from("email_records").insert({
        id, provider, from, to, subject, status: "scheduled", scheduled_at: scheduledAt
      });
      
      const job = setTimeout(async () => {
        try {
          const providerId = await sendViaProvider({ provider, from, to, subject, html: trackedHtml, attachments });
          await supabase.from("email_records").update({ 
            status: "sent", 
            provider_id: providerId,
            timestamp: new Date().toISOString() 
          }).eq("id", id);
        } catch (err: unknown) {
          const error = err instanceof Error ? err.message : String(err);
          await supabase.from("email_records").update({ status: "failed", error, timestamp: new Date().toISOString() }).eq("id", id);
        }
        scheduledJobs.delete(id);
      }, delay);
      scheduledJobs.set(id, job);
      return NextResponse.json({ success: true, id, scheduled: true });
    }
  }

  // Immediate
  try {
    const providerId = await sendViaProvider({ provider, from, to, subject, html: trackedHtml, attachments });
    await supabase.from("email_records").insert({ id, provider, from, to, subject, provider_id: providerId, status: "sent" });
    return NextResponse.json({ success: true, id });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    await supabase.from("email_records").insert({ id, provider, from, to, subject, status: "failed", error });
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}

export async function GET() {
  const { data } = await supabase.from("email_records").select("*").order("timestamp", { ascending: false }).limit(100);
  const mapped = (data || []).map((r: any) => ({
    id: r.id, campaignId: r.campaign_id, provider: r.provider,
    from: r.from, to: r.to, subject: r.subject,
    status: r.status, error: r.error,
    opens: r.opens, clicks: r.clicks,
    timestamp: r.timestamp, scheduledAt: r.scheduled_at,
  }));
  return NextResponse.json(mapped);
}
