"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useDropzone } from "react-dropzone";
import {
  LayoutDashboard, Send, Users, Megaphone, History, Settings,
  Zap, Plus, Trash2, Upload, CheckCircle, XCircle, Clock,
  Mail, Eye, MousePointer, UserMinus, ChevronDown, ChevronRight,
  Paperclip, X, Loader2, BarChart2, TrendingUp, Search,
  Bold, Italic, List, Heading2, Link, AlignLeft, Play, Calendar,
  ExternalLink, RefreshCw, Download, Filter, Tag
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from "recharts";
import {
  EmailProvider, Contact, ContactList, Campaign, EmailRecord,
  DashboardStats, EmailAttachment
} from "@/types";

// ===================== TYPES =====================
type View = "dashboard" | "compose" | "contacts" | "campaigns" | "history";
const PROVIDERS: EmailProvider[] = ["resend"];
const PROVIDER_LABELS: Record<EmailProvider, string> = { resend: "Resend" };

// ===================== HELPERS =====================
function fmt(n: number) { return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n); }
function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return "À l'instant";
  if (diff < 3600000) return `il y a ${Math.floor(diff / 60000)}min`;
  if (diff < 86400000) return `il y a ${Math.floor(diff / 3600000)}h`;
  return new Date(iso).toLocaleDateString("fr-FR");
}

