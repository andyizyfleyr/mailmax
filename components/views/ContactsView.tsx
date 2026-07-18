"use client";

import { useState } from "react";
import { Plus, Upload, Trash2, Users, Search, CheckCircle } from "lucide-react";
import { Contact, ContactList } from "@/types";
import { Card, Badge, Button, Modal, ConfirmDialog, AlertDialog } from "@/components/ui";

export function ContactsView({ contacts, lists, onRefresh }: {
  contacts: Contact[]; lists: ContactList[]; onRefresh: () => void;
}) {
  const [search, setSearch] = useState("");
  const [filterList, setFilterList] = useState("all");
  const [showAddContact, setShowAddContact] = useState(false);
  const [showAddList, setShowAddList] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [showAll, setShowAll] = useState(false);
  const [newEmail, setNewEmail] = useState(""); const [newName, setNewName] = useState(""); const [newList, setNewList] = useState("");
  const [newTags, setNewTags] = useState("");

  async function addContact() {
    if (!newEmail || !newList) return;
    const tagsArray = newTags.split(',').map(t => t.trim()).filter(Boolean);
    await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "contact", email: newEmail, name: newName || newEmail, listId: newList, tags: tagsArray })
    });
    setNewEmail(""); setNewName(""); setNewTags(""); setShowAddContact(false); onRefresh();
  }

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteSelected, setConfirmDeleteSelected] = useState(false);
  const [alertImport, setAlertImport] = useState(false);
  const [newListName, setNewListName] = useState(""); const [newListDesc, setNewListDesc] = useState("");

  const filtered = contacts.filter(c => {
    const matchSearch = c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.tags || []).some(t => t.toLowerCase().includes(search.toLowerCase()));
    const matchList = filterList === "all" || c.listId === filterList;
    return matchSearch && matchList;
  });

  const perPage = showAll ? filtered.length : 5;

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * perPage, safePage * perPage);

  function goTo(p: number) { setPage(Math.max(1, Math.min(p, totalPages))); }

  const [prevFilterList, setPrevFilterList] = useState(filterList);
  const [prevSearch, setPrevSearch] = useState(search);
  if (filterList !== prevFilterList) { setPrevFilterList(filterList); setPage(1); }
  if (search !== prevSearch) { setPrevSearch(search); setPage(1); }

  async function addList() {
    if (!newListName) return;
    await fetch("/api/contacts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "list", name: newListName, description: newListDesc }) });
    setNewListName(""); setNewListDesc(""); setShowAddList(false); onRefresh();
  }

  async function doDeleteContact() {
    if (!confirmDeleteId) return;
    await fetch("/api/contacts", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: confirmDeleteId }) });
    setConfirmDeleteId(null); onRefresh();
  }

  async function doDeleteSelected() {
    await fetch("/api/contacts", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: selected }) });
    setSelected([]); setConfirmDeleteSelected(false); onRefresh();
  }

  function toggleSelect(id: string) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function toggleAll() {
    if (paginated.every(c => selected.includes(c.id))) {
      setSelected(prev => prev.filter(id => !paginated.some(c => c.id === id)));
    } else {
      const pageIds = paginated.map(c => c.id);
      setSelected(prev => {
        const next = [...prev];
        for (const id of pageIds) {
          if (!next.includes(id)) next.push(id);
        }
        return next;
      });
    }
  }

  async function handleCsvImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const text = await file.text();
    const rows = text.split("\n").slice(1).filter(Boolean).map(line => {
      const parts = line.split(",");
      return { email: parts[0]?.trim(), name: parts[1]?.trim() };
    }).filter(r => r.email);
    if (!filterList || filterList === "all") { setAlertImport(true); return; }
    await fetch("/api/contacts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "import", rows, listId: filterList }) });
    onRefresh();
  }

  return (
    <div className="pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h2 className="font-display font-bold text-xl text-white">Contacts</h2>
          <p className="text-sm text-[hsl(var(--muted))] mt-0.5">Gérez votre audience</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="btn btn-ghost text-xs cursor-pointer">
            <Upload size={14} /> CSV
            <input type="file" accept=".csv" className="hidden" onChange={handleCsvImport} />
          </label>
          <Button variant="ghost" onClick={() => setShowAddList(true)}><Plus size={14} /> Liste</Button>
          <Button variant="primary" onClick={() => setShowAddContact(true)}><Plus size={14} /> Contact</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 pb-4">
        <Card className={`p-5 min-w-[180px] cursor-pointer transition-all ${filterList === "all" ? "ring-1 ring-[hsl(var(--primary))] border-transparent" : "hover:border-[hsl(var(--primary)/0.3)]"}`}
          onClick={() => setFilterList("all")}>
          <div className="text-xs font-medium text-[hsl(var(--muted))] mb-1">Total</div>
          <div className="text-2xl font-bold text-white">{contacts.length}</div>
          {filterList === "all" && <CheckCircle size={14} className="text-[hsl(var(--primary))] mt-3" />}
        </Card>
        {lists.map(l => (
          <Card key={l.id} className={`p-5 min-w-[180px] cursor-pointer transition-all ${filterList === l.id ? "ring-1 ring-[hsl(var(--primary))] border-transparent" : "hover:border-[hsl(var(--primary)/0.3)]"}`}
            onClick={() => setFilterList(l.id)}>
            <div className="text-xs font-medium text-[hsl(var(--muted))] mb-1 truncate">{l.name}</div>
            <div className="text-2xl font-bold text-white">{contacts.filter(c => c.listId === l.id).length}</div>
            {filterList === l.id && <CheckCircle size={14} className="text-[hsl(var(--primary))] mt-3" />}
          </Card>
        ))}
      </div>

      <div className="flex items-center gap-3 my-5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[hsl(var(--dim))]" />
          <input className="input !pl-10" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {selected.length > 0 && (
          <Button variant="danger" onClick={() => setConfirmDeleteSelected(true)}>
            <Trash2 size={14} /> ({selected.length})
          </Button>
        )}
      </div>

      <Card className="overflow-hidden overflow-x-auto">
        <div className="table-row font-medium text-[11px] uppercase tracking-wider text-[hsl(var(--dim))] bg-[hsl(var(--s1)/0.5)]"
             style={{ gridTemplateColumns: "40px 2fr 2fr 1.2fr 1fr 1fr 50px" }}>
          <span><input type="checkbox" checked={paginated.length > 0 && paginated.every(c => selected.includes(c.id))} onChange={toggleAll} className="w-4 h-4 rounded border-[hsl(var(--border))] bg-[hsl(var(--s2))] text-[hsl(var(--primary))] focus:ring-0 cursor-pointer" /></span>
          <span>Contact</span><span>Email</span><span>Liste</span><span>Statut</span><span>Tags</span><span></span>
        </div>

        {filtered.length === 0 ? (
          <div className="py-24 text-center">
            <Users size={40} className="mx-auto mb-4 text-[hsl(var(--dim))] opacity-20" />
            <p className="text-sm font-medium text-white mb-1">Aucun contact trouvé</p>
            <p className="text-xs text-[hsl(var(--muted))]">Modifiez vos filtres ou ajoutez des contacts.</p>
          </div>
        ) : paginated.map(c => (
          <div key={c.id} className={`table-row hover:bg-[hsl(var(--s2)/0.2)] ${selected.includes(c.id) ? "bg-[hsl(var(--primary)/0.03)]" : ""}`}
               style={{ gridTemplateColumns: "40px 2fr 2fr 1.2fr 1fr 1fr 50px" }}>
            <span><input type="checkbox" checked={selected.includes(c.id)} onChange={() => toggleSelect(c.id)} className="w-4 h-4 rounded border-[hsl(var(--border))] bg-[hsl(var(--s2))] text-[hsl(var(--primary))] focus:ring-0 cursor-pointer" /></span>
            <span>
              <span className="font-medium text-white">{c.name}</span>
              <span className="text-[10px] text-[hsl(var(--dim))] block">{c.id.split('-')[0]}</span>
            </span>
            <span className="text-sm text-[hsl(var(--muted))]">{c.email}</span>
            <span><span className="text-xs px-2 py-0.5 rounded bg-[hsl(var(--s2))] text-[hsl(var(--muted))] border border-[hsl(var(--border))]">{lists.find(l => l.id === c.listId)?.name || "Non classé"}</span></span>
            <span><Badge variant={c.subscribed ? "success" : "danger"}>{c.subscribed ? "Abonné" : "Désabonné"}</Badge></span>
            <div className="flex flex-wrap gap-1">
              {(c.tags || []).length > 0 ? c.tags.map((t, idx) => (
                <span key={idx} className="text-[10px] px-1.5 py-0.5 rounded bg-[hsl(var(--s2))] text-[hsl(var(--primary))] border border-[hsl(var(--primary)/0.15)]">{t}</span>
              )) : <span className="text-[10px] text-[hsl(var(--dim))] italic">—</span>}
            </div>
            <div className="flex justify-end">
              <button onClick={() => setConfirmDeleteId(c.id)} className="w-7 h-7 rounded-md flex items-center justify-center text-[hsl(var(--dim))] hover:text-[hsl(var(--danger))] hover:bg-[hsl(var(--danger)/0.1)] transition-colors">
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </Card>

      {totalPages > 1 && !showAll && (
        <div className="flex items-center justify-center gap-2 pt-6">
          <button onClick={() => goTo(safePage - 1)} disabled={safePage <= 1}
            className="px-3 py-1.5 rounded-md text-xs font-medium border border-[hsl(var(--border))] text-[hsl(var(--muted))] hover:text-white hover:border-[hsl(var(--primary)/0.3)] transition-colors disabled:opacity-30 disabled:pointer-events-none">
            ← Précédent
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => goTo(p)}
              className={`w-8 h-8 rounded-md text-xs font-medium transition-colors ${p === safePage ? "bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]" : "text-[hsl(var(--dim))] hover:text-white"}`}>
              {p}
            </button>
          ))}
          <button onClick={() => goTo(safePage + 1)} disabled={safePage >= totalPages}
            className="px-3 py-1.5 rounded-md text-xs font-medium border border-[hsl(var(--border))] text-[hsl(var(--muted))] hover:text-white hover:border-[hsl(var(--primary)/0.3)] transition-colors disabled:opacity-30 disabled:pointer-events-none">
            Suivant →
          </button>
        </div>
      )}
      {filtered.length > 5 && (
        <div className="flex items-center justify-center pt-3">
          <button onClick={() => { setShowAll(!showAll); setPage(1); }}
            className="px-3 py-1.5 rounded-md text-xs font-medium border border-[hsl(var(--border))] text-[hsl(var(--muted))] hover:text-white hover:border-[hsl(var(--primary)/0.3)] transition-colors">
            {showAll ? "Paginer (5 par page)" : "Tout afficher"}
          </button>
        </div>
      )}

      {showAddContact && (
        <Modal onClose={() => setShowAddContact(false)} maxWidth={440}>
          <div className="px-8 pb-8 space-y-6">
            <div>
              <h3 className="font-display font-bold text-lg text-white">Nouveau Contact</h3>
              <p className="text-xs text-[hsl(var(--muted))] mt-0.5">Ajoutez un contact à votre audience</p>
            </div>
            <div className="space-y-4">
              <div><label className="label">Email *</label><input className="input" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="email@exemple.com" /></div>
              <div><label className="label">Nom</label><input className="input" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Jean Dupont" /></div>
              <div><label className="label">Tags (séparés par des virgules)</label><input className="input" value={newTags} onChange={e => setNewTags(e.target.value)} placeholder="vip, prospect" /></div>
              <div><label className="label">Liste *</label>
                <select className="input" value={newList} onChange={e => setNewList(e.target.value)}>
                  <option value="">Sélectionner une liste</option>
                  {lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="ghost" className="flex-1 justify-center" onClick={() => setShowAddContact(false)}>Annuler</Button>
                <Button variant="primary" className="flex-1 justify-center" onClick={addContact}>Ajouter</Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      <ConfirmDialog open={!!confirmDeleteId} title="Supprimer le contact" description="Êtes-vous sûr de vouloir supprimer ce contact ? Cette action est irréversible." confirmLabel="Supprimer" onConfirm={doDeleteContact} onCancel={() => setConfirmDeleteId(null)} />
      <ConfirmDialog open={confirmDeleteSelected} title="Supprimer les contacts" description={`Êtes-vous sûr de vouloir supprimer ces ${selected.length} contacts ? Cette action est irréversible.`} confirmLabel="Supprimer" onConfirm={doDeleteSelected} onCancel={() => setConfirmDeleteSelected(false)} />
      <AlertDialog open={alertImport} title="Impossible d'importer" description="Sélectionnez une liste spécifique avant d'importer un fichier CSV." onClose={() => setAlertImport(false)} />

      {showAddList && (
        <Modal onClose={() => setShowAddList(false)} maxWidth={440}>
          <div className="px-8 pb-8 space-y-6">
            <div>
              <h3 className="font-display font-bold text-lg text-white">Nouvelle Liste</h3>
              <p className="text-xs text-[hsl(var(--muted))] mt-0.5">Créez un segment d'audience</p>
            </div>
            <div className="space-y-4">
              <div><label className="label">Nom *</label><input className="input" value={newListName} onChange={e => setNewListName(e.target.value)} placeholder="Clients VIP" /></div>
              <div><label className="label">Description</label><input className="input" value={newListDesc} onChange={e => setNewListDesc(e.target.value)} placeholder="Description de la liste" /></div>
              <div className="flex gap-3 pt-2">
                <Button variant="ghost" className="flex-1 justify-center" onClick={() => setShowAddList(false)}>Annuler</Button>
                <Button variant="primary" className="flex-1 justify-center" onClick={addList}>Créer</Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
