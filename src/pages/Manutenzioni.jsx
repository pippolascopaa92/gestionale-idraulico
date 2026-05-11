import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Wrench, AlertTriangle, Clock, CheckCircle2, CalendarDays, User, ChevronRight, RefreshCw } from "lucide-react";

// ─── helpers ─────────────────────────────────────────────────────────────────

function readLS(key, fb) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fb; } catch { return fb; }
}

function fmtData(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
}

function daysFromNow(iso) {
  if (!iso) return null;
  const diff = new Date(iso).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0);
  return Math.ceil(diff / 86400000);
}

function scadenzaStatus(iso) {
  const d = daysFromNow(iso);
  if (d === null)   return { label: "—",             color: "text-slate-500",   bg: "bg-slate-500/10",   dot: "bg-slate-500"   };
  if (d < 0)        return { label: "Scaduta",        color: "text-red-400",     bg: "bg-red-400/10",     dot: "bg-red-400"     };
  if (d === 0)      return { label: "Scade oggi",     color: "text-orange-400",  bg: "bg-orange-400/10",  dot: "bg-orange-400"  };
  if (d <= 30)      return { label: `${d}gg`,         color: "text-amber-400",   bg: "bg-amber-400/10",   dot: "bg-amber-400"   };
  return              { label: `${d}gg`,              color: "text-emerald-400", bg: "bg-emerald-400/10", dot: "bg-emerald-400" };
}

const TIPI_LABEL = {
  riparazione:   "Riparazione",
  manutenzione:  "Manutenzione",
  installazione: "Installazione",
  collaudo:      "Collaudo",
  emergenza:     "Emergenza",
};

// ─── componente ──────────────────────────────────────────────────────────────

export default function Manutenzioni() {
  const navigate    = useNavigate();
  const rapportini  = readLS("rapportini", []);
  const clienti     = readLS("hydrodesk_clienti", []);
  const tecnici     = readLS("tecnici", []);

  const items = useMemo(() => {
    return rapportini
      .filter(r => r.isManutenzione)
      .map(r => {
        const cliente = clienti.find(c => c.id === r.clienteId);
        const tecnico = r.tecnico || tecnici.find(t => t.id === r.tecnicoId)?.nome || "";
        return { ...r, _cliente: cliente?.nome || r.cliente || "—", _tecnico: tecnico };
      })
      .sort((a, b) => {
        // scadute prima, poi per data crescente
        const dA = a.prossimaManutenzione ? new Date(a.prossimaManutenzione) : new Date("9999-12-31");
        const dB = b.prossimaManutenzione ? new Date(b.prossimaManutenzione) : new Date("9999-12-31");
        return dA - dB;
      });
  }, [rapportini, clienti, tecnici]);

  const scadute     = items.filter(r => r.prossimaManutenzione && daysFromNow(r.prossimaManutenzione) < 0);
  const inScadenza  = items.filter(r => r.prossimaManutenzione && daysFromNow(r.prossimaManutenzione) >= 0 && daysFromNow(r.prossimaManutenzione) <= 30);
  const ok          = items.filter(r => !r.prossimaManutenzione || daysFromNow(r.prossimaManutenzione) > 30);

  const groups = [
    { key: "scadute",    label: "Scadute",       items: scadute,    icon: AlertTriangle,  iconColor: "text-red-400",     border: "border-red-500/20"    },
    { key: "scadenza",   label: "Entro 30 giorni",items: inScadenza, icon: Clock,          iconColor: "text-amber-400",   border: "border-amber-500/20"  },
    { key: "ok",         label: "In ordine",      items: ok,         icon: CheckCircle2,   iconColor: "text-emerald-400", border: "border-emerald-500/20"},
  ].filter(g => g.items.length > 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-[fadeSlideUp_0.3s_ease_both]">
      <style>{`@keyframes fadeSlideUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Wrench className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Manutenzioni</h1>
          </div>
          <p className="text-sm text-slate-500">Impianti con controllo periodico programmato</p>
        </div>
        <button
          onClick={() => navigate("/rapportino/nuovo")}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#060d1f] text-sm font-semibold transition-all">
          <RefreshCw className="w-4 h-4" />
          Nuovo intervento
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Scadute",        value: scadute.length,    color: "text-red-400",     bg: "bg-red-400/10"    },
          { label: "Entro 30 giorni",value: inScadenza.length, color: "text-amber-400",   bg: "bg-amber-400/10"  },
          { label: "In ordine",      value: ok.length,         color: "text-emerald-400", bg: "bg-emerald-400/10"},
        ].map(({ label, value, color, bg }) => (
          <div key={label} className="bg-white dark:bg-[#0c1a35] border border-slate-100 dark:border-white/5 rounded-xl px-4 py-3 text-center">
            <p className={`text-2xl font-bold font-mono ${color}`}>{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Stato vuoto */}
      {items.length === 0 && (
        <div className="bg-white dark:bg-[#0c1a35] border border-slate-100 dark:border-white/5 rounded-2xl py-16 text-center">
          <Wrench className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="font-semibold text-slate-500 mb-1">Nessuna manutenzione programmata</p>
          <p className="text-sm text-slate-600 max-w-xs mx-auto">
            Attiva "Manutenzione periodica" in un rapportino per inserire la prossima scadenza
          </p>
        </div>
      )}

      {/* Gruppi */}
      {groups.map(({ key, label, items: gItems, icon: Icon, iconColor, border }) => (
        <div key={key} className={`bg-white dark:bg-[#0c1a35] border dark:border-white/5 rounded-2xl overflow-hidden ${border}`}>
          {/* Header gruppo */}
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 dark:border-white/5">
            <Icon className={`w-4 h-4 ${iconColor}`} />
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm">{label}</h3>
            <span className="px-2 py-0.5 rounded-full bg-white/5 text-xs font-mono text-slate-400">
              {gItems.length}
            </span>
          </div>

          {/* Righe */}
          <div className="divide-y divide-slate-100 dark:divide-white/5">
            {gItems.map(r => {
              const st = scadenzaStatus(r.prossimaManutenzione);
              const days = daysFromNow(r.prossimaManutenzione);
              return (
                <div
                  key={r.id}
                  onClick={() => navigate(`/rapportino/${r.id}`)}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-white/2 transition-colors cursor-pointer group">

                  {/* Dot stato */}
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${st.dot}`} />

                  {/* Info principale */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {r._cliente}
                      </p>
                      <span className="text-xs text-slate-500">
                        {TIPI_LABEL[r.tipoIntervento] || r.tipoIntervento || "Intervento"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <CalendarDays className="w-3 h-3" />
                        Ultimo: {fmtData(r.dataInizio ?? r.data)}
                      </span>
                      {r._tecnico && (
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <User className="w-3 h-3" /> {r._tecnico}
                        </span>
                      )}
                      {r.indirizzoIntervento && (
                        <span className="text-xs text-slate-500 truncate max-w-[200px]">{r.indirizzoIntervento}</span>
                      )}
                    </div>
                  </div>

                  {/* Prossima scadenza */}
                  <div className="text-right shrink-0">
                    {r.prossimaManutenzione ? (
                      <>
                        <p className="text-xs text-slate-500 mb-0.5">Prossimo controllo</p>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white font-mono">
                          {fmtData(r.prossimaManutenzione)}
                        </p>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${st.color} ${st.bg}`}>
                          {days !== null && days < 0 ? `${Math.abs(days)}gg fa` : st.label}
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-slate-600">Nessuna scadenza</span>
                    )}
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-400 transition-colors shrink-0" />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