// ===================== SMALL COMPONENTS =====================
function ProviderBadge({ p }: { p: EmailProvider }) {
  return <span className={`badge badge-${p}`}>{PROVIDER_LABELS[p]}</span>;
}
function StatusBadge({ s }: { s: string }) {
  return <span className={`badge badge-${s}`}>{s}</span>;
}
function StatCard({ value, label, icon, color, delta }: {
  value: string | number; label: string; icon: React.ReactNode; color: string; delta?: string;
}) {
  return (
    <div className="stat-card animate-in" style={{ borderTop: `2px solid ${color}` }}>
      <div className="flex items-start justify-between">
        <div>
          <div className="stat-value">{value}</div>
          <div className="stat-label">{label}</div>
          {delta && <div className="stat-delta" style={{ color }}>{delta}</div>}
        </div>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}18`, color }}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// ===================== RICH EDITOR TOOLBAR =====================
function EditorToolbar({ exec }: { exec: (cmd: string, val?: string) => void }) {
  const tools = [
    { icon: <Bold size={13} />, cmd: "bold", title: "Gras" },
    { icon: <Italic size={13} />, cmd: "italic", title: "Italique" },
    { icon: <Heading2 size={13} />, cmd: "formatBlock", val: "h2", title: "Titre" },
    { icon: <List size={13} />, cmd: "insertUnorderedList", title: "Liste" },
    { icon: <Link size={13} />, cmd: "createLink", title: "Lien" },
    { icon: <AlignLeft size={13} />, cmd: "justifyLeft", title: "Aligner" },
  ];
  return (
    <div className="flex items-center gap-0.5 px-3 py-2 border-b" style={{ borderColor: "var(--border)" }}>
      {tools.map((t, i) => (
        <button key={i} type="button" title={t.title}
          onClick={() => {
            if (t.cmd === "createLink") {
              const url = prompt("URL du lien :");
              if (url) exec(t.cmd, url);
            } else exec(t.cmd, t.val);
          }}
          className="p-1.5 rounded-lg transition-colors hover:text-white"
          style={{ color: "var(--muted)" }}>
          {t.icon}
        </button>
      ))}
      <div className="w-px h-4 mx-1" style={{ background: "var(--border)" }} />
      {["#4fffcf", "#fb7185", "#fbbf24", "#60a5fa"].map(c => (
        <button key={c} type="button" title={c} onClick={() => exec("foreColor", c)}
          className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
          style={{ background: c, borderColor: "transparent" }} />
      ))}
    </div>
  );
}

// ===================== COMPOSE VIEW =====================
function ComposeView({ lists, onSent }: { lists: ContactList[]; onSent: () => void }) {
  const [provider, setProvider] = useState<EmailProvider>("resend");
  const [from, setFrom] = useState("contact@crediwize.com");
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const [attachments, setAttachments] = useState<EmailAttachment[]>([]);
  const [scheduledAt, setScheduledAt] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [msg, setMsg] = useState("");
  const editorRef = useRef<HTMLDivElement>(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: useCallback((files: File[]) => {
      files.forEach(f => {
        const r = new FileReader();
        r.onload = e => {
          const b64 = (e.target?.result as string).split(",")[1];
          setAttachments(prev => [...prev, { name: f.name, content: b64, type: f.type }]);
        };
        r.readAsDataURL(f);
      });
    }, []),
    noClick: true, noKeyboard: true,
  });

  function execCmd(cmd: string, val?: string) {
    document.execCommand(cmd, false, val);
    if (editorRef.current) setHtml(editorRef.current.innerHTML);
  }

  async function handleSend() {
    if (!from || !to || !subject) { setStatus("error"); setMsg("Remplis tous les champs."); return; }
    setStatus("loading");
    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, from, to, subject, html, attachments, scheduledAt: scheduledAt || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus("success");
        setMsg(data.scheduled ? `Email planifié pour ${new Date(scheduledAt).toLocaleString("fr-FR")}` : "Email envoyé !");
        setTo(""); setSubject(""); setHtml(""); setAttachments([]); setScheduledAt("");
        if (editorRef.current) editorRef.current.innerHTML = "";
        onSent();
      } else { setStatus("error"); setMsg(data.error || "Erreur"); }
    } catch { setStatus("error"); setMsg("Erreur réseau"); }
    setTimeout(() => setStatus("idle"), 5000);
  }

  return (
    <div className="animate-in max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-xl font-semibold" style={{ color: "#fff" }}>Nouvel email</h2>
        <div className="flex items-center gap-2">
          <ProviderBadge p="resend" />
        </div>
      </div>

      <div className="card p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">De *</label>
            <input className="input" value={from} onChange={e => setFrom(e.target.value)} placeholder="vous@domaine.com" />
          </div>
          <div>
            <label className="label">À *</label>
            <input className="input" value={to} onChange={e => setTo(e.target.value)} placeholder="dest@email.com" />
          </div>
        </div>
        <div>
          <label className="label">Objet *</label>
          <input className="input" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Objet de l'email…" />
        </div>

        {/* Editor */}
        <div>
          <label className="label">Message</label>
          <div className="rounded-xl overflow-hidden" style={{ background: "var(--s2)", border: "1px solid var(--border)" }}>
            <EditorToolbar exec={execCmd} />
            <div
              ref={editorRef}
              contentEditable
              onInput={() => { if (editorRef.current) setHtml(editorRef.current.innerHTML); }}
              data-placeholder="Composez votre message ici…"
              className="rich-editor px-4 py-4"
              suppressContentEditableWarning
            />
          </div>
        </div>

        {/* Dropzone */}
        <div {...getRootProps()}>
          <input {...getInputProps()} />
          <div className={`rounded-xl px-4 py-3 flex items-center gap-2 border border-dashed transition-all cursor-pointer ${isDragActive ? "border-electric bg-electric/5" : ""}`}
            style={{ borderColor: isDragActive ? "var(--electric)" : "var(--border)" }}>
            <Paperclip size={14} style={{ color: "var(--muted)" }} />
            <span className="text-sm" style={{ color: "var(--muted)" }}>
              {isDragActive ? "Dépose ici…" : "Glisse des fichiers pour les joindre"}
            </span>
          </div>
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {attachments.map((a, i) => (
                <span key={i} className="tag flex items-center gap-1.5">
                  <Paperclip size={10} /> {a.name}
                  <button onClick={() => setAttachments(p => p.filter((_, j) => j !== i))}>
                    <X size={10} className="hover:text-red-400" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Schedule */}
        <div>
          <label className="label">Planification (optionnel)</label>
          <div className="flex items-center gap-2">
            <Calendar size={14} style={{ color: "var(--muted)" }} />
            <input type="datetime-local" className="input" value={scheduledAt}
              onChange={e => setScheduledAt(e.target.value)}
              style={{ colorScheme: "dark" }} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm flex items-center gap-2">
          {status === "success" && <><CheckCircle size={14} style={{ color: "#4ade80" }} /><span style={{ color: "#4ade80" }}>{msg}</span></>}
          {status === "error" && <><XCircle size={14} style={{ color: "var(--rose)" }} /><span style={{ color: "var(--rose)" }}>{msg}</span></>}
        </div>
        <button onClick={handleSend} disabled={status === "loading"} className="btn btn-primary">
          {status === "loading" ? <><Loader2 size={14} className="spin" /> Envoi…</> : scheduledAt ? <><Calendar size={14} /> Planifier</> : <><Send size={14} /> Envoyer via {PROVIDER_LABELS[provider]}</>}
        </button>
      </div>

      {/* Env hint */}
      <div className="card mt-6 p-4">
        <p className="font-mono text-xs mb-2" style={{ color: "var(--dim)" }}>// .env.local</p>
        <div className="font-mono text-xs">
          <p><span style={{ color: "var(--electric)" }}>RESEND_API_KEY</span>=<span style={{ color: "var(--dim)" }}>re_...</span></p>
        </div>
      </div>
    </div>
  );
}

// ===================== CONTACTS VIEW =====================
function ContactsView({ contacts, lists, onRefresh }: {
  contacts: Contact[]; lists: ContactList[]; onRefresh: () => void;
}) {
  const [search, setSearch] = useState("");
  const [filterList, setFilterList] = useState("all");
  const [showAddContact, setShowAddContact] = useState(false);
  const [showAddList, setShowAddList] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState(""); const [newName, setNewName] = useState(""); const [newList, setNewList] = useState("");
  const [newListName, setNewListName] = useState(""); const [newListDesc, setNewListDesc] = useState("");

  const filtered = contacts.filter(c => {
    const matchSearch = c.email.includes(search) || c.name.toLowerCase().includes(search.toLowerCase());
    const matchList = filterList === "all" || c.listId === filterList;
    return matchSearch && matchList;
  });

  async function addContact() {
    if (!newEmail || !newList) return;
    await fetch("/api/contacts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "contact", email: newEmail, name: newName || newEmail, listId: newList }) });
    setNewEmail(""); setNewName(""); setShowAddContact(false); onRefresh();
  }
  async function addList() {
    if (!newListName) return;
    await fetch("/api/contacts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "list", name: newListName, description: newListDesc }) });
    setNewListName(""); setNewListDesc(""); setShowAddList(false); onRefresh();
  }
  async function deleteContact(id: string) {
    if (!confirm("Supprimer ce contact ?")) return;
    await fetch("/api/contacts", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    onRefresh();
  }
  async function deleteSelected() {
    if (selected.length === 0) return;
    if (!confirm(`Supprimer ces ${selected.length} contacts ?`)) return;
    await fetch("/api/contacts", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: selected }) });
    setSelected([]);
    onRefresh();
  }
  function toggleSelect(id: string) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }
  function toggleAll() {
    if (selected.length === filtered.length) setSelected([]);
    else setSelected(filtered.map(c => c.id));
  }

  async function handleCsvImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const text = await file.text();
    const rows = text.split("\n").slice(1).filter(Boolean).map(line => {
      const [email, name] = line.split(",");
      return { email: email?.trim(), name: name?.trim() };
    }).filter(r => r.email);
    if (!filterList || filterList === "all") { alert("Sélectionne une liste d'abord"); return; }
    await fetch("/api/contacts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "import", rows, listId: filterList }) });
    onRefresh();
  }

  return (
    <div className="animate-in">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-xl font-semibold" style={{ color: "#fff" }}>Contacts</h2>
        <div className="flex items-center gap-2">
          <label className="btn btn-ghost text-sm cursor-pointer">
            <Upload size={14} /> Importer CSV
            <input type="file" accept=".csv" className="hidden" onChange={handleCsvImport} />
          </label>
          <button onClick={() => setShowAddList(true)} className="btn btn-ghost text-sm"><Plus size={14} /> Nouvelle liste</button>
          <button onClick={() => setShowAddContact(true)} className="btn btn-primary text-sm"><Plus size={14} /> Contact</button>
        </div>
      </div>

      {/* Lists overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className={`card p-4 cursor-pointer card-hover ${filterList === "all" ? "border-electric/40" : ""}`}
          style={filterList === "all" ? { borderColor: "var(--electric-dim)" } : {}}
          onClick={() => setFilterList("all")}>
          <div className="text-2xl font-display font-bold" style={{ color: "#fff" }}>{contacts.length}</div>
          <div className="font-mono text-xs mt-1" style={{ color: "var(--muted)" }}>TOUS</div>
        </div>
        {lists.map(l => (
          <div key={l.id}
            className={`card p-4 cursor-pointer card-hover ${filterList === l.id ? "border-electric/40" : ""}`}
            style={filterList === l.id ? { borderColor: "var(--electric-dim)" } : {}}
            onClick={() => setFilterList(l.id)}>
            <div className="text-2xl font-display font-bold" style={{ color: "#fff" }}>
              {contacts.filter(c => c.listId === l.id).length}
            </div>
            <div className="font-mono text-xs mt-1 truncate" style={{ color: "var(--muted)" }}>{l.name.toUpperCase()}</div>
          </div>
        ))}
      </div>

      {/* Actions & Search */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted)" }} />
          <input className="input pl-9" placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {selected.length > 0 && (
          <button onClick={deleteSelected} className="btn badge-failed text-xs px-4 py-2.5 animate-in flex items-center gap-2" style={{ background: "rgba(255, 100, 100, 0.1)", border: "1px solid rgba(255, 100, 100, 0.2)" }}>
            <Trash2 size={13} />
            Supprimer la sélection ({selected.length})
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="table-row font-mono text-xs" style={{ gridTemplateColumns: "40px 2fr 2fr 1fr 1fr 80px", color: "var(--dim)" }}>
          <span className="flex items-center justify-center">
            <input type="checkbox" checked={filtered.length > 0 && selected.length === filtered.length} onChange={toggleAll} className="w-4 h-4 rounded border-border bg-s2 accent-electric cursor-pointer" />
          </span>
          <span>NOM</span><span>EMAIL</span><span>LISTE</span><span>STATUT</span><span></span>
        </div>
        {filtered.length === 0 ? (
          <div className="py-16 text-center" style={{ color: "var(--muted)" }}>
            <Users size={28} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Aucun contact</p>
          </div>
        ) : filtered.map((c, i) => (
          <div key={c.id} className={`table-row animate-in ${selected.includes(c.id) ? "bg-electric/5" : ""}`} 
               style={{ gridTemplateColumns: "40px 2fr 2fr 1fr 1fr 80px", animationDelay: `${i * 0.03}s` }}>
            <span className="flex items-center justify-center">
              <input type="checkbox" checked={selected.includes(c.id)} onChange={() => toggleSelect(c.id)} className="w-4 h-4 rounded border-border bg-s2 accent-electric cursor-pointer" />
            </span>
            <span className="font-medium" style={{ color: "#fff" }}>{c.name}</span>
            <span className="font-mono text-xs truncate" style={{ color: "var(--muted)" }}>{c.email}</span>
            <span className="text-xs">{lists.find(l => l.id === c.listId)?.name || c.listId}</span>
            <span><span className={`badge ${c.subscribed ? "badge-green" : "badge-failed"}`}>{c.subscribed ? "Abonné" : "Désabonné"}</span></span>
            <div className="flex justify-end">
              <button onClick={() => deleteContact(c.id)} className="btn btn-danger" style={{ padding: "4px 10px" }}><Trash2 size={12} /></button>
            </div>
          </div>
        ))}
      </div>

      {/* Add contact modal */}
      {showAddContact && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setShowAddContact(false)}>
          <div className="modal p-6 space-y-4">
            <h3 className="font-display font-semibold text-lg" style={{ color: "#fff" }}>Ajouter un contact</h3>
            <div><label className="label">Email</label><input className="input" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="email@exemple.com" /></div>
            <div><label className="label">Nom</label><input className="input" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Prénom Nom" /></div>
            <div><label className="label">Liste</label>
              <select className="input" value={newList} onChange={e => setNewList(e.target.value)}>
                <option value="">Choisir une liste</option>
                {lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setShowAddContact(false)} className="btn btn-ghost flex-1">Annuler</button>
              <button onClick={addContact} className="btn btn-primary flex-1">Ajouter</button>
            </div>
          </div>
        </div>
      )}

      {/* Add list modal */}
      {showAddList && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setShowAddList(false)}>
          <div className="modal p-6 space-y-4">
            <h3 className="font-display font-semibold text-lg" style={{ color: "#fff" }}>Nouvelle liste</h3>
            <div><label className="label">Nom</label><input className="input" value={newListName} onChange={e => setNewListName(e.target.value)} placeholder="Ma liste" /></div>
            <div><label className="label">Description</label><input className="input" value={newListDesc} onChange={e => setNewListDesc(e.target.value)} placeholder="Description optionnelle" /></div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setShowAddList(false)} className="btn btn-ghost flex-1">Annuler</button>
              <button onClick={addList} className="btn btn-primary flex-1">Créer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===================== CAMPAIGNS VIEW =====================
function CampaignsView({ campaigns, lists, contacts, onRefresh }: {
  campaigns: Campaign[]; lists: ContactList[]; contacts: Contact[]; onRefresh: () => void;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [name, setName] = useState(""); const [subject, setSubject] = useState("");
  const [html, setHtml] = useState(""); const [listId, setListId] = useState("");
  const [provider, setProvider] = useState<EmailProvider>("resend");
  const [fromName, setFromName] = useState("CrediWize"); const [fromEmail, setFromEmail] = useState("contact@crediwize.com");
  const [scheduledAt, setScheduledAt] = useState("");
  const editorRef = useRef<HTMLDivElement>(null);

  const [step, setStep] = useState(1);

  function execCmd(cmd: string, val?: string) {
    document.execCommand(cmd, false, val);
    if (editorRef.current) setHtml(editorRef.current.innerHTML);
  }

  async function createCampaign() {
    if (!name || !subject || !listId || !fromEmail) return;
    await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, subject, html, listId, provider, fromName, fromEmail, scheduledAt: scheduledAt || undefined }),
    });
    setShowCreate(false); setStep(1); setName(""); setSubject(""); setHtml(""); setScheduledAt("");
    onRefresh();
  }

  async function sendCampaign(id: string) {
    setSending(id);
    await fetch("/api/bulk-send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId: id }),
    });
    setSending(null); onRefresh();
  }

  async function deleteCampaign(id: string) {
    await fetch("/api/campaigns", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    onRefresh();
  }

  const steps = [
    { n: 1, label: "Configuration", icon: <Settings size={14} /> },
    { n: 2, label: "Expéditeur", icon: <UserMinus size={14} /> },
    { n: 3, label: "Message", icon: <Mail size={14} /> },
  ];

  return (
    <div className="animate-in">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-xl font-semibold" style={{ color: "#fff" }}>Campagnes</h2>
        <button onClick={() => { setStep(1); setShowCreate(true); }} className="btn btn-primary text-sm">
          <Plus size={14} /> Nouvelle campagne
        </button>
      </div>

      {campaigns.length === 0 ? (
        <div className="card py-20 text-center">
          <Megaphone size={32} className="mx-auto mb-3 opacity-20" />
          <p style={{ color: "var(--muted)" }}>Aucune campagne pour l'instant</p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c, i) => (
            <div key={c.id} className="card p-5 animate-in card-hover" style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-display font-semibold truncate" style={{ color: "#fff" }}>{c.name}</h3>
                    <StatusBadge s={c.status} />
                    <ProviderBadge p={c.provider} />
                  </div>
                  <p className="text-sm truncate mb-3" style={{ color: "var(--muted)" }}>{c.subject}</p>
                  <div className="flex items-center gap-4 text-xs font-mono" style={{ color: "var(--dim)" }}>
                    <span className="flex items-center gap-1"><Send size={11} />{c.stats.sent}/{c.stats.total} envoyés</span>
                    <span className="flex items-center gap-1"><Eye size={11} />{c.stats.opens} ouvertures</span>
                    <span className="flex items-center gap-1"><MousePointer size={11} />{c.stats.clicks} clics</span>
                    <span className="flex items-center gap-1"><UserMinus size={11} />{c.stats.unsubscribes} désabs</span>
                  </div>
                  {c.stats.total > 0 && (
                    <div className="flex gap-3 mt-3">
                      {[
                        { label: "Ouv.", val: c.stats.opens, total: c.stats.sent, color: "var(--electric)" },
                        { label: "Clics", val: c.stats.clicks, total: c.stats.sent, color: "var(--violet)" },
                      ].map(bar => (
                        <div key={bar.label} className="flex-1">
                          <div className="flex justify-between text-xs font-mono mb-1" style={{ color: "var(--dim)" }}>
                            <span>{bar.label}</span>
                            <span>{bar.total > 0 ? Math.round((bar.val / bar.total) * 100) : 0}%</span>
                          </div>
                          <div className="progress-bar">
                            <div className="progress-fill" style={{ width: `${bar.total > 0 ? (bar.val / bar.total) * 100 : 0}%`, background: bar.color }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  {c.status === "draft" && (
                    <button onClick={() => sendCampaign(c.id)} disabled={sending === c.id} className="btn btn-primary text-sm">
                      {sending === c.id ? <><Loader2 size={12} className="spin" /> Envoi…</> : <><Play size={12} /> Envoyer</>}
                    </button>
                  )}
                  {c.scheduledAt && c.status === "scheduled" && (
                    <div className="text-xs font-mono flex items-center gap-1" style={{ color: "var(--blue)" }}>
                      <Clock size={11} /> {new Date(c.scheduledAt).toLocaleString("fr-FR")}
                    </div>
                  )}
                  <button onClick={() => deleteCampaign(c.id)} className="btn btn-danger text-sm"><Trash2 size={12} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create campaign modal - Multi-step */}
      {showCreate && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="modal flex flex-col shadow-2xl" style={{ maxWidth: 560, borderTop: "4px solid var(--electric)" }}>
            {/* Header / Steps */}
            <div className="p-8 pb-4">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-display font-bold text-xl" style={{ color: "#fff" }}>Nouvelle campagne</h3>
                  <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>Configuration de votre envoi groupé</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono px-2 py-1 rounded bg-s2 border border-border" style={{ color: "var(--electric)" }}>Step {step}/3</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {steps.map((s, i) => (
                  <div key={s.n} className="flex-1 flex items-center gap-1.5">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${step >= s.n ? "bg-electric text-s1 shadow-[0_0_15px_rgba(79,255,207,0.3)]" : "bg-s2 text-dim border border-border"}`}>
                      {step > s.n ? <CheckCircle size={15} /> : s.n}
                    </div>
                    {i < steps.length - 1 && <div className={`flex-1 h-1 rounded-full ${step > s.n ? "bg-electric/40" : "bg-border"}`} />}
                  </div>
                ))}
              </div>
            </div>

            {/* Content Area */}
            <div className="px-8 pb-6 flex-1 overflow-y-auto">
              {step === 1 && (
                <div className="space-y-6 animate-in">
                  <div className="space-y-4">
                    <div>
                      <label className="label">Nom de la campagne *</label>
                      <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Newsletter Printemps" />
                    </div>
                    <div>
                      <label className="label">Liste de contacts *</label>
                      <select className="input" value={listId} onChange={e => setListId(e.target.value)}>
                        <option value="">Sélectionner une audience</option>
                        {lists.map(l => <option key={l.id} value={l.id}>{l.name} ({contacts.filter(c=>c.listId===l.id).length} contacts)</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="p-4 bg-s2/30 rounded-xl border border-border">
                    <p className="text-xs font-mono" style={{ color: "var(--muted)" }}>Fournisseur : <span style={{ color: "var(--electric)" }}>Resend</span></p>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6 animate-in">
                  {/* Inbox Preview Visual */}
                  <div className="space-y-2">
                    <label className="label">Aperçu boîte de réception</label>
                    <div className="p-4 rounded-xl border border-white/5 bg-gradient-to-br from-s2 to-s1/50 shadow-inner">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shadow-lg" 
                             style={{ background: "linear-gradient(135deg, var(--electric), var(--violet))", color: "var(--s1)" }}>
                          {(fromName || "M")[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-white truncate">{fromName || "MailerFind"}</span>
                            <span className="text-[10px] text-muted">17:05</span>
                          </div>
                          <div className="text-xs text-white/90 font-medium truncate mt-0.5">{subject || "(Sans objet)"}</div>
                          <p className="text-[10px] text-dim truncate mt-0.5">Cliquez pour voir le contenu de cette campagne...</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Nom expéditeur</label>
                      <input className="input" value={fromName} onChange={e => setFromName(e.target.value)} placeholder="MailerFind" />
                    </div>
                    <div>
                      <label className="label">Email expéditeur *</label>
                      <input className="input font-mono text-xs" value={fromEmail} onChange={e => setFromEmail(e.target.value)} placeholder="hello@domain.com" />
                    </div>
                  </div>
                  <div>
                    <label className="label">Objet de l'email *</label>
                    <input className="input" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Votre cadeau vous attend !" />
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6 animate-in">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="label m-0">Corps du message</label>
                      <span className="text-[10px] text-dim font-mono">Variables: {"{{name}}"}, {"{{email}}"}</span>
                    </div>
                    <div className="rounded-2xl overflow-hidden border" style={{ borderColor: "var(--border)", background: "var(--s2)" }}>
                      <EditorToolbar exec={execCmd} />
                      <div ref={editorRef} contentEditable onInput={() => { if (editorRef.current) setHtml(editorRef.current.innerHTML); }}
                        data-placeholder="Commencez à rédiger..." className="rich-editor px-5 py-4 text-sm" suppressContentEditableWarning style={{ minHeight: 180, maxHeight: 220, overflowY: 'auto' }} />
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-s2/30 border border-border">
                    <label className="label flex items-center gap-2 mb-3">
                      <Calendar size={12} /> Planifier la diffusion
                    </label>
                    <input type="datetime-local" className="input" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} style={{ colorScheme: "dark" }} />
                    <p className="text-[10px] text-dim mt-2 italic">Laissez vide pour un envoi immédiat après création.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="p-8 pt-4 border-t flex gap-3" style={{ borderColor: "var(--border)" }}>
              {step > 1 ? (
                <button onClick={() => setStep(step - 1)} className="btn btn-ghost px-6">Retour</button>
              ) : (
                <button onClick={() => setShowCreate(false)} className="btn btn-ghost px-6">Annuler</button>
              )}
              {step < 3 ? (
                <button onClick={() => { if (step === 1 && (!name || !listId)) return; if (step === 2 && (!fromEmail || !subject)) return; setStep(step + 1); }}
                  className="btn btn-primary flex-1 justify-center shadow-lg">
                  Continuer <ChevronRight size={16} />
                </button>
              ) : (
                <button onClick={createCampaign} className="btn btn-primary flex-1 justify-center shadow-[0_0_20px_rgba(79,255,207,0.2)]">
                  {scheduledAt ? <><Calendar size={14} /> Confirmer la planification</> : <><Zap size={14} /> Lancer la campagne</>}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ===================== HISTORY VIEW =====================
function HistoryView({ records, onRefresh }: { records: EmailRecord[]; onRefresh: () => void }) {
  const [filter, setFilter] = useState("all");
  const filtered = records.filter(r => filter === "all" || r.status === filter);

  return (
    <div className="animate-in">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-xl font-semibold" style={{ color: "#fff" }}>Historique</h2>
        <div className="flex items-center gap-2">
          {["all", "sent", "failed", "scheduled"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="btn text-xs" style={filter === f ? { background: "var(--s3)", color: "var(--electric)", border: "1px solid var(--electric-dim)" } : { background: "transparent", color: "var(--muted)", border: "1px solid var(--border)" }}>
              {f === "all" ? "Tous" : f}
            </button>
          ))}
          <button onClick={onRefresh} className="btn btn-ghost text-sm"><RefreshCw size={13} /></button>
        </div>
      </div>

      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center"><History size={28} className="mx-auto mb-2 opacity-20" /><p className="text-sm" style={{ color: "var(--muted)" }}>Aucun email</p></div>
        ) : (
          <>
            <div className="table-row font-mono text-xs" style={{ gridTemplateColumns: "1fr 1fr 2fr 1fr 1fr 80px 100px", color: "var(--dim)" }}>
              <span>PROVIDER</span><span>DE</span><span>OBJET</span><span>OUVERTURES</span><span>CLICS</span><span>STATUT</span><span>DATE</span>
            </div>
            {filtered.map((r, i) => (
              <div key={r.id} className="table-row animate-in text-sm" style={{ gridTemplateColumns: "1fr 1fr 2fr 1fr 1fr 80px 100px", animationDelay: `${i * 0.02}s` }}>
                <ProviderBadge p={r.provider} />
                <span className="truncate font-mono text-xs" style={{ color: "var(--muted)" }}>{r.from}</span>
                <span className="truncate" style={{ color: "#ddd" }}>{r.subject}</span>
                <span className="flex items-center gap-1 font-mono text-xs"><Eye size={10} />{r.opens}</span>
                <span className="flex items-center gap-1 font-mono text-xs"><MousePointer size={10} />{r.clicks}</span>
                <StatusBadge s={r.status} />
                <span className="text-xs font-mono" style={{ color: "var(--dim)" }}>{relTime(r.timestamp)}</span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// ===================== DASHBOARD VIEW =====================
function DashboardView({ stats }: { stats: DashboardStats | null }) {
  if (!stats) return <div className="flex items-center justify-center h-64"><Loader2 size={24} className="spin" style={{ color: "var(--electric)" }} /></div>;

  return (
    <div className="animate-in space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold" style={{ color: "#fff" }}>Vue d'ensemble</h2>
        <span className="font-mono text-xs" style={{ color: "var(--muted)" }}>{new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard value={fmt(stats.totalSent)} label="Emails envoyés" icon={<Send size={16} />} color="var(--electric)" />
        <StatCard value={`${stats.openRate}%`} label="Taux d'ouverture" icon={<Eye size={16} />} color="var(--violet)" />
        <StatCard value={`${stats.clickRate}%`} label="Taux de clic" icon={<MousePointer size={16} />} color="var(--amber)" />
        <StatCard value={`${stats.unsubscribeRate}%`} label="Désabonnements" icon={<UserMinus size={16} />} color="var(--rose)" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-5 col-span-2">
          <h3 className="font-display font-semibold mb-4" style={{ color: "#fff" }}>Activité — 7 derniers jours</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={stats.recentActivity} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="gSent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4fffcf" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#4fffcf" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gOpens" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e38" />
              <XAxis dataKey="date" tick={{ fill: "#6060a0", fontSize: 10, fontFamily: "Space Mono" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#6060a0", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#121224", border: "1px solid #2a2a48", borderRadius: 10, fontFamily: "Outfit" }} />
              <Area type="monotone" dataKey="sent" stroke="#4fffcf" strokeWidth={2} fill="url(#gSent)" name="Envoyés" />
              <Area type="monotone" dataKey="opens" stroke="#a78bfa" strokeWidth={2} fill="url(#gOpens)" name="Ouvertures" />
              <Area type="monotone" dataKey="clicks" stroke="#fbbf24" strokeWidth={2} fill="none" name="Clics" strokeDasharray="4 4" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="font-display font-semibold mb-4" style={{ color: "#fff" }}>Top campagnes</h3>
          {stats.topCampaigns.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 opacity-30">
              <BarChart2 size={24} className="mb-2" />
              <p className="text-xs text-center" style={{ color: "var(--muted)" }}>Aucune donnée</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.topCampaigns} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 0 }}>
                <XAxis type="number" tick={{ fill: "#6060a0", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: "#8080b0", fontSize: 10, fontFamily: "Outfit" }} axisLine={false} tickLine={false} width={80} />
                <Tooltip contentStyle={{ background: "#121224", border: "1px solid #2a2a48", borderRadius: 10 }} />
                <Bar dataKey="opens" name="Ouvertures" radius={4}>
                  {stats.topCampaigns.map((_, i) => <Cell key={i} fill={["#4fffcf", "#a78bfa", "#fbbf24", "#60a5fa", "#fb7185"][i % 5]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Quick tips */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: <TrendingUp size={16} />, title: "Taux d'ouverture moyen", value: "20-25%", color: "var(--electric)", tip: "Un bon taux commence à 20%. Soigne tes objets." },
          { icon: <MousePointer size={16} />, title: "Taux de clic moyen", value: "2-5%", color: "var(--violet)", tip: "Place tes CTAs en haut et en bas de l'email." },
          { icon: <UserMinus size={16} />, title: "Taux de désabonnement", value: "<0.5%", color: "var(--amber)", tip: "Au-delà de 0.5%, revois la fréquence d'envoi." },
        ].map((t, i) => (
          <div key={i} className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div style={{ color: t.color }}>{t.icon}</div>
              <span className="text-xs font-mono" style={{ color: "var(--muted)" }}>{t.title}</span>
            </div>
            <div className="text-xl font-display font-bold mb-1" style={{ color: t.color }}>{t.value}</div>
            <p className="text-xs" style={{ color: "var(--dim)" }}>{t.tip}</p>
          </div>
        ))}
      </div>
    </div>
  );
}



// ===================== MAIN APP =====================
export default function MailerFindApp() {
  const [view, setView] = useState<View>("dashboard");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [lists, setLists] = useState<ContactList[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [records, setRecords] = useState<EmailRecord[]>([]);

  async function fetchAll() {
    const [a, c, camp, h] = await Promise.all([
      fetch("/api/analytics").then(r => r.json()),
      fetch("/api/contacts").then(r => r.json()),
      fetch("/api/campaigns").then(r => r.json()),
      fetch("/api/send-email").then(r => r.json()),
    ]);
    setStats(a);
    setContacts(c.contacts || []);
    setLists(c.lists || []);
    setCampaigns(Array.isArray(camp) ? camp : []);
    setRecords(Array.isArray(h) ? h : []);
  }

  useEffect(() => { fetchAll(); }, []);

  const NAV = [
    { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={16} /> },
    { id: "compose", label: "Composer", icon: <Send size={16} /> },
    { id: "contacts", label: "Contacts", icon: <Users size={16} /> },
    { id: "campaigns", label: "Campagnes", icon: <Megaphone size={16} /> },
    { id: "history", label: "Historique", icon: <History size={16} /> },
  ] as const;

  return (
    <div className="flex min-h-screen">
      {/* SIDEBAR */}
      <aside className="w-56 flex-shrink-0 flex flex-col p-4 gap-1" style={{ background: "var(--s1)", borderRight: "1px solid var(--border)" }}>
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-2 py-3 mb-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#4fffcf18", border: "1px solid #4fffcf33" }}>
            <Zap size={15} style={{ color: "var(--electric)" }} />
          </div>
          <div>
            <div className="font-display font-bold text-sm leading-none" style={{ color: "#fff" }}>MailerFind</div>
            <div className="font-mono text-xs mt-0.5" style={{ color: "var(--dim)" }}>v2.0</div>
          </div>
        </div>

        {NAV.map(n => (
          <button key={n.id} onClick={() => { setView(n.id); fetchAll(); }}
            className={`nav-item ${view === n.id ? "active" : ""}`}>
            {n.icon}
            {n.label}
          </button>
        ))}

        <div className="mt-auto pt-4 border-t" style={{ borderColor: "var(--border)" }}>
          <div className="px-2 py-2">
            <div className="font-mono text-xs mb-2" style={{ color: "var(--dim)" }}>Stats rapides</div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between"><span style={{ color: "var(--muted)" }}>Contacts</span><span style={{ color: "#fff" }}>{contacts.length}</span></div>
              <div className="flex justify-between"><span style={{ color: "var(--muted)" }}>Campagnes</span><span style={{ color: "#fff" }}>{campaigns.length}</span></div>
              <div className="flex justify-between"><span style={{ color: "var(--muted)" }}>Envoyés</span><span style={{ color: "#fff" }}>{records.filter(r => r.status === "sent").length}</span></div>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto p-8">
          {view === "dashboard" && <DashboardView stats={stats} />}
          {view === "compose" && <ComposeView lists={lists} onSent={fetchAll} />}
          {view === "contacts" && <ContactsView contacts={contacts} lists={lists} onRefresh={fetchAll} />}
          {view === "campaigns" && <CampaignsView campaigns={campaigns} lists={lists} contacts={contacts} onRefresh={fetchAll} />}
          {view === "history" && <HistoryView records={records} onRefresh={fetchAll} />}
        </div>
      </main>
    </div>
  );
}
