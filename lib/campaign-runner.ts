import { supabase } from "./supabase";
import { v4 as uuidv4 } from "uuid";
import { injectTracking, getBaseUrl } from "./store";
import { sendViaProvider } from "./sender";

export async function runCampaign(campaignId: string) {
  try {
    const { data: campaign, error: fetchErr } = await supabase.from("campaigns").select("*").eq("id", campaignId).single();
    if (fetchErr || !campaign) {
      console.error("Campaign not found:", campaignId);
      return;
    }

    const { data: recipients, error: recErr } = await supabase.from("contacts")
      .select("*")
      .eq("list_id", campaign.list_id)
      .eq("subscribed", true);

    if (recErr || !recipients || recipients.length === 0) {
      await supabase.from("campaigns").update({ 
        status: "sent", 
        sent_at: new Date().toISOString(),
        stats_total: 0
      }).eq("id", campaignId);
      return;
    }

    // Update with total to show progress and clear any old error
    await supabase.from("campaigns").update({ 
      status: "sending", 
      stats_total: recipients.length,
      stats_sent: 0,
      stats_failed: 0,
      error_message: null
    }).eq("id", campaignId);

    const baseUrl = getBaseUrl();
    let sent = 0, failed = 0;

    for (const contact of recipients) {
      const emailId = uuidv4();
      const personalizedHtml = (campaign.html || "")
        .replace(/\{\{name\}\}/gi, contact.name || "")
        .replace(/\{\{email\}\}/gi, contact.email);
      const trackedHtml = injectTracking(personalizedHtml, emailId, baseUrl, contact.email);

      try {
        const providerId = await sendViaProvider({
          provider: campaign.provider as any,
          from: `${campaign.from_name} <${campaign.from_email}>`,
          to: contact.email,
          subject: campaign.subject,
          html: trackedHtml,
          attachments: campaign.attachments || [],
        });
        
        await supabase.from("email_records").insert({
          id: emailId, campaign_id: campaignId, provider: campaign.provider,
          provider_id: providerId,
          from: campaign.from_email, to: contact.email, subject: campaign.subject, status: "sent"
        });
        sent++;
      } catch (err: any) {
        failed++;
        await supabase.from("email_records").insert({
          id: emailId, campaign_id: campaignId, provider: campaign.provider,
          from: campaign.from_email, to: contact.email, subject: campaign.subject, 
          status: "failed", error: err.message || String(err)
        });
      }
      
      // Heartbeat update every 5 emails or at the end
      if (sent % 5 === 0) {
        await supabase.from("campaigns").update({ stats_sent: sent, stats_failed: failed }).eq("id", campaignId);
      }
      
      await new Promise(r => setTimeout(r, 100)); // Rate limit safeguard
    }

    await supabase.from("campaigns").update({ 
      status: "sent", 
      sent_at: new Date().toISOString(),
      stats_sent: sent, 
      stats_failed: failed 
    }).eq("id", campaignId);

  } catch (globalErr: any) {
    console.error("Global campaign failure:", globalErr);
    await supabase.from("campaigns").update({ 
      status: "failed", 
      error_message: globalErr.message || String(globalErr) 
    }).eq("id", campaignId);
  }
}
