import { useState, useMemo } from "react";
import { FileBarChart2, FileText, Download, Search, X, Filter, TrendingUp, Clock, Euro, Wrench, Users } from "lucide-react";
import { generateRapportinoP } from "../utils/generatePDF";
import { useData } from "../context/DataContext";

function fmtData(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
}

const PERIODI = [
  { label: "Questo mese",    value: "mese"  },
  { label: "Ultimi 3 mesi",  value: "3m"    },
  { label: "Ultimi 6 mesi",  value: "6m"    },
  { label: "Quest'anno",     value: "anno"  },
  { label: "Tutto",          value: "tutto" },
];

const STATI_LABEL = {
  bozza: "Bozza", completato: "Completato", inviato: "Inviato", fatturato: "Fatturato",
};

const TIPI_LABEL = {
  riparazione: "Riparazione", manutenzione: "Manutenzione",
  installazione: "Installazione", collaudo: "Collaudo", emergenza: "Emergenza",
};

function periodoStart(value) {
  const now = new Date();
  if (value === "mese")  { return new Date(now.getFullYear(), now.getMonth(), 1); }
  if (value === "3m")    { return new Date(now.getFullYear(), now.getMonth() - 3, 1); }
  if (value === "6m")    { return new Date(now.getFullYear(), now.getMonth() - 6, 1); }
  if (value === "anno")  { return new Date(now.getFullYear(), 0, 1); }
  return null;
}

