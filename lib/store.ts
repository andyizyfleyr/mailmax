import { Contact, ContactList, Campaign, EmailRecord, AnalyticsEvent } from "@/types";
import { v4 as uuidv4 } from "uuid";

// ---- CONTACTS ----
export let contacts: Contact[] = [
  { id: uuidv4(), email: "alice@example.com", name: "Alice Martin", listId: "list-1", subscribed: true, createdAt: new Date().toISOString(), tags: ["vip"] },
  { id: uuidv4(), email: "bob@example.com", name: "Bob Dupont", listId: "list-1", subscribed: true, createdAt: new Date().toISOString(), tags: [] },
  { id: uuidv4(), email: "carol@example.com", name: "Carol Bernard", listId: "list-2", subscribed: true, createdAt: new Date().toISOString(), tags: ["vip", "client"] },
];

export let lists: ContactList[] = [
  { id: "list-1", name: "Newsletter", description: "Abonnés newsletter", createdAt: new Date().toISOString() },
  { id: "list-2", name: "Clients VIP", description: "Clients premium", createdAt: new Date().toISOString() },
];

// ---- CAMPAIGNS ----
export let campaigns: Campaign[] = [
  {
    id: "campaign-1",
    name: "Lancement Printemps 2025",
    subject: "🌸 Notre nouvelle collection est arrivée !",
    html: "<h1>Nouvelle collection</h1><p>Découvrez nos dernières nouveautés.</p>",
    listId: "list-1",
    provider: "resend",
    fromName: "MailerFind",
    fromEmail: "hello@example.com",
    status: "sent",
    sentAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    attachments: [],
    stats: { total: 2, sent: 2, failed: 0, opens: 1, clicks: 0, unsubscribes: 0 },
  },
];

// ---- EMAIL RECORDS ----
export let emailRecords: EmailRecord[] = [];

// ---- ANALYTICS ----
export let analyticsEvents: AnalyticsEvent[] = [];

// ---- SCHEDULED JOBS ----
export const scheduledJobs = new Map<string, ReturnType<typeof setTimeout>>();

// ---- UNSUBSCRIBE TOKENS ----
export const unsubTokens = new Map<string, string>(); // token → email

export function generateUnsubToken(email: string): string {
  const token = Buffer.from(email).toString("base64url");
  unsubTokens.set(token, email);
  return token;
}

export function injectTracking(html: string, emailId: string, baseUrl: string, email?: string): string {
  // Replace {{unsubscribe}} placeholder
  let tracked = html.replace(/\{\{unsubscribe\}\}/gi, () => {
    const token = email ? generateUnsubToken(email) : "no-email";
    return `${baseUrl}/api/unsubscribe/${token}`;
  });

  // Wrap links
  tracked = tracked.replace(/href="(https?:\/\/[^"]+)"/g, (_, url) => {
    if (url.includes("/api/unsubscribe/")) return `href="${url}"`; // Don't wrap the unsub link again
    const encoded = encodeURIComponent(url);
    return `href="${baseUrl}/api/track/click?id=${emailId}&url=${encoded}"`;
  });
  // Add pixel
  const pixel = `<img src="${baseUrl}/api/track/open/${emailId}" width="1" height="1" style="display:none" alt="" />`;
  return tracked + pixel;
}

export function getDashboardStats() {
  const totalSent = emailRecords.filter(r => r.status === "sent").length;
  const totalOpens = analyticsEvents.filter(e => e.type === "open").length;
  const totalClicks = analyticsEvents.filter(e => e.type === "click").length;
  const totalUnsubs = analyticsEvents.filter(e => e.type === "unsubscribe").length;

  const openRate = totalSent > 0 ? Math.round((totalOpens / totalSent) * 100) : 0;
  const clickRate = totalSent > 0 ? Math.round((totalClicks / totalSent) * 100) : 0;
  const unsubscribeRate = totalSent > 0 ? Math.round((totalUnsubs / totalSent) * 100) : 0;

  // Last 7 days activity
  const recentActivity = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" });
    const dayStart = new Date(d); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(d); dayEnd.setHours(23, 59, 59, 999);
    return {
      date: dateStr,
      sent: emailRecords.filter(r => { const t = new Date(r.timestamp); return t >= dayStart && t <= dayEnd; }).length,
      opens: analyticsEvents.filter(e => { const t = new Date(e.timestamp); return e.type === "open" && t >= dayStart && t <= dayEnd; }).length,
      clicks: analyticsEvents.filter(e => { const t = new Date(e.timestamp); return e.type === "click" && t >= dayStart && t <= dayEnd; }).length,
    };
  });

  const topCampaigns = campaigns.slice(0, 5).map(c => ({
    name: c.name,
    opens: c.stats.opens,
    clicks: c.stats.clicks,
  }));

  return { totalSent, openRate, clickRate, unsubscribeRate, recentActivity, topCampaigns };
}
