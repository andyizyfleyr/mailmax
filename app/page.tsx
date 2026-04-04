"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useDropzone } from "react-dropzone";
import {
  LayoutDashboard, Send, Users, Megaphone, History, Settings, Inbox, Lock,
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
  DashboardStats, EmailAttachment, InboundEmail
} from "@/types";

// ===================== TYPES =====================
type View = "dashboard" | "compose" | "contacts" | "campaigns" | "history" | "inbox";
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
function StatCard({ value, label, icon, color, delta, trend = "up" }: {
  value: string | number; label: string; icon: React.ReactNode; color: string; delta?: string; trend?: "up" | "down";
}) {
  return (
    <div className="stat-card group animate-in" style={{ borderLeft: `3px solid hsl(${color})` }}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="stat-label">{label}</div>
          <div className="stat-value">{value}</div>
          {delta && (
            <div className="stat-delta" style={{ color: trend === "up" ? "hsl(var(--electric))" : "hsl(var(--rose))" }}>
              {trend === "up" ? <TrendingUp size={12} /> : <TrendingUp size={12} className="rotate-180" />}
              {delta}
            </div>
          )}
        </div>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110" 
             style={{ background: `hsl(${color} / 0.1)`, color: `hsl(${color})`, boxShadow: `0 0 20px -5px hsl(${color} / 0.2)` }}>
          {icon}
        </div>
      </div>
      {/* Subtle indicator beam */}
      <div className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-transparent via-white/10 to-transparent w-full opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}

// ===================== AUTH GATE =====================
function LoginGate({ onAuthorize }: { onAuthorize: () => void }) {
  const [pass, setPass] = useState("");
  const [err, setErr] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pass === "Mail2000") {
      localStorage.setItem("mailmax_auth", "true");
      onAuthorize();
    } else {
      setErr(true);
      setTimeout(() => setErr(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[hsl(var(--bg))] p-6">
      <div className="absolute inset-0 bg-radial-gradient from-[hsl(var(--electric)/0.05)] to-transparent opacity-50" />
      <div className="card max-w-md w-full p-10 space-y-8 relative overflow-hidden animate-in zoom-in-95 duration-500 shadow-2xl border-[hsl(var(--border))]">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[hsl(var(--electric))] to-transparent" />
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-20 h-20 rounded-3xl bg-[hsl(var(--s2))] flex items-center justify-center text-[hsl(var(--electric))] border border-[hsl(var(--electric)/0.2)] shadow-[0_0_40px_rgba(79,255,207,0.1)]">
            <Lock size={32} />
          </div>
          <div className="space-y-1">
            <h1 className="font-display font-black text-3xl text-white tracking-widest uppercase italic">MailMax</h1>
            <p className="text-[10px] font-mono text-[hsl(var(--dim))] uppercase tracking-[0.3em] font-bold">V-CORE ENGINE &bull; ACCÈS RESTREINT</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-mono uppercase tracking-widest text-[hsl(var(--dim))] font-bold ml-1">Clé d'accès</label>
            <input type="password" autoFocus className={`input w-full !bg-[hsl(var(--s1))] border-none shadow-inner py-4 text-center text-xl tracking-[0.5em] font-black ${err ? "animate-shake text-[hsl(var(--rose))]" : "text-white"}`}
              value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••••" />
          </div>
          <button type="submit" className="btn btn-primary w-full justify-center py-4 rounded-xl font-display font-black text-xs uppercase tracking-[0.2em] shadow-[0_15px_40px_-10px_hsl(var(--electric)/0.3)]">
            Déverrouiller le système
          </button>
        </form>

        {err && (
          <div className="absolute inset-0 flex items-center justify-center bg-[hsl(var(--bg)/0.8)] backdrop-blur-sm z-50 animate-in fade-in zoom-in-95 duration-200">
             <div className="bg-[hsl(var(--rose))] p-6 rounded-2xl flex flex-col items-center gap-3 shadow-[0_20px_50px_rgba(251,113,133,0.3)] border border-[hsl(var(--rose)/0.2)]">
                <XCircle size={32} className="text-white animate-bounce" />
                <p className="text-white text-sm font-black uppercase tracking-[0.2em]">Accès Refusé</p>
             </div>
          </div>
        )}
        
        <p className="text-[9px] font-mono text-[hsl(var(--dim))] text-center uppercase tracking-widest opacity-50">Authorized Personnel Only &bull; IP Logged</p>
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
  const [from, setFrom] = useState("CrediWize <contact@crediwize.com>");
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
    if (!from || !to || !subject) { setStatus("error"); setMsg("Tous les champs marqués d'une * sont requis."); return; }
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
        setMsg(data.scheduled ? `Envoi programmé avec succès.` : "Email envoyé avec succès !");
        setTo(""); setSubject(""); setHtml(""); setAttachments([]); setScheduledAt("");
        if (editorRef.current) editorRef.current.innerHTML = "";
        onSent();
      } else { setStatus("error"); setMsg(data.error || "Une erreur est survenue."); }
    } catch { setStatus("error"); setMsg("Erreur de connexion."); }
    setTimeout(() => setStatus("idle"), 5000);
  }

  const [preview, setPreview] = useState(false);

  // ... (rest of fetch logic remains same)

  return (
    <div className="animate-in max-w-5xl mx-auto space-y-8 pb-20">
      <div className="flex items-end justify-between border-b border-[hsl(var(--border))] pb-6">
        <div className="space-y-1">
          <h2 className="font-display font-black text-3xl text-white tracking-tighter uppercase italic">Studio d'Email</h2>
          <div className="flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-[hsl(var(--electric))] shadow-[0_0_8px_hsl(var(--electric))]" />
             <p className="text-[10px] font-mono text-[hsl(var(--dim))] uppercase tracking-[0.2em] font-bold">Moteur V-Core &bull; Prêt à transmettre</p>
          </div>
        </div>
        <div className="flex bg-[hsl(var(--s2))] p-1 rounded-xl border border-[hsl(var(--border))]">
          <button onClick={() => setPreview(false)} className={`px-5 py-2 rounded-lg text-[11px] font-mono uppercase tracking-widest transition-all ${!preview ? "bg-[hsl(var(--s3))] text-white shadow-lg" : "text-[hsl(var(--dim))] hover:text-white"}`}>Éditer</button>
          <button onClick={() => setPreview(true)} className={`px-5 py-2 rounded-lg text-[11px] font-mono uppercase tracking-widest transition-all ${preview ? "bg-[hsl(var(--s3))] text-white shadow-lg" : "text-[hsl(var(--dim))] hover:text-white"}`}>Aperçu</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-8">
          {preview ? (
            <div className="card !p-0 overflow-hidden border-[hsl(var(--border))] animate-in zoom-in-95 duration-300">
               <div className="bg-[hsl(var(--s2))] p-6 border-b border-[hsl(var(--border))] space-y-3">
                  <div className="flex items-center gap-3 text-[11px] font-mono"><span className="text-[hsl(var(--dim))] w-14 uppercase">De :</span> <span className="text-white font-bold">{from}</span></div>
                  <div className="flex items-center gap-3 text-[11px] font-mono"><span className="text-[hsl(var(--dim))] w-14 uppercase">À :</span> <span className="text-white font-bold">{to || "(Destinataire)"}</span></div>
                  <div className="flex items-center gap-3 text-sm font-bold"><span className="text-[hsl(var(--dim))] w-14 font-mono text-[11px] uppercase">Sujet :</span> <span className="text-[hsl(var(--electric))]">{subject || "(Aucun sujet)"}</span></div>
               </div>
               <div className="bg-white p-12 min-h-[500px] text-zinc-900 shadow-inner overflow-auto leading-relaxed" 
                    dangerouslySetInnerHTML={{ __html: html || '<div class="text-zinc-300 italic">Aucun contenu à prévisualiser…</div>' }} />
               <div className="bg-[hsl(var(--s1))] p-4 flex items-center justify-between">
                  <div className="flex gap-2">
                     <span className="w-2.5 h-2.5 rounded-full bg-red-500/20" />
                     <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/20" />
                     <span className="w-2.5 h-2.5 rounded-full bg-green-500/20" />
                  </div>
                  <p className="text-[9px] font-mono text-[hsl(var(--dim))] uppercase tracking-widest">MailMax Preview Engine v2.0</p>
               </div>
            </div>
          ) : (
            <div className="card p-10 space-y-8 shadow-2xl animate-in fade-in slide-in-from-left-4 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-[hsl(var(--dim))] font-bold ml-1">Emetteur</label>
                  <input className="input !bg-[hsl(var(--bg))] font-mono text-sm border-none shadow-inner py-4" value={from} onChange={e => setFrom(e.target.value)} placeholder="contact@votre-domaine.com" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-[hsl(var(--dim))] font-bold ml-1">Destinataire</label>
                  <input className="input !bg-[hsl(var(--bg))] font-mono text-sm border-none shadow-inner py-4" value={to} onChange={e => setTo(e.target.value)} placeholder="client@exemple.com" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-[hsl(var(--dim))] font-bold ml-1">Objet Transmis</label>
                <input className="input !bg-[hsl(var(--bg))] border-none shadow-inner text-lg font-bold py-5" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Sujet de votre email…" />
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-[hsl(var(--dim))] font-bold ml-1">Message Body (HTML Core)</label>
                <div className="rounded-2xl overflow-hidden border border-[hsl(var(--border))] shadow-2xl bg-[hsl(var(--bg))]">
                   <EditorToolbar exec={execCmd} />
                   <div ref={editorRef} contentEditable onInput={() => { if (editorRef.current) setHtml(editorRef.current.innerHTML); }}
                     data-placeholder="Commencez à écrire..." className="rich-editor min-h-[400px] px-10 py-10 outline-none leading-relaxed text-white/90" suppressContentEditableWarning />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="card p-8 space-y-8 bg-gradient-to-br from-[hsl(var(--s2))] to-transparent border-[hsl(var(--border))] sticky top-32">
             <div>
                <h3 className="text-xs font-mono uppercase tracking-[0.3em] text-white font-bold mb-6 flex items-center gap-2">
                   <Zap size={14} className="text-[hsl(var(--electric))]" /> Paramètres
                </h3>
                
                <div className="space-y-6">
                   <div>
                      <label className="label-lite flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-[hsl(var(--dim))] mb-3"><Paperclip size={12} /> Pièces jointes</label>
                      <div {...getRootProps()} className={`rounded-xl p-6 border-2 border-dashed transition-all cursor-pointer flex flex-col items-center gap-3 ${isDragActive ? "border-[hsl(var(--electric))] bg-[hsl(var(--electric)/0.05)]" : "border-[hsl(var(--border))] hover:border-[hsl(var(--dim))]"}`}>
                         <input {...getInputProps()} />
                         <Upload size={24} className={isDragActive ? "text-[hsl(var(--electric))]" : "text-[hsl(var(--dim))]"} />
                         <p className="text-[9px] font-mono text-[hsl(var(--muted))] uppercase">Déposez vos fichiers</p>
                      </div>
                      {attachments.length > 0 && (
                         <div className="space-y-2 mt-4">
                            {attachments.map((a, i) => (
                              <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-[hsl(var(--s1))] border border-[hsl(var(--border))] text-[10px] font-mono">
                                 <span className="truncate flex-1 text-[hsl(var(--muted))]">{a.name}</span>
                                 <button onClick={() => setAttachments(p => p.filter((_, j) => j !== i))} className="text-[hsl(var(--rose))] hover:scale-110 transition-transform ml-2">
                                   <X size={14} />
                                 </button>
                              </div>
                            ))}
                         </div>
                      )}
                   </div>

                   <div className="pt-6 border-t border-[hsl(var(--border))]">
                      <label className="label-lite flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-[hsl(var(--dim))] mb-3"><Calendar size={12} /> Planification</label>
                      <input type="datetime-local" className="input !py-3 !text-xs !bg-[hsl(var(--bg))] border-none shadow-inner" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} style={{ colorScheme: "dark" }} />
                   </div>

                   <div className="pt-6">
                      <button onClick={handleSend} disabled={status === "loading"} className="btn btn-primary w-full justify-center py-4 rounded-xl shadow-[0_15px_40px_-5px_hsl(var(--electric)/0.3)] hover:translate-y-[-2px] active:translate-y-0 transition-all font-display font-black text-xs uppercase tracking-[0.2em]">
                         {status === "loading" ? <Loader2 size={18} className="spin" /> : scheduledAt ? "Planifier" : "Transmettre"}
                      </button>
                      {status !== "idle" && (
                         <div className={`mt-6 p-4 rounded-xl text-center text-[10px] font-mono font-bold uppercase tracking-widest animate-in slide-in-from-top-4 ${status === "success" ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
                            {msg}
                         </div>
                      )}
                   </div>
                </div>
             </div>

             <div className="p-5 rounded-2xl bg-[hsl(var(--s3)/0.5)] border border-[hsl(var(--border))] space-y-3">
                <div className="flex items-center gap-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--electric))] shadow-[0_0_8px_hsl(var(--electric))]" />
                   <h4 className="text-[10px] font-mono text-white uppercase font-black">Optimisation</h4>
                </div>
                <p className="text-[9px] text-[hsl(var(--muted))] leading-relaxed font-medium">Utilisez la variable <code className="text-white">{"{{name}}"}</code> pour personnaliser vos envois. L'analyse suggère un engagement 24% plus élevé.</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===================== CONTACTS VIEW =====================
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
  const [newTags, setNewTags] = useState("");

  async function addContact() {
    if (!newEmail || !newList) return;
    const tagsArray = newTags.split(',').map(t => t.trim()).filter(Boolean);
    await fetch("/api/contacts", { 
      method: "POST", 
      headers: { "Content-Type": "application/json" }, 
      body: JSON.stringify({ 
        type: "contact", 
        email: newEmail, 
        name: newName || newEmail, 
        listId: newList,
        tags: tagsArray
      }) 
    });
    setNewEmail(""); setNewName(""); setNewTags(""); setShowAddContact(false); onRefresh();
  }

  const [newListName, setNewListName] = useState(""); const [newListDesc, setNewListDesc] = useState("");

  const filtered = contacts.filter(c => {
    const matchSearch = c.email.toLowerCase().includes(search.toLowerCase()) || 
                      c.name.toLowerCase().includes(search.toLowerCase()) ||
                      (c.tags || []).some(t => t.toLowerCase().includes(search.toLowerCase()));
    const matchList = filterList === "all" || c.listId === filterList;
    return matchSearch && matchList;
  });

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
    if (!confirm(`Supprimer ces ${selected.length} contacts sélectionnés ?`)) return;
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
      const parts = line.split(",");
      return { email: parts[0]?.trim(), name: parts[1]?.trim() };
    }).filter(r => r.email);
    if (!filterList || filterList === "all") { alert("Veuillez sélectionner une liste spécifique avant d'importer."); return; }
    await fetch("/api/contacts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "import", rows, listId: filterList }) });
    onRefresh();
  }

  return (
    <div className="animate-in pb-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="font-display font-bold text-2xl text-white">Gestion de l'Audience</h2>
          <p className="text-sm text-[hsl(var(--muted))]">Organisez vos contacts et segmentez vos listes</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="btn btn-ghost !px-4 text-xs cursor-pointer border-dashed">
            <Upload size={14} /> Importer CSV
            <input type="file" accept=".csv" className="hidden" onChange={handleCsvImport} />
          </label>
          <button onClick={() => setShowAddList(true)} className="btn btn-ghost !px-4 text-xs"><Plus size={14} /> Liste</button>
          <button onClick={() => setShowAddContact(true)} className="btn btn-primary !px-4 text-xs"><Plus size={14} /> Nouveau Contact</button>
        </div>
      </div>

      {/* Lists overview */}
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
        <div className={`card p-6 min-w-[220px] cursor-pointer transition-all ${filterList === "all" ? "ring-2 ring-[hsl(var(--electric))] border-transparent" : "hover:border-[hsl(var(--border-glow))]"}`}
          onClick={() => setFilterList("all")}>
          <div className="text-sm font-mono text-[hsl(var(--dim))] uppercase tracking-widest mb-2 px-1">Audience Totale</div>
          <div className="text-3xl font-display font-bold text-white px-1">{contacts.length}</div>
          <div className="mt-4 pt-4 border-t border-[hsl(var(--border))] flex items-center justify-between text-[10px] font-mono">
             <span className="text-[hsl(var(--muted))]">Ensemble des contacts</span>
             {filterList === "all" && <CheckCircle size={14} className="text-[hsl(var(--electric))]" />}
          </div>
        </div>
        
        {lists.map(l => (
          <div key={l.id}
            className={`card p-6 min-w-[220px] cursor-pointer transition-all ${filterList === l.id ? "ring-2 ring-[hsl(var(--electric))] border-transparent" : "hover:border-[hsl(var(--border-glow))]"}`}
            onClick={() => setFilterList(l.id)}>
            <div className="text-sm font-mono text-[hsl(var(--dim))] uppercase tracking-widest mb-2 px-1 truncate">{l.name}</div>
            <div className="text-3xl font-display font-bold text-white px-1">
              {contacts.filter(c => c.listId === l.id).length}
            </div>
            <div className="mt-4 pt-4 border-t border-[hsl(var(--border))] flex items-center justify-between text-[10px] font-mono">
               <span className="text-[hsl(var(--muted))]">Contacts ciblés</span>
               {filterList === l.id && <CheckCircle size={14} className="text-[hsl(var(--electric))]" />}
            </div>
          </div>
        ))}
      </div>

      {/* Actions & Search */}
      <div className="flex items-center gap-4 my-8">
        <div className="relative flex-1 group">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[hsl(var(--dim))] group-focus-within:text-[hsl(var(--electric))] transition-colors" />
          <input className="input !pl-12 !py-3.5 !rounded-2xl" placeholder="Rechercher par nom, email ou tag…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {selected.length > 0 && (
          <button onClick={deleteSelected} className="btn !bg-[hsl(var(--rose)/0.15)] !text-[hsl(var(--rose))] !border-[hsl(var(--rose)/0.3)] !px-6 animate-in flex items-center gap-2 hover:!bg-[hsl(var(--rose)/0.25)]">
            <Trash2 size={16} />
            Supprimer ({selected.length})
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card !rounded-2xl overflow-hidden border-[hsl(var(--border))]">
        <div className="table-row font-mono text-[10px] tracking-widest uppercase bg-[hsl(var(--s1)/0.5)] !py-4" 
             style={{ gridTemplateColumns: "60px 1.8fr 1.8fr 1fr 1fr 1fr 80px", color: "hsl(var(--dim))" }}>
          <span className="flex items-center justify-center border-r border-[hsl(var(--border))]">
            <input type="checkbox" checked={filtered.length > 0 && selected.length === filtered.length} onChange={toggleAll} className="w-5 h-5 rounded-lg border-[hsl(var(--border))] bg-[hsl(var(--s3))] text-[hsl(var(--electric))] focus:ring-0 checked:bg-[hsl(var(--electric))] cursor-pointer transition-all" />
          </span>
          <span className="pl-6">Contact</span><span className="opacity-70">Identifiant Email</span><span>Segment</span><span>Statut</span><span>Tags</span><span></span>
        </div>
        
        {filtered.length === 0 ? (
          <div className="py-24 text-center bg-gradient-to-b from-transparent to-[hsl(var(--s2)/0.2)]">
            <Users size={48} className="mx-auto mb-6 opacity-10 text-white" />
            <p className="text-sm font-bold text-white mb-1">Aucun contact trouvé</p>
            <p className="text-xs text-[hsl(var(--muted))]">Essayez de modifier vos filtres ou effectuez une nouvelle recherche.</p>
          </div>
        ) : filtered.map((c, i) => (
          <div key={c.id} className={`table-row !py-5 transition-all group ${selected.includes(c.id) ? "bg-[hsl(var(--electric)/0.03)]" : ""}`} 
               style={{ gridTemplateColumns: "60px 1.8fr 1.8fr 1fr 1fr 1fr 80px", animationDelay: `${i * 0.02}s` }}>
            <span className="flex items-center justify-center border-r border-[hsl(var(--border))]">
              <input type="checkbox" checked={selected.includes(c.id)} onChange={() => toggleSelect(c.id)} className="w-5 h-5 rounded-lg border-[hsl(var(--border))] bg-[hsl(var(--s3))] text-[hsl(var(--electric))] focus:ring-0 checked:bg-[hsl(var(--electric))] cursor-pointer transition-all" />
            </span>
            <span className="pl-6 flex flex-col">
               <span className="font-bold text-white group-hover:text-[hsl(var(--electric))] transition-colors">{c.name}</span>
               <span className="text-[10px] font-mono text-[hsl(var(--dim))] mt-0.5">ID: {c.id.split('-')[0]}</span>
            </span>
            <span className="font-mono text-xs text-[hsl(var(--muted))] group-hover:text-white transition-colors truncate pr-4">{c.email}</span>
            <span className="text-xs">
               <span className="px-2 py-0.5 rounded-md bg-[hsl(var(--s2))] text-[hsl(var(--muted))] border border-[hsl(var(--border))]">{lists.find(l => l.id === c.listId)?.name || "Non classé"}</span>
            </span>
            <span>
               <span className={`badge ${c.subscribed ? "badge-green" : "badge-failed"}`}>
                  <div className={`w-1 h-1 rounded-full ${c.subscribed ? "bg-green-400" : "bg-rose-400"}`} />
                  {c.subscribed ? "Abonné" : "Désabonné"}
               </span>
            </span>
            <div className="flex flex-wrap gap-1">
               {(c.tags || []).length > 0 ? c.tags.map((t, idx) => (
                 <span key={idx} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[hsl(var(--s3))] text-[hsl(var(--electric))] border border-[hsl(var(--electric)/0.2)]">{t}</span>
               )) : <span className="text-[9px] font-mono text-[hsl(var(--dim))] italic">Aucun</span>}
            </div>
            <div className="flex justify-end pr-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => deleteContact(c.id)} className="btn btn-danger !p-2 rounded-xl"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>

      {/* Modals for Add Contact / Add List */}
      {showAddContact && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setShowAddContact(false)}>
          <div className="modal p-8 flex flex-col gap-6" style={{ maxWidth: 440 }}>
            <div>
               <h3 className="font-display font-bold text-2xl text-white tracking-tight">Nouveau Contact</h3>
               <p className="text-xs text-[hsl(var(--muted))] font-mono uppercase tracking-widest mt-1">Saisie de données</p>
            </div>
            <div className="space-y-5">
              <div><label className="label">Adresse Email *</label><input className="input font-mono text-sm" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="email@exemple.com" /></div>
              <div><label className="label">Nom complet</label><input className="input" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Jean Dupont" /></div>
              <div><label className="label">Tags (séparés par des virgules)</label><input className="input font-mono text-xs" value={newTags} onChange={e => setNewTags(e.target.value)} placeholder="vip, prospect, etc..." /></div>
              <div><label className="label">Segment / Liste *</label>
                <select className="input" value={newList} onChange={e => setNewList(e.target.value)}>
                  <option value="">Sélectionner une cible</option>
                  {lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div className="flex gap-4 pt-4">
                <button onClick={() => setShowAddContact(false)} className="btn btn-ghost flex-1">Annuler</button>
                <button onClick={addContact} className="btn btn-primary flex-1">Enregistrer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddList && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setShowAddList(false)}>
          <div className="modal p-8 flex flex-col gap-6" style={{ maxWidth: 440 }}>
            <div>
               <h3 className="font-display font-bold text-2xl text-white tracking-tight">Nouveau Segment</h3>
               <p className="text-xs text-[hsl(var(--muted))] font-mono uppercase tracking-widest mt-1">Saisie de données</p>
            </div>
            <div className="space-y-5">
              <div><label className="label">Nom de la liste *</label><input className="input" value={newListName} onChange={e => setNewListName(e.target.value)} placeholder="Ex: Clients Prioritaires" /></div>
              <div><label className="label">Description (optionnelle)</label><input className="input" value={newListDesc} onChange={e => setNewListDesc(e.target.value)} placeholder="Contexte pour cet audience…" /></div>
              <div className="flex gap-4 pt-4">
                <button onClick={() => setShowAddList(false)} className="btn btn-ghost flex-1">Annuler</button>
                <button onClick={addList} className="btn btn-primary flex-1">Créer le segment</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===================== CAMPAIGNS VIEW =====================
function CampaignsView({ campaigns, lists, contacts, onRefresh }: { 
  campaigns: Campaign[]; lists: ContactList[]; contacts: Contact[]; onRefresh: () => void 
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [sending, setSending] = useState<string | null>(null);

  // Form State
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const [listId, setListId] = useState("");
  const [provider, setProvider] = useState<EmailProvider>("resend");
  const [fromName, setFromName] = useState("CrediWize"); 
  const [fromEmail, setFromEmail] = useState("contact@crediwize.com");
  const [scheduledAt, setScheduledAt] = useState("");
  const [attachments, setAttachments] = useState<EmailAttachment[]>([]);
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

  async function createCampaign() {
    if (!name || !subject || !listId || !fromEmail) {
      alert("⚠️ Tous les champs (Nom, Sujet, Audience, Expéditeur) sont requis !");
      return;
    }
    
    if (!listId.includes("-") || listId === "list-1") {
      alert("❌ Vous utilisez une audience de démonstration. Veuillez d'abord créer une vraie Audience dans l'onglet 'Audience' !");
      return;
    }

    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, subject, html, listId, provider, fromName, fromEmail, attachments, scheduledAt: scheduledAt || undefined }),
      });
      
      const data = await res.json();
      if (!res.ok) {
        alert("🚨 ERREUR CRITIQUE SUPABASE :\n\n" + (data.error || "Le serveur a refusé la création."));
        return;
      }
      
      setShowCreate(false); setStep(1); setName(""); setSubject(""); setHtml(""); setScheduledAt(""); setAttachments([]);
      onRefresh();

      if (!scheduledAt && data.id) sendCampaign(data.id);
    } catch (err) {
      alert("🌐 Erreur de connexion au serveur.");
    }
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
    if (!confirm("Supprimer cette campagne ?")) return;
    await fetch("/api/campaigns", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    onRefresh();
  }

  function execCmd(cmd: string, val?: string) {
    document.execCommand(cmd, false, val);
    if (editorRef.current) setHtml(editorRef.current.innerHTML);
  }

  return (
    <div className="animate-in space-y-10 pb-20 max-w-7xl mx-auto">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <h2 className="font-display font-black text-4xl text-white tracking-tighter uppercase italic leading-none">Commandes de Campagnes</h2>
          <div className="flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-[hsl(var(--electric))] shadow-[0_0_10px_hsl(var(--electric))]" />
             <p className="text-[10px] font-mono text-[hsl(var(--dim))] uppercase tracking-[0.3em] font-bold">V-Core Engine &bull; {campaigns.length} unités actives</p>
          </div>
        </div>
        <button onClick={() => { setStep(1); setShowCreate(true); }} className="btn btn-primary px-8 py-4 !rounded-2xl shadow-[0_20px_40px_-10px_hsl(var(--electric)/0.3)] group">
          <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
          Nouv. Campagne
        </button>
      </div>

      {campaigns.length === 0 ? (
        <div className="card !bg-transparent border-dashed border-2 py-32 flex flex-col items-center justify-center text-center space-y-6">
           <div className="w-24 h-24 rounded-full bg-[hsl(var(--s1))] flex items-center justify-center text-[hsl(var(--dim))]">
              <Megaphone size={40} strokeWidth={1} />
           </div>
           <div className="space-y-1">
             <h3 className="text-white font-bold">Aucune campagne à l'horizon</h3>
             <p className="text-sm text-[hsl(var(--muted))]">Commencez par créer votre première transmission pour engager votre audience.</p>
           </div>
           <button onClick={() => { setStep(1); setShowCreate(true); }} className="btn btn-ghost !rounded-xl">Lancer une campagne</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {campaigns.map((c) => (
            <div key={c.id} className="card group hover:border-[hsl(var(--electric)/0.3)] transition-all duration-500 relative flex flex-col overflow-hidden bg-gradient-to-br from-[hsl(var(--s1))] to-[hsl(var(--s2))]">
               {/* Background Glow */}
               <div className="absolute top-0 right-0 w-64 h-64 bg-radial-gradient from-[hsl(var(--electric)/0.03)] to-transparent pointer-events-none" />
               
               {/* Top Bar */}
               <div className="p-6 pb-0 flex items-start justify-between relative z-10">
                  <div className="space-y-2 max-w-[70%]">
                     <div className="flex items-center gap-2">
                        <StatusBadge s={c.status} />
                        <ProviderBadge p={c.provider} />
                     </div>
                     <h3 className="font-display font-black text-xl text-white truncate leading-tight tracking-tight group-hover:text-[hsl(var(--electric))] transition-colors">{c.name}</h3>
                     <p className="text-xs text-[hsl(var(--muted))] italic truncate">{c.subject}</p>
                  </div>
                  <div className="flex gap-2">
                     <button onClick={() => deleteCampaign(c.id)} className="w-10 h-10 rounded-xl bg-[hsl(var(--s3))] border border-[hsl(var(--border))] flex items-center justify-center text-[hsl(var(--dim))] hover:text-[hsl(var(--rose))] hover:bg-[hsl(var(--rose)/0.1)] hover:border-[hsl(var(--rose)/0.2)] transition-all">
                       <Trash2 size={16} />
                     </button>
                  </div>
               </div>

               {/* Stats Row */}
               <div className="p-6 grid grid-cols-4 gap-4 relative z-10">
                  {[
                    { label: "Envois", val: c.stats.sent, icon: <Send size={12} />, color: "var(--electric)" },
                    { label: "Ouverts", val: c.stats.opens, icon: <Eye size={12} />, color: "var(--violet)" },
                    { label: "Clics", val: c.stats.clicks, icon: <MousePointer size={12} />, color: "var(--amber)" },
                    { label: "Désabs.", val: c.stats.unsubscribes, icon: <UserMinus size={12} />, color: "var(--rose)" },
                  ].map(s => (
                    <div key={s.label} className="space-y-1">
                       <div className="flex items-center gap-1.5 text-[9px] font-mono text-[hsl(var(--dim))] uppercase tracking-widest font-bold">
                          <span style={{ color: `hsl(${s.color})` }}>{s.icon}</span>
                          {s.label}
                       </div>
                       <div className="text-lg font-black text-white font-mono">{fmt(s.val)}</div>
                    </div>
                  ))}
               </div>

               {/* Progress Section */}
               <div className="px-6 pb-6 space-y-4 relative z-10 flex-1 flex flex-col justify-end">
                  <div className="space-y-2">
                     <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-widest">
                        <span className="text-[hsl(var(--muted))]">Transmission Status</span>
                        <span className="text-white">{c.stats.sent}/{c.stats.total} <span className="text-[hsl(var(--electric))]">({c.stats.total > 0 ? Math.round((c.stats.sent / c.stats.total) * 100) : 0}%)</span></span>
                     </div>
                     <div className="h-1.5 w-full bg-[hsl(var(--s3))] rounded-full overflow-hidden p-[1px]">
                        <div className="h-full rounded-full bg-gradient-to-r from-[hsl(var(--electric))] to-[hsl(var(--violet))] shadow-[0_0_10px_hsl(var(--electric)/0.3)] transition-all duration-1000" 
                             style={{ width: `${c.stats.total > 0 ? (c.stats.sent / c.stats.total) * 100 : 0}%` }} />
                     </div>
                  </div>

                  {c.errorMessage && (
                    <div className="p-3 rounded-xl bg-[hsl(var(--rose)/0.1)] border border-[hsl(var(--rose)/0.2)] flex items-start gap-3 animate-in slide-in-from-left duration-500">
                      <XCircle size={14} className="text-[hsl(var(--rose))] shrink-0 mt-0.5" />
                      <div className="text-[10px] text-[hsl(var(--rose))] font-mono font-bold leading-tight uppercase tracking-tighter">
                        Diagnostic: {c.errorMessage}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {(c.status === "draft" || c.status === "failed") && (
                      <button onClick={() => sendCampaign(c.id)} disabled={sending === c.id} 
                        className="btn btn-primary w-full py-4 !rounded-xl text-xs uppercase tracking-widest font-black shadow-[0_10px_20px_hsl(var(--electric)/0.2)] group/btn">
                        {sending === c.id ? <><Loader2 size={14} className="spin" /> Séquençage...</> : <><Play size={14} className="group-hover/btn:scale-125 transition-transform" /> {c.status === "failed" ? "Relancer" : "Lancer la transmission"}</>}
                      </button>
                    )}
                    {c.status === "sending" && (
                      <div className="w-full py-4 rounded-xl bg-[hsl(var(--amber)/0.1)] border border-[hsl(var(--amber)/0.2)] flex items-center justify-center gap-3 text-[hsl(var(--amber))] text-[10px] font-black uppercase tracking-widest animate-pulse">
                        <RefreshCw size={14} className="spin" /> Synchronisation Resend...
                      </div>
                    )}
                    {c.status === "sent" && (
                      <div className="w-full py-4 rounded-xl bg-[hsl(var(--electric)/0.05)] border border-[hsl(var(--electric)/0.1)] flex items-center justify-center gap-3 text-[hsl(var(--electric))] text-[10px] font-black uppercase tracking-widest">
                        <CheckCircle size={14} /> Mission Terminée
                      </div>
                    )}
                  </div>
               </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE MODAL */}
      {showCreate && (
        <div className="overlay animate-in fade-in duration-300" onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="modal flex flex-col shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden" style={{ maxWidth: 700 }}>
            <div className="h-1.5 bg-gradient-to-r from-[hsl(var(--electric))] to-[hsl(var(--violet))]" />
            
            {/* Modal Header */}
            <div className="p-8 border-b border-[hsl(var(--border))] flex items-center justify-between bg-gradient-to-b from-[hsl(var(--s2))] to-[hsl(var(--bg))]">
              <div className="space-y-1">
                <h2 className="text-white font-display font-black text-2xl uppercase italic leading-none tracking-tighter">Initialiser Mission</h2>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--electric))] animate-pulse" />
                  <p className="text-[10px] font-mono text-[hsl(var(--dim))] uppercase tracking-widest font-bold">Étape {step} sur 3</p>
                </div>
              </div>
              <button onClick={() => setShowCreate(false)} className="w-10 h-10 rounded-xl bg-[hsl(var(--s3))] flex items-center justify-center text-[hsl(var(--muted))] hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-8 space-y-8 overflow-y-auto max-h-[70vh]">
              {step === 1 && (
                <div className="space-y-6 animate-in slide-in-from-right duration-500">
                  <div className="space-y-2">
                    <label className="label">Identifiant de Campagne</label>
                    <input autoFocus className="input text-lg font-bold" placeholder="ex: Solde Hiver 2025" value={name} onChange={e => setName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="label">Sujet de Transmission</label>
                    <input className="input" placeholder="ex: Profitez de 50% de réduction..." value={subject} onChange={e => setSubject(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="label">Nom Expéditeur</label>
                      <input className="input" value={fromName} onChange={e => setFromName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <label className="label">Email Expéditeur</label>
                      <input className="input" value={fromEmail} onChange={e => setFromEmail(e.target.value)} />
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6 animate-in slide-in-from-right duration-500">
                  <div className="space-y-2">
                    <label className="label">Cible (Audience)</label>
                    <select className="input h-14 font-bold" value={listId} onChange={e => setListId(e.target.value)}>
                      <option value="">Sélectionner une audience</option>
                      {lists.map(l => (
                        <option key={l.id} value={l.id}>
                          {l.name} ({contacts.filter(con => con.listId === l.id).length} contacts)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="label">Service de Relay</label>
                    <div className="flex gap-3">
                      {PROVIDERS.map(p => (
                        <button key={p} onClick={() => setProvider(p)} 
                          className={`flex-1 p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${provider === p ? 'bg-[hsl(var(--electric)/0.1)] border-[hsl(var(--electric))]' : 'bg-[hsl(var(--s2))] border-[hsl(var(--border))] opacity-50'}`}>
                          <span className={`text-[10px] font-mono font-bold uppercase tracking-widest ${provider === p ? 'text-[hsl(var(--electric))]' : 'text-[hsl(var(--muted))]'}`}>{PROVIDER_LABELS[p]}</span>
                          <span className="text-[hsl(var(--dim))] text-[9px] font-mono">Recommandé</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="label">Planification (Optionnel)</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-4 text-[hsl(var(--dim))]" size={18} />
                      <input type="datetime-local" className="input !pl-12" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6 animate-in slide-in-from-right duration-500">
                   <div className="space-y-2">
                    <label className="label">Contenu HTML</label>
                    <div className="rounded-2xl border border-[hsl(var(--border))] overflow-hidden bg-[hsl(var(--s1))]">
                      <EditorToolbar exec={execCmd} />
                      <div {...getRootProps()} className={`rich-editor p-6 relative ${isDragActive ? "bg-[hsl(var(--electric)/0.05)]" : ""}`}>
                        <input {...getInputProps()} />
                        <div ref={editorRef} contentEditable className="rich-editor" onInput={e => setHtml(e.currentTarget.innerHTML)} data-placeholder="Écrivez votre message ici..." />
                        {isDragActive && (
                          <div className="absolute inset-0 flex items-center justify-center bg-[hsl(var(--bg)/0.5)] backdrop-blur-sm">
                            <div className="flex flex-col items-center animate-bounce text-[hsl(var(--electric))]">
                              <Upload size={32} />
                              <span className="text-[10px] font-mono uppercase font-black">Larguer les fichiers</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {attachments.length > 0 && (
                    <div className="space-y-2">
                      <label className="label">Pièces Jointes ({attachments.length})</label>
                      <div className="flex flex-wrap gap-2">
                        {attachments.map((a, i) => (
                          <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[hsl(var(--s2))] border border-[hsl(var(--border))] group/att">
                            <Paperclip size={12} className="text-[hsl(var(--dim))]" />
                            <span className="text-[10px] font-mono text-white max-w-[100px] truncate">{a.name}</span>
                            <button onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))} className="text-[hsl(var(--dim))] hover:text-[hsl(var(--rose))]">
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-8 bg-[hsl(var(--s1))] border-t border-[hsl(var(--border))] flex gap-4">
              {step > 1 && (
                <button onClick={() => setStep(step - 1)} className="btn btn-ghost px-8 py-4 !rounded-xl">Précédent</button>
              )}
              {step < 3 ? (
                <button onClick={() => setStep(step + 1)} className="btn btn-primary flex-1 justify-center !rounded-xl py-4 shadow-[0_15px_30px_hsl(var(--electric)/0.2)]">Continuer</button>
              ) : (
                <button onClick={createCampaign} className="btn btn-primary flex-1 justify-center !rounded-xl py-4 shadow-[0_15px_30px_hsl(var(--electric)/0.3)] group/launch">
                  {scheduledAt ? <><Calendar size={18} /> Planifier Mission</> : <><Zap size={18} className="group-hover/launch:scale-125 transition-transform" /> Initialiser Transmission</>}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===================== INBOX VIEW =====================
function InboxView({ emails, onRefresh }: { emails: InboundEmail[]; onRefresh: () => void }) {
  const [filter, setFilter] = useState("all");
  const [selectedEmail, setSelectedEmail] = useState<InboundEmail | null>(null);
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
    if (!confirm("Supprimer cet email ?")) return;
    await fetch(`/api/inbound?id=${id}`, { method: "DELETE" });
    onRefresh();
    if (selectedEmail?.id === id) setSelectedEmail(null);
  }

  return (
    <div className="animate-in pb-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="font-display font-bold text-2xl text-white">Boîte de Réception</h2>
          <p className="text-sm text-[hsl(var(--muted))]">Gérez vos communications entrantes en temps réel</p>
        </div>
        <div className="flex items-center gap-2 bg-[hsl(var(--s2))] p-1 rounded-xl border border-[hsl(var(--border))]">
          {["all", "unread", "read", "archived"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-widest transition-all ${filter === f ? "bg-[hsl(var(--s3))] text-[hsl(var(--electric))] shadow-sm" : "text-[hsl(var(--dim))] hover:text-white"}`}>
              {f === "all" ? "Tous" : f === "unread" ? "Non lus" : f === "read" ? "Lus" : "Archivés"}
            </button>
          ))}
          <div className="w-[1px] h-4 bg-[hsl(var(--border))] mx-1" />
          <button onClick={onRefresh} className="p-2 text-[hsl(var(--dim))] hover:text-white transition-colors"><RefreshCw size={14} /></button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className={`card !p-0 overflow-hidden border-[hsl(var(--border))] ${selectedEmail ? "lg:col-span-5" : "lg:col-span-12"}`}>
          <div className="table-row font-mono text-[10px] tracking-widest uppercase bg-[hsl(var(--s1)/0.5)] !py-4" 
               style={{ gridTemplateColumns: selectedEmail ? "140px 1fr 100px" : "140px 1.5fr 2fr 100px 140px", color: "hsl(var(--dim))" }}>
            <span>Expéditeur</span><span>Sujet</span>{!selectedEmail && <span>Message</span>}<span>Statut</span><span className="text-right pr-6">Date</span>
          </div>
          
          {filtered.length === 0 ? (
            <div className="py-24 text-center bg-gradient-to-b from-transparent to-[hsl(var(--s2)/0.2)]">
              <Mail size={48} className="mx-auto mb-6 opacity-10 text-white" />
              <p className="text-sm font-bold text-white mb-1">Boîte vide</p>
              <p className="text-xs text-[hsl(var(--muted))]">Aucun message ne correspond à vos critères.</p>
            </div>
          ) : (
            filtered.map((e, i) => (
              <div key={e.id} onClick={() => { setSelectedEmail(e); if (e.status === "unread") updateStatus(e.id, "read"); }}
                   className={`table-row !py-5 hover:bg-[hsl(var(--electric)/0.02)] transition-colors group cursor-pointer ${selectedEmail?.id === e.id ? "bg-[hsl(var(--electric)/0.05)] border-l-2 border-l-[hsl(var(--electric))]" : ""}`} 
                   style={{ gridTemplateColumns: selectedEmail ? "140px 1fr 100px" : "140px 1.5fr 2fr 100px 140px", animationDelay: `${i * 0.02}s` }}>
                <span className={`truncate font-bold text-[12px] group-hover:text-white transition-colors pr-4 ${e.status === "unread" ? "text-white" : "text-[hsl(var(--dim))]"}`}>{e.fromName || e.fromEmail}</span>
                <span className={`truncate pr-4 text-[13px] ${e.status === "unread" ? "text-white font-bold" : "text-[hsl(var(--muted))]"}`}>{e.subject}</span>
                {!selectedEmail && <span className="truncate text-[11px] text-[hsl(var(--dim))] pr-4">{e.text}</span>}
                <span className="flex items-center gap-1.5"><StatusBadge s={e.status} /></span>
                <span className="text-[11px] font-mono text-[hsl(var(--dim))] text-right pr-6">{relTime(e.timestamp)}</span>
              </div>
            ))
          )}
        </div>

        {selectedEmail && (
          <div className="lg:col-span-7 card p-8 space-y-6 animate-in slide-in-from-right-4">
            <div className="flex items-start justify-between border-b border-[hsl(var(--border))] pb-6">
              <div className="space-y-1">
                <h3 className="font-display font-bold text-xl text-white">{selectedEmail.subject}</h3>
                <div className="flex items-center gap-3 text-[11px] font-mono">
                  <span className="text-[hsl(var(--dim))] uppercase">De :</span> 
                  <span className="text-[hsl(var(--electric))]">{selectedEmail.fromName ? `${selectedEmail.fromName} <${selectedEmail.fromEmail}>` : selectedEmail.fromEmail}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => updateStatus(selectedEmail.id, selectedEmail.status === "archived" ? "read" : "archived")} 
                        className="btn btn-ghost !p-2" title={selectedEmail.status === "archived" ? "Désarchiver" : "Archiver"}>
                  <Download size={16} />
                </button>
                <button onClick={() => deleteEmail(selectedEmail.id)} className="btn btn-ghost !p-2 text-[hsl(var(--rose))]" title="Supprimer">
                  <Trash2 size={16} />
                </button>
                <button onClick={() => setSelectedEmail(null)} className="btn btn-ghost !p-2" title="Fermer">
                  <X size={16} />
                </button>
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-8 min-h-[400px] text-zinc-900 overflow-auto leading-relaxed"
                 dangerouslySetInnerHTML={{ __html: selectedEmail.html || `<div class="font-sans whitespace-pre-wrap">${selectedEmail.text}</div>` }} />
          </div>
        )}
      </div>
    </div>
  );
}

