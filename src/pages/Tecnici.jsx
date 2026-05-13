import { useState } from "react";
import { useData } from "../context/DataContext";
import { useTheme } from "../App";
import { Users, Plus, Edit2, Trash2, X, Check, Phone, Mail, User } from "lucide-react";

const EMPTY = { nome: "", ruolo: "", telefono: "", email: "", colore: "#f59e0b" };
const COLORI = ["#f59e0b","#10b981","#3b82f6","#8b5cf6","#ef4444","#ec4899","#14b8a6","#f97316"];

function Avatar({ tecnico, size = 10 }) {
  const initials = (tecnico.nome || "?").trim().split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
  return (
    <div
      className={`w-${size} h-${size} rounded-full flex items-center justify-center text-white font-bold shrink-0`}
      style={{ background: tecnico.colore || "#f59e0b", fontSize: size > 8 ? 16 : 12 }}
    >
      {initials}
    </div>
  );
}

function TecnicoForm({ iniziale, onSave, onCancel }) {
  const [form, setForm] = useState(iniziale || EMPTY);
  const [errors, setErrors] = useState({});
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = () => {
    const e = {};
    if (!form.nome.trim()) e.nome = "Nome obbligatorio";
    if (Object.keys(e).length) { setErrors(e); return; }
    onSave(form);
  };

  const inputCls = `w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-colors
    ${isDark
      ? "bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:border-amber-500/50"
      : "bg-zinc-50 border border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:border-amber-400"}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm overflow-y-auto" onClick={onCancel}>
      <div className="min-h-full flex items-start justify-center p-4 py-8" onClick={e => e.stopPropagation()}>
        <div className={`w-full max-w-md rounded-2xl shadow-2xl border ${isDark ? "bg-[#0c1a35] border-white/10" : "bg-white border-zinc-200"}`}>

          {/* Header */}
          <div className={`flex items-center justify-between p-5 border-b ${isDark ? "border-white/5" : "border-zinc-100"}`}>
            <div className="flex items-center gap-3">
              <Avatar tecnico={form} size={8} />
              <h2 className={`font-semibold ${isDark ? "text-white" : "text-zinc-900"}`}>
                {iniziale ? "Modifica tecnico" : "Nuovo tecnico"}
              </h2>
            </div>
            <button onClick={onCancel} className="text-slate-400 hover:text-slate-200 transition-colors p-1">
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4">
            <div>
              <label className={`block text-xs mb-1.5 ${isDark ? "text-slate-400" : "text-zinc-500"}`}>Nome *</label>
              <input className={inputCls} placeholder="Es. Mario Bianchi" value={form.nome}
                onChange={e => set("nome", e.target.value)} />
              {errors.nome && <p className="text-xs text-red-400 mt-1">{errors.nome}</p>}
            </div>
            <div>
              <label className={`block text-xs mb-1.5 ${isDark ? "text-slate-400" : "text-zinc-500"}`}>Ruolo</label>
              <input className={inputCls} placeholder="Es. Idraulico senior" value={form.ruolo}
                onChange={e => set("ruolo", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-xs mb-1.5 ${isDark ? "text-slate-400" : "text-zinc-500"}`}>Telefono</label>
                <input className={inputCls} placeholder="333 123 4567" value={form.telefono}
                  onChange={e => set("telefono", e.target.value)} />
              </div>
              <div>
                <label className={`block text-xs mb-1.5 ${isDark ? "text-slate-400" : "text-zinc-500"}`}>Email</label>
                <input className={inputCls} placeholder="email@esempio.it" value={form.email}
                  onChange={e => set("email", e.target.value)} />
              </div>
            </div>
            <div>
              <label className={`block text-xs mb-2 ${isDark ? "text-slate-400" : "text-zinc-500"}`}>Colore avatar</label>
              <div className="flex gap-2 flex-wrap">
                {COLORI.map(c => (
                  <button key={c} onClick={() => set("colore", c)}
                    className="w-7 h-7 rounded-full border-2 transition-all"
                    style={{ background: c, borderColor: form.colore === c ? "white" : "transparent",
                             transform: form.colore === c ? "scale(1.2)" : "scale(1)" }} />
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className={`flex flex-col-reverse sm:flex-row sm:justify-end gap-3 p-5 border-t ${isDark ? "border-white/5" : "border-zinc-100"}`}>
            <button onClick={onCancel}
              className={`px-5 py-2.5 rounded-xl text-sm border transition-colors ${isDark ? "border-white/10 text-slate-300 hover:bg-white/5" : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"}`}>
              Annulla
            </button>
            <button onClick={submit}
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#060d1f] text-sm font-semibold transition-colors">
              {iniziale ? "Salva modifiche" : "Aggiungi tecnico"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Tecnici() {
  const { tecnici, addTecnico, updateTecnico, deleteTecnico } = useData();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [showForm, setShowForm]       = useState(false);
  const [editTarget, setEditTarget]   = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const handleSave = async (form) => {
    if (editTarget) {
      await updateTecnico(editTarget.id, form);
    } else {
      await addTecnico({ ...form, id: `t${Date.now()}`, createdAt: new Date().toISOString() });
    }
    setShowForm(false);
    setEditTarget(null);
  };

  const handleDelete = async () => {
    await deleteTecnico(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <div className="max-w-2xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <h1 className={`text-xl font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>Tecnici</h1>
          <p className={`text-sm mt-0.5 ${isDark ? "text-slate-400" : "text-zinc-500"}`}>
            {tecnici.length} tecnico{tecnici.length !== 1 ? "i" : ""} registrato{tecnici.length !== 1 ? "i" : ""}
          </p>
        </div>
        <button
          onClick={() => { setEditTarget(null); setShowForm(true); }}
          className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#060d1f] text-sm font-semibold transition-all">
          <Plus size={16} />
          <span className="hidden sm:inline">Nuovo tecnico</span>
          <span className="sm:hidden">Nuovo</span>
        </button>
      </div>

      {/* Lista */}
      {tecnici.length === 0 ? (
        <div className={`rounded-2xl p-10 text-center border ${isDark ? "bg-[#0f2040] border-[#1a3358]" : "bg-white border-zinc-200"}`}>
          <Users size={40} className="mx-auto mb-3 text-slate-500" />
          <p className={`font-medium ${isDark ? "text-slate-300" : "text-zinc-700"}`}>Nessun tecnico ancora</p>
          <p className={`text-sm mt-1 ${isDark ? "text-slate-500" : "text-zinc-400"}`}>Aggiungi il primo tecnico per iniziare</p>
          <button onClick={() => setShowForm(true)}
            className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#060d1f] text-sm font-semibold transition-colors">
            <Plus size={15} /> Aggiungi tecnico
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {tecnici.map(t => (
            <div key={t.id}
              className={`flex items-center gap-4 p-4 rounded-2xl border transition-all
                ${isDark ? "bg-[#0f2040] border-[#1a3358] hover:border-amber-500/30" : "bg-white border-zinc-200 hover:border-amber-300 shadow-sm"}`}>
              <Avatar tecnico={t} size={12} />
              <div className="flex-1 min-w-0">
                <p className={`font-semibold truncate ${isDark ? "text-white" : "text-zinc-900"}`}>{t.nome}</p>
                {t.ruolo && <p className={`text-xs mt-0.5 truncate ${isDark ? "text-slate-400" : "text-zinc-500"}`}>{t.ruolo}</p>}
                <div className="flex gap-3 mt-1 flex-wrap">
                  {t.telefono && (
                    <span className={`flex items-center gap-1 text-xs ${isDark ? "text-slate-500" : "text-zinc-400"}`}>
                      <Phone size={10} />{t.telefono}
                    </span>
                  )}
                  {t.email && (
                    <span className={`flex items-center gap-1 text-xs ${isDark ? "text-slate-500" : "text-zinc-400"}`}>
                      <Mail size={10} />{t.email}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => { setEditTarget(t); setShowForm(true); }}
                  className={`p-2 rounded-lg transition-colors ${isDark ? "text-slate-400 hover:text-amber-400 hover:bg-amber-500/10" : "text-zinc-400 hover:text-amber-500 hover:bg-amber-50"}`}>
                  <Edit2 size={15} />
                </button>
                <button
                  onClick={() => setDeleteTarget(t)}
                  className={`p-2 rounded-lg transition-colors ${isDark ? "text-slate-400 hover:text-red-400 hover:bg-red-500/10" : "text-zinc-400 hover:text-red-500 hover:bg-red-50"}`}>
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form modale */}
      {showForm && (
        <TecnicoForm
          iniziale={editTarget}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditTarget(null); }}
        />
      )}

      {/* Conferma elimina */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setDeleteTarget(null)}>
          <div className={`w-full max-w-sm rounded-2xl p-6 border shadow-2xl ${isDark ? "bg-[#0f2040] border-red-500/20" : "bg-white border-red-200"}`}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                <Trash2 size={18} className="text-red-400" />
              </div>
              <div>
                <p className={`font-semibold ${isDark ? "text-white" : "text-zinc-900"}`}>Elimina tecnico</p>
                <p className={`text-sm ${isDark ? "text-slate-400" : "text-zinc-500"}`}>{deleteTarget.nome}</p>
              </div>
            </div>
            <p className={`text-sm mb-5 ${isDark ? "text-slate-300" : "text-zinc-600"}`}>
              Questa azione non può essere annullata. I rapportini associati non verranno eliminati.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)}
                className={`flex-1 py-2.5 rounded-xl text-sm border transition-colors ${isDark ? "border-white/10 text-slate-300 hover:bg-white/5" : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"}`}>
                Annulla
              </button>
              <button onClick={handleDelete}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors">
                Elimina
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
