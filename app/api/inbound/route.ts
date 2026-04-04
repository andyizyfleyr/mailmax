import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const event = JSON.parse(rawBody);

    // 1. VÉRIFICATION DE LA SIGNATURE (SÉCURITÉ)
    const secret = process.env.RESEND_WEBHOOK_SECRET;
    if (secret) {
      const headers = {
        "id": req.headers.get("svix-id") || "",
        "timestamp": req.headers.get("svix-timestamp") || "",
        "signature": req.headers.get("svix-signature") || "",
      };

      try {
        await resend.webhooks.verify({
          payload: rawBody,
          headers,
          webhookSecret: secret,
        });
      } catch (err) {
        console.error("Signature verification failed:", err);
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    // 2. GESTION DES ÉVÉNEMENTS (Inbound + Tracking)
    const eventType = event.type;
    const providerId = event.data?.email_id;

    if (!providerId) {
      return NextResponse.json({ success: true, message: "No provider ID found" });
    }

    // A. Emails entrants (Inbound)
    if (eventType === "email.received") {
      const { data: email, error: fetchErr } = await resend.emails.receiving.get(providerId);

      if (fetchErr) throw fetchErr;
      if (!email) throw new Error("No email found for this ID");

      // Gestion des pièces jointes
      let attachments: any[] = [];
      if (email.attachments && email.attachments.length > 0) {
        const { data: attList } = await resend.emails.receiving.attachments.list({ 
          emailId: providerId 
        });
        
        if (attList && Array.isArray(attList)) {
          for (const att of (attList as any[])) {
            const resp = await fetch(att.download_url);
            if (resp.ok) {
              const buffer = Buffer.from(await resp.arrayBuffer());
              attachments.push({
                name: att.filename,
                type: att.content_type,
                content: buffer.toString("base64")
              });
            }
          }
        }
      }

      const fromRaw = email.from || "unknown";
      let fromEmail = fromRaw;
      let fromName = "";
      if (fromRaw.includes("<")) {
        const match = fromRaw.match(/(.*)<(.*)>/);
        if (match) {
          fromName = match[1].trim();
          fromEmail = match[2].trim();
        }
      }

      const { error } = await supabase.from("inbound_emails").insert({
        from_email: fromEmail,
        from_name: fromName,
        to: Array.isArray(email.to) ? email.to.join(", ") : (email.to || "unknown"),
        subject: email.subject || "(Pas d'objet)",
        html: email.html || "",
        text: email.text || "",
        attachments: attachments,
        status: "unread",
        timestamp: email.created_at || new Date().toISOString()
      });

      if (error) throw error;
      return NextResponse.json({ success: true, message: "Email received and stored" });
    }

    // B. Statistiques (Tracking)
    const trackingEvents = ["email.delivered", "email.opened", "email.clicked", "email.bounced"];
    if (trackingEvents.includes(eventType)) {
      // 1. Trouver le record correspondant
      const { data: record } = await supabase
        .from("email_records")
        .select("id, campaign_id, opens, clicks")
        .eq("provider_id", providerId)
        .single();

      if (!record) {
        return NextResponse.json({ success: true, message: "Record not found for tracking" });
      }

      // 2. Mettre à jour le record
      let updates: any = {};
      if (eventType === "email.delivered") updates.status = "delivered";
      if (eventType === "email.opened") {
        updates.opens = (record.opens || 0) + 1;
        // Ajouter un événement d'analytics
        await supabase.from("analytics_events").insert({
          email_id: record.id,
          campaign_id: record.campaign_id,
          type: "open",
          email: event.data.to?.[0] || "unknown",
        });
      }
      if (eventType === "email.clicked") {
        updates.clicks = (record.clicks || 0) + 1;
        await supabase.from("analytics_events").insert({
          email_id: record.id,
          campaign_id: record.campaign_id,
          type: "click",
          email: event.data.to?.[0] || "unknown",
          url: event.data.click?.url,
        });
      }
      if (eventType === "email.bounced") updates.status = "bounced";

      await supabase.from("email_records").update(updates).eq("id", record.id);

      // 3. Mettre à jour les stats globales de la campagne
      if (["email.opened", "email.clicked"].includes(eventType)) {
        const field = eventType === "email.opened" ? "stats_opens" : "stats_clicks";
        const { data: camp } = await supabase.from("campaigns").select("stats_opens, stats_clicks").eq("id", record.campaign_id).single();
        if (camp) {
          const currentValue = (camp as any)[field] || 0;
          await supabase.from("campaigns").update({ [field]: currentValue + 1 }).eq("id", record.campaign_id);
        }
      }

      return NextResponse.json({ success: true, message: `Stats updated for ${eventType}` });
    }

    return NextResponse.json({ success: true, message: `Event ${eventType} processed (no-op)` });

  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    console.error("Inbound Webhook Error:", error);
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}

export async function GET() {
  const { data, error } = await supabase
    .from("inbound_emails")
    .select("*")
    .order("timestamp", { ascending: false })
    .limit(100);
    
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function PATCH(req: NextRequest) {
  const { id, status } = await req.json();
  const { error } = await supabase
    .from("inbound_emails")
    .update({ status })
    .eq("id", id);
    
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID requis" }, { status: 400 });
  
  const { error } = await supabase.from("inbound_emails").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
