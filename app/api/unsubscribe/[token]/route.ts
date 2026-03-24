import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { unsubTokens } from "@/lib/store";

export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  const { token } = params;
  const email = unsubTokens.get(token) || Buffer.from(token, "base64url").toString();

  const { data: contact } = await supabase.from("contacts").select("*").eq("email", email).single();
  
  if (contact) {
    await supabase.from("contacts").update({ subscribed: false }).eq("id", contact.id);
    await supabase.from("analytics_events").insert({
      type: "unsubscribe",
      email,
      timestamp: new Date().toISOString(),
    });
  }

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Désabonnement</title>
  <style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0a0a0f;color:#e8e8f0}
  .box{text-align:center;padding:40px;border:1px solid #1e1e32;border-radius:16px;background:#0f0f1a;max-width:400px}
  h2{color:#00d4ff;margin-bottom:8px}p{color:#6666aa;margin:0}</style></head>
  <body><div class="box"><h2>✓ Désabonnement confirmé</h2>
  <p>${email} a été retiré de notre liste.<br/>Vous ne recevrez plus d'emails de notre part.</p></div></body></html>`;

  return new NextResponse(html, { headers: { "Content-Type": "text/html" } });
}
