import { useState, useMemo, useCallback, Fragment } from "react";
import { useAuth } from "../auth/AuthContext";
import { useData } from "../context/DataContext";
import {
  Users, Plus, Search, X, Edit2, Trash2,
  Phone, Mail, MapPin, FileText, Clock,
  Building2, ArrowLeft, Wrench, Calendar,
  TrendingUp, Hash, ChevronRight, AlertTriangle,
  User, BadgeCheck, SlidersHorizontal, CheckCircle2,
  Package, Camera, ZoomIn, PenLine,
  Folder, FolderOpen, FolderPlus
} from "lucide-react";

// ─── STORAGE KEYS ────────────────────────────────────────────────────────────

const KEY_CLIENTI     = "hydrodesk_clienti";
const KEY_RAPPORTINI  = "rapportini";
const KEY_TECNICI     = "tecnici";
const KEY_COMMESSE    = "hydrodesk_commesse";

// ─── MOCK DATA (seed se localStorage è vuoto) ────────────────────────────────

const CLIENTI_SEED = [
  {
    id: "c1",
    nome: "Mario Rossi",
    tipo: "Privato",
    telefono: "335 123 4567",
    email: "mario.rossi@email.it",
    indirizzo: "Via Roma 12",
    citta: "Bergamo",
    cap: "24121",
    provincia: "BG",
    codiceFiscale: "RSSMRA80A01A794F",
    partitaIva: "",
    note: "Cliente storico. Preferisce chiamate la mattina.",
    createdAt: "2024-01-15T09:00:00.000Z",
  },
  {
    id: "c2",
    nome: "Condominio Piazza Pontida",
    tipo: "Condominio",
    telefono: "035 987 6543",
    email: "admin.pontida@pec.it",
    indirizzo: "Piazza Pontida 3",
    citta: "Bergamo",
    cap: "24122",
    provincia: "BG",
    codiceFiscale: "",
    partitaIva: "02345678901",
    note: "Referente: Geom. Brambilla. Interventi urgenti comunicare al portiere.",
    createdAt: "2024-02-10T10:30:00.000Z",
  },
  {
    id: "c3",
    nome: "Ediltek S.r.l.",
    tipo: "Azienda",
    telefono: "02 4567 8910",
    email: "info@ediltek.it",
    indirizzo: "Via Industriale 88",
    citta: "Dalmine",
    cap: "24044",
    provincia: "BG",
    codiceFiscale: "",
    partitaIva: "03456789012",
    note: "Contratto di manutenzione annuale impianti.",
    createdAt: "2024-03-05T14:00:00.000Z",
  },
  {
    id: "c4",
    nome: "Lucia Ferri",
    tipo: "Privato",
    telefono: "347 654 3210",
    email: "lucia.ferri@gmail.com",
    indirizzo: "Via Manzoni 7",
    citta: "Alzano Lombardo",
    cap: "24022",
    provincia: "BG",
    codiceFiscale: "FRRLCU75B49A794G",
    partitaIva: "",
    note: "",
    createdAt: "2024-04-20T08:00:00.000Z",
  },
];

// ─── TIPI CLIENTE ─────────────────────────────────────────────────────────────

const TIPI = ["Privato", "Azienda", "Condominio", "Ente pubblico"];

const TIPO_CONFIG = {
  "Privato":        { color: "text-sky-400",   bg: "bg-sky-400/10",   border: "border-sky-400/20"   },
  "Azienda":        { color: "text-violet-400", bg: "bg-violet-400/10",border: "border-violet-400/20"},
  "Condominio":     { color: "text-emerald-400",bg: "bg-emerald-400/10",border:"border-emerald-400/20"},
  "Ente pubblico":  { color: "text-amber-400",  bg: "bg-amber-400/10", border: "border-amber-400/20" },
};

// ─── TIPO INTERVENTO ─────────────────────────────────────────────────────────

const TIPO_INT_CONFIG = {
  riparazione:   { label: "Riparazione",   color: "#f59e0b" },
  manutenzione:  { label: "Manutenzione",  color: "#3b82f6" },
  installazione: { label: "Installazione", color: "#10b981" },
  collaudo:      { label: "Collaudo",      color: "#8b5cf6" },
  emergenza:     { label: "Emergenza",     color: "#ef4444" },
};

// ─── STATO RAPPORTINO ─────────────────────────────────────────────────────────

const STATO_CONFIG = {
  bozza:      { label: "Bozza",      color: "text-slate-400",  bg: "bg-slate-400/10"  },
  completato: { label: "Completato", color: "text-emerald-400",bg: "bg-emerald-400/10"},
  inviato:    { label: "Inviato",    color: "text-sky-400",    bg: "bg-sky-400/10"    },
  fatturato:  { label: "Fatturato",  color: "text-amber-400",  bg: "bg-amber-400/10"  },
};

// ─── FORM VUOTO ───────────────────────────────────────────────────────────────

const FORM_EMPTY = {
  nome: "", tipo: "Privato", telefono: "", email: "",
  indirizzo: "", citta: "", cap: "", provincia: "",
  codiceFiscale: "", partitaIva: "", note: "",
};

// ─── UTILS ────────────────────────────────────────────────────────────────────

function readLS(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

function writeLS(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
}

function ripristinaMagazzinoPerRapportino(rap) {
  if (!rap?.materiali?.length) return;
  try {
    const mag = JSON.parse(localStorage.getItem('hydrodesk_magazzino') || '[]');
    const updated = mag.map(p => {
      const usato = rap.materiali
        .filter(m => m.magazzinoId === p.id)
        .reduce((s, m) => s + (parseFloat(m.quantita) || 0), 0);
      return usato > 0 ? { ...p, quantita: (p.quantita || 0) + usato } : p;
    });
    localStorage.setItem('hydrodesk_magazzino', JSON.stringify(updated));
  } catch {}
}

function initClienti() {
  const stored = readLS(KEY_CLIENTI, null);
  if (!stored) { writeLS(KEY_CLIENTI, CLIENTI_SEED); return CLIENTI_SEED; }
  return stored;
}

function formatData(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("it-IT", { day:"2-digit", month:"short", year:"numeric" });
}

function iniziali(nome) {
  return nome.trim().split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

// colori avatar deterministici
const AVATAR_COLORS = [
  "from-amber-500 to-orange-600",
  "from-sky-500 to-blue-600",
  "from-emerald-500 to-teal-600",
  "from-violet-500 to-purple-600",
  "from-rose-500 to-pink-600",
];
function avatarColor(id) {
  const i = id ? id.charCodeAt(id.length - 1) % AVATAR_COLORS.length : 0;
  return AVATAR_COLORS[i];
}

// ─── COMPONENTE BADGE TIPO ────────────────────────────────────────────────────

function TipoBadge({ tipo }) {
  const cfg = TIPO_CONFIG[tipo] ?? TIPO_CONFIG["Privato"];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border
      ${cfg.color} ${cfg.bg} ${cfg.border}`}>
      {tipo}
    </span>
  );
}

// ─── COMPONENTE BADGE STATO RAPPORTINO ───────────────────────────────────────

function StatoBadge({ stato }) {
  const cfg = STATO_CONFIG[stato] ?? STATO_CONFIG["bozza"];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color} ${cfg.bg}`}>
      {cfg.label}
    </span>
  );
}

