import { EmailProvider, EmailAttachment } from "@/types";

export async function sendViaProvider(opts: {
  provider: EmailProvider;
  from: string;
  fromName?: string;
  to: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
}) {
  const { from, fromName, to, subject, html, attachments } = opts;
  const fromAddr = fromName ? `${fromName} <${from}>` : from;

  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { data, error } = await resend.emails.send({
    from: fromAddr, to, subject, html,
    attachments: attachments?.map(a => ({
      filename: a.name,
      content: Buffer.from(a.content, "base64"),
    })),
  });
  if (error) throw new Error(error.message);
  return data?.id;
}
