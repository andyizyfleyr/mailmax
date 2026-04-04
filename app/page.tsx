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
          <h2 className="font-display font-black text-3xl text-white tracking-tighter uppercase italic">Email Studio</h2>
          <div className="flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-[hsl(var(--electric))] shadow-[0_0_8px_hsl(var(--electric))]" />
             <p className="text-[10px] font-mono text-[hsl(var(--dim))] uppercase tracking-[0.2em] font-bold">Resend Engine &bull; Ready to transmit</p>
          </div>
        </div>
        <div className="flex bg-[hsl(var(--s2))] p-1 rounded-xl border border-[hsl(var(--border))]">
          <button onClick={() => setPreview(false)} className={`px-5 py-2 rounded-lg text-[11px] font-mono uppercase tracking-widest transition-all ${!preview ? "bg-[hsl(var(--s3))] text-white shadow-lg" : "text-[hsl(var(--dim))] hover:text-white"}`}>Edit</button>
          <button onClick={() => setPreview(true)} className={`px-5 py-2 rounded-lg text-[11px] font-mono uppercase tracking-widest transition-all ${preview ? "bg-[hsl(var(--s3))] text-white shadow-lg" : "text-[hsl(var(--dim))] hover:text-white"}`}>Preview</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-8">
          {preview ? (
            <div className="card !p-0 overflow-hidden border-[hsl(var(--border))] animate-in zoom-in-95 duration-300">
               <div className="bg-[hsl(var(--s2))] p-6 border-b border-[hsl(var(--border))] space-y-3">
                  <div className="flex items-center gap-3 text-[11px] font-mono"><span className="text-[hsl(var(--dim))] w-14 uppercase">From:</span> <span className="text-white font-bold">{from}</span></div>
                  <div className="flex items-center gap-3 text-[11px] font-mono"><span className="text-[hsl(var(--dim))] w-14 uppercase">To:</span> <span className="text-white font-bold">{to || "(Destinataire)"}</span></div>
                  <div className="flex items-center gap-3 text-sm font-bold"><span className="text-[hsl(var(--dim))] w-14 font-mono text-[11px] uppercase">Subj:</span> <span className="text-[hsl(var(--electric))]">{subject || "(Aucun sujet)"}</span></div>
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
                     data-placeholder="Start typing..." className="rich-editor min-h-[400px] px-10 py-10 outline-none leading-relaxed text-white/90" suppressContentEditableWarning />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="card p-8 space-y-8 bg-gradient-to-br from-[hsl(var(--s2))] to-transparent border-[hsl(var(--border))] sticky top-32">
             <div>
                <h3 className="text-xs font-mono uppercase tracking-[0.3em] text-white font-bold mb-6 flex items-center gap-2">
                   <Zap size={14} className="text-[hsl(var(--electric))]" /> Settings
                </h3>
                
                <div className="space-y-6">
                   <div>
                      <label className="label-lite flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-[hsl(var(--dim))] mb-3"><Paperclip size={12} /> Attachments</label>
                      <div {...getRootProps()} className={`rounded-xl p-6 border-2 border-dashed transition-all cursor-pointer flex flex-col items-center gap-3 ${isDragActive ? "border-[hsl(var(--electric))] bg-[hsl(var(--electric)/0.05)]" : "border-[hsl(var(--border))] hover:border-[hsl(var(--dim))]"}`}>
                         <input {...getInputProps()} />
                         <Upload size={24} className={isDragActive ? "text-[hsl(var(--electric))]" : "text-[hsl(var(--dim))]"} />
                         <p className="text-[9px] font-mono text-[hsl(var(--muted))] uppercase">Drop files</p>
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
                      <label className="label-lite flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-[hsl(var(--dim))] mb-3"><Calendar size={12} /> Scheduling</label>
                      <input type="datetime-local" className="input !py-3 !text-xs !bg-[hsl(var(--bg))] border-none shadow-inner" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} style={{ colorScheme: "dark" }} />
                   </div>

                   <div className="pt-6">
                      <button onClick={handleSend} disabled={status === "loading"} className="btn btn-primary w-full justify-center py-4 rounded-xl shadow-[0_15px_40px_-5px_hsl(var(--electric)/0.3)] hover:translate-y-[-2px] active:translate-y-0 transition-all font-display font-black text-xs uppercase tracking-[0.2em]">
                         {status === "loading" ? <Loader2 size={18} className="spin" /> : scheduledAt ? "Schedule" : "Transmit"}
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
                   <h4 className="text-[10px] font-mono text-white uppercase font-black">Optimization</h4>
                </div>
                <p className="text-[9px] text-[hsl(var(--muted))] leading-relaxed font-medium">Use <code className="text-white">{"{{name}}"}</code> variable for personalized transmission. Analysis suggests 24% higher engagement.</p>
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
              <div><label className="label">Tags (séparés par des virgules)</label><input className="input font-mono text-xs" value={newTags} onChange={e => setNewTags(e.target.value)} placeholder="vip, prospect, 2024..." /></div>
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
              <div><label className="label">Nom de la liste *</label><input className="input" value={newListName} onChange={e => setNewListName(e.target.value)} placeholder="Ex: Clients VIP 2024" /></div>
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
// ===================== CAMPAIGNS VIEW =====================
function CampaignsView({ campaigns, lists, contacts, onRefresh }: {
  campaigns: Campaign[]; lists: ContactList[]; contacts: Contact[]; onRefresh: () => void;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [name, setName] = useState(""); const [subject, setSubject] = useState("");
  const [html, setHtml] = useState(""); const [listId, setListId] = useState("");
  const [provider, setProvider] = useState<EmailProvider>("resend");
  const [fromName, setFromName] = useState("MailMax"); const [fromEmail, setFromEmail] = useState("contact@crediwize.com");
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
    if (!confirm("Supprimer cette campagne et son historique ?")) return;
    await fetch("/api/campaigns", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    onRefresh();
  }

  const steps = [
    { n: 1, label: "Audience", icon: <Users size={14} /> },
    { n: 2, label: "Expéditeur", icon: <UserMinus size={14} /> },
    { n: 3, label: "Contenu", icon: <Mail size={14} /> },
  ];

  return (
    <div className="animate-in space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-2xl text-white">Vos Campagnes</h2>
          <p className="text-sm text-[hsl(var(--muted))]">Gérez et suivez vos performances d'envois groupés</p>
        </div>
        <button onClick={() => { setStep(1); setShowCreate(true); }} className="btn btn-primary">
          <Plus size={18} /> Nouvelle campagne
        </button>
      </div>

      {campaigns.length === 0 ? (
        <div className="card py-24 flex flex-col items-center justify-center text-center bg-gradient-to-b from-[hsl(var(--s2))] to-transparent">
          <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--s3))] flex items-center justify-center text-[hsl(var(--muted))] mb-6 border border-[hsl(var(--border))]">
            <Megaphone size={32} />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Aucune campagne active</h3>
          <p className="text-sm text-[hsl(var(--muted))] max-w-sm mb-8">Lancez votre première campagne et commencez à engager vos contacts dès maintenant.</p>
          <button onClick={() => { setStep(1); setShowCreate(true); }} className="btn btn-ghost px-8">
            Créer ma première campagne
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {campaigns.map((c, i) => (
            <div key={c.id} className="card p-0 overflow-hidden animate-in card-hover group" style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x border-[hsl(var(--border))]" style={{ borderColor: "hsl(var(--border))" }}>
                <div className="p-6 md:w-1/3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                       <StatusBadge s={c.status} />
                       <ProviderBadge p={c.provider} />
                    </div>
                    <h3 className="font-display font-bold text-lg text-white mb-1 truncate group-hover:text-[hsl(var(--electric))] transition-colors">{c.name}</h3>
                    <p className="text-xs text-[hsl(var(--muted))] truncate mb-4">{c.subject}</p>
                  </div>
                  
                  <div className="flex items-center gap-2 pt-2">
                    {c.status === "draft" && (
                      <button onClick={() => sendCampaign(c.id)} disabled={sending === c.id} className="btn btn-primary !py-2 !px-4 text-xs flex-1">
                        {sending === c.id ? <><Loader2 size={12} className="spin" /> Envoi…</> : <><Play size={12} /> Lancer</>}
                      </button>
                    )}
                    {c.scheduledAt && c.status === "scheduled" && (
                      <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[hsl(var(--blue) / 0.1)] text-[hsl(var(--blue))] text-[10px] font-bold font-mono">
                        <Clock size={12} /> {new Date(c.scheduledAt).toLocaleString("fr-FR", { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                    <button onClick={() => deleteCampaign(c.id)} className="btn btn-danger !p-2 rounded-lg"><Trash2 size={14} /></button>
                  </div>
                </div>

                <div className="p-6 md:flex-1 bg-[hsl(var(--s1) / 0.3)]">
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                      {[
                        { label: "Emails", val: c.stats.total, icon: <Send />, color: "var(--electric)" },
                        { label: "Ouverts", val: c.stats.opens, icon: <Eye />, color: "var(--violet)" },
                        { label: "Clics", val: c.stats.clicks, icon: <MousePointer />, color: "var(--amber)" },
                        { label: "Désabs.", val: c.stats.unsubscribes, icon: <UserMinus />, color: "var(--rose)" },
                      ].map(s => (
                        <div key={s.label}>
                          <div className="text-[10px] font-mono text-[hsl(var(--dim))] uppercase tracking-widest mb-1">{s.label}</div>
                          <div className="text-xl font-bold text-white font-mono">{s.val}</div>
                        </div>
                      ))}
                   </div>
                   
                   <div className="space-y-4 pt-2 border-t border-[hsl(var(--border))]">
                      <div className="flex justify-between items-center text-[11px] font-mono">
                        <span className="text-[hsl(var(--muted))] uppercase">Progression de l'envoi</span>
                        <span className="text-white">{c.stats.sent}/{c.stats.total} envoyés ({c.stats.total > 0 ? Math.round((c.stats.sent/c.stats.total)*100) : 0}%)</span>
                      </div>
                      <div className="h-1.5 w-full bg-[hsl(var(--s2))] rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-[hsl(var(--electric))] to-[hsl(var(--violet))] transition-all duration-1000" 
                             style={{ width: `${c.stats.total > 0 ? (c.stats.sent / c.stats.total) * 100 : 0}%` }} />
                      </div>
                   </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create campaign modal - Multi-step */}
      {showCreate && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="modal flex flex-col shadow-2xl overflow-hidden" style={{ maxWidth: 640 }}>
            <div className="h-1 bg-[hsl(var(--electric))]" />
            {/* Header / Steps */}
            <div className="p-8 pb-4">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="font-display font-bold text-2xl text-white tracking-tight">Nouvelle campagne</h3>
                  <p className="text-xs text-[hsl(var(--muted))] mt-1 font-mono uppercase tracking-widest">Configuration de diffusion</p>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-inter font-bold px-2 py-1 rounded bg-[hsl(var(--s2))] border border-[hsl(var(--border))] text-[hsl(var(--muted))]">Step {step}/3</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {steps.map((s, i) => (
                  <div key={s.n} className="flex-1 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-bold transition-all duration-500 ${step >= s.n ? "bg-[hsl(var(--electric))] text-[hsl(var(--bg))] shadow-[0_0_20px_hsl(var(--electric)/0.3)]" : "bg-[hsl(var(--s3))] text-[hsl(var(--dim))] border border-[hsl(var(--border))]"}`}>
                      {step > s.n ? <CheckCircle size={18} /> : s.n}
                    </div>
                    {i < steps.length - 1 && <div className={`flex-1 h-[2px] rounded-full transition-colors duration-500 ${step > s.n ? "bg-[hsl(var(--electric))]" : "bg-[hsl(var(--border))]"}`} />}
                  </div>
                ))}
              </div>
            </div>

            {/* Content Area */}
            <div className="px-8 py-6 flex-1 overflow-y-auto" style={{ minHeight: 380 }}>
              {step === 1 && (
                <div className="space-y-6 animate-in">
                  <div className="grid grid-cols-1 gap-6">
                    <div>
                      <label className="label">Nom interne de la campagne *</label>
                      <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Newsletter fidélisation - Avril 2024" />
                      <p className="text-[10px] text-[hsl(var(--dim))] mt-2 italic font-mono">Visible uniquement par vous.</p>
                    </div>
                    <div>
                      <label className="label">Cible & Audience *</label>
                      <select className="input" value={listId} onChange={e => setListId(e.target.value)}>
                        <option value="">Sélectionner une audience</option>
                        {lists.map(l => <option key={l.id} value={l.id}>{l.name} ({contacts.filter(c=>c.listId===l.id).length} contacts)</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-8 animate-in">
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-[hsl(var(--s2))] to-transparent border border-[hsl(var(--border))]">
                    <label className="label mb-4 opacity-50">Apparence dans la boîte de réception</label>
                    <div className="flex items-center gap-4 bg-[hsl(var(--bg))] p-4 rounded-xl border border-[hsl(var(--border))]">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl text-white shadow-inner" 
                           style={{ background: "linear-gradient(135deg, hsl(var(--violet)), hsl(var(--electric)))" }}>
                        {(fromName || "M")[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-white truncate">{fromName || "MailMax"}</span>
                          <span className="text-[10px] text-[hsl(var(--dim))] font-mono">Maintenant</span>
                        </div>
                        <div className="text-[13px] text-white/90 font-semibold truncate mt-0.5">{subject || "(Objet de l'email)"}</div>
                        <p className="text-[11px] text-[hsl(var(--dim))] truncate mt-0.5">Cliquez pour voir cet email incroyable...</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Nom affiché</label>
                      <input className="input" value={fromName} onChange={e => setFromName(e.target.value)} placeholder="MailMax" />
                    </div>
                    <div>
                      <label className="label">Email de réponse *</label>
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
                    <div className="flex items-center justify-between mb-3">
                      <label className="label m-0">Corps du message (HTML)</label>
                      <div className="flex gap-2">
                        {["name", "email"].map(v => (
                          <button key={v} onClick={() => execCmd("insertText", `{{${v}}}`)} className="text-[9px] font-mono px-2 py-0.5 rounded bg-[hsl(var(--s3))] border border-[hsl(var(--border))] text-[hsl(var(--dim))] hover:text-white hover:border-[hsl(var(--border-glow))] transition-colors">
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-2xl overflow-hidden border border-[hsl(var(--border))] shadow-inner" style={{ background: "hsl(var(--s2))" }}>
                      <EditorToolbar exec={execCmd} />
                      <div ref={editorRef} contentEditable onInput={() => { if (editorRef.current) setHtml(editorRef.current.innerHTML); }}
                        data-placeholder="Commencez à rédiger..." className="rich-editor px-6 py-6 text-sm" suppressContentEditableWarning style={{ minHeight: 220, maxHeight: 300, overflowY: 'auto' }} />
                    </div>
                  </div>
                  <div className="p-5 rounded-2xl bg-[hsl(var(--s2) / 0.3)] border border-dashed border-[hsl(var(--border))]">
                    <label className="label flex items-center gap-2 mb-4">
                      <Calendar size={14} className="text-[hsl(var(--electric))]" /> Planification optionnelle
                    </label>
                    <input type="datetime-local" className="input" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} style={{ colorScheme: "dark" }} />
                    <p className="text-[10px] text-[hsl(var(--dim))] mt-3 italic font-mono uppercase tracking-tighter">Laissez vide pour lancer maintenant.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="p-8 border-t border-[hsl(var(--border))] bg-[hsl(var(--s1) / 0.3)] flex gap-4">
              {step > 1 ? (
                <button onClick={() => setStep(step - 1)} className="btn btn-ghost px-8">Retour</button>
              ) : (
                <button onClick={() => setShowCreate(false)} className="btn btn-ghost px-8">Annuler</button>
              )}
              {step < 3 ? (
                <button onClick={() => { if (step === 1 && (!name || !listId)) return; if (step === 2 && (!fromEmail || !subject)) return; setStep(step + 1); }}
                  className="btn btn-primary flex-1 justify-center">
                  Continuer <ChevronRight size={18} />
                </button>
              ) : (
                <button onClick={createCampaign} className="btn btn-primary flex-1 justify-center shadow-[0_0_30px_hsl(var(--electric)/0.2)]">
                  {scheduledAt ? <><Calendar size={18} /> Planifier l'envoi</> : <><Zap size={18} /> Lancer la campagne</>}
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
        <StatCard value={`${stats.openRate}%`} label="Taux d'ouverture" icon={<Eye size={20} />} color="var(--violet)" delta="+4.3%" trend="up" />
        <StatCard value={`${stats.clickRate}%`} label="Taux de clic" icon={<MousePointer size={20} />} color="var(--amber)" delta="-1.2%" trend="down" />
        <StatCard value={`${stats.unsubscribeRate}%`} label="Désabonnements" icon={<UserMinus size={20} />} color="var(--rose)" delta="-0.05%" trend="up" />
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
                        <div className="text-[11px] font-mono text-[hsl(var(--electric))]">{c.opens} open</div>
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
  const [view, setView] = useState<View>("dashboard");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [lists, setLists] = useState<ContactList[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [records, setRecords] = useState<EmailRecord[]>([]);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  async function fetchAll() {
    try {
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
    } catch (err) {
      console.error("Failed to fetch data:", err);
    }
  }

  useEffect(() => { 
    fetchAll();
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const NAV = [
    { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
    { id: "compose", label: "Composer", icon: <Send size={20} /> },
    { id: "contacts", label: "Audience", icon: <Users size={20} /> },
    { id: "campaigns", label: "Campagnes", icon: <Megaphone size={20} /> },
    { id: "history", label: "Historique", icon: <History size={20} /> },
  ] as const;

  const currentNav = NAV.find(n => n.id === view);

  return (
    <div className="flex min-h-screen bg-[hsl(var(--bg))] text-[hsl(var(--muted))] font-inter">
      {/* SIDEBAR */}
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
           {!isSidebarCollapsed && (
             <div className="p-5 rounded-2xl bg-gradient-to-br from-[hsl(var(--s2))] to-transparent border border-[hsl(var(--border))] animate-in slide-in-from-bottom-4 duration-500 fill-mode-forwards">
               <div className="flex justify-between items-end mb-3">
                 <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[hsl(var(--dim))] font-bold">Quota Mensuel</div>
                 <div className="text-xs font-black text-white">84%</div>
               </div>
               <div className="h-2 w-full bg-[hsl(var(--s1))] rounded-full overflow-hidden border border-white/5">
                 <div className="h-full bg-gradient-to-r from-[hsl(var(--electric))] to-[hsl(var(--violet))] rounded-full shadow-[0_0_10px_hsl(var(--electric)/0.2)]" style={{ width: '84%' }} />
               </div>
               <p className="text-[10px] mt-3 text-[hsl(var(--dim))] leading-snug font-medium">Reset automatique dans 8 jours.</p>
             </div>
           )}
           
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
                   <p className="text-[10px] font-mono text-[hsl(var(--dim))] uppercase tracking-widest font-bold">Session Active &bull; Jacques D.</p>
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
                   <div className="text-xs font-black text-white tracking-tight leading-none uppercase">Jacques D.</div>
                   <div className="text-[9px] font-mono text-[hsl(var(--electric))] uppercase mt-1.5 font-bold">Power User &bull; 9.4k e/mo</div>
                 </div>
                 <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[hsl(var(--electric))] to-[hsl(var(--violet))] border-2 border-white/20 flex items-center justify-center text-xs font-black text-white shadow-2xl group-hover:scale-110 transition-transform">
                   JD
                 </div>
               </div>
            </div>
          </div>
        </header>

        {/* VIEW PORT */}
        <div className="px-10 py-8 max-w-7xl mx-auto w-full flex-1">
          <div className="animate-in fade-in duration-700">
            {view === "dashboard" && <DashboardView stats={stats} />}
            {view === "compose" && <ComposeView lists={lists} onSent={fetchAll} />}
            {view === "contacts" && <ContactsView contacts={contacts} lists={lists} onRefresh={fetchAll} />}
            {view === "campaigns" && <CampaignsView campaigns={campaigns} lists={lists} contacts={contacts} onRefresh={fetchAll} />}
            {view === "history" && <HistoryView records={records} onRefresh={fetchAll} />}
          </div>
        </div>

        {/* INDUSTRIAL FOOTER */}
        <footer className="px-10 py-12 border-t border-[hsl(var(--border))] bg-gradient-to-b from-transparent to-[hsl(var(--s1)/0.2)] mt-auto">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="flex flex-col gap-2">
               <div className="flex items-center gap-3 opacity-30 grayscale group hover:grayscale-0 hover:opacity-100 transition-all">
                  <Zap size={18} />
                  <span className="text-[11px] font-display font-black uppercase tracking-[0.4em]">MailMax Core v2.4.9</span>
               </div>
               <p className="text-[9px] font-mono text-[hsl(var(--dim))] px-1">STABLE BUILD &bull; LATENCY 24MS &bull; IO_THREAD_OK</p>
            </div>
            
            <nav className="flex items-center gap-12">
              {['Status', 'Docs', 'Support', 'Legal'].map(l => (
                <a key={l} href="#" className="text-[11px] font-mono uppercase tracking-[0.2em] text-[hsl(var(--dim))] hover:text-[hsl(var(--electric))] font-bold transition-colors">{l}</a>
              ))}
            </nav>

            <div className="flex items-center gap-4 bg-[hsl(var(--s2))] py-3 px-6 rounded-2xl border border-[hsl(var(--border))] group hover:border-[hsl(var(--electric)/0.3)] transition-all">
              <div className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--electric))] shadow-[0_0_10px_hsl(var(--electric))]" />
              <div className="text-[10px] font-mono text-[hsl(var(--dim))] uppercase font-bold tracking-widest">
                Connected to <span className="text-white">Resend API v1.2</span>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