// ─── MODAL CONFERMA ELIMINA ───────────────────────────────────────────────────

function DeleteModal({ cliente, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white dark:bg-[#0f2040] border border-red-500/20 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <p className="font-semibold text-slate-900 dark:text-white text-sm">Elimina cliente</p>
            <p className="text-xs text-slate-400">Operazione irreversibile</p>
          </div>
        </div>
        <p className="text-sm text-slate-300 mb-6">
          Sei sicuro di voler eliminare <span className="text-slate-900 dark:text-white font-medium">{cliente.nome}</span>?
          I rapportini collegati non verranno eliminati.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-300 text-sm hover:bg-white/5 transition-colors">
            Annulla
          </button>
          <button onClick={onConfirm}
            className="flex-1 px-4 py-2 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-500/30 transition-colors">
            Elimina
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── FIELD (standalone, fuori dal form per evitare remount ad ogni keystroke) ──

function Field({ label, campo, placeholder, half, mono, form, set, errors }) {
  return (
    <div className={half ? "col-span-1" : "col-span-2"}>
      <label className="block text-xs text-slate-400 mb-1">{label}</label>
      <input
        value={form[campo]}
        onChange={e => set(campo, e.target.value)}
        placeholder={placeholder}
        className={`w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/5 border text-sm placeholder-slate-600 outline-none transition-colors
          ${mono ? "font-mono" : ""}
          ${errors[campo]
            ? "border-red-500/50 focus:border-red-500 text-red-300"
            : "border-slate-200 dark:border-white/10 focus:border-amber-500/50 text-slate-900 dark:text-white"}`}
      />
      {errors[campo] && <p className="text-xs text-red-400 mt-1">{errors[campo]}</p>}
    </div>
  );
}

// ─── FORM CLIENTE (aggiunta / modifica) ──────────────────────────────────────

function ClienteForm({ iniziale, onSave, onCancel }) {
  const [form, setForm] = useState(iniziale ?? FORM_EMPTY);
  const [errors, setErrors] = useState({});

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    if (errors[k]) setErrors(e => ({ ...e, [k]: null }));
  };

  const validate = () => {
    const e = {};
    if (!form.nome.trim())    e.nome    = "Nome obbligatorio";
    if (!form.citta.trim())   e.citta   = "Città obbligatoria";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Email non valida";
    return e;
  };

  const submit = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    onSave(form);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm overflow-y-auto"
      onClick={onCancel}
    >
      <div
        className="min-h-full flex items-start justify-center p-4 py-8"
        onClick={e => e.stopPropagation()}
      >
        <div className="relative bg-white dark:bg-[#0c1a35] border border-slate-200 dark:border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl">

          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <User className="w-4 h-4 text-amber-400" />
              </div>
              <h2 className="font-semibold text-slate-900 dark:text-white">
                {iniziale ? "Modifica cliente" : "Nuovo cliente"}
              </h2>
            </div>
            <button onClick={onCancel} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors p-1">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-5">

            {/* Tipo */}
            <div>
              <label className="block text-xs text-slate-400 mb-2">Tipo cliente</label>
              <div className="flex gap-2 flex-wrap">
                {TIPI.map(t => (
                  <button key={t} onClick={() => set("tipo", t)}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-all
                      ${form.tipo === t
                        ? "bg-amber-500/20 border-amber-500/40 text-amber-300 font-medium"
                        : "bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 hover:border-white/20"}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Griglia campi — 1 col su mobile, 2 su sm+ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nome / Ragione sociale *" campo="nome" placeholder="Es. Mario Rossi" form={form} set={set} errors={errors} />
              <Field label="Telefono" campo="telefono" placeholder="333 123 4567" half mono form={form} set={set} errors={errors} />
              <Field label="Email" campo="email" placeholder="email@esempio.it" half form={form} set={set} errors={errors} />
              <Field label="Indirizzo" campo="indirizzo" placeholder="Via Roma 12" form={form} set={set} errors={errors} />
              <Field label="Città *" campo="citta" placeholder="Bergamo" half form={form} set={set} errors={errors} />
              <Field label="CAP" campo="cap" placeholder="24121" half mono form={form} set={set} errors={errors} />
              <Field label="Provincia" campo="provincia" placeholder="BG" half form={form} set={set} errors={errors} />
            </div>

            {/* Sezione fiscale */}
            <div className="border-t border-slate-100 dark:border-white/5 pt-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Dati fiscali</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Codice Fiscale" campo="codiceFiscale" placeholder="RSSMRA80A01A794F" half mono form={form} set={set} errors={errors} />
                <Field label="Partita IVA" campo="partitaIva" placeholder="02345678901" half mono form={form} set={set} errors={errors} />
              </div>
            </div>

            {/* Note */}
            <div className="border-t border-slate-100 dark:border-white/5 pt-4">
              <label className="block text-xs text-slate-400 mb-1">Note</label>
              <textarea
                rows={3}
                value={form.note}
                onChange={e => set("note", e.target.value)}
                placeholder="Informazioni aggiuntive, preferenze, avvertenze..."
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 outline-none focus:border-amber-500/50 transition-colors resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 p-5 border-t border-slate-100 dark:border-white/5">
            <button onClick={onCancel}
              className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-300 text-sm hover:bg-white/5 transition-colors">
              Annulla
            </button>
            <button onClick={submit}
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#060d1f] text-sm font-semibold transition-colors">
              {iniziale ? "Salva modifiche" : "Crea cliente"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── DETTAGLIO RAPPORTINO (modal) ────────────────────────────────────────────

function RapportinoDettaglio({ r, tecnici, onClose, onDelete }) {
  const [fotoZoom, setFotoZoom] = useState(null);

  const tipoConfig  = TIPO_INT_CONFIG[r.tipoIntervento] || { label: r.tipoIntervento || "Intervento", color: "#f59e0b" };
  const nomeTecnico = r.tecnico || tecnici?.find(t => t.id === r.tecnicoId)?.nome || null;

  const totMat = (r.materiali || []).reduce((s, m) =>
    s + (parseFloat(m.quantita) || 0) * (parseFloat(m.prezzoVendita) || 0), 0);
  const totMan = (parseFloat(r.oreManodopera) || 0) * (parseFloat(r.costoOrario) || 0);
  const totInt = totMat + totMan;

  const hasPrezzi = totMat > 0;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 overflow-y-auto">
        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full max-w-2xl rounded-2xl bg-white dark:bg-[#0c1a35] border border-slate-200 dark:border-white/10 shadow-2xl mb-8">

          {/* Header */}
          <div className="flex items-start justify-between p-5 border-b border-slate-100 dark:border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                   style={{ background: tipoConfig.color + "22" }}>
                <Wrench size={18} style={{ color: tipoConfig.color }} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-slate-900 dark:text-white">{tipoConfig.label}</span>
                  <StatoBadge stato={r.stato} />
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {formatData(r.data)}
                  {r.oraInizio ? ` · ${r.oraInizio}` : ""}
                  {r.oraFine   ? ` → ${r.oraFine}`   : ""}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {onDelete && (
                <button onClick={onDelete}
                  title="Elimina rapportino"
                  className="text-slate-400 hover:text-red-400 transition-colors p-1 shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button onClick={onClose}
                className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors p-1 shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="p-5 space-y-5">

            {/* Info base */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {r.indirizzoIntervento && (
                <div className="sm:col-span-2 flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500">Indirizzo intervento</p>
                    <p className="text-sm text-slate-900 dark:text-white">{r.indirizzoIntervento}</p>
                  </div>
                </div>
              )}
              {nomeTecnico && (
                <div className="flex items-start gap-2">
                  <User className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500">Tecnico</p>
                    <p className="text-sm text-slate-900 dark:text-white">{nomeTecnico}</p>
                  </div>
                </div>
              )}
              {r.oreManodopera && (
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500">Manodopera</p>
                    <p className="text-sm text-slate-900 dark:text-white font-mono">
                      {r.oreManodopera}h{r.costoOrario ? ` × ${r.costoOrario} €/h` : ""}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Descrizione */}
            {r.descrizione && (
              <div className="rounded-xl p-4 bg-slate-50 dark:bg-white/3 border border-slate-100 dark:border-white/5">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Descrizione lavoro</p>
                <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">{r.descrizione}</p>
              </div>
            )}

            {/* Materiali */}
            {r.materiali?.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-4 h-4 text-amber-400" />
                  <p className="text-xs text-slate-500 uppercase tracking-wider">
                    Materiali utilizzati ({r.materiali.length})
                  </p>
                </div>
                <div className="rounded-xl border border-slate-100 dark:border-white/5 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-white/3 border-b border-slate-100 dark:border-white/5">
                        <th className="text-left px-3 py-2 text-xs text-slate-500 font-medium">Materiale</th>
                        <th className="text-right px-3 py-2 text-xs text-slate-500 font-medium">Qtà</th>
                        <th className="text-right px-3 py-2 text-xs text-slate-500 font-medium">U.M.</th>
                        {hasPrezzi && (
                          <>
                            <th className="text-right px-3 py-2 text-xs text-slate-500 font-medium">€/pz</th>
                            <th className="text-right px-3 py-2 text-xs text-slate-500 font-medium">Totale</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                      {r.materiali.map((m, i) => {
                        const totRiga = (parseFloat(m.quantita) || 0) * (parseFloat(m.prezzoVendita) || 0);
                        return (
                          <tr key={i} className="hover:bg-slate-50 dark:hover:bg-white/2">
                            <td className="px-3 py-2 text-slate-800 dark:text-white">{m.nome || "—"}</td>
                            <td className="px-3 py-2 text-right font-mono text-slate-500">{m.quantita}</td>
                            <td className="px-3 py-2 text-right text-slate-500">{m.unita}</td>
                            {hasPrezzi && (
                              <>
                                <td className="px-3 py-2 text-right font-mono text-slate-400">
                                  {m.prezzoVendita ? Number(m.prezzoVendita).toFixed(2) + " €" : "—"}
                                </td>
                                <td className="px-3 py-2 text-right font-mono font-semibold text-amber-400">
                                  {totRiga > 0 ? totRiga.toFixed(2) + " €" : "—"}
                                </td>
                              </>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Totale intervento */}
            {totInt > 0 && (
              <div className="flex justify-end">
                <div className="space-y-1 min-w-[220px] text-sm">
                  {totMat > 0 && (
                    <div className="flex justify-between gap-8 text-slate-400">
                      <span>Materiali</span>
                      <span className="font-mono">{totMat.toFixed(2)} €</span>
                    </div>
                  )}
                  {totMan > 0 && (
                    <div className="flex justify-between gap-8 text-slate-400">
                      <span>Manodopera</span>
                      <span className="font-mono">{totMan.toFixed(2)} €</span>
                    </div>
                  )}
                  <div className="flex justify-between gap-8 pt-1.5 border-t border-slate-100 dark:border-white/10">
                    <span className="font-semibold text-slate-900 dark:text-white">Totale intervento</span>
                    <span className="font-mono font-bold text-amber-400 text-base">{totInt.toFixed(2)} €</span>
                  </div>
                </div>
              </div>
            )}

            {/* Anomalie */}
            {r.anomalie && (
              <div className="rounded-xl p-4 bg-red-500/5 border border-red-500/10">
                <p className="text-xs text-red-400/70 uppercase tracking-wider mb-2">Anomalie / Note</p>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">{r.anomalie}</p>
              </div>
            )}

            {/* Foto */}
            {r.foto?.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Camera className="w-4 h-4 text-slate-400" />
                  <p className="text-xs text-slate-500 uppercase tracking-wider">
                    Foto allegate ({r.foto.length})
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {r.foto.map((f, i) => (
                    <button
                      key={f.id || i}
                      onClick={() => setFotoZoom(f.data)}
                      className="aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 hover:border-amber-500/40 transition-all group relative">
                      <img src={f.data} alt={f.name || "foto"} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center">
                        <ZoomIn className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Firma */}
            {r.firma && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <PenLine className="w-4 h-4 text-slate-400" />
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Firma cliente</p>
                </div>
                <div className="rounded-xl border border-slate-100 dark:border-white/10 overflow-hidden bg-slate-50 dark:bg-white/3 p-3">
                  <img src={r.firma} alt="firma cliente" className="h-20 object-contain" />
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Zoom foto */}
      {fotoZoom && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/92"
          onClick={() => setFotoZoom(null)}>
          <img src={fotoZoom} alt="zoom" className="max-w-full max-h-full rounded-xl object-contain shadow-2xl" />
          <button
            onClick={() => setFotoZoom(null)}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
    </>
  );
}

// ─── MODAL CONFERMA ELIMINA COMMESSA ─────────────────────────────────────────

function DeleteCommessaModal({ nomeCommessa, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white dark:bg-[#0f2040] border border-red-500/20 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <p className="font-semibold text-slate-900 dark:text-white text-sm">Elimina commessa</p>
            <p className="text-xs text-slate-400">Operazione irreversibile</p>
          </div>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">
          Sei sicuro di voler eliminare <span className="text-slate-900 dark:text-white font-medium">{nomeCommessa}</span>?
          I rapportini collegati non verranno eliminati.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 text-sm hover:bg-white/5 transition-colors">
            Annulla
          </button>
          <button onClick={onConfirm}
            className="flex-1 px-4 py-2 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-500/30 transition-colors">
            Elimina
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MODAL CONFERMA ELIMINA RAPPORTINO ───────────────────────────────────────

function DeleteRapportinoModal({ rapportino, onConfirm, onCancel }) {
  const tipoLabel = TIPO_INT_CONFIG[rapportino?.tipoIntervento]?.label || rapportino?.tipoIntervento || "Intervento";
  const dataLabel = formatData(rapportino?.dataInizio ?? rapportino?.data);
  const nMat = rapportino?.materiali?.filter(m => m.magazzinoId)?.length || 0;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white dark:bg-[#0f2040] border border-red-500/20 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <p className="font-semibold text-slate-900 dark:text-white text-sm">Elimina rapportino</p>
            <p className="text-xs text-slate-400">
              {nMat > 0
                ? `${nMat} materiale${nMat > 1 ? "i" : ""} ripristinato${nMat > 1 ? "i" : ""} in magazzino`
                : "Operazione irreversibile"}
            </p>
          </div>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">
          Eliminare <span className="text-slate-900 dark:text-white font-medium">{tipoLabel}</span> del {dataLabel}?
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 text-sm hover:bg-white/5 transition-colors">
            Annulla
          </button>
          <button onClick={onConfirm}
            className="flex-1 px-4 py-2 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-500/30 transition-colors">
            Elimina
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── FORM COMMESSA (modal) ───────────────────────────────────────────────────

function CommessaFormModal({ iniziale, onSave, onCancel }) {
  const [nome, setNome]             = useState(iniziale?.nome || "");
  const [descrizione, setDescrizione] = useState(iniziale?.descrizione || "");
  const [error, setError]           = useState("");

  const submit = () => {
    if (!nome.trim()) { setError("Il nome è obbligatorio"); return; }
    onSave({ nome: nome.trim(), descrizione: descrizione.trim() });
  };

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white dark:bg-[#0c1a35] border border-slate-200 dark:border-white/10 rounded-2xl w-full max-w-md shadow-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Folder className="w-5 h-5 text-amber-400" />
            <h3 className="font-semibold text-slate-900 dark:text-white">
              {iniziale ? "Modifica commessa" : "Nuova commessa"}
            </h3>
          </div>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Nome commessa *</label>
            <input
              autoFocus
              value={nome}
              onChange={e => { setNome(e.target.value); setError(""); }}
              onKeyDown={e => e.key === "Enter" && submit()}
              placeholder="es. Casa al mare, Ristrutturazione bagno..."
              className="w-full px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white outline-none focus:border-amber-500/50 transition-colors"
            />
            {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Descrizione</label>
            <textarea
              rows={2}
              value={descrizione}
              onChange={e => setDescrizione(e.target.value)}
              placeholder="Note o dettagli sulla commessa..."
              className="w-full px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white outline-none focus:border-amber-500/50 transition-colors resize-none"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onCancel}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-400 text-sm hover:bg-white/5 transition-colors">
            Annulla
          </button>
          <button onClick={submit}
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#060d1f] text-sm font-semibold transition-colors">
            {iniziale ? "Salva modifiche" : "Crea commessa"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── SCHEDA CLIENTE ───────────────────────────────────────────────────────────

function SchedaCliente({ cliente, rapportini, tecnici, onEdit, onDelete, onBack, onEliminaRapportino }) {
  const { hasPermission } = useAuth();
  const { commesse: allCommesse, addCommessa: ctxAdd, updateCommessa: ctxUpdate, deleteCommessa: ctxDelete } = useData();
  const canManage = hasPermission('clienti.gestisci');
  const [rapportinoAperto,   setRapportinoAperto]   = useState(null);
  const [formCommessa,       setFormCommessa]       = useState(null);
  const [commessaAperta,     setCommessaAperta]     = useState(null);
  const [pickerCommessaId,   setPickerCommessaId]   = useState(null);
  const [commessaToDelete,   setCommessaToDelete]   = useState(null);
  const [rapportinoToDelete, setRapportinoToDelete] = useState(null);

  const commesse = allCommesse.filter(c => c.clienteId === cliente.id);

  const addCommessa = ({ nome, descrizione }) => {
    const id = `cm${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
    ctxAdd({ id, clienteId: cliente.id, nome, descrizione, createdAt: new Date().toISOString(), rapportiniIds: [] });
    setFormCommessa(null);
    setCommessaAperta(id);
  };

  const editCommessa = (id, patch) => {
    ctxUpdate(id, patch);
    setFormCommessa(null);
  };

  const deleteCommessa = (id) => {
    const target = commesse.find(c => c.id === id);
    if (target) setCommessaToDelete({ id, nome: target.nome });
  };

  const confirmDeleteCommessa = () => {
    if (!commessaToDelete) return;
    ctxDelete(commessaToDelete.id);
    if (commessaAperta === commessaToDelete.id) setCommessaAperta(null);
    setCommessaToDelete(null);
  };

  const confirmDeleteRapportino = () => {
    if (!rapportinoToDelete) return;
    const id = rapportinoToDelete.id;
    commesse.forEach(c => {
      if ((c.rapportiniIds || []).includes(id)) {
        ctxUpdate(c.id, { rapportiniIds: c.rapportiniIds.filter(rid => rid !== id) });
      }
    });
    if (rapportinoAperto?.id === id) setRapportinoAperto(null);
    setRapportinoToDelete(null);
    onEliminaRapportino(rapportinoToDelete);
  };

  const assignRapportino = (commessaId, rapportinoId) => {
    const c = commesse.find(x => x.id === commessaId);
    if (c) ctxUpdate(commessaId, { rapportiniIds: [...(c.rapportiniIds || []), rapportinoId] });
    setPickerCommessaId(null);
  };

  const removeFromCommessa = (commessaId, rapportinoId) => {
    const c = commesse.find(x => x.id === commessaId);
    if (c) ctxUpdate(commessaId, { rapportiniIds: (c.rapportiniIds || []).filter(id => id !== rapportinoId) });
  };

  const rList = useMemo(() =>
    rapportini
      .filter(r => r.clienteId === cliente.id || r.cliente === cliente.nome)
      .sort((a, b) => new Date(b.dataInizio ?? b.data ?? 0) - new Date(a.dataInizio ?? a.data ?? 0)),
    [rapportini, cliente]
  );

  const rapportiniInQualcheCommessa = useMemo(() =>
    new Set(commesse.flatMap(c => c.rapportiniIds || [])),
    [commesse]
  );

  const rapportinoCommessaMap = useMemo(() => {
    const map = {};
    commesse.forEach(c => (c.rapportiniIds || []).forEach(id => { map[id] = c.nome; }));
    return map;
  }, [commesse]);

  const totOre = rList.reduce((s, r) => s + (parseFloat(r.oreManodopera) || 0), 0);
  const totCostoMan = rList.reduce((s, r) =>
    s + (parseFloat(r.oreManodopera) || 0) * (parseFloat(r.costoOrario) || 0), 0);

  const orePerTecnico = useMemo(() => {
    const conOre = rList.filter(r => parseFloat(r.oreManodopera) > 0);
    const mappa = {};
    conOre.forEach(r => {
      const nome = r.tecnico || tecnici?.find(t => t.id === r.tecnicoId)?.nome || "Tecnico n.d.";
      if (!mappa[nome]) mappa[nome] = [];
      mappa[nome].push(r);
    });
    return Object.entries(mappa).sort(([a], [b]) => a.localeCompare(b, "it"));
  }, [rList, tecnici]);

  const InfoRow = ({ icon: Icon, label, value }) => value ? (
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-100 dark:border-white/5 last:border-0">
      <Icon className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm text-slate-800 dark:text-white mt-0.5">{value}</p>
      </div>
    </div>
  ) : null;

  return (
    <div className="space-y-6 animate-[fadeSlideUp_0.3s_ease_both]">

      {/* Topbar scheda */}
      <div className="flex items-center justify-between">
        <button onClick={onBack}
          className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Tutti i clienti
        </button>
        {canManage && (
          <div className="flex items-center gap-2">
            <button onClick={onEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-white/20 transition-all">
              <Edit2 className="w-3.5 h-3.5" /> Modifica
            </button>
            <button onClick={onDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400 hover:bg-red-500/20 transition-all">
              <Trash2 className="w-3.5 h-3.5" /> Elimina
            </button>
          </div>
        )}
      </div>

      {/* Header cliente */}
      <div className="bg-white dark:bg-[#0c1a35] border border-slate-100 dark:border-white/5 rounded-2xl p-6">
        <div className="flex items-start gap-5">
          {/* Avatar */}
          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${avatarColor(cliente.id)}
            flex items-center justify-center text-white font-bold text-xl shrink-0`}>
            {iniziali(cliente.nome)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">{cliente.nome}</h1>
              <TipoBadge tipo={cliente.tipo} />
            </div>
            <p className="text-sm text-slate-400 mt-1">
              {[cliente.indirizzo, cliente.citta, cliente.provincia].filter(Boolean).join(", ")}
            </p>
            <p className="text-xs text-slate-600 mt-1.5">
              Cliente dal {formatData(cliente.createdAt)}
            </p>
          </div>
        </div>

        {/* KPI rapidi */}
        <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-slate-100 dark:border-white/5">
          {[
            { icon: FileText, label: "Interventi", value: rList.length },
            { icon: Clock,    label: "Ore totali", value: totOre > 0 ? `${totOre}h` : "—" },
            { icon: Calendar, label: "Ultimo",      value: rList[0] ? formatData(rList[0].dataInizio ?? rList[0].data) : "—" },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-slate-50 dark:bg-white/3 rounded-xl p-3 text-center">
              <Icon className="w-4 h-4 text-slate-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-slate-900 dark:text-white font-mono">{value}</p>
              <p className="text-xs text-slate-500">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Griglia: Anagrafica + Note */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Contatti */}
        <div className="bg-white dark:bg-[#0c1a35] border border-slate-100 dark:border-white/5 rounded-2xl p-5">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Contatti & Indirizzo</p>
          <InfoRow icon={Phone}  label="Telefono"  value={cliente.telefono} />
          <InfoRow icon={Mail}   label="Email"     value={cliente.email} />
          <InfoRow icon={MapPin} label="Indirizzo" value={[cliente.indirizzo, cliente.citta, cliente.cap, cliente.provincia].filter(Boolean).join(", ")} />
        </div>

        {/* Dati fiscali + note */}
        <div className="bg-white dark:bg-[#0c1a35] border border-slate-100 dark:border-white/5 rounded-2xl p-5">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Dati fiscali & Note</p>
          <InfoRow icon={Hash}       label="Codice Fiscale" value={cliente.codiceFiscale} />
          <InfoRow icon={BadgeCheck} label="Partita IVA"    value={cliente.partitaIva} />
          {cliente.note && (
            <div className="mt-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
              <p className="text-xs text-amber-400/70 mb-1">Note</p>
              <p className="text-sm text-slate-300 leading-relaxed">{cliente.note}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Commesse ── */}
      <div className="bg-white dark:bg-[#0c1a35] border border-slate-100 dark:border-white/5 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-2">
            <Folder className="w-4 h-4 text-amber-400" />
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Commesse</h3>
            {commesse.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-xs font-mono">
                {commesse.length}
              </span>
            )}
          </div>
          <button
            onClick={() => setFormCommessa("nuova")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium hover:bg-amber-500/20 transition-colors">
            <FolderPlus className="w-3.5 h-3.5" />
            Nuova commessa
          </button>
        </div>

        {commesse.length === 0 ? (
          <div className="py-10 text-center">
            <Folder className="w-8 h-8 text-slate-700 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Nessuna commessa</p>
            <p className="text-xs text-slate-600 mt-1">Raggruppa gli interventi per cantiere o progetto</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-white/5">
            {commesse.map(c => {
              const isAperta   = commessaAperta === c.id;
              const rapInCommessa = rList.filter(r => (c.rapportiniIds || []).includes(r.id));
              return (
                <div key={c.id}>
                  {/* Header commessa */}
                  <div
                    onClick={() => setCommessaAperta(isAperta ? null : c.id)}
                    className="flex items-center gap-3 px-5 py-3.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/2 transition-colors group">
                    {isAperta
                      ? <FolderOpen className="w-4 h-4 text-amber-400 shrink-0" />
                      : <Folder className="w-4 h-4 text-slate-400 group-hover:text-amber-400 shrink-0 transition-colors" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{c.nome}</p>
                      {c.descrizione && <p className="text-xs text-slate-500 truncate">{c.descrizione}</p>}
                    </div>
                    <span className="text-xs text-slate-500 font-mono shrink-0 mr-1">
                      {rapInCommessa.length} {rapInCommessa.length === 1 ? "intervento" : "interventi"}
                    </span>
                    <div className="flex items-center gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => setFormCommessa({ tipo: "edit", commessa: c })}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-all">
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => deleteCommessa(c.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <ChevronRight className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${isAperta ? "rotate-90" : ""}`} />
                  </div>

                  {/* Body espanso */}
                  {isAperta && (
                    <div className="bg-slate-50 dark:bg-black/10 border-t border-slate-100 dark:border-white/5">
                      {rapInCommessa.length === 0 ? (
                        <div className="py-6 text-center">
                          <p className="text-xs text-slate-500">Nessun intervento in questa commessa</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-100 dark:divide-white/5">
                          {rapInCommessa.map((r, i) => {
                            const nomeTec = r.tecnico || tecnici?.find(t => t.id === r.tecnicoId)?.nome || null;
                            return (
                              <div key={r.id ?? i} className="flex items-center gap-3 px-5 py-3 group">
                                <div
                                  className="flex-1 min-w-0 cursor-pointer"
                                  onClick={() => setRapportinoAperto(r)}>
                                  <p className="text-sm font-medium text-slate-900 dark:text-white line-clamp-1">
                                    {r.tipoIntervento
                                      ? r.tipoIntervento.charAt(0).toUpperCase() + r.tipoIntervento.slice(1)
                                      : "Intervento"}
                                    {r.indirizzoIntervento && (
                                      <span className="text-slate-500 font-normal"> — {r.indirizzoIntervento}</span>
                                    )}
                                  </p>
                                  <p className="text-xs text-slate-500 mt-0.5">
                                    {formatData(r.dataInizio ?? r.data)}
                                    {nomeTec && ` · ${nomeTec}`}
                                  </p>
                                </div>
                                <StatoBadge stato={r.stato ?? "bozza"} />
                                <button
                                  onClick={() => removeFromCommessa(c.id, r.id)}
                                  title="Rimuovi dalla commessa"
                                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0">
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {/* Aggiungi intervento */}
                      <div className="px-5 py-2.5 border-t border-slate-100 dark:border-white/5">
                        <button
                          onClick={() => setPickerCommessaId(c.id)}
                          disabled={rList.filter(r => !rapportiniInQualcheCommessa.has(r.id)).length === 0}
                          className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium">
                          <Plus className="w-3.5 h-3.5" />
                          Aggiungi intervento
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Form commessa (modal) ── */}
      {formCommessa && (
        <CommessaFormModal
          iniziale={formCommessa === "nuova" ? null : formCommessa.commessa}
          onSave={formCommessa === "nuova"
            ? addCommessa
            : (patch) => editCommessa(formCommessa.commessa.id, patch)}
          onCancel={() => setFormCommessa(null)}
        />
      )}

      {/* ── Picker rapportino per commessa ── */}
      {pickerCommessaId && (() => {
        const disponibili = rList.filter(r => !rapportiniInQualcheCommessa.has(r.id));
        return (
          <div className="fixed inset-0 z-[55] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setPickerCommessaId(null)} />
            <div className="relative bg-white dark:bg-[#0c1a35] border border-slate-200 dark:border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col" style={{ maxHeight: "75vh" }}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/5 shrink-0">
                <div className="flex items-center gap-2">
                  <Folder className="w-4 h-4 text-amber-400" />
                  <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Aggiungi intervento alla commessa</h3>
                </div>
                <button onClick={() => setPickerCommessaId(null)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="overflow-y-auto flex-1">
                {disponibili.length === 0 ? (
                  <div className="py-10 text-center">
                    <p className="text-sm text-slate-500">Tutti gli interventi sono già in una commessa</p>
                  </div>
                ) : (
                  disponibili.map((r, i) => (
                    <button
                      key={r.id ?? i}
                      onClick={() => assignRapportino(pickerCommessaId, r.id)}
                      className="w-full flex items-start gap-3 px-5 py-3.5 text-left border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/3 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {r.tipoIntervento
                            ? r.tipoIntervento.charAt(0).toUpperCase() + r.tipoIntervento.slice(1)
                            : "Intervento"}
                          {r.indirizzoIntervento && (
                            <span className="text-slate-500 font-normal"> — {r.indirizzoIntervento}</span>
                          )}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">{formatData(r.dataInizio ?? r.data)}</p>
                        {r.descrizione && (
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{r.descrizione}</p>
                        )}
                      </div>
                      <StatoBadge stato={r.stato ?? "bozza"} />
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Ore manodopera ── */}
      {orePerTecnico.length > 0 && (
        <div className="bg-white dark:bg-[#0c1a35] border border-slate-100 dark:border-white/5 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/5">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Ore manodopera</h3>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-slate-500">
                <span className="text-slate-900 dark:text-white font-semibold">{totOre}h</span>
                {totCostoMan > 0 && (
                  <> · <span className="text-amber-400 font-semibold">{totCostoMan.toFixed(2)} €</span></>
                )}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-white/3 border-b border-slate-100 dark:border-white/5">
                  <th className="text-left px-4 py-2.5 text-xs text-slate-500 font-medium">Data</th>
                  <th className="text-left px-4 py-2.5 text-xs text-slate-500 font-medium">Lavorazione</th>
                  <th className="text-right px-4 py-2.5 text-xs text-slate-500 font-medium">Ore</th>
                  <th className="text-right px-4 py-2.5 text-xs text-slate-500 font-medium">€/h</th>
                  <th className="text-right px-4 py-2.5 text-xs text-slate-500 font-medium">Totale</th>
                </tr>
              </thead>
              <tbody>
                {orePerTecnico.map(([nomeTecnico, interventi]) => {
                  const oreT   = interventi.reduce((s, r) => s + (parseFloat(r.oreManodopera) || 0), 0);
                  const costoT = interventi.reduce((s, r) =>
                    s + (parseFloat(r.oreManodopera) || 0) * (parseFloat(r.costoOrario) || 0), 0);
                  return (
                    <Fragment key={nomeTecnico}>
                      {/* Intestazione tecnico */}
                      <tr className="bg-slate-50/60 dark:bg-white/[0.02]">
                        <td colSpan={5} className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                              {nomeTecnico}
                            </span>
                          </div>
                        </td>
                      </tr>
                      {/* Righe interventi */}
                      {interventi.map((r, i) => {
                        const ore = parseFloat(r.oreManodopera) || 0;
                        const cph = parseFloat(r.costoOrario)   || 0;
                        const tot = ore * cph;
                        return (
                          <tr key={r.id ?? i}
                            className="border-b border-slate-50 dark:border-white/3 hover:bg-slate-50 dark:hover:bg-white/2 transition-colors">
                            <td className="px-4 py-2.5 text-xs text-slate-500 font-mono whitespace-nowrap">
                              {formatData(r.dataInizio ?? r.data)}
                            </td>
                            <td className="px-4 py-2.5 text-sm text-slate-800 dark:text-white">
                              {TIPO_INT_CONFIG[r.tipoIntervento]?.label || r.tipoIntervento || "—"}
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono text-slate-800 dark:text-white">
                              {ore}h
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono text-slate-500">
                              {cph > 0 ? `${cph.toFixed(2)} €` : "—"}
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono font-semibold text-amber-400">
                              {tot > 0 ? `${tot.toFixed(2)} €` : "—"}
                            </td>
                          </tr>
                        );
                      })}
                      {/* Subtotale per tecnico */}
                      <tr className="border-b border-slate-100 dark:border-white/5 bg-slate-50/80 dark:bg-white/[0.03]">
                        <td colSpan={2} className="px-4 py-2 text-xs text-slate-500 text-right">
                          Subtotale {nomeTecnico}
                        </td>
                        <td className="px-4 py-2 text-right font-mono text-sm font-semibold text-slate-700 dark:text-slate-200">
                          {oreT}h
                        </td>
                        <td className="px-4 py-2" />
                        <td className="px-4 py-2 text-right font-mono text-sm font-semibold text-amber-400">
                          {costoT > 0 ? `${costoT.toFixed(2)} €` : "—"}
                        </td>
                      </tr>
                    </Fragment>
                  );
                })}
                {/* Totale complessivo (solo se più di un tecnico) */}
                {orePerTecnico.length > 1 && (
                  <tr className="bg-slate-50 dark:bg-white/3">
                    <td colSpan={2} className="px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Totale manodopera
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-800 dark:text-white">
                      {totOre}h
                    </td>
                    <td className="px-4 py-3" />
                    <td className="px-4 py-3 text-right font-mono font-bold text-amber-400 text-base">
                      {totCostoMan > 0 ? `${totCostoMan.toFixed(2)} €` : "—"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Storico interventi */}
      <div className="bg-white dark:bg-[#0c1a35] border border-slate-100 dark:border-white/5 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-amber-400" />
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Storico interventi</h3>
            {rList.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-xs font-mono">
                {rList.length}
              </span>
            )}
          </div>
        </div>

        {rList.length === 0 ? (
          <div className="py-12 text-center">
            <FileText className="w-8 h-8 text-slate-700 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Nessun intervento registrato</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-white/5">
            {rList.map((r, i) => {
              const nomeTecnico = r.tecnico || tecnici?.find(t => t.id === r.tecnicoId)?.nome || null;
              const hasFoto = r.foto?.length > 0;
              const totInt = (() => {
                const mat = (r.materiali||[]).reduce((s,m) => s+(parseFloat(m.quantita)||0)*(parseFloat(m.prezzoVendita)||0),0);
                const man = (parseFloat(r.oreManodopera)||0)*(parseFloat(r.costoOrario)||0);
                return mat + man;
              })();
              return (
                <div
                  key={r.id ?? i}
                  onClick={() => setRapportinoAperto(r)}
                  className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-white/3 transition-colors group cursor-pointer">
                  {/* Linea temporale */}
                  <div className="flex flex-col items-center gap-1 mt-1 shrink-0">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    {i < rList.length - 1 && <div className="w-px h-6 bg-slate-200 dark:bg-white/5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="min-w-0">
                        <p className="text-sm text-slate-900 dark:text-white font-medium line-clamp-1">
                          {r.tipoIntervento
                            ? r.tipoIntervento.charAt(0).toUpperCase() + r.tipoIntervento.slice(1)
                            : "Intervento"}
                          {r.indirizzoIntervento && (
                            <span className="text-slate-500 font-normal"> — {r.indirizzoIntervento}</span>
                          )}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {formatData(r.dataInizio ?? r.data)}
                          {nomeTecnico && ` · ${nomeTecnico}`}
                          {r.oreManodopera && ` · ${r.oreManodopera}h`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <StatoBadge stato={r.stato ?? "bozza"} />
                      </div>
                    </div>
                    {r.descrizione && (
                      <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                        {r.descrizione}
                      </p>
                    )}
                    {/* Metadati rapidi */}
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      {rapportinoCommessaMap[r.id] && (
                        <span className="flex items-center gap-1 text-xs text-amber-400/80">
                          <Folder className="w-3 h-3" /> {rapportinoCommessaMap[r.id]}
                        </span>
                      )}
                      {hasFoto && (
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <Camera className="w-3 h-3" /> {r.foto.length} foto
                        </span>
                      )}
                      {r.materiali?.length > 0 && (
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <Package className="w-3 h-3" /> {r.materiali.length} materiali
                        </span>
                      )}
                      {totInt > 0 && (
                        <span className="text-xs font-mono font-semibold text-amber-400">
                          {totInt.toFixed(2)} €
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 mt-1 shrink-0" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => setRapportinoToDelete(r)}
                      title="Elimina rapportino"
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-500/10 transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-400 transition-colors" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal dettaglio rapportino */}
      {rapportinoAperto && (
        <RapportinoDettaglio
          r={rapportinoAperto}
          tecnici={tecnici}
          onClose={() => setRapportinoAperto(null)}
          onDelete={() => { setRapportinoToDelete(rapportinoAperto); setRapportinoAperto(null); }}
        />
      )}

      {/* Modal conferma elimina commessa */}
      {commessaToDelete && (
        <DeleteCommessaModal
          nomeCommessa={commessaToDelete.nome}
          onConfirm={confirmDeleteCommessa}
          onCancel={() => setCommessaToDelete(null)}
        />
      )}

      {/* Modal conferma elimina rapportino */}
      {rapportinoToDelete && (
        <DeleteRapportinoModal
          rapportino={rapportinoToDelete}
          onConfirm={confirmDeleteRapportino}
          onCancel={() => setRapportinoToDelete(null)}
        />
      )}
    </div>
  );
}

// ─── CARD CLIENTE (lista) ─────────────────────────────────────────────────────

function ClienteCard({ cliente, nInterventi, onView, onEdit, onDelete }) {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('clienti.gestisci');
  return (
    <div
      onClick={onView}
      className="bg-white dark:bg-[#0c1a35] border border-slate-100 dark:border-white/5 rounded-2xl p-4 cursor-pointer
        hover:border-amber-500/20 hover:bg-white dark:bg-[#0f2040] transition-all group
        animate-[fadeSlideUp_0.3s_ease_both]">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${avatarColor(cliente.id)}
          flex items-center justify-center text-white font-bold text-sm shrink-0`}>
          {iniziali(cliente.nome)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-100 transition-colors truncate">
                {cliente.nome}
              </p>
              <p className="text-xs text-slate-500 truncate mt-0.5">
                {[cliente.citta, cliente.provincia].filter(Boolean).join(", ") || "—"}
              </p>
            </div>
            <TipoBadge tipo={cliente.tipo} />
          </div>

          <div className="flex items-center gap-3 mt-2.5 flex-wrap">
            {cliente.telefono && (
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <Phone className="w-3 h-3" /> {cliente.telefono}
              </span>
            )}
            {cliente.email && (
              <span className="flex items-center gap-1 text-xs text-slate-500 truncate max-w-[160px]">
                <Mail className="w-3 h-3" /> {cliente.email}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Footer card */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-white/5">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Wrench className="w-3 h-3" />
          <span className="font-mono">
            {nInterventi} {nInterventi === 1 ? "intervento" : "interventi"}
          </span>
        </div>
        {canManage && (
          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
            <button onClick={onEdit}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500
                hover:text-amber-400 hover:bg-amber-500/10 transition-all">
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={onDelete}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500
                hover:text-red-400 hover:bg-red-500/10 transition-all">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PAGINA PRINCIPALE ────────────────────────────────────────────────────────

export default function Clienti() {
  const { hasPermission } = useAuth();
  const { clienti, rapportini, tecnici, addCliente, updateCliente, deleteCliente } = useData();
  const [search,     setSearch]     = useState("");
  const [filterTipo, setFilterTipo] = useState("Tutti");
  const [showFilters,setShowFilters]= useState(false);

  // Vista: "lista" | "scheda" | "form-nuovo" | "form-modifica"
  const [view,           setView]           = useState("lista");
  const [clienteSelezionato, setClienteSelezionato] = useState(null);
  const [clienteDelete,      setClienteDelete]      = useState(null);

  // Filtraggio + ricerca
  const clientiFiltrati = useMemo(() => {
    return clienti
      .filter(c => filterTipo === "Tutti" || c.tipo === filterTipo)
      .filter(c => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          c.nome?.toLowerCase().includes(q) ||
          c.citta?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.telefono?.includes(q) ||
          c.partitaIva?.includes(q) ||
          c.codiceFiscale?.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.nome.localeCompare(b.nome, "it"));
  }, [clienti, search, filterTipo]);

  // Conta interventi per cliente
  const countInterventi = useCallback((clienteId, clienteNome) => {
    return rapportini.filter(r => r.clienteId === clienteId || r.cliente === clienteNome).length;
  }, [rapportini]);

  // CRUD
  const handleSalva = async (form) => {
    if (view === "form-nuovo") {
      await addCliente(form);
      setView("lista");
    } else if (view === "form-modifica") {
      await updateCliente(clienteSelezionato.id, form);
      setClienteSelezionato(prev => ({ ...prev, ...form }));
      setView("scheda");
    }
  };

  const handleElimina = async () => {
    await deleteCliente(clienteDelete.id);
    setClienteDelete(null);
    if (view === "scheda") setView("lista");
  };

  const { deleteRapportino, ripristinaMagazzino } = useData();
  const handleEliminaRapportino = async (rap) => {
    if (rap?.materiali?.length > 0) await ripristinaMagazzino(rap.materiali);
    await deleteRapportino(rap.id);
  };

  // KPI sommario
  const totaleInterventi = rapportini.length;

  // ── RENDER SCHEDA ─────────────────────────────────────────────────────────

  if (view === "scheda" && clienteSelezionato) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#060d1f] p-4 md:p-6 lg:p-8">
        <style>{`@keyframes fadeSlideUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>
        {clienteDelete && (
          <DeleteModal
            cliente={clienteDelete}
            onConfirm={handleElimina}
            onCancel={() => setClienteDelete(null)}
          />
        )}
        <SchedaCliente
          cliente={clienteSelezionato}
          rapportini={rapportini}
          tecnici={tecnici}
          onEdit={() => setView("form-modifica")}
          onDelete={() => setClienteDelete(clienteSelezionato)}
          onBack={() => setView("lista")}
          onEliminaRapportino={handleEliminaRapportino}
        />
        {view === "form-modifica" && (
          <ClienteForm
            iniziale={clienteSelezionato}
            onSave={handleSalva}
            onCancel={() => setView("scheda")}
          />
        )}
      </div>
    );
  }

  // ── RENDER LISTA ──────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#060d1f] p-4 md:p-6 lg:p-8">
      <style>{`@keyframes fadeSlideUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Modal elimina */}
      {clienteDelete && (
        <DeleteModal
          cliente={clienteDelete}
          onConfirm={handleElimina}
          onCancel={() => setClienteDelete(null)}
        />
      )}

      {/* Form nuovo / modifica */}
      {(view === "form-nuovo" || (view === "form-modifica" && clienteSelezionato)) && (
        <ClienteForm
          iniziale={view === "form-modifica" ? clienteSelezionato : null}
          onSave={handleSalva}
          onCancel={() => setView("lista")}
        />
      )}

      {/* ── Header pagina ── */}
      <div className="flex items-start justify-between mb-6 animate-[fadeSlideUp_0.2s_ease_both]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Users className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Clienti</h1>
          </div>
          <p className="text-sm text-slate-500">
            Anagrafica e storico interventi per cliente
          </p>
        </div>
        {hasPermission('clienti.gestisci') && (
          <button
            onClick={() => setView("form-nuovo")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400
              text-[#060d1f] text-sm font-semibold transition-all hover:shadow-lg hover:shadow-amber-500/20">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nuovo cliente</span>
            <span className="sm:hidden">Nuovo</span>
          </button>
        )}
      </div>

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 animate-[fadeSlideUp_0.25s_ease_both]">
        {[
          { label: "Clienti totali",     value: clienti.length,        icon: Users,     accent: "text-amber-400"   },
          { label: "Privati",            value: clienti.filter(c=>c.tipo==="Privato").length,     icon: User,      accent: "text-sky-400"     },
          { label: "Aziende / Cond.",    value: clienti.filter(c=>c.tipo!=="Privato"&&c.tipo!=="Ente pubblico").length, icon: Building2, accent: "text-violet-400" },
          { label: "Interventi totali",  value: totaleInterventi,       icon: Wrench,    accent: "text-emerald-400" },
        ].map(({ label, value, icon: Icon, accent }) => (
          <div key={label} className="bg-white dark:bg-[#0c1a35] border border-slate-100 dark:border-white/5 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <Icon className={`w-3.5 h-3.5 ${accent}`} />
              <p className="text-xs text-slate-500">{label}</p>
            </div>
            <p className={`text-2xl font-bold font-mono ${accent}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* ── Barra ricerca + filtri ── */}
      <div className="flex items-center gap-2 mb-4 animate-[fadeSlideUp_0.3s_ease_both]">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cerca per nome, città, email, P.IVA..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white dark:bg-[#0c1a35] border border-slate-200 dark:border-white/10
              text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 outline-none focus:border-amber-500/40 transition-colors"
          />
          {search && (
            <button onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Toggle filtri */}
        <button
          onClick={() => setShowFilters(f => !f)}
          className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm transition-all
            ${showFilters
              ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
              : "bg-white dark:bg-[#0c1a35] border-slate-200 dark:border-white/10 text-slate-400 hover:border-white/20"}`}>
          <SlidersHorizontal className="w-4 h-4" />
          <span className="hidden sm:inline">Filtri</span>
          {filterTipo !== "Tutti" && (
            <span className="w-2 h-2 rounded-full bg-amber-400 sm:hidden" />
          )}
        </button>
      </div>

      {/* Filtro tipo */}
      {showFilters && (
        <div className="flex gap-2 flex-wrap mb-4 animate-[fadeSlideUp_0.15s_ease_both]">
          {["Tutti", ...TIPI].map(t => (
            <button key={t}
              onClick={() => setFilterTipo(t)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-all
                ${filterTipo === t
                  ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                  : "bg-slate-50 dark:bg-white/3 border-slate-200 dark:border-white/10 text-slate-400 hover:border-white/20"}`}>
              {filterTipo === t && <CheckCircle2 className="w-3.5 h-3.5" />}
              {t}
            </button>
          ))}
        </div>
      )}

      {/* ── Lista clienti ── */}
      {clientiFiltrati.length === 0 ? (
        <div className="text-center py-20 animate-[fadeSlideUp_0.3s_ease_both]">
          <Users className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">
            {search || filterTipo !== "Tutti" ? "Nessun cliente trovato" : "Nessun cliente ancora"}
          </p>
          <p className="text-sm text-slate-600 mt-1">
            {search || filterTipo !== "Tutti"
              ? "Prova a modificare la ricerca o i filtri"
              : "Crea il primo cliente per iniziare"}
          </p>
          {!search && filterTipo === "Tutti" && (
            <button
              onClick={() => setView("form-nuovo")}
              className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500
                hover:bg-amber-400 text-[#060d1f] text-sm font-semibold transition-colors">
              <Plus className="w-4 h-4" /> Aggiungi cliente
            </button>
          )}
        </div>
      ) : (
        <>
          <p className="text-xs text-slate-500 mb-3">
            {clientiFiltrati.length} {clientiFiltrati.length === 1 ? "cliente" : "clienti"}
            {(search || filterTipo !== "Tutti") && " trovati"}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {clientiFiltrati.map((c, i) => (
              <div key={c.id} style={{ animationDelay: `${i * 40}ms` }}>
                <ClienteCard
                  cliente={c}
                  nInterventi={countInterventi(c.id, c.nome)}
                  onView={() => { setClienteSelezionato(c); setView("scheda"); }}
                  onEdit={(e) => { e?.stopPropagation?.(); setClienteSelezionato(c); setView("form-modifica"); }}
                  onDelete={(e) => { e?.stopPropagation?.(); setClienteDelete(c); }}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
