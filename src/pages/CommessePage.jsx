import { useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import {
  Folder, Search, X, Users, Wrench, ChevronRight, Plus
} from "lucide-react"

function readLS(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback }
}

function formatData(iso) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" })
}

export default function CommessePage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState("")

  const commesse   = useMemo(() => readLS("hydrodesk_commesse", []), [])
  const clienti    = useMemo(() => readLS("hydrodesk_clienti", []), [])
  const rapportini = useMemo(() => readLS("rapportini", []), [])

  const arricchite = useMemo(() =>
    commesse.map(c => {
      const cliente = clienti.find(cl => cl.id === c.clienteId)
      const raps    = rapportini.filter(r => (c.rapportiniIds || []).includes(r.id))
      return { ...c, clienteNome: cliente?.nome || "Cliente sconosciuto", raps }
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [commesse, clienti, rapportini]
  )

  const filtrate = useMemo(() => {
    if (!search.trim()) return arricchite
    const q = search.toLowerCase()
    return arricchite.filter(c =>
      c.nome.toLowerCase().includes(q) ||
      c.descrizione?.toLowerCase().includes(q) ||
      c.clienteNome.toLowerCase().includes(q)
    )
  }, [arricchite, search])

  // Raggruppa per cliente
  const perCliente = useMemo(() => {
    const map = {}
    filtrate.forEach(c => {
      if (!map[c.clienteNome]) map[c.clienteNome] = []
      map[c.clienteNome].push(c)
    })
    return Object.entries(map)
  }, [filtrate])

  const totInterventi = arricchite.reduce((s, c) => s + c.raps.length, 0)

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold dark:text-white text-slate-800">Commesse</h1>
          <p className="text-sm dark:text-slate-400 text-slate-500 mt-0.5">
            {commesse.length} {commesse.length === 1 ? "commessa" : "commesse"}
            {totInterventi > 0 && ` · ${totInterventi} interventi collegati`}
          </p>
        </div>
        <button
          onClick={() => navigate("/clienti")}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-sm font-semibold transition-colors">
          <Plus size={15} />
          Nuova commessa
        </button>
      </div>

      {/* Ricerca */}
      {commesse.length > 0 && (
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 dark:text-slate-500 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cerca per nome, descrizione o cliente..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm dark:bg-[#080f20] bg-white dark:border-[#1e2d4a] border-slate-200 dark:text-slate-100 text-slate-800 focus:outline-none focus:border-amber-500 transition-colors"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 dark:text-slate-500 text-slate-400">
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {/* Stato vuoto */}
      {commesse.length === 0 && (
        <div className="rounded-2xl border dark:border-[#1e2d4a] border-slate-200 dark:bg-[#080f20] bg-white py-16 text-center">
          <Folder size={40} className="mx-auto mb-3 dark:text-slate-700 text-slate-300" />
          <p className="font-semibold dark:text-slate-300 text-slate-600 mb-1">Nessuna commessa ancora</p>
          <p className="text-sm dark:text-slate-500 text-slate-400 max-w-xs mx-auto mb-6">
            Le commesse si creano dalla scheda di ogni cliente — aprila e usa la sezione "Commesse"
          </p>
          <button
            onClick={() => navigate("/clienti")}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-sm font-semibold transition-colors">
            <Users size={15} /> Vai a Clienti
          </button>
        </div>
      )}

      {/* Nessun risultato ricerca */}
      {commesse.length > 0 && filtrate.length === 0 && (
        <div className="rounded-2xl border dark:border-[#1e2d4a] border-slate-200 dark:bg-[#080f20] bg-white py-10 text-center">
          <p className="dark:text-slate-400 text-slate-500">Nessuna commessa trovata per "{search}"</p>
        </div>
      )}

      {/* Lista raggruppata per cliente */}
      {perCliente.map(([nomeCliente, list]) => (
        <div key={nomeCliente} className="space-y-2">
          {/* Label cliente */}
          <div className="flex items-center gap-2 px-1">
            <Users size={13} className="dark:text-slate-500 text-slate-400" />
            <span className="text-xs font-semibold uppercase tracking-wider dark:text-slate-500 text-slate-400">
              {nomeCliente}
            </span>
            <span className="text-xs dark:text-slate-600 text-slate-400 font-mono">({list.length})</span>
          </div>

          <div className="rounded-2xl border dark:border-[#1e2d4a] border-slate-200 dark:bg-[#080f20] bg-white overflow-hidden">
            <div className="divide-y dark:divide-[#1e2d4a] divide-slate-100">
              {list.map(c => (
                <div
                  key={c.id}
                  onClick={() => navigate("/clienti")}
                  className="flex items-center gap-4 px-5 py-4 hover:dark:bg-white/3 hover:bg-slate-50 transition-colors cursor-pointer group">

                  <div className="w-9 h-9 rounded-xl dark:bg-amber-500/10 bg-amber-50 flex items-center justify-center shrink-0">
                    <Folder size={16} className="text-amber-400" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold dark:text-white text-slate-800 truncate">{c.nome}</p>
                    {c.descrizione && (
                      <p className="text-xs dark:text-slate-400 text-slate-500 truncate mt-0.5">{c.descrizione}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className="flex items-center gap-1 text-xs dark:text-slate-500 text-slate-400">
                        <Wrench size={10} />
                        {c.raps.length} {c.raps.length === 1 ? "intervento" : "interventi"}
                      </span>
                      <span className="text-xs dark:text-slate-600 text-slate-400">
                        {formatData(c.createdAt)}
                      </span>
                    </div>
                  </div>

                  <ChevronRight size={15} className="dark:text-slate-600 text-slate-300 group-hover:text-amber-400 transition-colors shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}

      {/* Nota footer */}
      {commesse.length > 0 && (
        <p className="text-xs dark:text-slate-600 text-slate-400 text-center pb-4">
          Per creare o modificare le commesse apri la scheda di un cliente → sezione "Commesse"
        </p>
      )}
    </div>
  )
}
