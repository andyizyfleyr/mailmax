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

interface ResendEvent {
  id: string;
  type: string;
  created_at: string;
  data: {
    email_id: string;
    to: string[];
    tag: string | null;
  };
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
    console.error(`Resend API error ${res.status}: ${await res.text()}`);
    throw new Error(`Resend API error ${res.status}`);
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

export async function listEvents(limit = 100): Promise<ResendEvent[]> {
  const all: ResendEvent[] = [];
  let after: string | undefined;
  let hasMore = true;

  while (hasMore && all.length < 500) {
    const params = new URLSearchParams({ limit: String(limit) });
    if (after) params.set("after", after);

    const page = await resendFetch<ResendListResponse<ResendEvent>>(`/events?${params}`);
    all.push(...page.data);
    hasMore = page.has_more;
    if (page.data.length > 0) after = page.data[page.data.length - 1].id;
    else hasMore = false;
  }
  return all;
}

export async function getResendAnalytics() {
  const [emails, events] = await Promise.all([
    listEmails().catch(e => { console.error("Failed to list emails:", e); return [] as ResendEmail[]; }),
    listEvents().catch(e => { console.error("Failed to list events:", e); return [] as ResendEvent[]; }),
  ]);

  const totalSent = emails.length;

  const openEvents = events.filter(e => e.type === "email.opened").length;
  const clickEvents = events.filter(e => e.type === "email.clicked").length;
  const bounceEvents = events.filter(e => e.type === "email.bounced").length;
  const complaintEvents = events.filter(e => e.type === "email.complained").length;

  const openedEmails = new Set(
    events.filter(e => e.type === "email.opened").map(e => e.data.email_id)
  ).size;
  const clickedEmails = new Set(
    events.filter(e => e.type === "email.clicked").map(e => e.data.email_id)
  ).size;

  const activityMap = new Map<string, { sent: number; opens: number; clicks: number }>();

  for (const e of emails) {
    const day = e.created_at.slice(0, 10);
    const entry = activityMap.get(day) || { sent: 0, opens: 0, clicks: 0 };
    entry.sent++;
    activityMap.set(day, entry);
  }

  for (const e of events) {
    const day = e.created_at.slice(0, 10);
    const entry = activityMap.get(day) || { sent: 0, opens: 0, clicks: 0 };
    if (e.type === "email.opened") entry.opens++;
    if (e.type === "email.clicked") entry.clicks++;
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

  return {
    totalSent,
    totalOpens: openEvents,
    totalClicks: clickEvents,
    totalBounces: bounceEvents,
    totalComplaints: complaintEvents,
    uniqueOpens: openedEmails,
    uniqueClicks: clickedEmails,
    openRate: totalSent > 0 ? Math.round((openedEmails / totalSent) * 100) : 0,
    clickRate: totalSent > 0 ? Math.round((clickedEmails / totalSent) * 100) : 0,
    recentActivity,
    topCampaigns: [] as { name: string; opens: number; clicks: number }[],
  };
}
