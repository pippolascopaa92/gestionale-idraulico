// src/pages/Dashboard.jsx
// Modulo: Dashboard — panoramica interventi, KPI, calendario rapido
// Design system: navy (#060d1f) + amber (#f59e0b) | DM Sans + Space Mono

import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../App";
import { useData } from "../context/DataContext";
import {
  Wrench,
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  CalendarDays,
  User,
  ChevronRight,
  Flame,
  Droplets,
  ThermometerSun,
  ArrowUpRight,
  MoreHorizontal,
} from "lucide-react";
import Calendario from "./Calendario";

// ─── Helper: legge i rapportini da localStorage ───────────────────────────────
function loadRapportini() {
  try {
    const raw = localStorage.getItem("rapportini");
    return raw ? JSON.parse(raw) : getDefaultRapportini();
  } catch {
    return getDefaultRapportini();
  }
}

function loadClienti() {
  try { return JSON.parse(localStorage.getItem("hydrodesk_clienti") || "[]"); } catch { return []; }
}

function loadTecnici() {
  try { return JSON.parse(localStorage.getItem("tecnici") || "[]"); } catch { return []; }
}

function getDefaultRapportini() {
  const oggi = new Date();
  const fmt = (d) => d.toISOString().split("T")[0];
  const ieri = new Date(oggi); ieri.setDate(oggi.getDate() - 1);
  const domani = new Date(oggi); domani.setDate(oggi.getDate() + 1);
  const lun = new Date(oggi); lun.setDate(oggi.getDate() - 3);

  return [
    { id: "r1", cliente: "Rossi Mario", tipo: "emergenza", stato: "completato", tecnico: "Luca B.", data: fmt(oggi), oraInizio: "08:30", oraFine: "11:00", indirizzo: "Via Roma 14, Bergamo", descrizione: "Perdita tubazione cucina, sostituzione raccordo" },
    { id: "r2", cliente: "Condominio Le Torri", tipo: "manutenzione", stato: "in_corso", tecnico: "Marco V.", data: fmt(oggi), oraInizio: "14:00", oraFine: null, indirizzo: "Via Garibaldi 8, Bergamo", descrizione: "Manutenzione programmata caldaie condominiali" },
    { id: "r3", cliente: "Ferri Lucia", tipo: "installazione", stato: "completato", tecnico: "Luca B.", data: fmt(ieri), oraInizio: "09:00", oraFine: "13:30", indirizzo: "Corso Vittorio 22, Dalmine", descrizione: "Installazione nuovo scaldabagno a pompa di calore" },
    { id: "r4", cliente: "Bar Sport", tipo: "riparazione", stato: "bozza", tecnico: "Paolo M.", data: fmt(domani), oraInizio: "10:00", oraFine: null, indirizzo: "Piazza Cavour 1, Seriate", descrizione: "Sostituzione miscelatore bar" },
    { id: "r5", cliente: "Villa Colombo", tipo: "collaudo", stato: "inviato", tecnico: "Marco V.", data: fmt(lun), oraInizio: "15:00", oraFine: "17:00", indirizzo: "Via dei Mille 5, Alzano", descrizione: "Collaudo impianto idraulico nuovo cantiere" },
    { id: "r6", cliente: "Condominio Le Torri", tipo: "manutenzione", stato: "fatturato", tecnico: "Luca B.", data: fmt(lun), oraInizio: "08:00", oraFine: "12:00", indirizzo: "Via Garibaldi 8, Bergamo", descrizione: "Pulizia e spurgo colonne montanti" },
    { id: "r7", cliente: "Brambilla Paolo", tipo: "emergenza", stato: "completato", tecnico: "Paolo M.", data: fmt(ieri), oraInizio: "19:45", oraFine: "22:00", indirizzo: "Via Tasso 30, Bergamo", descrizione: "Allagamento bagno, rottura sifone" },
  ];
}

