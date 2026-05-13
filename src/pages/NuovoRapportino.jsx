import { useState, useRef, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useData } from "../context/DataContext";
import {
  User, MapPin, Calendar, Clock, Wrench, FileText,
  Package, AlertTriangle, Camera, PenLine, Save, Phone, Mail, Hash,
  ChevronDown, Plus, Trash2, Check, X, ChevronLeft,
  Droplets, Flame, Wind, Zap, HardHat, RotateCcw,
  Upload, ArrowLeft
} from "lucide-react";

// ─── helpers localStorage ────────────────────────────────────────────────────
const STORAGE_KEY = "rapportini";

function saveRapportino(data) {
  const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  const idx = existing.findIndex((r) => r.id === data.id);
  if (idx >= 0) existing[idx] = data;
  else existing.push(data);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
}

function getRapportino(id) {
  const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  return all.find((r) => r.id === id) || null;
}

function getClienti() {
  return JSON.parse(localStorage.getItem("hydrodesk_clienti") || "[]");
}

function getTecnici() {
  return JSON.parse(localStorage.getItem("tecnici") || "[]");
}

function getMagazzino() {
  return JSON.parse(localStorage.getItem("hydrodesk_magazzino") || "[]");
}

function getCommesse() {
  return JSON.parse(localStorage.getItem("hydrodesk_commesse") || "[]");
}

function findCommessaByRapportino(rapportinoId) {
  return getCommesse().find(c => (c.rapportiniIds || []).includes(rapportinoId));
}

function assignToCommessa(commessaId, rapportinoId, prevCommessaId) {
  const commesse = getCommesse();
  const updated = commesse.map(c => {
    const ids = c.rapportiniIds || [];
    if (c.id === prevCommessaId && prevCommessaId !== commessaId) {
      return { ...c, rapportiniIds: ids.filter(id => id !== rapportinoId) };
    }
    if (c.id === commessaId && !ids.includes(rapportinoId)) {
      return { ...c, rapportiniIds: [...ids, rapportinoId] };
    }
    return c;
  });
  localStorage.setItem("hydrodesk_commesse", JSON.stringify(updated));
}

function calcVendita(acquisto, ricarico) {
  const a = parseFloat(acquisto);
  const r = parseFloat(ricarico);
  if (isNaN(a) || a <= 0) return '';
  return (a * (1 + (isNaN(r) ? 0 : r) / 100)).toFixed(2);
}

function scalaMagazzino(materiali) {
  const mag = getMagazzino();
  const updated = mag.map(p => {
    const usato = materiali
      .filter(m => m.magazzinoId === p.id)
      .reduce((sum, m) => sum + (parseFloat(m.quantita) || 0), 0);
    if (usato <= 0) return p;
    return { ...p, quantita: Math.max(0, (p.quantita || 0) - usato) };
  });
  localStorage.setItem('hydrodesk_magazzino', JSON.stringify(updated));
}

function uuid() {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}

// ─── costanti ────────────────────────────────────────────────────────────────
const TIPI_INTERVENTO = [
  { value: "riparazione",    label: "Riparazione",    icon: Wrench,    color: "#f59e0b" },
  { value: "manutenzione",   label: "Manutenzione",   icon: RotateCcw, color: "#3b82f6" },
  { value: "installazione",  label: "Installazione",  icon: HardHat,   color: "#10b981" },
  { value: "collaudo",       label: "Collaudo",       icon: Check,     color: "#8b5cf6" },
  { value: "emergenza",      label: "Emergenza",      icon: Zap,       color: "#ef4444" },
];

const STATI = [
  { value: "bozza",      label: "Da svolgere",    color: "#6b7280" },
  { value: "completato", label: "In svolgimento", color: "#10b981" },
  { value: "inviato",    label: "Lavoro svolto",  color: "#3b82f6" },
  { value: "fatturato",  label: "Fatturato",      color: "#f59e0b" },
];

const UNITA = ["pz", "m", "m²", "kg", "lt", "conf", "rotolo", "set"];

const MOCK_CLIENTI = [
  { id: "c1", nome: "Condominio Rossi",   indirizzo: "Via Roma 12, Bergamo" },
  { id: "c2", nome: "Mario Bianchi",      indirizzo: "Via Manzoni 5, Dalmine" },
  { id: "c3", nome: "Hotel Bellavista",   indirizzo: "Viale Europa 34, Orio" },
  { id: "c4", nome: "Scuola Elementare",  indirizzo: "Via Verdi 1, Sorisole" },
];

const MOCK_TECNICI = [
  { id: "t1", nome: "Marco Ferrari" },
  { id: "t2", nome: "Luca Rossi" },
  { id: "t3", nome: "Davide Conti" },
];

// ─── componenti interni ───────────────────────────────────────────────────────

function SectionTitle({ icon: Icon, label, step }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold"
           style={{ background: "#f59e0b22", color: "#f59e0b", border: "1.5px solid #f59e0b55" }}>
        {step}
      </div>
      <Icon size={16} style={{ color: "#f59e0b" }} />
      <span className="text-sm font-semibold tracking-wider uppercase"
            style={{ color: "var(--text-2)", letterSpacing: "0.1em" }}>
        {label}
      </span>
    </div>
  );
}

function Field({ label, required, children, hint }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium" style={{ color: "var(--text-3)" }}>
        {label} {required && <span style={{ color: "#f59e0b" }}>*</span>}
      </label>
      {children}
      {hint && <p className="text-xs" style={{ color: "var(--text-4)" }}>{hint}</p>}
    </div>
  );
}