function StatoBadge({ stato }) {
  const cfg = {
    bozza:      "text-slate-400 bg-slate-400/10",
    completato: "text-emerald-400 bg-emerald-400/10",
    inviato:    "text-sky-400 bg-sky-400/10",
    fatturato:  "text-amber-400 bg-amber-400/10",
  }[stato] ?? "text-slate-400 bg-slate-400/10";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg}`}>
      {STATI_LABEL[stato] ?? stato}
    </span>
  );
}

// ─── componente ──────────────────────────────────────────────────────────────

export default function Report() {
  const [tab,       setTab]       = useState("report"); // "report" | "pdf"
  const [periodo,   setPeriodo]   = useState("3m");
  const [clienteFlt,setClienteFlt]= useState("");
  const [search,    setSearch]    = useState("");
  const [loadingId, setLoadingId] = useState(null);

  const { rapportini, clienti, tecnici } = useData();

  const nomeCliente = (r) => {
    const c = clienti.find(cl => cl.id === r.clienteId);
    return c?.nome || r.cliente || "—";
  };

  // ── Filtro per Report ──────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const start = periodoStart(periodo);
    return rapportini.filter(r => {
      const data = new Date(r.dataInizio ?? r.data ?? 0);
      if (start && data < start) return false;
      if (clienteFlt && r.clienteId !== clienteFlt && r.cliente !== clienti.find(c => c.id === clienteFlt)?.nome) return false;
      return true;
    });
  }, [rapportini, periodo, clienteFlt, clienti]);

  // ── KPI ───────────────────────────────────────────────────────────────────
  const kpi = useMemo(() => {
    const totOre = filtered.reduce((s, r) => s + (parseFloat(r.oreManodopera) || 0), 0);
    const totMat = filtered.reduce((s, r) =>
      s + (r.materiali || []).reduce((m, mat) =>
        m + (parseFloat(mat.quantita) || 0) * (parseFloat(mat.prezzoVendita) || 0), 0), 0);
    const totMan = filtered.reduce((s, r) =>
      s + (parseFloat(r.oreManodopera) || 0) * (parseFloat(r.costoOrario) || 0), 0);
    const clientiAttivi = new Set(filtered.map(r => r.clienteId || r.cliente)).size;
    return { n: filtered.length, totOre, totMat, totMan, totFatturato: totMat + totMan, clientiAttivi };
  }, [filtered]);

  // ── Top tecnici ───────────────────────────────────────────────────────────
  const topTecnici = useMemo(() => {
    const map = {};
    filtered.forEach(r => {
      const nome = r.tecnico || tecnici.find(t => t.id === r.tecnicoId)?.nome || "N.D.";
      if (!map[nome]) map[nome] = { ore: 0, n: 0 };
      map[nome].ore += parseFloat(r.oreManodopera) || 0;
      map[nome].n++;
    });
    return Object.entries(map).sort((a, b) => b[1].ore - a[1].ore).slice(0, 5);
  }, [filtered, tecnici]);

  // ── Top tipi ─────────────────────────────────────────────────────────────
  const topTipi = useMemo(() => {
    const map = {};
    filtered.forEach(r => { const t = r.tipoIntervento || "—"; map[t] = (map[t] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  // ── Filtro per PDF ────────────────────────────────────────────────────────
  const filteredPDF = useMemo(() => {
    const q = search.toLowerCase().trim();
    return rapportini.filter(r => {
      if (clienteFlt && r.clienteId !== clienteFlt) return false;
      if (!q) return true;
      return (
        nomeCliente(r).toLowerCase().includes(q) ||
        (r.descrizione || "").toLowerCase().includes(q) ||
        (r.tipoIntervento || "").toLowerCase().includes(q) ||
        fmtData(r.dataInizio ?? r.data).toLowerCase().includes(q)
      );
    });
  }, [rapportini, clienteFlt, search]);

  const handleDownloadPDF = (r) => {
    setLoadingId(r.id);
    setTimeout(() => {
      try {
        const doc = generateRapportinoP(r, clienti, tecnici);
        const nome = `${nomeCliente(r).replace(/[^a-z0-9]/gi, "_")}_${(r.dataInizio ?? r.data ?? "").slice(0, 10)}.pdf`;
        doc.save(nome);
      } catch (e) {
        console.error("Errore generazione PDF:", e);
      }
      setLoadingId(null);
    }, 50);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5 animate-[fadeSlideUp_0.3s_ease_both]">
      <style>{`@keyframes fadeSlideUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
          <FileBarChart2 className="w-3.5 h-3.5 text-amber-400" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Report & PDF</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-white/5 rounded-xl p-1 w-fit">
        {[{ k: "report", label: "Statistiche" }, { k: "pdf", label: "Esporta PDF" }].map(({ k, label }) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === k
                ? "bg-white dark:bg-[#0c1a35] text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Filtri comuni ── */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Periodo (solo tab report) */}
        {tab === "report" && (
          <div className="flex gap-1.5 flex-wrap">
            {PERIODI.map(p => (
              <button
                key={p.value}
                onClick={() => setPeriodo(p.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  periodo === p.value
                    ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                    : "bg-white dark:bg-white/3 border-slate-200 dark:border-white/10 text-slate-500 hover:border-white/20"
                }`}>
                {p.label}
              </button>
            ))}
          </div>
        )}
        {/* Filtro cliente */}
        <select
          value={clienteFlt}
          onChange={e => setClienteFlt(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-xs border bg-white dark:bg-[#0c1a35] border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 outline-none focus:border-amber-500/50">
          <option value="">Tutti i clienti</option>
          {clienti.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        {(clienteFlt) && (
          <button onClick={() => setClienteFlt("")} className="text-xs text-slate-500 hover:text-red-400 flex items-center gap-1">
            <X className="w-3 h-3" /> Reset filtri
          </button>
        )}
      </div>

      {/* ═══════════════════════════════ TAB REPORT ══════════════════════════*/}
      {tab === "report" && (
        <div className="space-y-5">

          {/* KPI */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: Wrench,      label: "Interventi",        value: kpi.n,                            color: "text-amber-400"   },
              { icon: Clock,       label: "Ore manodopera",    value: kpi.totOre > 0 ? `${kpi.totOre}h` : "—", color: "text-sky-400"     },
              { icon: Euro,        label: "Fatturato stimato", value: kpi.totFatturato > 0 ? `${kpi.totFatturato.toFixed(0)} €` : "—", color: "text-emerald-400" },
              { icon: Users,       label: "Clienti attivi",    value: kpi.clientiAttivi,                color: "text-violet-400"  },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="bg-white dark:bg-[#0c1a35] border border-slate-100 dark:border-white/5 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`w-3.5 h-3.5 ${color}`} />
                  <p className="text-xs text-slate-500">{label}</p>
                </div>
                <p className={`text-2xl font-bold font-mono ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Sub KPI: materiali e manodopera */}
          {kpi.totFatturato > 0 && (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white dark:bg-[#0c1a35] border border-slate-100 dark:border-white/5 rounded-xl px-4 py-3">
                <p className="text-xs text-slate-500 mb-1">di cui materiali</p>
                <p className="text-xl font-bold font-mono text-amber-400">{kpi.totMat.toFixed(2)} €</p>
              </div>
              <div className="bg-white dark:bg-[#0c1a35] border border-slate-100 dark:border-white/5 rounded-xl px-4 py-3">
                <p className="text-xs text-slate-500 mb-1">di cui manodopera</p>
                <p className="text-xl font-bold font-mono text-amber-400">{kpi.totMan.toFixed(2)} €</p>
              </div>
            </div>
          )}

          {/* Distribuzione tipo + top tecnici */}
          {filtered.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Tipi intervento */}
              <div className="bg-white dark:bg-[#0c1a35] border border-slate-100 dark:border-white/5 rounded-xl p-5">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Tipo intervento</p>
                <div className="space-y-2">
                  {topTipi.map(([tipo, n]) => {
                    const pct = Math.round((n / kpi.n) * 100);
                    return (
                      <div key={tipo}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-700 dark:text-slate-300">{TIPI_LABEL[tipo] || tipo}</span>
                          <span className="text-slate-500 font-mono">{n} ({pct}%)</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden">
                          <div className="h-full rounded-full bg-amber-500" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top tecnici */}
              <div className="bg-white dark:bg-[#0c1a35] border border-slate-100 dark:border-white/5 rounded-xl p-5">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Ore per tecnico</p>
                {topTecnici.length === 0 ? (
                  <p className="text-sm text-slate-600">Nessun dato ore</p>
                ) : (
                  <div className="space-y-2.5">
                    {topTecnici.map(([nome, d]) => {
                      const maxOre = topTecnici[0][1].ore;
                      const pct = Math.round((d.ore / maxOre) * 100);
                      return (
                        <div key={nome}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-700 dark:text-slate-300">{nome}</span>
                            <span className="text-slate-500 font-mono">{d.ore}h ({d.n} int.)</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden">
                            <div className="h-full rounded-full bg-sky-500" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tabella interventi filtrati */}
          <div className="bg-white dark:bg-[#0c1a35] border border-slate-100 dark:border-white/5 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                Interventi nel periodo
              </p>
              <span className="text-xs text-slate-500 font-mono">{filtered.length}</span>
            </div>
            {filtered.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm text-slate-500">Nessun intervento nel periodo selezionato</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-white/3 border-b border-slate-100 dark:border-white/5">
                      <th className="text-left px-4 py-2.5 text-xs text-slate-500 font-medium">Data</th>
                      <th className="text-left px-4 py-2.5 text-xs text-slate-500 font-medium">Cliente</th>
                      <th className="text-left px-4 py-2.5 text-xs text-slate-500 font-medium">Tipo</th>
                      <th className="text-right px-4 py-2.5 text-xs text-slate-500 font-medium">Ore</th>
                      <th className="text-right px-4 py-2.5 text-xs text-slate-500 font-medium">Totale</th>
                      <th className="text-center px-4 py-2.5 text-xs text-slate-500 font-medium">Stato</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-white/3">
                    {filtered.map(r => {
                      const totR = (r.materiali || []).reduce(
                        (s, m) => s + (parseFloat(m.quantita) || 0) * (parseFloat(m.prezzoVendita) || 0), 0) +
                        (parseFloat(r.oreManodopera) || 0) * (parseFloat(r.costoOrario) || 0);
                      return (
                        <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-white/2">
                          <td className="px-4 py-2.5 text-xs text-slate-500 font-mono whitespace-nowrap">
                            {fmtData(r.dataInizio ?? r.data)}
                          </td>
                          <td className="px-4 py-2.5 text-sm text-slate-800 dark:text-white">{nomeCliente(r)}</td>
                          <td className="px-4 py-2.5 text-xs text-slate-500">{TIPI_LABEL[r.tipoIntervento] || "—"}</td>
                          <td className="px-4 py-2.5 text-right font-mono text-xs text-slate-500">
                            {r.oreManodopera ? `${r.oreManodopera}h` : "—"}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-sm font-semibold text-amber-400">
                            {totR > 0 ? `${totR.toFixed(2)} €` : "—"}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <StatoBadge stato={r.stato} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════ TAB PDF ════════════════════════════*/}
      {tab === "pdf" && (
        <div className="space-y-4">
          {/* Ricerca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cerca per cliente, tipo, data, descrizione..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white dark:bg-[#0c1a35] border border-slate-200 dark:border-white/10
                text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-amber-500/40 transition-colors"
            />
            {search && (
              <button onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Lista rapportini */}
          <div className="bg-white dark:bg-[#0c1a35] border border-slate-100 dark:border-white/5 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Seleziona rapportino</p>
              <span className="text-xs text-slate-500 font-mono">{filteredPDF.length}</span>
            </div>

            {filteredPDF.length === 0 ? (
              <div className="py-10 text-center">
                <FileText className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-500">Nessun rapportino trovato</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50 dark:divide-white/3">
                {filteredPDF.map(r => {
                  const totR = (r.materiali || []).reduce(
                    (s, m) => s + (parseFloat(m.quantita) || 0) * (parseFloat(m.prezzoVendita) || 0), 0) +
                    (parseFloat(r.oreManodopera) || 0) * (parseFloat(r.costoOrario) || 0);
                  const tecNome = r.tecnico || tecnici.find(t => t.id === r.tecnicoId)?.nome || "";
                  const loading = loadingId === r.id;
                  return (
                    <div key={r.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-white/2 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            {nomeCliente(r)}
                          </p>
                          <StatoBadge stato={r.stato} />
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {fmtData(r.dataInizio ?? r.data)}
                          {` · ${TIPI_LABEL[r.tipoIntervento] || "Intervento"}`}
                          {tecNome && ` · ${tecNome}`}
                          {totR > 0 && <span className="text-amber-400 font-mono"> · {totR.toFixed(2)} €</span>}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDownloadPDF(r)}
                        disabled={loading}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20
                          text-amber-400 text-xs font-medium hover:bg-amber-500/20 transition-colors disabled:opacity-50 shrink-0">
                        <Download className="w-3.5 h-3.5" />
                        {loading ? "..." : "PDF"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
