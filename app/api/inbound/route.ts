import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Resend Inbound Webhook structure
    // from: { email: '...', name: '...' }
    // to: [{ email: '...' }]
    // subject: '...'
    // html: '...'
    // text: '...'
    
    const from = body.from?.email || "unknown";
    const name = body.from?.name || "";
    const to = Array.isArray(body.to) ? body.to[0]?.email : (body.to?.email || "unknown");
    const subject = body.subject || "(Pas d'objet)";
    const html = body.html || "";
    const text = body.text || "";

    const { error } = await supabase.from("inbound_emails").insert({
      from_email: from,
      from_name: name,
      to,
      subject,
      html,
      text,
      status: "unread",
      timestamp: new Date().toISOString()
    });

    if (error) throw error;
    return NextResponse.json({ success: true });
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
