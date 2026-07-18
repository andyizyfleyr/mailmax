"use client";

import { useState, useCallback, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { Plus, Trash2, Play, Loader2, CheckCircle, XCircle, RefreshCw, Send, Megaphone, X, Paperclip, Upload, Zap } from "lucide-react";
import { EmailProvider, Campaign, ContactList, Contact, EmailAttachment } from "@/types";
import { Badge, Button, Card, Modal, ConfirmDialog, AlertDialog } from "@/components/ui";
import { EditorToolbar } from "@/components/editor/EditorToolbar";

const PROVIDERS: EmailProvider[] = ["resend"];
const PROVIDER_LABELS: Record<EmailProvider, string> = { resend: "Resend" };

function fmt(n: number) { return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n); }

export function CampaignsView({ campaigns, lists, contacts, onRefresh }: {
  campaigns: Campaign[]; lists: ContactList[]; contacts: Contact[]; onRefresh: () => void
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const [listId, setListId] = useState("");
  const [provider] = useState<EmailProvider>("resend");
  const [fromName, setFromName] = useState("CrediWize");
  const [fromEmail, setFromEmail] = useState("contact@crediwize.com");
  const [attachments, setAttachments] = useState<EmailAttachment[]>([]);
  const editorRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

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
      setAlertMsg("Tous les champs (Nom, Sujet, Audience, Expéditeur) sont requis !");
      return;
    }
    if (!listId.includes("-") || listId === "list-1") {
      setAlertMsg("Veuillez d'abord créer une vraie audience dans l'onglet 'Contacts' !");
      return;
    }
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, subject, html, listId, provider, fromName, fromEmail, attachments }),
      });
      const data = await res.json();
      if (!res.ok) { setAlertMsg("Erreur : " + (data.error || "Échec de création")); return; }
      setShowCreate(false); setStep(1); setName(""); setSubject(""); setHtml(""); setAttachments([]);
      onRefresh();
      if (data.id) sendCampaign(data.id);
    } catch { setAlertMsg("Erreur de connexion au serveur."); }
  }

  async function sendCampaign(id: string) {
    setSending(id);
    await fetch("/api/bulk-send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ campaignId: id }) });
    setSending(null); onRefresh();
  }

  async function doDeleteCampaign() {
    if (!confirmDeleteId) return;
    await fetch("/api/campaigns", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: confirmDeleteId }) });
    setConfirmDeleteId(null); onRefresh();
  }

  function execCmd(cmd: string, val?: string) {
    document.execCommand(cmd, false, val);
    if (editorRef.current) setHtml(editorRef.current.innerHTML);
  }

  function handleImageClick() {
    imageInputRef.current?.click();
  }

  function handleImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1];
      const mime = file.type;
      try {
        const res = await fetch("/api/upload-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ base64, mime }),
        });
        const data = await res.json();
        if (data.url) {
          const imgHtml = `<img src="${data.url}" style="width:150px;height:150px;object-fit:cover;border-radius:8px;margin:4px;cursor:pointer;display:inline-block" onclick="var w=prompt('Largeur en px (150):',this.width);if(w&&!isNaN(w)&&w>0){this.style.width=w+'px';this.style.height=w+'px'}" />`;
          execCmd("insertHTML", imgHtml);
        }
      } catch {}
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  const statusVariant: Record<string, "primary" | "success" | "danger" | "warning" | "info" | "muted"> = {
    draft: "muted", sending: "warning", sent: "success", failed: "danger",
  };

  return (
    <div className="pb-20 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h2 className="font-display font-bold text-xl text-white">Campagnes</h2>
          <p className="text-sm text-[hsl(var(--muted))] mt-0.5">{campaigns.length} campagne{campaigns.length > 1 ? "s" : ""}</p>
        </div>
        <Button variant="primary" onClick={() => { setStep(1); setShowCreate(true); }}>
          <Plus size={16} /> Nouvelle campagne
        </Button>
      </div>

      {campaigns.length === 0 ? (
        <Card className="border-dashed border-2 py-24 flex flex-col items-center justify-center text-center">
          <Megaphone size={40} className="text-[hsl(var(--dim))] mb-4 opacity-30" />
          <h3 className="font-display font-bold text-lg text-white mb-1">Aucune campagne</h3>
          <p className="text-sm text-[hsl(var(--muted))] mb-4">Créez votre première campagne pour commencer.</p>
          <Button variant="primary" onClick={() => { setStep(1); setShowCreate(true); }}>Créer une campagne</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {campaigns.map(c => (
            <Card key={c.id} className="flex flex-col overflow-hidden">
              <div className="p-5 pb-0 flex items-start justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Badge variant={statusVariant[c.status] || "muted"}>{c.status}</Badge>
                    <span className="text-xs font-medium text-[hsl(var(--primary))]">{PROVIDER_LABELS[c.provider]}</span>
                  </div>
                  <h3 className="font-display font-bold text-lg text-white">{c.name}</h3>
                  <p className="text-xs text-[hsl(var(--muted))]">{c.subject}</p>
                </div>
                <button onClick={() => setConfirmDeleteId(c.id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[hsl(var(--dim))] hover:text-[hsl(var(--danger))] hover:bg-[hsl(var(--danger)/0.1)] transition-colors">
                  <Trash2 size={15} />
                </button>
              </div>

              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: "Envoyés", val: c.stats.sent, icon: <Send size={13} />, color: "var(--primary)" },
                ].map(s => (
                  <div key={s.label}>
                    <div className="flex items-center gap-1 text-[10px] font-medium text-[hsl(var(--dim))] mb-1">
                      <span style={{ color: `hsl(${s.color})` }}>{s.icon}</span>
                      {s.label}
                    </div>
                    <div className="text-lg font-bold text-white">{fmt(s.val)}</div>
                  </div>
                ))}
              </div>

              <div className="px-5 pb-5 mt-auto space-y-4">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-[hsl(var(--muted))]">Progression</span>
                    <span className="text-white font-medium">{c.stats.sent}/{c.stats.total} ({c.stats.total > 0 ? Math.round((c.stats.sent / c.stats.total) * 100) : 0}%)</span>
                  </div>
                  <div className="h-1.5 bg-[hsl(var(--s2))] rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-[hsl(var(--primary))] transition-all" style={{ width: `${c.stats.total > 0 ? (c.stats.sent / c.stats.total) * 100 : 0}%` }} />
                  </div>
                </div>

                {c.errorMessage && (
                  <div className="p-3 rounded-lg bg-[hsl(var(--danger)/0.08)] border border-[hsl(var(--danger)/0.12)] flex items-start gap-2">
                    <XCircle size={14} className="text-[hsl(var(--danger))] shrink-0 mt-0.5" />
                    <span className="text-xs text-[hsl(var(--danger))]">{c.errorMessage}</span>
                  </div>
                )}

                {(c.status === "draft" || c.status === "failed") && (
                  <Button variant="primary" className="w-full justify-center py-2.5" disabled={sending === c.id} onClick={() => sendCampaign(c.id)}>
                    {sending === c.id ? <><Loader2 size={14} className="spin" /> Envoi...</> : <><Play size={14} /> {c.status === "failed" ? "Relancer" : "Lancer"}</>}
                  </Button>
                )}
                {c.status === "sending" && (
                  <div className="w-full py-2.5 rounded-lg bg-[hsl(var(--warning)/0.08)] border border-[hsl(var(--warning)/0.12)] flex items-center justify-center gap-2 text-[hsl(var(--warning))] text-xs font-medium">
                    <RefreshCw size={14} className="spin" /> Envoi en cours...
                  </div>
                )}
                {c.status === "sent" && (
                  <div className="w-full py-2.5 rounded-lg bg-[hsl(var(--success)/0.08)] border border-[hsl(var(--success)/0.12)] flex items-center justify-center gap-2 text-[hsl(var(--success))] text-xs font-medium">
                    <CheckCircle size={14} /> Terminée
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {showCreate && (
        <Modal onClose={() => setShowCreate(false)} maxWidth={640}>
          <div className="px-8 pb-8 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-lg text-white">Nouvelle Campagne</h3>
                <p className="text-xs text-[hsl(var(--muted))] mt-0.5">Étape {step} sur 3</p>
              </div>
              <span className="flex gap-1">
                {[1, 2, 3].map(s => (
                  <span key={s} className={`w-2 h-2 rounded-full ${s <= step ? "bg-[hsl(var(--primary))]" : "bg-[hsl(var(--s3))]"}`} />
                ))}
              </span>
            </div>

            <div className="min-h-[300px]">
              {step === 1 && (
                <div className="space-y-5 animate-in">
                  <div className="space-y-2">
                    <label className="label">Nom de la campagne *</label>
                    <input autoFocus className="input font-medium" placeholder="ex: Newsletter Juillet" value={name} onChange={e => setName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="label">Sujet *</label>
                    <input className="input" placeholder="ex: Nos dernières actualités..." value={subject} onChange={e => setSubject(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="label">Nom expéditeur</label>
                      <input className="input" value={fromName} onChange={e => setFromName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <label className="label">Email expéditeur *</label>
                      <input className="input" value={fromEmail} onChange={e => setFromEmail(e.target.value)} />
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-5 animate-in">
                  <div className="space-y-2">
                    <label className="label">Audience cible *</label>
                    <select className="input" value={listId} onChange={e => setListId(e.target.value)}>
                      <option value="">Sélectionner une audience</option>
                      {lists.map(l => (
                        <option key={l.id} value={l.id}>{l.name} ({contacts.filter(con => con.listId === l.id).length} contacts)</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-5 animate-in">
                  <div className="space-y-2">
                    <label className="label">Contenu</label>
                    <div className="border border-[hsl(var(--border))] rounded-lg overflow-hidden">
                      <EditorToolbar exec={execCmd} onImage={handleImageClick} />
                      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
                      <div {...getRootProps()} className="relative">
                        <input {...getInputProps()} />
                        <div ref={editorRef} contentEditable className="rich-editor min-h-[240px] p-5" onInput={e => setHtml(e.currentTarget.innerHTML)}
                          data-placeholder="Écrivez votre message ici..." />
                        {isDragActive && (
                          <div className="absolute inset-0 flex items-center justify-center bg-[hsl(var(--bg)/0.6)] backdrop-blur-sm">
                            <div className="flex flex-col items-center text-[hsl(var(--primary))]">
                              <Upload size={24} />
                              <span className="text-xs font-medium">Déposez les fichiers</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {attachments.length > 0 && (
                    <div className="space-y-1.5">
                      <label className="label">Pièces jointes ({attachments.length})</label>
                      <div className="flex flex-wrap gap-2">
                        {attachments.map((a, i) => (
                          <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[hsl(var(--s2))] border border-[hsl(var(--border))]">
                            <Paperclip size={12} className="text-[hsl(var(--dim))]" />
                            <span className="text-xs text-white max-w-[100px] truncate">{a.name}</span>
                            <button onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))} className="text-[hsl(var(--dim))] hover:text-[hsl(var(--danger))]">
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

            <div className="flex gap-3 pt-4 border-t border-[hsl(var(--border))]">
              {step > 1 && <Button variant="ghost" className="px-6" onClick={() => setStep(step - 1)}>Précédent</Button>}
              <div className="flex-1" />
              {step < 3 ? (
                <Button variant="primary" className="px-8" onClick={() => setStep(step + 1)}>Continuer</Button>
              ) : (
                <Button variant="primary" className="px-8" onClick={createCampaign}>
                  <><Zap size={16} /> Lancer</>
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}

      <ConfirmDialog open={!!confirmDeleteId} title="Supprimer la campagne" description="Êtes-vous sûr de vouloir supprimer cette campagne ? Cette action est irréversible." confirmLabel="Supprimer" onConfirm={doDeleteCampaign} onCancel={() => setConfirmDeleteId(null)} />
      <AlertDialog open={!!alertMsg} title="Attention" description={alertMsg || ""} onClose={() => setAlertMsg(null)} />
    </div>
  );
}
