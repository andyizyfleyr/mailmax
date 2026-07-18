"use client";

import { useState, useEffect } from "react";
import { LayoutDashboard, Send, Users, Megaphone, History, Inbox } from "lucide-react";
import type { DashboardStats, Contact, ContactList, Campaign, EmailRecord, InboundEmail } from "@/types";
import { LoginGate } from "@/components/auth/LoginGate";
import { Sidebar, View } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { DashboardView } from "@/components/views/DashboardView";
import { InboxView } from "@/components/views/InboxView";
import { ComposeView } from "@/components/views/ComposeView";
import { ContactsView } from "@/components/views/ContactsView";
import { CampaignsView } from "@/components/views/CampaignsView";
import { HistoryView } from "@/components/views/HistoryView";

export default function MailerFindApp() {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [view, setView] = useState<View>("dashboard");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [lists, setLists] = useState<ContactList[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [records, setRecords] = useState<EmailRecord[]>([]);
  const [inbound, setInbound] = useState<InboundEmail[]>([]);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [errorBar, setErrorBar] = useState<string | null>(null);

  async function fetchAll() {
    setErrorBar(null);
    try {
      const [a, c, camp, h, inc] = await Promise.all([
        fetch("/api/analytics").then(r => r.json().catch(() => ({ error: "Erreur Analytics" }))),
        fetch("/api/contacts").then(r => r.json().catch(() => ({ error: "Erreur Contacts" }))),
        fetch("/api/campaigns").then(r => r.json().catch(() => ({ error: "Erreur Campagnes" }))),
        fetch("/api/send-email").then(r => r.json().catch(() => ({ error: "Erreur Historique" }))),
        fetch("/api/inbound").then(r => r.json().catch(() => ({ error: "Erreur Réception" }))),
      ]);

      const errors = [a, c, camp, h, inc].filter(x => x?.error).map(x => x.error);
      if (errors.length > 0) setErrorBar(errors.join(", "));

      setStats(a?.error ? null : a);
      setContacts(Array.isArray(c?.contacts) ? c.contacts : []);
      setLists(Array.isArray(c?.lists) ? c.lists : []);
      setCampaigns(Array.isArray(camp) ? camp : []);
      setRecords(Array.isArray(h) ? h : []);
      setInbound(Array.isArray(inc) ? inc : []);
    } catch (err) {
      setErrorBar("Erreur de connexion au serveur.");
      console.error("Failed to fetch data:", err);
    }
  }

  useEffect(() => {
    if (localStorage.getItem("mailmax_auth") === "true") setIsAuthorized(true);
    fetchAll();
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!isAuthorized) return <LoginGate onAuthorize={() => setIsAuthorized(true)} />;

  return (
    <div className="flex h-screen bg-[hsl(var(--bg))] overflow-hidden">
      {errorBar && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[200] max-w-lg w-full p-3 rounded-xl bg-[hsl(var(--danger))] text-white shadow-lg flex items-center justify-between gap-3 animate-in">
          <span className="text-xs font-medium">{errorBar}</span>
          <button onClick={fetchAll} className="text-white/70 hover:text-white shrink-0">
            <LayoutDashboard size={14} />
          </button>
        </div>
      )}

      <Sidebar view={view} onNavigate={setView} collapsed={isSidebarCollapsed} onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />

      <main className={`flex-1 transition-all duration-200 flex flex-col ${isSidebarCollapsed ? "ml-[68px]" : "ml-60"}`}>
        <Header view={view} onRefresh={fetchAll} scrolled={isScrolled} />

        <div className="px-8 py-6 flex-1 overflow-y-auto">
          {view === "dashboard" && <DashboardView stats={stats} />}
          {view === "inbox" && <InboxView emails={inbound} onRefresh={fetchAll} />}
          {view === "compose" && <ComposeView lists={lists} onSent={fetchAll} />}
          {view === "contacts" && <ContactsView contacts={contacts} lists={lists} onRefresh={fetchAll} />}
          {view === "campaigns" && <CampaignsView campaigns={campaigns} lists={lists} contacts={contacts} onRefresh={fetchAll} />}
          {view === "history" && <HistoryView records={records} onRefresh={fetchAll} />}
        </div>
      </main>
    </div>
  );
}
