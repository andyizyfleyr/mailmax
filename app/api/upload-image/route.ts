import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const BUCKET = "email-images";

export async function POST(req: NextRequest) {
  const { base64, mime } = await req.json();
  if (!base64) return NextResponse.json({ error: "Missing base64" }, { status: 400 });

  // Ensure bucket exists
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.find(b => b.name === BUCKET)) {
    await supabase.storage.createBucket(BUCKET, { public: true });
  }

  const ext = mime?.split("/")[1] || "png";
  const fileName = `${uuidv4()}.${ext}`;
  const buffer = Buffer.from(base64, "base64");

  const { data, error } = await supabase.storage.from(BUCKET).upload(fileName, buffer, {
    contentType: mime || "image/png",
    upsert: false,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: publicUrl } = supabase.storage.from(BUCKET).getPublicUrl(fileName);

  return NextResponse.json({ url: publicUrl.publicUrl });
}
