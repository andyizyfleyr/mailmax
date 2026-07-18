import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { SendPayload } from "@/types";
import { supabase } from "@/lib/supabase";
import { injectTracking, getBaseUrl } from "@/lib/store";
import { sendViaProvider } from "@/lib/sender";

export async function POST(req: NextRequest) {
  const body: SendPayload = await req.json();
  const { provider, from, fromName, to, subject, html, attachments } = body;
  const id = uuidv4();
  const baseUrl = getBaseUrl();
  const trackedHtml = injectTracking(html, id, baseUrl, to);

  // Immediate
  try {
    const providerId = await sendViaProvider({ provider, from, fromName, to, subject, html: trackedHtml, attachments });
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
    timestamp: r.timestamp,
  }));
  return NextResponse.json(mapped);
}
