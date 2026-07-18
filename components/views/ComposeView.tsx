"use client";

import { useState, useRef } from "react";
import { Loader2, Send } from "lucide-react";
import { EmailProvider, ContactList } from "@/types";
import { Card, Button } from "@/components/ui";
import { EditorToolbar } from "@/components/editor/EditorToolbar";

export function ComposeView({ lists, onSent }: { lists: ContactList[]; onSent: () => void }) {
  const [provider] = useState<EmailProvider>("resend");
  const [from, setFrom] = useState("contact@crediwize.com");
  const [fromName, setFromName] = useState("CrediWize");
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [msg, setMsg] = useState("");
  const editorRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

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

  async function handleSend() {
    if (!from || !to || !subject) { setStatus("error"); setMsg("Tous les champs marqués d'une * sont requis."); return; }
    setStatus("loading");
    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, from, fromName, to, subject, html }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus("success");
        setMsg("Email envoyé avec succès !");
        setTo(""); setSubject(""); setHtml("");
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="label">Email expéditeur *</label>
                  <input className="input font-mono text-sm" value={from} onChange={e => setFrom(e.target.value)} placeholder="email@exemple.com" />
                </div>
                <div className="space-y-2">
                  <label className="label">Nom expéditeur</label>
                  <input className="input text-sm" value={fromName} onChange={e => setFromName(e.target.value)} placeholder="Votre nom" />
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
                  <EditorToolbar exec={execCmd} onImage={handleImageClick} />
                  <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
                  <div ref={editorRef} contentEditable onInput={() => { if (editorRef.current) setHtml(editorRef.current.innerHTML); }}
                    data-placeholder="Commencez à écrire..." className="rich-editor min-h-[320px] p-6" suppressContentEditableWarning />
                </div>
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card className="p-5 space-y-5 sticky top-24">

            <Button variant="primary" className="w-full justify-center py-3" disabled={status === "loading"} onClick={handleSend}>
              {status === "loading" ? <><Loader2 size={16} className="spin" /> Envoi...</> : <><Send size={16} /> Envoyer</>}
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
