"use client";

import { useState } from "react";
import { Mail, RefreshCw, Trash2, Download, X, Eye } from "lucide-react";
import { InboundEmail } from "@/types";
import { Badge, Button, Card, ConfirmDialog } from "@/components/ui";

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return "À l'instant";
  if (diff < 3600000) return `il y a ${Math.floor(diff / 60000)}min`;
  if (diff < 86400000) return `il y a ${Math.floor(diff / 3600000)}h`;
  return new Date(iso).toLocaleDateString("fr-FR");
}

export function InboxView({ emails, onRefresh }: { emails: InboundEmail[]; onRefresh: () => void }) {
  const [filter, setFilter] = useState("all");
  const [selectedEmail, setSelectedEmail] = useState<InboundEmail | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const filtered = emails.filter(e => filter === "all" || e.status === filter);

  async function updateStatus(id: string, status: string) {
    await fetch("/api/inbound", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status })
    });
    onRefresh();
    if (selectedEmail?.id === id) setSelectedEmail(prev => prev ? { ...prev, status: status as any } : null);
  }

  async function deleteEmail(id: string) {
    await fetch(`/api/inbound?id=${id}`, { method: "DELETE" });
    onRefresh();
    setConfirmDeleteId(null);
    if (selectedEmail?.id === id) setSelectedEmail(null);
  }

  return (
    <div className="pb-12 flex flex-col h-[calc(100vh-120px)]">
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
          <h2 className="font-display font-bold text-xl text-white">Boîte de Réception</h2>
          <p className="text-sm text-[hsl(var(--muted))] mt-0.5">Emails entrants</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-[hsl(var(--s1))] rounded-lg border border-[hsl(var(--border))] p-0.5">
            {["all", "unread", "read", "archived"].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-all ${filter === f ? "bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]" : "text-[hsl(var(--dim))] hover:text-white"}`}>
                {f === "all" ? "Tous" : f === "unread" ? "Non lus" : f === "read" ? "Lus" : "Archivés"}
              </button>
            ))}
          </div>
          <Button variant="ghost" onClick={onRefresh}><RefreshCw size={15} /></Button>
        </div>
      </div>

      <div className="flex flex-1 gap-5 overflow-hidden">
        <div className={`flex flex-col border border-[hsl(var(--border))] rounded-xl bg-[hsl(var(--s1))] ${selectedEmail ? "w-[380px]" : "flex-1"}`}>
          <div className="px-4 py-3 border-b border-[hsl(var(--border))] flex items-center justify-between shrink-0">
            <span className="text-xs font-medium text-[hsl(var(--muted))]">{filtered.length} messages</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                <Mail size={32} className="text-[hsl(var(--dim))] mb-4" />
                <p className="text-sm text-[hsl(var(--muted))]">Aucun message</p>
              </div>
            ) : (
              <div className="divide-y divide-[hsl(var(--border)/0.5)]">
                {filtered.map(e => (
                  <button key={e.id} onClick={() => { setSelectedEmail(e); if (e.status === "unread") updateStatus(e.id, "read"); }}
                    className={`w-full text-left p-4 hover:bg-[hsl(var(--s2)/0.3)] transition-all relative ${selectedEmail?.id === e.id ? "bg-[hsl(var(--primary)/0.05)]" : ""}`}>
                    <div className={`absolute left-0 top-0 bottom-0 w-0.5 transition-all ${selectedEmail?.id === e.id ? "bg-[hsl(var(--primary))]" : e.status === "unread" ? "bg-[hsl(var(--primary)/0.3)]" : "bg-transparent"}`} />
                    <div className="flex items-center justify-between mb-1 pl-2">
                      <span className={`text-sm font-medium truncate ${e.status === "unread" ? "text-white" : "text-[hsl(var(--muted))]"}`}>
                        {e.fromName || e.fromEmail.split('@')[0]}
                      </span>
                      <span className="text-[10px] text-[hsl(var(--dim))] shrink-0">{relTime(e.timestamp)}</span>
                    </div>
                    <div className={`text-sm truncate pl-2 ${e.status === "unread" ? "text-white font-medium" : "text-[hsl(var(--muted))]"}`}>
                      {e.subject || "(Sans objet)"}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {selectedEmail && (
          <div className="flex-1 flex flex-col border border-[hsl(var(--border))] rounded-xl bg-[hsl(var(--s1))] overflow-hidden animate-in">
            <div className="px-6 py-5 border-b border-[hsl(var(--border))] flex items-start justify-between shrink-0">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <h3 className="font-display font-bold text-lg text-white">{selectedEmail.subject || "(Sans objet)"}</h3>
                  <Badge variant={selectedEmail.status === "unread" ? "primary" : selectedEmail.status === "archived" ? "muted" : "info"}>
                    {selectedEmail.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[hsl(var(--primary)/0.1)] flex items-center justify-center text-sm font-bold text-[hsl(var(--primary))]">
                    {(selectedEmail.fromName || selectedEmail.fromEmail)[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">{selectedEmail.fromName || selectedEmail.fromEmail}</div>
                    <div className="text-xs text-[hsl(var(--dim))]">{selectedEmail.fromEmail} — {new Date(selectedEmail.timestamp).toLocaleString("fr-FR")}</div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => updateStatus(selectedEmail.id, selectedEmail.status === "archived" ? "read" : "archived")}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[hsl(var(--dim))] hover:text-white hover:bg-[hsl(var(--s2))] transition-colors">
                  <Download size={15} />
                </button>
                <button onClick={() => setConfirmDeleteId(selectedEmail.id)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[hsl(var(--dim))] hover:text-[hsl(var(--danger))] hover:bg-[hsl(var(--danger)/0.1)] transition-colors">
                  <Trash2 size={15} />
                </button>
                <button onClick={() => setSelectedEmail(null)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[hsl(var(--dim))] hover:text-white hover:bg-[hsl(var(--s2))] transition-colors">
                  <X size={15} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-8">
              <div className="max-w-3xl mx-auto bg-white/5 rounded-xl p-8 border border-white/10">
                <div className="prose prose-invert max-w-none text-sm leading-relaxed text-[hsl(var(--text))]"
                     dangerouslySetInnerHTML={{ __html: selectedEmail.html || `<div class="whitespace-pre-wrap font-mono text-sm">${selectedEmail.text}</div>` }} />
              </div>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog open={!!confirmDeleteId} title="Supprimer l'email" description="Êtes-vous sûr de vouloir supprimer cet email ? Cette action est irréversible." confirmLabel="Supprimer" onConfirm={() => deleteEmail(confirmDeleteId!)} onCancel={() => setConfirmDeleteId(null)} />
    </div>
  );
}
