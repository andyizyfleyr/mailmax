export type EmailProvider = "resend";

export interface Contact {
  id: string;
  email: string;
  name: string;
  listId: string;
  subscribed: boolean;
  createdAt: string;
  tags: string[];
}

export interface ContactList {
  id: string;
  name: string;
  description: string;
  createdAt: string;
}

export interface Campaign {
  id: string;
  name: string;
  subject: string;
  html: string;
  listId: string;
  provider: EmailProvider;
  fromName: string;
  fromEmail: string;
  status: "draft" | "scheduled" | "sending" | "sent" | "failed";
  scheduledAt?: string;
  sentAt?: string;
  createdAt: string;
  stats: {
    total: number;
    sent: number;
    failed: number;
    opens: number;
    clicks: number;
    unsubscribes: number;
  };
}

export interface EmailRecord {
  id: string;
  campaignId?: string;
  provider: EmailProvider;
  from: string;
  to: string;
  subject: string;
  status: "sent" | "failed" | "scheduled";
  error?: string;
  opens: number;
  clicks: number;
  timestamp: string;
  scheduledAt?: string;
}

export interface AnalyticsEvent {
  type: "open" | "click" | "unsubscribe";
  emailId: string;
  campaignId?: string;
  email: string;
  url?: string;
  timestamp: string;
}

export interface EmailAttachment {
  name: string;
  content: string;
  type: string;
}

export interface SendPayload {
  provider: EmailProvider;
  from: string;
  to: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
  scheduledAt?: string;
}

export interface BulkSendPayload {
  campaignId: string;
}

export interface DashboardStats {
  totalSent: number;
  openRate: number;
  clickRate: number;
  unsubscribeRate: number;
  recentActivity: { date: string; sent: number; opens: number; clicks: number }[];
  topCampaigns: { name: string; opens: number; clicks: number }[];
}