// ─── Costanti UI ──────────────────────────────────────────────────────────────
const TIPO_CONFIG = {
  riparazione:  { label: "Riparazione",  color: "text-blue-400",   bg: "bg-blue-400/10",  icon: Wrench },
  manutenzione: { label: "Manutenzione", color: "text-amber-400",  bg: "bg-amber-400/10", icon: ThermometerSun },
  installazione:{ label: "Installazione",color: "text-emerald-400",bg: "bg-emerald-400/10",icon: Droplets },
  collaudo:     { label: "Collaudo",     color: "text-violet-400", bg: "bg-violet-400/10", icon: CheckCircle2 },
  emergenza:    { label: "Emergenza",    color: "text-red-400",    bg: "bg-red-400/10",    icon: Flame },
};

const STATO_CONFIG = {
  bozza:      { label: "Da svolgere",    dot: "bg-gray-500",   text: "text-gray-400"    },
  in_corso:   { label: "In corso",       dot: "bg-amber-400",  text: "text-amber-400"   },
  completato: { label: "In svolgimento", dot: "bg-emerald-400",text: "text-emerald-400" },
  inviato:    { label: "Lavoro svolto",  dot: "bg-blue-400",   text: "text-blue-400"    },
  fatturato:  { label: "Fatturato",      dot: "bg-violet-400", text: "text-violet-400"  },
};

const FILTER_LABELS = {
  tutti:      "Tutti gli interventi",
  oggi:       "Interventi oggi",
  settimana:  "Questa settimana",
  bozze:      "Bozze",
  completati: "Completati",
  emergenze:  "Emergenze",
  in_corso:   "In corso",
};

// ─── Utility: calcola durata in ore ──────────────────────────────────────────
function calcolaDurata(inizio, fine) {
  if (!inizio || !fine) return null;
  const [hi, mi] = inizio.split(":").map(Number);
  const [hf, mf] = fine.split(":").map(Number);
  const tot = (hf * 60 + mf) - (hi * 60 + mi);
  if (tot <= 0) return null;
  const h = Math.floor(tot / 60);
  const m = tot % 60;
  return h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ""}` : `${m}m`;
}

// ─── Utility: giorno della settimana breve ────────────────────────────────────
const GIORNI = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
function formatData(isoDate) {
  if (!isoDate) return "";
  const d = new Date(isoDate + "T00:00:00");
  return `${GIORNI[d.getDay()]} ${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`;
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, accent, trend, onClick, active }) {
  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`relative overflow-hidden rounded-2xl p-5 flex flex-col gap-3 transition-all duration-200
        ${onClick ? "cursor-pointer hover:scale-[1.02] active:scale-[0.98]" : ""}`}
      style={{
        background: "var(--bg-card-grad)",
        border: active ? `2px solid ${accent}` : "1px solid var(--divide)",
        boxShadow: active ? `0 0 24px ${accent}33` : undefined,
        touchAction: "manipulation",
      }}
    >
      {/* accent glow */}
      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-10 blur-2xl" style={{ background: accent }} />

      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: accent + "22" }}>
          <Icon size={18} style={{ color: accent }} />
        </div>
        {active ? (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: accent + "22", color: accent }}>
            attivo
          </span>
        ) : trend !== undefined && (
          <span className={`flex items-center gap-0.5 text-xs font-mono ${trend >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            <ArrowUpRight size={12} className={trend < 0 ? "rotate-180" : ""} />
            {Math.abs(trend)}%
          </span>
        )}
      </div>

      <div>
        <div className="text-3xl font-mono font-bold text-slate-900 dark:text-white tracking-tight">{value}</div>
        <div className="text-xs text-slate-500 mt-0.5 font-medium">{label}</div>
      </div>

      {sub && <div className="text-xs text-slate-500 border-t border-black/5 dark:border-white/5 pt-2">{sub}</div>}
    </div>
  );
}

