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

    // 2. FILTRAGE DES ÉVÉNEMENTS
    if (event.type === "email.received" && event.data?.email_id) {
      const { data: email, error: fetchErr } = await resend.emails.receiving.get(event.data.email_id);

      if (fetchErr) throw fetchErr;
      if (!email) throw new Error("No email found for this ID");

      // Gestion des pièces jointes
      let attachments: any[] = [];
      if (email.attachments && email.attachments.length > 0) {
        const { data: attList } = await resend.emails.receiving.attachments.list({ 
          emailId: event.data.email_id 
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

    // Réponse par défaut pour les autres types d'événements (sent, delivered, etc.)
    return NextResponse.json({ success: true, message: `Event ${event.type} processed (no-op)` });

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
