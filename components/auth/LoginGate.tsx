"use client";

import { useState } from "react";
import { Lock } from "lucide-react";

export function LoginGate({ onAuthorize }: { onAuthorize: () => void }) {
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
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-xl bg-[hsl(var(--primary)/0.1)] flex items-center justify-center mx-auto border border-[hsl(var(--primary)/0.15)]">
            <Lock size={24} className="text-[hsl(var(--primary))]" />
          </div>
          <div>
            <h1 className="font-display font-bold text-2xl text-white">MailMax</h1>
            <p className="text-sm text-[hsl(var(--muted))] mt-1">Accès restreint</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="label">Mot de passe</label>
            <input type="password" autoFocus
              className={`input text-center text-lg tracking-[0.3em] ${err ? "!border-[hsl(var(--danger))] !shadow-[0_0_0_3px_hsl(var(--danger)/0.1)]" : ""}`}
              value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••••" />
          </div>
          <button type="submit" className="btn btn-primary w-full justify-center py-3">
            Déverrouiller
          </button>
        </form>

        {err && (
          <p className="text-center text-sm text-[hsl(var(--danger))] font-medium animate-in">
            Mot de passe incorrect
          </p>
        )}
      </div>
    </div>
  );
}