// ===================== HISTORY VIEW =====================
function HistoryView({ records, onRefresh }: { records: EmailRecord[]; onRefresh: () => void }) {
  const [filter, setFilter] = useState("all");
  const filtered = records.filter(r => filter === "all" || r.status === filter);

  return (
    <div className="animate-in pb-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="font-display font-bold text-2xl text-white">Journal d'Activité</h2>
          <p className="text-sm text-[hsl(var(--muted))]">Suivi détaillé de tous les emails envoyés ou programmés</p>
        </div>
        <div className="flex items-center gap-2 bg-[hsl(var(--s2))] p-1 rounded-xl border border-[hsl(var(--border))]">
          {["all", "sent", "failed", "scheduled"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-widest transition-all ${filter === f ? "bg-[hsl(var(--s3))] text-[hsl(var(--electric))] shadow-sm" : "text-[hsl(var(--dim))] hover:text-white"}`}>
              {f === "all" ? "Tous" : f}
            </button>
          ))}
          <div className="w-[1px] h-4 bg-[hsl(var(--border))] mx-1" />
          <button onClick={onRefresh} className="p-2 text-[hsl(var(--dim))] hover:text-white transition-colors"><RefreshCw size={14} /></button>
        </div>
      </div>

      <div className="card !rounded-2xl overflow-hidden border-[hsl(var(--border))]">
        <div className="table-row font-mono text-[10px] tracking-widest uppercase bg-[hsl(var(--s1)/0.5)] !py-4" 
             style={{ gridTemplateColumns: "100px 1.5fr 2fr 100px 100px 100px 140px", color: "hsl(var(--dim))" }}>
          <span>Source</span><span>Expéditeur</span><span>Objet</span><span className="text-center">Ouverts</span><span className="text-center">Clics</span><span>Statut</span><span className="text-right pr-6">Date</span>
        </div>
        
        {filtered.length === 0 ? (
          <div className="py-24 text-center bg-gradient-to-b from-transparent to-[hsl(var(--s2)/0.2)]">
            <History size={48} className="mx-auto mb-6 opacity-10 text-white" />
            <p className="text-sm font-bold text-white mb-1">Aucun enregistrement</p>
            <p className="text-xs text-[hsl(var(--muted))]">Votre historique d'envoi est vide pour le moment.</p>
          </div>
        ) : (
          filtered.map((r, i) => (
            <div key={r.id} className="table-row !py-5 hover:bg-[hsl(var(--electric)/0.02)] transition-colors group" 
                 style={{ gridTemplateColumns: "100px 1.5fr 2fr 100px 100px 100px 140px", animationDelay: `${i * 0.02}s` }}>
              <ProviderBadge p={r.provider} />
              <span className="truncate font-mono text-[11px] text-[hsl(var(--dim))] group-hover:text-[hsl(var(--muted))] transition-colors pr-4">{r.from}</span>
              <span className="truncate text-white font-medium pr-4">{r.subject}</span>
              <span className="flex items-center justify-center gap-1.5 font-mono text-[11px] text-[hsl(var(--muted))]">
                <Eye size={12} className="opacity-50" /> {r.opens}
              </span>
              <span className="flex items-center justify-center gap-1.5 font-mono text-[11px] text-[hsl(var(--muted))]">
                <MousePointer size={12} className="opacity-50" /> {r.clicks}
              </span>
              <span><StatusBadge s={r.status} /></span>
              <span className="text-[11px] font-mono text-[hsl(var(--dim))] text-right pr-6">{relTime(r.timestamp)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ===================== DASHBOARD VIEW =====================
function DashboardView({ stats }: { stats: DashboardStats | null }) {
  if (!stats) return <div className="flex flex-col items-center justify-center h-96 gap-4">
    <Loader2 size={32} className="spin text-[hsl(var(--electric))]" />
    <p className="text-xs font-mono text-[hsl(var(--dim))] uppercase tracking-widest animate-pulse">Initialisation du dashboard…</p>
  </div>;

  return (
    <div className="animate-in space-y-8 pb-12">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard value={fmt(stats.totalSent)} label="Emails envoyés" icon={<Send size={20} />} color="var(--electric)" delta="+12.5%" trend="up" />
        <StatCard value={fmt(stats.totalOpens)} label="Nombre d'ouverture" icon={<Eye size={20} />} color="var(--violet)" delta="+4.3%" trend="up" />
        <StatCard value={fmt(stats.totalClicks)} label="Nombre de clic" icon={<MousePointer size={20} />} color="var(--amber)" delta="-1.2%" trend="down" />
        <StatCard value={fmt(stats.totalUnsubs)} label="Désabonnements" icon={<UserMinus size={20} />} color="var(--rose)" delta="-0.05%" trend="up" />
      </div>

      {/* Main Stats Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-8 lg:col-span-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <BarChart2 size={120} />
          </div>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="font-display font-bold text-xl text-white">Analyse de Performance</h3>
              <p className="text-xs text-[hsl(var(--muted))] mt-1">Activité de diffusion sur les 7 derniers jours</p>
            </div>
            <div className="flex gap-2">
              <span className="badge badge-sent">Actif</span>
            </div>
          </div>
          
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.recentActivity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gSent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--electric))" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(var(--electric))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gOpens" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--violet))" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="hsl(var(--violet))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--dim))", fontSize: 10, fontFamily: "Space Mono" }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--dim))", fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{ background: "hsl(var(--bg))", border: "1px solid hsl(var(--border))", borderRadius: "12px", boxShadow: "0 10px 40px rgba(0,0,0,0.5)", fontFamily: "Outfit" }}
                  cursor={{ stroke: "hsl(var(--electric) / 0.2)", strokeWidth: 2 }}
                />
                <Area type="monotone" dataKey="sent" stroke="hsl(var(--electric))" strokeWidth={3} fill="url(#gSent)" name="Envoyés" activeDot={{ r: 6, strokeWidth: 0, fill: "white" }} />
                <Area type="monotone" dataKey="opens" stroke="hsl(var(--violet))" strokeWidth={3} fill="url(#gOpens)" name="Ouverts" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="card p-6 flex-1">
            <h3 className="font-display font-bold text-lg text-white mb-6">Top Campagnes</h3>
            <div className="space-y-5">
              {stats.topCampaigns.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 opacity-30 gap-3 border-2 border-dashed border-[hsl(var(--border))] rounded-2xl">
                  <BarChart2 size={32} />
                  <p className="text-[10px] font-mono uppercase tracking-widest text-center">Aucune campagne<br/>active</p>
                </div>
              ) : (
                stats.topCampaigns.slice(0, 4).map((c, i) => (
                  <div key={i} className="flex items-center gap-4 group">
                    <div className="w-10 h-10 rounded-xl bg-[hsl(var(--s2))] flex items-center justify-center text-xs font-bold border border-[hsl(var(--border))] text-white transition-transform group-hover:scale-105" 
                         style={{ color: i === 0 ? "hsl(var(--electric))" : "white", borderColor: i === 0 ? "hsl(var(--electric) / 0.2)" : "hsl(var(--border))" }}>
                      0{i+1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-end mb-1">
                        <div className="text-[13px] font-bold text-white truncate">{c.name}</div>
                        <div className="text-[11px] font-mono text-[hsl(var(--electric))]">{c.opens} ouvertures</div>
                      </div>
                      <div className="h-1.5 w-full bg-[hsl(var(--s2))] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-1000" 
                             style={{ width: `${Math.min(100, (c.opens / (stats.totalSent || 1)) * 100)}%`, background: i === 0 ? "hsl(var(--electric))" : "hsl(var(--violet))" }} />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            {stats.topCampaigns.length > 0 && (
              <button className="btn btn-ghost w-full mt-6 justify-center text-[10px] uppercase font-mono tracking-widest">
                Voir toutes les campagnes
              </button>
            )}
          </div>

          <div className="card p-6 bg-gradient-to-br from-[hsl(var(--electric) / 0.1)] to-transparent border-[hsl(var(--electric) / 0.15)] relative overflow-hidden">
            <Zap className="absolute -bottom-4 -right-4 w-24 h-24 text-[hsl(var(--electric))] opacity-5" />
            <h4 className="font-display font-bold text-white text-sm mb-2">Besoin d'aide ?</h4>
            <p className="text-xs text-[hsl(var(--muted))] leading-relaxed mb-4">Optimisez vos taux d'ouverture en personnalisant vos objets d'emails.</p>
            <button className="btn btn-primary !py-2 !px-4 text-xs w-full justify-center">
              Consulter le Guide <ExternalLink size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* Tips Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: <TrendingUp size={16} />, title: "Taux d'ouverture cible", value: "25%+", color: "var(--electric)", tip: "Travaillez vos objets d'emails." },
          { icon: <MousePointer size={16} />, title: "Taux de clic cible", value: "5%+", color: "var(--violet)", tip: "Soignez vos boutons d'action." },
          { icon: <UserMinus size={16} />, title: "Désabonnements max", value: "<0.5%", color: "var(--amber)", tip: "Évitez de saturer vos listes." },
        ].map((t, i) => (
          <div key={i} className="card p-5 flex items-center gap-4 hover:border-[hsl(var(--border-glow))] transition-all">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `hsl(${t.color} / 0.1)`, color: `hsl(${t.color})` }}>
              {t.icon}
            </div>
            <div>
              <div className="text-[10px] font-mono text-[hsl(var(--dim))] uppercase tracking-widest">{t.title}</div>
              <div className="text-lg font-bold text-white">{t.value}</div>
              <p className="text-[11px] text-[hsl(var(--muted))]">{t.tip}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}



// ===================== MAIN APP =====================
// ===================== MAIN APP =====================
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
      if (errors.length > 0) setErrorBar(`Erreur de synchronisation : ${errors.join(", ")}`);

      setStats(a?.error ? null : a);
      setContacts(Array.isArray(c?.contacts) ? c.contacts : []);
      setLists(Array.isArray(c?.lists) ? c.lists : []);
      setCampaigns(Array.isArray(camp) ? camp : []);
      setRecords(Array.isArray(h) ? h : []);
      setInbound(Array.isArray(inc) ? inc : []);
    } catch (err) {
      setErrorBar("Erreur critique de connexion au serveur.");
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

  const NAV = [
    { id: "dashboard", label: "Tableau de Bord", icon: <LayoutDashboard size={20} /> },
    { id: "inbox", label: "Réception", icon: <Inbox size={20} /> },
    { id: "compose", label: "Rédacteur", icon: <Send size={20} /> },
    { id: "contacts", label: "Audience", icon: <Users size={20} /> },
    { id: "campaigns", label: "Campagnes", icon: <Megaphone size={20} /> },
    { id: "history", label: "Historique", icon: <History size={20} /> },
  ] as const;

  const currentNav = NAV.find(n => n.id === view);

  if (!isAuthorized) return <LoginGate onAuthorize={() => setIsAuthorized(true)} />;

  return (
    <div className="flex h-screen bg-[hsl(var(--bg))] text-[hsl(var(--foreground))] overflow-hidden font-sans">
      {/* Global Error Bar */}
      {errorBar && (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[200] max-w-lg w-full p-3 rounded-2xl bg-[hsl(var(--rose))] text-white shadow-2xl flex items-center justify-between gap-4 animate-in slide-in-from-top duration-300">
           <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest leading-none">
             <XCircle size={14} className="shrink-0" /> {errorBar}
           </div>
           <button onClick={() => fetchAll()} className="p-2 hover:bg-white/10 rounded-lg shrink-0"><RefreshCw size={12} /></button>
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside className={`fixed inset-y-0 left-0 flex flex-col z-50 border-r border-[hsl(var(--border))] bg-[hsl(var(--bg))] transition-all duration-300 ease-in-out ${isSidebarCollapsed ? "w-20" : "w-72"}`}>
        {/* Logo Section */}
        <div className={`flex items-center gap-4 p-6 mb-4 transition-all opacity-0 scale-95 animate-in fade-in zoom-in duration-500 fill-mode-forwards ${isSidebarCollapsed ? "justify-center px-0" : ""}`}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(79,255,207,0.1)] transform transition-transform hover:rotate-12" 
               style={{ background: "linear-gradient(135deg, hsl(var(--electric) / 0.2), hsl(var(--violet) / 0.2))", border: "1px solid hsl(var(--electric) / 0.3)" }}>
            <Zap size={24} className="text-[hsl(var(--electric))]" />
          </div>
          {!isSidebarCollapsed && (
            <div className="animate-in slide-in-from-left-4 duration-300 fill-mode-forwards">
              <h1 className="font-display font-black text-2xl tracking-tighter text-white leading-none">MailMax</h1>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] mt-1 text-[hsl(var(--dim))] font-bold">V-CORE ENGINE</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-1.5 mt-4">
          {NAV.map(n => (
            <button key={n.id} onClick={() => { setView(n.id); fetchAll(); window.scrollTo({ top: 0, behavior: 'smooth'}); }}
              className={`nav-item group relative flex items-center gap-3 w-full p-3.5 rounded-2xl transition-all duration-200 ${view === n.id ? "bg-[hsl(var(--electric)/0.15)] text-[hsl(var(--electric))] shadow-inner" : "text-[hsl(var(--dim))] hover:bg-[hsl(var(--s2))] hover:text-white"}`}>
              <div className={`transition-transform group-hover:scale-110 ${view === n.id ? "scale-110" : ""}`}>
                {n.icon}
              </div>
              {!isSidebarCollapsed && (
                <span className="flex-1 text-left font-display font-bold text-[15.5px] animate-in fade-in duration-300">{n.label}</span>
              )}
              {isSidebarCollapsed && (
                <div className="absolute left-full ml-4 px-3 py-2 bg-[hsl(var(--s3))] text-white text-[11px] font-bold rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-2xl border border-[hsl(var(--border))]">
                  {n.label}
                </div>
              )}
              {view === n.id && <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-[hsl(var(--electric))] shadow-[0_0_8px_hsl(var(--electric))]" />}
            </button>
          ))}
        </nav>

        {/* Account Summary & Collapse Toggle */}
        <div className="p-4 space-y-4">
           
           <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
                   className="w-full h-12 flex items-center justify-center rounded-2xl bg-[hsl(var(--s2))] hover:bg-[hsl(var(--s3))] border border-[hsl(var(--border))] text-[hsl(var(--dim))] hover:text-white transition-all shadow-lg active:scale-95 group">
             {isSidebarCollapsed ? <ChevronRight size={20} className="group-hover:translate-x-0.5 transition-transform" /> : <AlignLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />}
           </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className={`flex-1 transition-all duration-300 ease-in-out flex flex-col ${isSidebarCollapsed ? "ml-20" : "ml-72"}`}>
        {/* TOP INTERACTIVE NAV */}
        <header className={`sticky top-0 z-40 px-10 py-5 transition-all duration-300 ${isScrolled ? "bg-[hsl(var(--bg)/0.8)] backdrop-blur-xl border-b border-[hsl(var(--border))] shadow-2xl" : "bg-transparent"}`}>
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="w-12 h-12 rounded-2xl bg-[hsl(var(--s2))] text-[hsl(var(--electric))] shadow-inner flex items-center justify-center border border-[hsl(var(--border))] transform transition-transform hover:rotate-6">
                 {currentNav?.icon}
              </div>
              <div>
                <h2 className="font-display font-black text-2xl text-white tracking-tighter leading-none">{currentNav?.label || "App"}</h2>
                <div className="flex items-center gap-2 mt-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--electric))] animate-pulse" />
                   <p className="text-[10px] font-mono text-[hsl(var(--dim))] uppercase tracking-widest font-bold">Session Active</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
               <button onClick={() => fetchAll()} className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[hsl(var(--s2))] border border-[hsl(var(--border))] text-[hsl(var(--dim))] hover:text-white transition-all hover:scale-105 shadow-xl group">
                 <RefreshCw size={20} className="group-active:rotate-180 transition-transform duration-500" />
               </button>
               <div className="h-10 w-px bg-[hsl(var(--border))] mx-2" />
               <div className="flex items-center gap-4 pl-2 group cursor-pointer lg:bg-[hsl(var(--s2))] lg:py-2 lg:px-5 lg:rounded-2xl lg:border lg:border-[hsl(var(--border))] lg:hover:border-[hsl(var(--border-glow))] transition-all">
                 <div className="text-right hidden lg:block">
                   <div className="text-xs font-black text-white tracking-tight leading-none uppercase">Administrateur</div>
                   <div className="text-[9px] font-mono text-[hsl(var(--electric))] uppercase mt-1.5 font-bold"></div>
                 </div>
                 <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[hsl(var(--electric))] to-[hsl(var(--violet))] border-2 border-white/20 flex items-center justify-center text-xs font-black text-white shadow-2xl group-hover:scale-110 transition-transform">
                   AD
                 </div>
               </div>
            </div>
          </div>
        </header>

        {/* VIEW PORT */}
        <div className="px-10 py-8 max-w-7xl mx-auto w-full flex-1">
          <div className="animate-in fade-in duration-700">
            {view === "dashboard" && <DashboardView stats={stats} />}
            {view === "inbox" && <InboxView emails={inbound} onRefresh={fetchAll} />}
            {view === "compose" && <ComposeView lists={lists} onSent={fetchAll} />}
            {view === "contacts" && <ContactsView contacts={contacts} lists={lists} onRefresh={fetchAll} />}
            {view === "campaigns" && <CampaignsView campaigns={campaigns} lists={lists} contacts={contacts} onRefresh={fetchAll} />}
            {view === "history" && <HistoryView records={records} onRefresh={fetchAll} />}
          </div>
        </div>

      </main>
    </div>
  );
}
