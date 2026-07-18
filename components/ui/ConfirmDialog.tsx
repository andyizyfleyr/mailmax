import { X, AlertTriangle, Info } from "lucide-react";
import { Button } from "./Button";

export function ConfirmDialog({ open, title, description, confirmLabel = "Confirmer", cancelLabel = "Annuler", variant = "danger", icon = "warning", onConfirm, onCancel }: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "primary" | "danger";
  icon?: "warning" | "info";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="modal" style={{ maxWidth: 400 }}>
        <div className="flex justify-end p-4 pb-0">
          <button onClick={onCancel} className="w-8 h-8 rounded-lg flex items-center justify-center text-[hsl(var(--dim))] hover:text-white hover:bg-[hsl(var(--s2))] transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="px-8 pb-8 text-center">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${icon === "warning" ? "bg-[hsl(var(--danger)/0.1)] text-[hsl(var(--danger))]" : "bg-[hsl(var(--info)/0.1)] text-[hsl(var(--info))]"}`}>
            {icon === "warning" ? <AlertTriangle size={24} /> : <Info size={24} />}
          </div>
          <h3 className="font-display font-bold text-lg text-white mb-2">{title}</h3>
          <p className="text-sm text-[hsl(var(--muted))] mb-6">{description}</p>
          <div className="flex gap-3 justify-center">
            <Button variant="ghost" onClick={onCancel}>{cancelLabel}</Button>
            <Button variant={variant} onClick={onConfirm}>{confirmLabel}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AlertDialog({ open, title, description, onClose }: {
  open: boolean;
  title: string;
  description: string;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 400 }}>
        <div className="flex justify-end p-4 pb-0">
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-[hsl(var(--dim))] hover:text-white hover:bg-[hsl(var(--s2))] transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="px-8 pb-8 text-center">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 bg-[hsl(var(--info)/0.1)] text-[hsl(var(--info))]">
            <Info size={24} />
          </div>
          <h3 className="font-display font-bold text-lg text-white mb-2">{title}</h3>
          <p className="text-sm text-[hsl(var(--muted))] mb-6">{description}</p>
          <div className="flex gap-3 justify-center">
            <Button variant="primary" onClick={onClose}>OK</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