const inputCls =
  "w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-all duration-150 " +
  "border focus:ring-2";

const inputStyle = {
  background: "var(--bg-input)",
  border: "1px solid var(--border)",
  color: "var(--input-color)",
};

function Input({ value, onChange, placeholder, type = "text", ...props }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={inputCls}
      style={inputStyle}
      {...props}
    />
  );
}

function Textarea({ value, onChange, placeholder, rows = 4 }) {
  return (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      className={inputCls + " resize-none"}
      style={inputStyle}
    />
  );
}

function Select({ value, onChange, children }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={onChange}
        className={inputCls + " appearance-none cursor-pointer pr-9"}
        style={inputStyle}
      >
        {children}
      </select>
      <ChevronDown
        size={14}
        className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
        style={{ color: "var(--text-4)" }}
      />
    </div>
  );
}

function ClienteInfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2">
      <Icon size={13} className="shrink-0 mt-0.5" style={{ color: "var(--text-4)" }} />
      <div>
        <p className="text-xs" style={{ color: "var(--text-4)" }}>{label}</p>
        <p className="text-sm" style={{ color: "var(--text-2)" }}>{value}</p>
      </div>
    </div>
  );
}

// ─── picker magazzino ─────────────────────────────────────────────────────────
function MagazzinoPicker({ onSelect, onClose }) {
  const [search, setSearch] = useState("");
  const { magazzino: prodotti } = useData();

  const filtrati = prodotti.filter((p) =>
    p.nome.toLowerCase().includes(search.toLowerCase()) ||
    (p.categoria || "").toLowerCase().includes(search.toLowerCase()) ||
    (p.codice || "").toLowerCase().includes(search.toLowerCase())
  );

  const categorie = [...new Set(prodotti.map((p) => p.categoria).filter(Boolean))].sort();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col"
           style={{ background: "var(--bg-card)", border: "1px solid var(--border)", maxHeight: "80vh" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4"
             style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2">
            <Package size={16} style={{ color: "#f59e0b" }} />
            <span className="font-semibold text-sm" style={{ color: "var(--text-1)" }}>
              Scegli dal magazzino
            </span>
          </div>
          <button onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors"
            style={{ color: "var(--text-4)" }}>
            <X size={15} />
          </button>
        </div>

        {/* Ricerca */}
        <div className="px-5 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
          <input
            autoFocus
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca per nome, categoria o codice…"
            className={inputCls}
            style={inputStyle}
          />
        </div>

        {/* Lista prodotti */}
        <div className="overflow-y-auto flex-1">
          {filtrati.length === 0 ? (
            <div className="py-12 text-center">
              <Package size={24} className="mx-auto mb-2 opacity-30" style={{ color: "var(--text-4)" }} />
              <p className="text-sm" style={{ color: "var(--text-4)" }}>Nessun prodotto trovato</p>
            </div>
          ) : (
            categorie
              .filter((cat) => filtrati.some((p) => p.categoria === cat))
              .map((cat) => (
                <div key={cat}>
                  <p className="px-5 py-2 text-xs font-semibold uppercase tracking-wider"
                     style={{ background: "var(--bg-elevated)", color: "var(--text-4)" }}>
                    {cat}
                  </p>
                  {filtrati
                    .filter((p) => p.categoria === cat)
                    .map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => onSelect(p)}
                        className="w-full flex items-center justify-between px-5 py-3 text-left transition-colors"
                        style={{ borderBottom: "1px solid var(--border)" }}
                        onMouseOver={(e) => e.currentTarget.style.background = "var(--bg-elevated)"}
                        onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
                      >
                        <div>
                          <p className="text-sm font-medium" style={{ color: "var(--text-1)" }}>{p.nome}</p>
                          {p.codice && (
                            <p className="text-xs mt-0.5" style={{ color: "var(--text-4)", fontFamily: "Space Mono, monospace" }}>
                              {p.codice}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          <p className="text-sm font-mono" style={{
                            color: p.quantita <= 0 ? "#ef4444" : p.quantita <= 3 ? "#f59e0b" : "#10b981"
                          }}>
                            {p.quantita} {p.unita}
                          </p>
                          <p className="text-xs" style={{ color: "var(--text-4)" }}>disponibili</p>
                        </div>
                      </button>
                    ))}
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── firma canvas ─────────────────────────────────────────────────────────────
function FirmaCanvas({ onSave, firmaData }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const [hasFirma, setHasFirma] = useState(!!firmaData);

  const getPos = (e, canvas) => {
    const r = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: src.clientX - r.left, y: src.clientY - r.top };
  };

  const start = (e) => {
    e.preventDefault();
    drawing.current = true;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const { x, y } = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    e.preventDefault();
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--text-1").trim() || "#e2e8f0";
    const { x, y } = getPos(e, canvas);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stop = () => { drawing.current = false; };

  const clear = () => {
    const canvas = canvasRef.current;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    setHasFirma(false);
    onSave(null);
  };

  const save = () => {
    const data = canvasRef.current.toDataURL("image/png");
    setHasFirma(true);
    onSave(data);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="relative rounded-lg overflow-hidden"
           style={{ border: "1.5px dashed var(--border)", background: "var(--bg-elevated)" }}>
        {firmaData && hasFirma ? (
          <img src={firmaData} alt="firma" className="w-full h-28 object-contain" />
        ) : (
          <canvas
            ref={canvasRef}
            width={600}
            height={112}
            className="w-full h-28 cursor-crosshair touch-none"
            onMouseDown={start}
            onMouseMove={draw}
            onMouseUp={stop}
            onMouseLeave={stop}
            onTouchStart={start}
            onTouchMove={draw}
            onTouchEnd={stop}
          />
        )}
        <p className="absolute bottom-1.5 right-3 text-xs pointer-events-none"
           style={{ color: "var(--border)" }}>
          {hasFirma ? "Firmato" : "Firma qui"}
        </p>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={save}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          style={{ background: "var(--bg-elevated)", color: "var(--text-2)", border: "1px solid var(--border)" }}>
          <Check size={12} /> Conferma firma
        </button>
        <button type="button" onClick={clear}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          style={{ background: "var(--bg-elevated)", color: "var(--text-2)", border: "1px solid var(--border)" }}>
          <RotateCcw size={12} /> Cancella
        </button>
      </div>
    </div>
  );
}

// ─── stato iniziale rapportino ────────────────────────────────────────────────
function emptyRapportino() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toTimeString().slice(0, 5);
  return {
    id: uuid(),
    clienteId: "",
    indirizzoIntervento: "",
    // nuovi campi di contatto e indirizzo
    citta: "",
    numeroCivico: "",
    telefono: "",
    email: "",
    partitaIva: "",
    data: dateStr,
    mattinaInizio: "",
    mattinaFine: "",
    pomeriggioInizio: "",
    pomeriggioFine: "",
    oraInizio: timeStr,
    oraFine: "",
    tecnicoId: "",
    tipoIntervento: "riparazione",
    descrizione: "",
    materiali: [],
    oreManodopera: "",
    anomalie: "",
    foto: [],
    firma: null,
    stato: "bozza",
    commessaId: "",
    costoOrario: "",
    isManutenzione: false,
    prossimaManutenzione: "",
    magazzinoScalato: false,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

// ─── componente principale ────────────────────────────────────────────────────
export default function NuovoRapportino() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const dataFromUrl = searchParams.get("data")?.slice(0, 10) || "";
  const { clienti, tecnici: tecniciDB, magazzino, commesse, upsertRapportino, updateCommessa, scalaMagazzino, ripristinaMagazzino } = useData();

  const rapportiniLS = () => { try { return JSON.parse(localStorage.getItem('rapportini') || '[]'); } catch { return []; } };
  const existing = id ? (rapportiniLS().find(r => r.id === id) || null) : null;

  const [form, setForm] = useState(() => {
    const base = existing || emptyRapportino();
    if (!existing && dataFromUrl) return { ...base, data: dataFromUrl };
    if (existing && !base.commessaId) {
      const commessa = commesse.find(c => (c.rapportiniIds || []).includes(existing.id));
      return { ...base, commessaId: commessa?.id || "" };
    }
    return base;
  });
  const [saved, setSaved] = useState(false);
  const [gcalPopup, setGcalPopup] = useState(null);
  const [errors, setErrors] = useState({});
  const [showPicker, setShowPicker] = useState(false);

  const tecnici = [...MOCK_TECNICI, ...tecniciDB];

  // helper set field
  const set = (field, value) => {
    setForm((f) => {
      const next = { ...f, [field]: value, updatedAt: new Date().toISOString() };
      // Sincronizza oraInizio/oraFine dai campi mattina/pomeriggio
      if (['mattinaInizio','mattinaFine','pomeriggioInizio','pomeriggioFine'].includes(field)) {
        const mi = field === 'mattinaInizio'    ? value : next.mattinaInizio;
        const mf = field === 'mattinaFine'      ? value : next.mattinaFine;
        const pi = field === 'pomeriggioInizio' ? value : next.pomeriggioInizio;
        const pf = field === 'pomeriggioFine'   ? value : next.pomeriggioFine;
        next.oraInizio = mi || pi || '';
        next.oraFine   = pf || mf || '';
      }
      return next;
    });
    if (errors[field]) setErrors((e) => { const c = { ...e }; delete c[field]; return c; });
  };

  // materiali
  const addMateriale = () =>
    set("materiali", [...form.materiali, { id: uuid(), nome: "", quantita: "", unita: "pz" }]);

  const addDaMagazzino = (prodotto) => {
    const prezzoVendita = prodotto.prezzoVendita || calcVendita(prodotto.prezzoAcquisto, prodotto.ricarico) || '';
    set("materiali", [
      ...form.materiali,
      {
        id: uuid(),
        nome: prodotto.nome,
        quantita: "1",
        unita: prodotto.unita || "pz",
        magazzinoId: prodotto.id,
        prezzoAcquisto: prodotto.prezzoAcquisto || '',
        ricarico: prodotto.ricarico || '',
        prezzoVendita,
      },
    ]);
    setShowPicker(false);
  };

  const updateMateriale = (idx, field, val) => {
    const m = [...form.materiali];
    const item = { ...m[idx], [field]: val };
    if (field === 'ricarico') {
      const v = calcVendita(item.prezzoAcquisto, val);
      if (v) item.prezzoVendita = v;
    }
    m[idx] = item;
    set("materiali", m);
  };

  const removeMateriale = (idx) =>
    set("materiali", form.materiali.filter((_, i) => i !== idx));

  // foto upload (base64)
  const handleFoto = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach((f) => {
      const reader = new FileReader();
      reader.onload = (ev) =>
        set("foto", [...form.foto, { id: uuid(), name: f.name, data: ev.target.result }]);
      reader.readAsDataURL(f);
    });
  };

  // validazione
  function validate() {
    const e = {};
    if (!form.clienteId) e.clienteId = "Seleziona un cliente";
    if (!form.data) e.data = "Data obbligatoria";
    if (!form.mattinaInizio && !form.pomeriggioInizio) e.mattinaInizio = "Inserire almeno un orario";
    if (!form.tecnicoId) e.tecnicoId = "Seleziona un tecnico";
    if (!form.descrizione.trim()) e.descrizione = "Descrizione obbligatoria";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  const handleSave = async (stato) => {
    if (!validate()) return;
    const record = { ...form, stato, updatedAt: new Date().toISOString() };
    if (!form.magazzinoScalato && stato !== 'bozza') {
      await scalaMagazzino(form.materiali);
      record.magazzinoScalato = true;
      setForm(f => ({ ...f, magazzinoScalato: true }));
    }
    saveRapportino(record);
    // Gestisci assegnazione commessa
    const prevCommessa = commesse.find(c => (c.rapportiniIds || []).includes(form.id));
    const prevCommessaId = prevCommessa?.id || "";
    if (form.commessaId !== prevCommessaId) {
      if (prevCommessaId && prevCommessa)
        await updateCommessa(prevCommessaId, { rapportiniIds: (prevCommessa.rapportiniIds || []).filter(i => i !== form.id) });
      if (form.commessaId) {
        const nuova = commesse.find(c => c.id === form.commessaId);
        if (nuova) await updateCommessa(form.commessaId, { rapportiniIds: [...(nuova.rapportiniIds || []), form.id] });
      }
    }
    await upsertRapportino(record);
    setSaved(true);
    setGcalPopup(record);
  };

  // ─── Google Calendar URL builder ─────────────────────────────────────────
  function buildGcalUrl(r) {
    const cliente = clienti.find((c) => c.id === r.clienteId);
    const tipo = r.tipoIntervento || "Intervento";
    const title = encodeURIComponent(`[HydroDesk] ${tipo} — ${cliente?.nome || "Cliente"}`);
    const dateStr = (r.data || "").replace(/-/g, "");
    const start = r.oraInizio ? `${dateStr}T${r.oraInizio.replace(":", "")}00` : dateStr;
    const end = r.oraFine ? `${dateStr}T${r.oraFine.replace(":", "")}00` : start;
    const location = encodeURIComponent(r.indirizzoIntervento || cliente?.indirizzo || "");
    const details = encodeURIComponent(
      [`Tipo: ${tipo}`, r.tecnicoId ? `Tecnico: ${tecnici.find((t) => t.id === r.tecnicoId)?.nome || ""}` : "", r.descrizione || ""]
        .filter(Boolean).join("\n")
    );
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&location=${location}&details=${details}`;
  }

  const clienteSelezionato = clienti.find((c) => c.id === form.clienteId);
  const commesseCliente = form.clienteId
    ? commesse.filter(c => c.clienteId === form.clienteId)
    : [];
  const totMateriali = form.materiali.reduce((s, m) => s + (parseFloat(m.quantita) || 0) * (parseFloat(m.prezzoVendita) || 0), 0);
  const totManodopera = (parseFloat(form.oreManodopera) || 0) * (parseFloat(form.costoOrario) || 0);
  const totIntervento = totMateriali + totManodopera;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-page)" }}>

      {/* ── topbar contestuale ── */}
      <div className="sticky top-0 z-20 flex items-center justify-between px-6 py-4"
           style={{ background: "var(--sticky-bg)", borderBottom: "1px solid var(--border)", backdropFilter: "blur(12px)" }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm transition-colors hover:opacity-80"
            style={{ color: "var(--text-3)" }}>
            <ArrowLeft size={15} />
            Indietro
          </button>
          <span style={{ color: "var(--border)" }}>/</span>
          <span className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>
            {existing ? `Rapportino #${form.id.slice(-6).toUpperCase()}` : "Nuovo Rapportino"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* stato badge */}
          <Select value={form.stato} onChange={(e) => set("stato", e.target.value)}>
            {STATI.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </Select>

          <button
            type="button"
            onClick={() => handleSave("bozza")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{ background: "var(--bg-elevated)", color: "var(--text-2)", border: "1px solid var(--border)" }}>
            <Save size={14} />
            Salva (da svolgere)
          </button>

          <button
            type="button"
            onClick={() => handleSave("completato")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{ background: saved ? "#10b981" : "#f59e0b", color: "#060d1f" }}>
            {saved ? <Check size={14} /> : <Check size={14} />}
            {saved ? "Salvato!" : "Completa"}
          </button>
        </div>
      </div>

      {/* ── body ── */}
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {/* intestazione */}
        <div className="flex items-start gap-4 mb-2">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl"
               style={{ background: "#f59e0b22", border: "1.5px solid #f59e0b44" }}>
            <Droplets size={22} style={{ color: "#f59e0b" }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--text-1)", fontFamily: "'DM Sans', sans-serif" }}>
              {existing ? "Modifica Rapportino" : "Nuovo Rapportino"}
            </h1>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-4)" }}>
              ID: <span style={{ fontFamily: "Space Mono, monospace", color: "#f59e0b" }}>
                #{form.id.slice(-8).toUpperCase()}
              </span>
            </p>
          </div>
        </div>

        {/* ── SEZIONE 1: Cliente ── */}
        <Card>
          <SectionTitle icon={User} label="Cliente" step="1" />

          {/* Selettore centrato */}
          <div className="flex justify-center mb-5">
            <div style={{ width: "100%", maxWidth: 380 }}>
              <Field label="Seleziona cliente" required>
                <Select value={form.clienteId} onChange={(e) => {
                  const c = clienti.find((cl) => cl.id === e.target.value);
                  set("clienteId", e.target.value);
                  set("commessaId", "");
                  if (c) set("indirizzoIntervento",
                    [c.indirizzo, c.citta].filter(Boolean).join(", "));
                }}>
                  <option value="">— Seleziona cliente —</option>
                  {clienti.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </Select>
                {errors.clienteId && <ErrMsg msg={errors.clienteId} />}
              </Field>
            </div>
          </div>

          {/* Scheda dati cliente (sola lettura) */}
          {clienteSelezionato && (
            <div className="rounded-xl p-4 mb-5"
                 style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
              {/* Header avatar + nome */}
              <div className="flex items-center gap-3 mb-4 pb-3"
                   style={{ borderBottom: "1px solid var(--border)" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0"
                     style={{ background: "linear-gradient(135deg,#f59e0b,#f97316)", color: "#060d1f" }}>
                  {clienteSelezionato.nome?.trim().split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-sm" style={{ color: "var(--text-1)" }}>
                    {clienteSelezionato.nome}
                  </p>
                  {clienteSelezionato.tipo && (
                    <span className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: "#f59e0b22", color: "#f59e0b" }}>
                      {clienteSelezionato.tipo}
                    </span>
                  )}
                </div>
              </div>

              {/* Dettagli in griglia */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(clienteSelezionato.indirizzo || clienteSelezionato.citta) && (
                  <ClienteInfoRow icon={MapPin} label="Indirizzo"
                    value={[clienteSelezionato.indirizzo, clienteSelezionato.citta,
                            clienteSelezionato.cap, clienteSelezionato.provincia]
                           .filter(Boolean).join(", ")} />
                )}
                {clienteSelezionato.telefono && (
                  <ClienteInfoRow icon={Phone} label="Telefono" value={clienteSelezionato.telefono} />
                )}
                {clienteSelezionato.email && (
                  <ClienteInfoRow icon={Mail} label="Email" value={clienteSelezionato.email} />
                )}
                {clienteSelezionato.partitaIva && (
                  <ClienteInfoRow icon={Hash} label="Partita IVA" value={clienteSelezionato.partitaIva} />
                )}
                {clienteSelezionato.codiceFiscale && (
                  <ClienteInfoRow icon={Hash} label="Codice Fiscale" value={clienteSelezionato.codiceFiscale} />
                )}
                {clienteSelezionato.note && (
                  <div className="md:col-span-2 rounded-lg p-2.5"
                       style={{ background: "#f59e0b0d", border: "1px solid #f59e0b22" }}>
                    <p className="text-xs mb-1" style={{ color: "#f59e0b88" }}>Note</p>
                    <p className="text-xs" style={{ color: "var(--text-3)" }}>{clienteSelezionato.note}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Commessa (opzionale, solo se il cliente ha commesse) */}
          {commesseCliente.length > 0 && (
            <div className="mb-5">
              <Field label="Commessa (opzionale)">
                <Select value={form.commessaId} onChange={(e) => set("commessaId", e.target.value)}>
                  <option value="">— Nessuna commessa —</option>
                  {commesseCliente.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </Select>
              </Field>
              {form.commessaId && (
                <p className="text-xs mt-1.5 flex items-center gap-1" style={{ color: "#f59e0b" }}>
                  <span>📁</span>
                  {commesseCliente.find(c => c.id === form.commessaId)?.descrizione || ""}
                </p>
              )}
            </div>
          )}

          {/* Indirizzo intervento (modificabile se diverso da quello del cliente) */}
          <Field label="Indirizzo intervento">
            <div className="relative">
              <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                      style={{ color: "var(--text-4)" }} />
              <input
                type="text"
                value={form.indirizzoIntervento}
                onChange={(e) => set("indirizzoIntervento", e.target.value)}
                placeholder={clienteSelezionato
                  ? [clienteSelezionato.indirizzo, clienteSelezionato.citta].filter(Boolean).join(", ") || "Via, città…"
                  : "Via, città…"}
                className={inputCls + " pl-9"}
                style={inputStyle}
              />
            </div>
          </Field>
        </Card>

        {/* ── SEZIONE 2: Data & Tecnico ── */}
        <Card>
          <SectionTitle icon={Calendar} label="Pianificazione" step="2" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Field label="Data" required>
              <Input type="date" value={form.data} onChange={(e) => set("data", e.target.value)} />
              {errors.data && <ErrMsg msg={errors.data} />}
            </Field>
          </div>

          {/* Orari mattina / pomeriggio */}
          <div className="mt-5 space-y-3">
            {/* Riga mattina */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-semibold uppercase tracking-widest w-24 shrink-0"
                    style={{ color: "var(--text-3)" }}>Mattina</span>
              <Field label="Inizio">
                <Input type="time" value={form.mattinaInizio}
                  onChange={(e) => set("mattinaInizio", e.target.value)} />
              </Field>
              <span style={{ color: "var(--text-4)" }}>→</span>
              <Field label="Fine">
                <Input type="time" value={form.mattinaFine}
                  onChange={(e) => set("mattinaFine", e.target.value)} />
              </Field>
            </div>
            {/* Riga pomeriggio */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-semibold uppercase tracking-widest w-24 shrink-0"
                    style={{ color: "var(--text-3)" }}>Pomeriggio</span>
              <Field label="Inizio">
                <Input type="time" value={form.pomeriggioInizio}
                  onChange={(e) => set("pomeriggioInizio", e.target.value)} />
              </Field>
              <span style={{ color: "var(--text-4)" }}>→</span>
              <Field label="Fine">
                <Input type="time" value={form.pomeriggioFine}
                  onChange={(e) => set("pomeriggioFine", e.target.value)} />
              </Field>
            </div>
            {errors.mattinaInizio && <ErrMsg msg={errors.mattinaInizio} />}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-5">
            <Field label="Tecnico assegnato" required>
              <Select value={form.tecnicoId} onChange={(e) => set("tecnicoId", e.target.value)}>
                <option value="">— Seleziona tecnico —</option>
                {tecnici.map((t) => (
                  <option key={t.id} value={t.id}>{t.nome}</option>
                ))}
              </Select>
              {errors.tecnicoId && <ErrMsg msg={errors.tecnicoId} />}
            </Field>
            <Field label="Ore manodopera">
              <div className="relative">
                <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                       style={{ color: "var(--text-4)" }} />
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={form.oreManodopera}
                  onChange={(e) => set("oreManodopera", e.target.value)}
                  placeholder="es. 2.5"
                  className={inputCls + " pl-9"}
                  style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--input-color)", fontFamily: "Space Mono, monospace" }}
                />
              </div>
            </Field>
            <Field
              label="€ / ora manodopera"
              hint={form.oreManodopera && form.costoOrario ? `Totale: ${totManodopera.toFixed(2)} €` : undefined}
            >
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.costoOrario}
                onChange={(e) => set("costoOrario", e.target.value)}
                placeholder="es. 45.00"
                className={inputCls}
                style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--input-color)", fontFamily: "Space Mono, monospace" }}
              />
            </Field>
          </div>
        </Card>

        {/* ── SEZIONE 3: Tipo intervento ── */}
        <Card>
          <SectionTitle icon={Wrench} label="Tipo Intervento" step="3" />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {TIPI_INTERVENTO.map(({ value, label, icon: Icon, color }) => {
              const active = form.tipoIntervento === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => set("tipoIntervento", value)}
                  className="flex flex-col items-center gap-2 py-4 px-2 rounded-xl transition-all duration-200 text-center"
                  style={{
                    background: active ? `${color}22` : "var(--bg-elevated)",
                    border: active ? `2px solid ${color}88` : "2px solid var(--border)",
                    color: active ? color : "var(--text-4)",
                  }}
                >
                  <Icon size={20} />
                  <span className="text-xs font-semibold">{label}</span>
                </button>
              );
            })}
          </div>
        </Card>

        {/* ── SEZIONE 3.5: Manutenzione periodica ── */}
        <Card>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                   style={{ background: form.isManutenzione ? "#f59e0b22" : "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                <RotateCcw size={15} style={{ color: form.isManutenzione ? "#f59e0b" : "var(--text-4)" }} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>Manutenzione periodica</p>
                <p className="text-xs" style={{ color: "var(--text-4)" }}>Attiva se l'intervento richiede un controllo futuro</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => { set("isManutenzione", !form.isManutenzione); if (form.isManutenzione) set("prossimaManutenzione", ""); }}
              className="relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0"
              style={{ background: form.isManutenzione ? "#f59e0b" : "var(--bg-elevated)", border: "1px solid var(--border)" }}>
              <span
                className="absolute top-0.5 w-5 h-5 rounded-full transition-transform duration-200"
                style={{
                  background: form.isManutenzione ? "#060d1f" : "var(--text-4)",
                  transform: form.isManutenzione ? "translateX(20px)" : "translateX(2px)",
                }} />
            </button>
          </div>
          {form.isManutenzione && (
            <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
              <Field label="Data prossimo controllo">
                <Input
                  type="date"
                  value={form.prossimaManutenzione}
                  onChange={(e) => set("prossimaManutenzione", e.target.value)}
                />
              </Field>
            </div>
          )}
        </Card>

        {/* ── SEZIONE 4: Descrizione lavoro ── */}
        <Card>
          <SectionTitle icon={FileText} label="Lavoro svolto" step="4" />
          <Field label="Descrizione intervento" required>
            <Textarea
              value={form.descrizione}
              onChange={(e) => set("descrizione", e.target.value)}
              placeholder="Descrivi dettagliatamente il lavoro eseguito…"
              rows={5}
            />
            {errors.descrizione && <ErrMsg msg={errors.descrizione} />}
          </Field>
          <div className="mt-5">
            <Field label="Anomalie rilevate / Note">
              <Textarea
                value={form.anomalie}
                onChange={(e) => set("anomalie", e.target.value)}
                placeholder="Problemi riscontrati, raccomandazioni per il cliente…"
                rows={3}
              />
            </Field>
          </div>
        </Card>

        {/* ── SEZIONE 5: Materiali ── */}
        <Card>
          <div className="flex items-center justify-between mb-5">
            <SectionTitle icon={Package} label="Materiali utilizzati" step="5" />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPicker(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                style={{ background: "var(--bg-elevated)", color: "var(--text-2)", border: "1px solid var(--border)" }}>
                <Package size={12} /> Dal magazzino
              </button>
              <button
                type="button"
                onClick={addMateriale}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                style={{ background: "#f59e0b22", color: "#f59e0b", border: "1px solid #f59e0b44" }}>
                <Plus size={12} /> Manuale
              </button>
            </div>
          </div>

          {showPicker && (
            <MagazzinoPicker onSelect={addDaMagazzino} onClose={() => setShowPicker(false)} />
          )}

          {form.materiali.length === 0 ? (
            <div className="text-center py-8 rounded-xl"
                 style={{ border: "1.5px dashed var(--border)", color: "var(--text-3)" }}>
              <Package size={28} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nessun materiale aggiunto</p>
              <p className="text-xs mt-1">Clicca "+ Aggiungi" per inserire i materiali</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[720px] space-y-2">
                {/* header */}
                <div className="flex items-center gap-2 px-1">
                  <span className="flex-1 min-w-[150px] text-xs font-medium" style={{ color: "var(--text-4)" }}>Nome materiale</span>
                  <span className="w-14 text-xs font-medium text-right" style={{ color: "var(--text-4)" }}>Qtà</span>
                  <span className="w-16 text-xs font-medium" style={{ color: "var(--text-4)" }}>U.M.</span>
                  <span className="w-[84px] text-xs font-medium text-right" style={{ color: "var(--text-4)" }}>Acq. €/pz</span>
                  <span className="w-14 text-xs font-medium text-right" style={{ color: "var(--text-4)" }}>Ric. %</span>
                  <span className="w-[84px] text-xs font-medium text-right" style={{ color: "var(--text-4)" }}>Vend. €/pz</span>
                  <span className="w-20 text-xs font-medium text-right" style={{ color: "var(--text-4)" }}>Totale</span>
                  <span className="w-8" />
                </div>
                {form.materiali.map((m, idx) => {
                  const totRiga = (parseFloat(m.quantita) || 0) * (parseFloat(m.prezzoVendita) || 0);
                  return (
                    <div key={m.id} className="flex items-center gap-2">
                      <div className="flex-1 min-w-[150px]">
                        <Input value={m.nome} onChange={(e) => updateMateriale(idx, "nome", e.target.value)} placeholder="es. Valvola 1/2 poll" />
                      </div>
                      <div className="w-14">
                        <input type="number" min="0" step="0.1" value={m.quantita}
                          onChange={(e) => updateMateriale(idx, "quantita", e.target.value)}
                          placeholder="1" className={inputCls}
                          style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--input-color)", fontFamily: "Space Mono, monospace", textAlign: "right" }} />
                      </div>
                      <div className="w-16">
                        <Select value={m.unita} onChange={(e) => updateMateriale(idx, "unita", e.target.value)}>
                          {UNITA.map((u) => <option key={u} value={u}>{u}</option>)}
                        </Select>
                      </div>
                      {/* Prezzo acquisto — read-only, dal magazzino */}
                      <div className="w-[84px]">
                        <div className={inputCls + " text-right cursor-not-allowed"}
                             style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-3)", fontFamily: "Space Mono, monospace", opacity: 0.7 }}>
                          {m.prezzoAcquisto !== '' && m.prezzoAcquisto !== undefined && m.prezzoAcquisto !== null
                            ? Number(m.prezzoAcquisto).toFixed(2)
                            : '—'}
                        </div>
                      </div>
                      {/* Ricarico % — modificabile, ricalcola vendita */}
                      <div className="w-14">
                        <input type="number" min="0" step="0.1" value={m.ricarico ?? ''}
                          onChange={(e) => updateMateriale(idx, "ricarico", e.target.value)}
                          placeholder="0" className={inputCls}
                          style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--input-color)", fontFamily: "Space Mono, monospace", textAlign: "right" }} />
                      </div>
                      {/* Prezzo vendita — modificabile */}
                      <div className="w-[84px]">
                        <input type="number" min="0" step="0.01" value={m.prezzoVendita ?? ''}
                          onChange={(e) => updateMateriale(idx, "prezzoVendita", e.target.value)}
                          placeholder="0.00" className={inputCls}
                          style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "#f59e0b", fontFamily: "Space Mono, monospace", textAlign: "right", fontWeight: 600 }} />
                      </div>
                      {/* Totale riga */}
                      <div className="w-20 text-right">
                        <span className="text-sm font-mono font-semibold"
                              style={{ color: totRiga > 0 ? "#f59e0b" : "var(--text-4)" }}>
                          {totRiga > 0 ? totRiga.toFixed(2) + ' €' : '—'}
                        </span>
                      </div>
                      <div className="w-8 flex justify-center">
                        <button type="button" onClick={() => removeMateriale(idx)}
                          className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
                          style={{ color: "#ef444466", background: "var(--bg-elevated)" }}
                          onMouseOver={(e) => e.currentTarget.style.color = "#ef4444"}
                          onMouseOut={(e) => e.currentTarget.style.color = "#ef444466"}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Riepilogo costi */}
          {totIntervento > 0 && (
            <div className="mt-5 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
              <div className="flex justify-end">
                <div className="space-y-1.5 text-sm min-w-[260px]">
                  {totMateriali > 0 && (
                    <div className="flex justify-between gap-8">
                      <span style={{ color: "var(--text-4)" }}>Totale materiali</span>
                      <span className="font-mono font-semibold" style={{ color: "var(--text-2)" }}>{totMateriali.toFixed(2)} €</span>
                    </div>
                  )}
                  {totManodopera > 0 && (
                    <div className="flex justify-between gap-8">
                      <span style={{ color: "var(--text-4)" }}>Manodopera ({form.oreManodopera}h × {form.costoOrario}€/h)</span>
                      <span className="font-mono font-semibold" style={{ color: "var(--text-2)" }}>{totManodopera.toFixed(2)} €</span>
                    </div>
                  )}
                  <div className="flex justify-between gap-8 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
                    <span className="font-semibold" style={{ color: "var(--text-1)" }}>Totale intervento</span>
                    <span className="font-mono font-bold text-base" style={{ color: "#f59e0b" }}>{totIntervento.toFixed(2)} €</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* ── SEZIONE 6: Foto ── */}
        <Card>
          <SectionTitle icon={Camera} label="Foto allegate" step="6" />
          <label className="flex flex-col items-center gap-3 py-8 rounded-xl cursor-pointer transition-all duration-200"
                 style={{ border: "1.5px dashed var(--border)", background: "var(--bg-elevated)" }}
                 onDragOver={(e) => e.preventDefault()}
                 onDrop={(e) => {
                   e.preventDefault();
                   const files = Array.from(e.dataTransfer.files);
                   files.forEach((f) => {
                     const reader = new FileReader();
                     reader.onload = (ev) =>
                       set("foto", [...form.foto, { id: uuid(), name: f.name, data: ev.target.result }]);
                     reader.readAsDataURL(f);
                   });
                 }}>
            <Upload size={24} style={{ color: "#334155" }} />
            <div className="text-center">
              <p className="text-sm font-medium" style={{ color: "var(--text-3)" }}>
                Trascina le foto qui o <span style={{ color: "#f59e0b" }}>sfoglia</span>
              </p>
              <p className="text-xs mt-1" style={{ color: "#334155" }}>JPG, PNG, HEIC fino a 10MB</p>
            </div>
            <input type="file" multiple accept="image/*" className="hidden" onChange={handleFoto} />
          </label>

          {form.foto.length > 0 && (
            <div className="grid grid-cols-3 md:grid-cols-5 gap-3 mt-4">
              {form.foto.map((f, idx) => (
                <div key={f.id} className="relative group aspect-square rounded-lg overflow-hidden"
                     style={{ border: "1px solid var(--border)" }}>
                  <img src={f.data} alt={f.name} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => set("foto", form.foto.filter((_, i) => i !== idx))}
                    className="absolute top-1 right-1 flex items-center justify-center w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: "#ef4444dd" }}>
                    <X size={10} style={{ color: "#fff" }} />
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 px-1.5 py-1 text-xs truncate opacity-0 group-hover:opacity-100 transition-opacity"
                       style={{ background: "var(--sticky-bg)", color: "var(--text-2)" }}>
                    {f.name}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* ── SEZIONE 7: Firma cliente ── */}
        <Card>
          <SectionTitle icon={PenLine} label="Firma cliente" step="7" />
          <FirmaCanvas
            firmaData={form.firma}
            onSave={(data) => set("firma", data)}
          />
          {form.firma && (
            <p className="text-xs mt-2 flex items-center gap-1.5" style={{ color: "#10b981" }}>
              <Check size={12} /> Firma acquisita
            </p>
          )}
        </Card>

        {/* ── footer azione ── */}
        <div className="flex items-center justify-between pt-2 pb-10">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
            style={{ background: "var(--bg-elevated)", color: "var(--text-3)", border: "1px solid var(--border)" }}>
            <X size={14} /> Annulla
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleSave("bozza")}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
              style={{ background: "var(--bg-elevated)", color: "var(--text-2)", border: "1px solid var(--border)" }}>
              <Save size={14} /> Salva (da svolgere)
            </button>
            <button
              type="button"
              onClick={() => handleSave("completato")}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all"
              style={{
                background: saved ? "#10b981" : "linear-gradient(135deg, #f59e0b, #f97316)",
                color: "#060d1f",
                boxShadow: saved ? "0 0 16px #10b98144" : "0 0 20px #f59e0b44",
              }}>
              {saved ? <><Check size={14} /> Salvato!</> : <><Check size={14} /> Completa rapportino</>}
            </button>
          </div>
        </div>

      </div>

      {/* ── Popup Google Calendar ── */}
      {gcalPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"
               onClick={() => { setGcalPopup(null); setSaved(false); navigate("/rapportini"); }} />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
               style={{ background: "var(--bg-elevated)" }}>
            <div className="px-6 py-5 border-b border-white/10">
              <h3 className="text-white font-semibold text-base">Aggiungi a Google Calendar</h3>
              <p className="text-slate-400 text-sm mt-1">Vuoi sincronizzare questo intervento?</p>
            </div>
            <div className="px-6 py-4 space-y-2">
              {gcalPopup.data && (
                <p className="text-slate-300 text-sm">
                  Data: {gcalPopup.data}{gcalPopup.oraInizio ? " alle " + gcalPopup.oraInizio : ""}
                </p>
              )}
              {gcalPopup.indirizzoIntervento && (
                <p className="text-slate-300 text-sm">Indirizzo: {gcalPopup.indirizzoIntervento}</p>
              )}
              {gcalPopup.tipoIntervento && (
                <p className="text-slate-300 text-sm">Tipo: {gcalPopup.tipoIntervento}</p>
              )}
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => {
                  window.open(buildGcalUrl(gcalPopup), "_blank", "noopener,noreferrer");
                  setGcalPopup(null);
                  setSaved(false);
                  navigate("/rapportini");
                }}
                className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors"
                style={{ background: "#f59e0b", color: "#060d1f" }}
              >
                Aggiungi a Google Calendar
              </button>
              <button
                onClick={() => { setGcalPopup(null); setSaved(false); navigate("/rapportini"); }}
                className="px-4 py-2.5 rounded-xl text-slate-300 font-medium text-sm border border-white/10 transition-colors"
                style={{ background: "rgba(255,255,255,0.05)" }}
              >
                Salta
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ─── piccoli helper componenti ───────────────────────────────────────────────
function ErrMsg({ msg }) {
  return <p className="text-xs mt-0.5" style={{ color: "#ef4444" }}>{msg}</p>;
}

function Card({ children }) {
  return (
    <div className="rounded-2xl p-6"
         style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      {children}
    </div>
  );
}