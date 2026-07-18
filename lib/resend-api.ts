const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_API = "https://api.resend.com";

interface ResendEmail {
  id: string;
  to: string[];
  from: string;
  created_at: string;
  subject: string;
  last_event: string;
}

interface ResendListResponse<T> {
  object: "list";
  has_more: boolean;
  data: T[];
}

async function resendFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${RESEND_API}${path}`, {
    headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`Resend API error ${res.status}: ${body}`);
    throw new Error(`Resend API error ${res.status}: ${body}`);
  }
  return res.json();
}

export async function listEmails(limit = 100): Promise<ResendEmail[]> {
  const all: ResendEmail[] = [];
  let after: string | undefined;
  let hasMore = true;

  while (hasMore && all.length < 500) {
    const params = new URLSearchParams({ limit: String(limit) });
    if (after) params.set("after", after);

    const page = await resendFetch<ResendListResponse<ResendEmail>>(`/emails?${params}`);
    all.push(...page.data);
    hasMore = page.has_more;
    if (page.data.length > 0) after = page.data[page.data.length - 1].id;
    else hasMore = false;
  }
  return all;
}

export async function getResendAnalytics() {
  const emails = await listEmails().catch(e => {
    console.error("Failed to list emails from Resend:", e);
    return null;
  });

  if (!emails) return null;

  const totalSent = emails.length;
  const opened = emails.filter(e => e.last_event === "opened").length;
  const clicked = emails.filter(e => e.last_event === "clicked").length;
  const delivered = emails.filter(e => e.last_event === "delivered").length;
  const bounced = emails.filter(e => e.last_event === "bounced").length;

  const activityMap = new Map<string, { sent: number; opens: number; clicks: number }>();

  for (const e of emails) {
    const day = e.created_at.slice(0, 10);
    const entry = activityMap.get(day) || { sent: 0, opens: 0, clicks: 0 };
    entry.sent++;
    if (e.last_event === "opened") entry.opens++;
    if (e.last_event === "clicked") entry.clicks++;
    activityMap.set(day, entry);
  }

  const recentActivity = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" });
    const key = d.toISOString().slice(0, 10);
    const day = activityMap.get(key) || { sent: 0, opens: 0, clicks: 0 };
    return { date: dateStr, sent: day.sent, opens: day.opens, clicks: day.clicks };
  });

  const sentForRate = totalSent || 1;

  return {
    totalSent,
    totalOpens: opened,
    totalClicks: clicked,
    openRate: Math.round((opened / sentForRate) * 100),
    clickRate: Math.round((clicked / sentForRate) * 100),
    recentActivity,
    topCampaigns: [] as { name: string; opens: number; clicks: number }[],
  };
}
