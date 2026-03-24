import { supabase } from "./supabase";
import { v4 as uuidv4 } from "uuid";
import { injectTracking } from "./store";
import { sendViaProvider } from "./sender";

export async function runCampaign(campaignId: string) {
  const { data: campaign } = await supabase.from("campaigns").select("*").eq("id", campaignId).single();
  if (!campaign) return;

  const { data: recipients } = await supabase.from("contacts").select("*").eq("list_id", campaign.list_id).eq("subscribed", true);
  if (!recipients || recipients.length === 0) {
    await supabase.from("campaigns").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", campaignId);
    return;
  }

  await supabase.from("campaigns").update({ status: "sending", stats_total: recipients.length }).eq("id", campaignId);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  let sent = 0, failed = 0;

  for (const contact of recipients) {
    const emailId = uuidv4();
    const personalizedHtml = campaign.html
      .replace(/\{\{name\}\}/gi, contact.name || "")
      .replace(/\{\{email\}\}/gi, contact.email);
    const trackedHtml = injectTracking(personalizedHtml, emailId, baseUrl, contact.email);

    try {
      await sendViaProvider({
        provider: campaign.provider as any,
        from: `${campaign.from_name} <${campaign.from_email}>`,
        to: contact.email,
        subject: campaign.subject,
        html: trackedHtml,
      });
      
      await supabase.from("email_records").insert({
        id: emailId, campaign_id: campaignId, provider: campaign.provider,
        from: campaign.from_email, to: contact.email, subject: campaign.subject, status: "sent"
      });
      sent++;
    } catch (err: unknown) {
      const error = err instanceof Error ? err.message : String(err);
      await supabase.from("email_records").insert({
        id: emailId, campaign_id: campaignId, provider: campaign.provider,
        from: campaign.from_email, to: contact.email, subject: campaign.subject, 
        status: "failed", error
      });
      failed++;
    }
    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 100));
  }

  await supabase.from("campaigns").update({ 
    status: "sent", sent_at: new Date().toISOString(),
    stats_sent: sent, stats_failed: failed 
  }).eq("id", campaignId);
}
