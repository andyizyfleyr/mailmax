"use client";

import { useState, useCallback, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { Paperclip, Upload, X, Calendar, Loader2, Zap, Send } from "lucide-react";
import { EmailProvider, ContactList, EmailAttachment } from "@/types";
import { Card, Button } from "@/components/ui";
import { EditorToolbar } from "@/components/editor/EditorToolbar";

export function ComposeView({ lists, onSent }: { lists: ContactList[]; onSent: () => void }) {
  const [provider] = useState<EmailProvider>("resend");
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
        setMsg(data.scheduled ? "Envoi programmé avec succès." : "Email envoyé avec succès !");
        setTo(""); setSubject(""); setHtml(""); setAttachments([]); setScheduledAt("");
        if (editorRef.current) editorRef.current.innerHTML = "";
        onSent();
      } else { setStatus("error"); setMsg(data.error || "Une erreur est survenue."); }
    } catch { setStatus("error"); setMsg("Erreur de connexion."); }
    setTimeout(() => setStatus("idle"), 5000);
  }

  const [preview, setPreview] = useState(false);

  return (
    <div className="pb-20 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h2 className="font-display font-bold text-xl text-white">Composer un Email</h2>
          <p className="text-sm text-[hsl(var(--muted))] mt-0.5">Rédigez et envoyez un message</p>
        </div>
        <div className="flex bg-[hsl(var(--s1))] rounded-lg border border-[hsl(var(--border))] p-0.5">
          <button onClick={() => setPreview(false)} className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${!preview ? "bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]" : "text-[hsl(var(--dim))] hover:text-white"}`}>Éditer</button>
          <button onClick={() => setPreview(true)} className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${preview ? "bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]" : "text-[hsl(var(--dim))] hover:text-white"}`}>Aperçu</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          {preview ? (
            <Card className="overflow-hidden">
              <div className="p-5 border-b border-[hsl(var(--border))] space-y-2 bg-[hsl(var(--s2)/0.3)]">
                <div className="flex items-center gap-3 text-xs"><span className="text-[hsl(var(--dim))] w-12">De :</span><span className="text-white font-medium">{from}</span></div>
                <div className="flex items-center gap-3 text-xs"><span className="text-[hsl(var(--dim))] w-12">À :</span><span className="text-white font-medium">{to || "(Destinataire)"}</span></div>
                <div className="flex items-center gap-3 text-sm"><span className="text-[hsl(var(--dim))] w-12 text-xs">Sujet :</span><span className="text-[hsl(var(--primary))] font-medium">{subject || "(Aucun sujet)"}</span></div>
              </div>
              <div className="bg-white p-10 min-h-[400px] text-zinc-900 text-sm leading-relaxed"
                   dangerouslySetInnerHTML={{ __html: html || '<div class="text-zinc-300 italic">Aucun contenu...</div>' }} />
            </Card>
          ) : (
            <Card className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="label">Expéditeur *</label>
                  <input className="input font-mono text-sm" value={from} onChange={e => setFrom(e.target.value)} placeholder="email@exemple.com" />
                </div>
                <div className="space-y-2">
                  <label className="label">Destinataire *</label>
                  <input className="input font-mono text-sm" value={to} onChange={e => setTo(e.target.value)} placeholder="client@exemple.com" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="label">Objet *</label>
                <input className="input font-medium" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Sujet de votre email..." />
              </div>

              <div className="space-y-2">
                <label className="label">Message</label>
                <div className="border border-[hsl(var(--border))] rounded-lg overflow-hidden">
                  <EditorToolbar exec={execCmd} />
                  <div ref={editorRef} contentEditable onInput={() => { if (editorRef.current) setHtml(editorRef.current.innerHTML); }}
                    data-placeholder="Commencez à écrire..." className="rich-editor min-h-[320px] p-6" suppressContentEditableWarning />
                </div>
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card className="p-5 space-y-5 sticky top-24">
            <div className="space-y-2">
              <label className="label flex items-center gap-2"><Paperclip size={13} /> Pièces jointes</label>
              <div {...getRootProps()} className={`rounded-lg p-4 border-2 border-dashed transition-all cursor-pointer flex flex-col items-center gap-2 ${isDragActive ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.05)]" : "border-[hsl(var(--border))] hover:border-[hsl(var(--dim))]"}`}>
                <input {...getInputProps()} />
                <Upload size={20} className={isDragActive ? "text-[hsl(var(--primary))]" : "text-[hsl(var(--dim))]"} />
                <p className="text-[10px] text-[hsl(var(--muted))]">Déposez vos fichiers</p>
              </div>
              {attachments.length > 0 && (
                <div className="space-y-1.5 mt-3">
                  {attachments.map((a, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-[hsl(var(--s2))] border border-[hsl(var(--border))]">
                      <span className="text-xs text-[hsl(var(--muted))] truncate">{a.name}</span>
                      <button onClick={() => setAttachments(p => p.filter((_, j) => j !== i))} className="text-[hsl(var(--dim))] hover:text-[hsl(var(--danger))]">
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2 pt-3 border-t border-[hsl(var(--border))]">
              <label className="label flex items-center gap-2"><Calendar size={13} /> Planification</label>
              <input type="datetime-local" className="input !text-xs" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} style={{ colorScheme: "dark" }} />
            </div>

            <Button variant="primary" className="w-full justify-center py-3" disabled={status === "loading"} onClick={handleSend}>
              {status === "loading" ? <><Loader2 size={16} className="spin" /> Envoi...</> : scheduledAt ? <><Calendar size={16} /> Planifier</> : <><Send size={16} /> Envoyer</>}
            </Button>

            {status !== "idle" && (
              <div className={`p-3 rounded-lg text-xs text-center font-medium animate-in ${status === "success" ? "bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))] border border-[hsl(var(--success)/0.15)]" : "bg-[hsl(var(--danger)/0.1)] text-[hsl(var(--danger))] border border-[hsl(var(--danger)/0.15)]"}`}>
                {msg}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