// ─── Badge Tipo ───────────────────────────────────────────────────────────────
function TipoBadge({ tipo }) {
  const cfg = TIPO_CONFIG[tipo] || TIPO_CONFIG.riparazione;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color} ${cfg.bg}`}>
      <Icon size={10} />
      {cfg.label}
    </span>
  );
}

// ─── Dot Stato ────────────────────────────────────────────────────────────────
function StatoDot({ stato }) {
  const cfg = STATO_CONFIG[stato] || STATO_CONFIG.bozza;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${stato === "in_corso" ? "animate-pulse" : ""}`} />
      {cfg.label}
    </span>
  );
}

// ─── Row Intervento ───────────────────────────────────────────────────────────
function InterventoRow({ r, onNavigate }) {
  const durata = calcolaDurata(r.oraInizio, r.oraFine);
  const nomeCliente = r.clienteNome || r.cliente || "—";
  const nomeTecnico = r.tecnicoNome || r.tecnico || "—";
  return (
    <div
      className="group flex items-center gap-4 px-4 py-3 rounded-xl cursor-pointer transition-all"
      style={{ border: "1px solid transparent" }}
      onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(245,158,11,0.2)"}
      onMouseLeave={e => e.currentTarget.style.borderColor = "transparent"}
      onClick={() => onNavigate && onNavigate(`/rapportini/${r.id}`)}
    >
      {/* Tipo icon */}
      <div className="shrink-0">
        {(() => {
          const cfg = TIPO_CONFIG[r.tipo] || TIPO_CONFIG.riparazione;
          const Icon = cfg.icon;
          return (
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${cfg.bg}`}>
              <Icon size={15} className={cfg.color} />
            </div>
          );
        })()}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">{nomeCliente}</span>
          <TipoBadge tipo={r.tipo} />
        </div>
        <div className="text-xs text-slate-500 truncate mt-0.5">{r.indirizzoIntervento || r.indirizzo || ""}</div>
        {/* Data + tecnico visibili su mobile sotto le info */}
        <div className="flex items-center gap-2 mt-1 sm:hidden">
          <span className="text-xs text-slate-500">{formatData(r.data)}</span>
          {nomeTecnico && nomeTecnico !== "—" && (
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <User size={9} />{nomeTecnico}
            </span>
          )}
        </div>
      </div>

      {/* Meta: data + ora + tecnico — solo sm+ */}
      <div className="shrink-0 text-right hidden sm:block">
        <div className="text-xs font-medium text-slate-400">{formatData(r.data)}</div>
        <div className="text-xs font-mono text-slate-500">{r.oraInizio}{durata ? ` · ${durata}` : ""}</div>
        <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1 justify-end">
          <User size={10} />
          {nomeTecnico}
        </div>
      </div>

      {/* Stato */}
      <div className="shrink-0 text-right">
        <StatoDot stato={r.stato} />
      </div>

      <ChevronRight size={14} className="text-slate-600 group-hover:text-amber-400 transition-colors shrink-0" />
    </div>
  );
}

// ─── Micro calendario settimanale ─────────────────────────────────────────────
function MiniCalendario({ rapportini }) {
  const oggi = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(oggi);
    d.setDate(oggi.getDate() - oggi.getDay() + i + 1); // lun→dom
    return d;
  });

  const countByDay = {};
  rapportini.forEach(r => {
    if (r.data) countByDay[r.data] = (countByDay[r.data] || 0) + 1;
  });

  return (
    <div className="flex gap-1">
      {days.map(d => {
        const iso = d.toISOString().split("T")[0];
        const isOggi = iso === oggi.toISOString().split("T")[0];
        const count = countByDay[iso] || 0;
        return (
          <div key={iso} className="flex-1 flex flex-col items-center gap-1.5">
            <span className="text-[10px] text-slate-500 font-medium">{GIORNI[d.getDay()]}</span>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-mono font-bold transition-all
                ${isOggi ? "bg-amber-400 text-slate-900" : count > 0 ? "bg-black/8 dark:bg-white/10 text-slate-800 dark:text-white" : "text-slate-500"}`}
            >
              {d.getDate()}
            </div>
            {count > 0 && (
              <div className="flex gap-0.5">
                {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
                  <span key={i} className={`w-1 h-1 rounded-full ${isOggi ? "bg-amber-400" : "bg-slate-500"}`} />
                ))}
              </div>
            )}
            {count === 0 && <div className="h-1" />}
          </div>
        );
      })}
    </div>
  );
}

