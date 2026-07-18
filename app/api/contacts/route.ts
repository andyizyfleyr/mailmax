import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const [contactsRes, listsRes] = await Promise.all([
    supabase.from("contacts").select("*").order("created_at", { ascending: false }).limit(100000),
    supabase.from("lists").select("*").order("created_at", { ascending: false }),
  ]);

  // Convert db casing back to camelCase for the frontend
  const contacts = (contactsRes.data || []).map(c => ({
    id: c.id, email: c.email, name: c.name, listId: c.list_id,
    subscribed: c.subscribed, createdAt: c.created_at, tags: c.tags,
  }));
  const lists = (listsRes.data || []).map(l => ({
    id: l.id, name: l.name, description: l.description, createdAt: l.created_at,
  }));

  return NextResponse.json({ contacts, lists });
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (body.type === "contact") {
    const { data: contact, error } = await supabase.from("contacts").insert({
      email: body.email,
      name: body.name,
      list_id: body.listId,
      tags: body.tags || [],
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({
      id: contact.id, email: contact.email, name: contact.name, listId: contact.list_id,
      subscribed: contact.subscribed, createdAt: contact.created_at, tags: contact.tags,
    });
  }

  if (body.type === "list") {
    const { data: list, error } = await supabase.from("lists").insert({
      name: body.name,
      description: body.description || "",
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({
      id: list.id, name: list.name, description: list.description, createdAt: list.created_at,
    });
  }

  if (body.type === "import") {
    const rowsToInsert = (body.rows as { email: string; name: string }[]).map(row => ({
      email: row.email,
      name: row.name || row.email,
      list_id: body.listId,
    }));

    if (rowsToInsert.length > 5000) {
      return NextResponse.json({ error: "Limite de 5000 contacts par import CSV." }, { status: 400 });
    }

    // Batch upsert — ignore les doublons (contrainte UNIQUE list_id+email)
    const chunkSize = 1000;
    let total = 0;
    let lastError: string | null = null;
    for (let i = 0; i < rowsToInsert.length; i += chunkSize) {
      const chunk = rowsToInsert.slice(i, i + chunkSize);
      const { data: inserted, error } = await supabase
        .from("contacts")
        .upsert(chunk, { onConflict: "list_id,email", ignoreDuplicates: true })
        .select();
      if (error) {
        lastError = error.message;
        break;
      }
      total += inserted?.length || 0;
    }

    return NextResponse.json({ imported: total, error: lastError });
  }

  return NextResponse.json({ error: "Unknown type" }, { status: 400 });
}

export async function DELETE(req: NextRequest) {
  const body = await req.json();
  const { id, ids } = body;
  if (ids && Array.isArray(ids)) {
    await supabase.from("contacts").delete().in("id", ids);
  } else if (id) {
    await supabase.from("contacts").delete().eq("id", id);
  }
  return NextResponse.json({ success: true });
}