// ─── Distribuzione per tipo (mini bar chart) ──────────────────────────────────
function TipoChart({ rapportini }) {
  const counts = {};
  rapportini.forEach(r => {
    counts[r.tipo] = (counts[r.tipo] || 0) + 1;
  });
  const max = Math.max(...Object.values(counts), 1);
  const order = ["emergenza", "riparazione", "manutenzione", "installazione", "collaudo"];

  return (
    <div className="space-y-2.5">
      {order.filter(t => counts[t]).map(tipo => {
        const cfg = TIPO_CONFIG[tipo];
        const pct = Math.round((counts[tipo] / max) * 100);
        return (
          <div key={tipo} className="flex items-center gap-3">
            <span className="text-xs text-slate-400 w-24 shrink-0">{cfg.label}</span>
            <div className="flex-1 h-1.5 rounded-full bg-black/8 dark:bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, background: cfg.color.replace("text-", "").includes("amber") ? "#f59e0b" : cfg.color.replace("text-", "").includes("red") ? "#f87171" : cfg.color.replace("text-", "").includes("emerald") ? "#34d399" : cfg.color.replace("text-", "").includes("blue") ? "#60a5fa" : "#a78bfa" }}
              />
            </div>
            <span className="text-xs font-mono text-slate-400 w-4 text-right shrink-0">{counts[tipo]}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Tecnici attivi oggi ──────────────────────────────────────────────────────
function TecniciOggi({ rapportiniOggi }) {
  const map = {};
  rapportiniOggi.forEach(r => {
    if (!map[r.tecnico]) map[r.tecnico] = { count: 0, inCorso: false };
    map[r.tecnico].count++;
    if (r.stato === "in_corso") map[r.tecnico].inCorso = true;
  });

  if (Object.keys(map).length === 0)
    return <p className="text-xs text-slate-500 italic">Nessun tecnico operativo oggi.</p>;

  return (
    <div className="space-y-2">
      {Object.entries(map).map(([nome, info]) => (
        <div key={nome} className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-amber-400/20 flex items-center justify-center text-amber-400 text-xs font-bold shrink-0">
            {nome.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-slate-900 dark:text-white truncate">{nome}</div>
            <div className="text-xs text-slate-500">{info.count} intervento{info.count > 1 ? "i" : ""}</div>
          </div>
          {info.inCorso && (
            <span className="text-xs text-amber-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              attivo
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── DASHBOARD PRINCIPALE ─────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("tutti");
  const { rapportini, clienti, tecnici } = useData();

  const oggi = new Date().toISOString().split("T")[0];
  const settimanaStart = new Date();
  settimanaStart.setDate(settimanaStart.getDate() - settimanaStart.getDay() + 1);
  const settimanaStartISO = settimanaStart.toISOString().split("T")[0];

  const rapportiniOggi     = rapportini.filter(r => r.data === oggi);
  const rapportiniSettimana = rapportini.filter(r => r.data >= settimanaStartISO);
  const inCorso   = rapportini.filter(r => r.stato === "in_corso");
  const emergenze = rapportini.filter(r => r.tipo === "emergenza" && r.stato !== "fatturato");
  const bozze     = rapportini.filter(r => r.stato === "bozza");
  const oreOggi = rapportiniOggi.reduce((acc, r) => {
    const d = calcolaDurata(r.oraInizio, r.oraFine);
    if (!d) return acc;
    const [h] = d.split("h").map(Number);
    return acc + (h || 0);
  }, 0);

  // Risolve nome cliente e tecnico (supporta sia mock con stringhe che dati reali con ID)
  function arricchisci(r) {
    const clienteNome = r.cliente || clienti.find(c => c.id === r.clienteId)?.nome || "—";
    const tecnicoNome = r.tecnico || tecnici.find(t => t.id === r.tecnicoId)?.nome || "—";
    return { ...r, clienteNome, tecnicoNome };
  }

  // Lista filtrata per KPI/tab
  const listaFiltrata = useMemo(() => {
    let base;
    switch (filter) {
      case "oggi":       base = rapportiniOggi; break;
      case "settimana":  base = rapportiniSettimana; break;
      case "bozze":      base = rapportini.filter(r => r.stato === "bozza"); break;
      case "completati": base = rapportini.filter(r => r.stato === "completato"); break;
      case "emergenze":  base = rapportini.filter(r => r.tipo === "emergenza"); break;
      case "in_corso":   base = rapportini.filter(r => r.stato === "in_corso"); break;
      default:           base = rapportini;
    }
    return [...base]
      .sort((a, b) => (b.data || "").localeCompare(a.data || "") || (b.oraInizio || "").localeCompare(a.oraInizio || ""))
      .map(arricchisci);
  }, [filter, rapportini, rapportiniOggi, rapportiniSettimana, clienti, tecnici]);

  return (
    <div
      className="min-h-screen p-4 md:p-6 lg:p-8"
      style={{ background: "var(--bg-page)", fontFamily: "'DM Sans', sans-serif" }}
    >
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Space+Mono:wght@400;700&display=swap');
        .font-mono { font-family: 'Space Mono', monospace; }
        * { box-sizing: border-box; }
        @keyframes fade-up { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        .anim-1 { animation: fade-up 0.4s ease both 0.05s; }
        .anim-2 { animation: fade-up 0.4s ease both 0.12s; }
        .anim-3 { animation: fade-up 0.4s ease both 0.19s; }
        .anim-4 { animation: fade-up 0.4s ease both 0.26s; }
        .anim-5 { animation: fade-up 0.4s ease both 0.33s; }
      `}</style>

      {/* ── Header ── */}
      <div className="anim-1 flex items-center justify-between gap-3 mb-6">
        <div className="min-w-0">
          <h1 className="text-xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Buongiorno 👋
          </h1>
          <p className="text-slate-400 text-xs md:text-sm mt-1 capitalize truncate">
            {new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>

        <button
          className="shrink-0 flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95"
          style={{ background: "#f59e0b", color: "#0a0f1e" }}
          onClick={() => navigate("/rapportino/nuovo")}
        >
          <Wrench size={14} />
          <span className="hidden sm:inline">Nuovo intervento</span>
          <span className="sm:hidden">Nuovo</span>
        </button>
      </div>

      {/* ── KPI Grid ── */}
      <div className="anim-2 grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <KpiCard
          label="Interventi oggi"
          value={rapportiniOggi.length}
          icon={CalendarDays}
          accent="#f59e0b"
          sub={`${oreOggi > 0 ? oreOggi + "h di lavoro" : "Nessuna ora registrata"}`}
          trend={filter !== "oggi" ? 12 : undefined}
          onClick={() => setFilter(filter === "oggi" ? "tutti" : "oggi")}
          active={filter === "oggi"}
        />
        <KpiCard
          label="Bozze da completare"
          value={bozze.length}
          icon={Clock}
          accent="#94a3b8"
          sub={bozze.length > 0 ? "Lavori in attesa" : "Nessun lavoro in attesa"}
          onClick={() => setFilter(filter === "bozze" ? "tutti" : "bozze")}
          active={filter === "bozze"}
        />
        <KpiCard
          label="Questa settimana"
          value={rapportiniSettimana.length}
          icon={TrendingUp}
          accent="#60a5fa"
          sub={`su ${rapportini.length} totali`}
          trend={filter !== "settimana" ? -5 : undefined}
          onClick={() => setFilter(filter === "settimana" ? "tutti" : "settimana")}
          active={filter === "settimana"}
        />
        <KpiCard
          label="Emergenze aperte"
          value={emergenze.length}
          icon={AlertTriangle}
          accent="#f87171"
          sub={emergenze.length > 0 ? "⚠ Richiede attenzione" : "Nessuna emergenza"}
          onClick={() => setFilter(filter === "emergenze" ? "tutti" : "emergenze")}
          active={filter === "emergenze"}
        />
      </div>

      {/* Calendario completo — nascosto su mobile (troppo pesante) */}
      <div className="hidden md:block anim-4 rounded-2xl p-5 mb-4"
          style={{ background: "var(--bg-card-grad)", border: "1px solid var(--divide)" }}>
        <Calendario embedded />
      </div>

      {/* ── Corpo principale: lista + sidebar ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* ── Lista interventi ── */}
        <div className="anim-3 xl:col-span-2 rounded-2xl overflow-hidden"
          style={{ background: "var(--bg-card-grad)", border: "1px solid var(--divide)" }}>

          {/* Header lista */}
          <div className="px-5 py-4 border-b" style={{ borderColor: "var(--divide)" }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Interventi</h2>
                {filter !== "tutti" && (
                  <>
                    <span className="text-xs text-amber-400 font-medium">
                      — {FILTER_LABELS[filter]}
                    </span>
                    <span className="text-xs font-mono text-slate-500">
                      ({listaFiltrata.length})
                    </span>
                    <button
                      onClick={() => setFilter("tutti")}
                      className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors underline underline-offset-2"
                    >
                      × tutti
                    </button>
                  </>
                )}
              </div>
              <span className="text-xs text-slate-500 font-mono">{listaFiltrata.length} risultati</span>
            </div>
            <div className="flex gap-1 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
              {[
                ["tutti",      "Tutti"],
                ["oggi",       "Oggi"],
                ["settimana",  "Settimana"],
                ["bozze",      "Bozze"],
                ["completati", "Completati"],
                ["emergenze",  "Emergenze"],
              ].map(([val, lbl]) => (
                <button
                  key={val}
                  onClick={() => setFilter(val)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-shrink-0
                    ${filter === val
                      ? "bg-amber-400 text-slate-900"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  style={filter !== val ? { background: "var(--bg-elevated)" } : undefined}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          {/* Rows */}
          <div className="divide-y" style={{ divideColor: "rgba(255,255,255,0.04)" }}>
            {listaFiltrata.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-sm">
                <Wrench size={28} className="mx-auto mb-3 opacity-30" />
                Nessun intervento trovato
              </div>
            ) : (
              listaFiltrata.map(r => (
                <div key={r.id} style={{ borderBottom: "1px solid var(--divide)" }}>
                  <div className="px-2">
                    <InterventoRow r={r} />
                  </div>
                </div>
              ))
            )}
          </div>

          {listaFiltrata.length > 0 && (
            <div className="px-5 py-3 border-t text-center" style={{ borderColor: "var(--divide)" }}>
              <button className="text-xs text-amber-400 hover:text-amber-300 transition-colors font-medium">
                Vedi tutti gli interventi →
              </button>
            </div>
          )}
        </div>

        {/* ── Sidebar destra — nascosta su mobile ── */}
        <div className="hidden xl:flex flex-col gap-4">

          {/* Tecnici oggi */}
          <div className="anim-4 rounded-2xl p-5"
            style={{ background: "var(--bg-card-grad)", border: "1px solid var(--divide)" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Tecnici operativi oggi</h3>
              <User size={14} className="text-slate-500" />
            </div>
            <TecniciOggi rapportiniOggi={rapportiniOggi} />
          </div>

          {/* Distribuzione per tipo */}
          <div className="anim-5 rounded-2xl p-5"
            style={{ background: "var(--bg-card-grad)", border: "1px solid var(--divide)" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Tipologia interventi</h3>
              <MoreHorizontal size={14} className="text-slate-500" />
            </div>
            <TipoChart rapportini={rapportini} />
          </div>

        </div>
      </div>
    </div>
  );
}
