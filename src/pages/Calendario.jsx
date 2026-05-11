import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Calendar,
  Clock,
  MapPin,
  User,
  Wrench,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  FileText,
  Zap,
  Settings,
  Hammer,
} from 'lucide-react'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
  getHours,
  getMinutes,
} from 'date-fns'
import { it } from 'date-fns/locale'

// ─── Costanti ────────────────────────────────────────────────────────────────

const TIPO_CONFIG = {
  riparazione: {
    label: 'Riparazione',
    color: 'bg-red-500',
    colorLight: 'bg-red-500/20',
    textColor: 'text-red-400',
    borderColor: 'border-red-500/40',
    icon: Wrench,
  },
  manutenzione: {
    label: 'Manutenzione',
    color: 'bg-blue-500',
    colorLight: 'bg-blue-500/20',
    textColor: 'text-blue-400',
    borderColor: 'border-blue-500/40',
    icon: Settings,
  },
  installazione: {
    label: 'Installazione',
    color: 'bg-amber-500',
    colorLight: 'bg-amber-500/20',
    textColor: 'text-amber-400',
    borderColor: 'border-amber-500/40',
    icon: Hammer,
  },
  collaudo: {
    label: 'Collaudo',
    color: 'bg-green-500',
    colorLight: 'bg-green-500/20',
    textColor: 'text-green-400',
    borderColor: 'border-green-500/40',
    icon: CheckCircle,
  },
  emergenza: {
    label: 'Emergenza',
    color: 'bg-orange-500',
    colorLight: 'bg-orange-500/20',
    textColor: 'text-orange-400',
    borderColor: 'border-orange-500/40',
    icon: Zap,
  },
}

const STATO_CONFIG = {
  bozza: { label: 'Bozza', color: 'text-slate-400', bg: 'bg-slate-700' },
  completato: { label: 'Completato', color: 'text-green-400', bg: 'bg-green-900/40' },
  inviato: { label: 'Inviato', color: 'text-blue-400', bg: 'bg-blue-900/40' },
  fatturato: { label: 'Fatturato', color: 'text-amber-400', bg: 'bg-amber-900/40' },
}

const GIORNI_SETTIMANA = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildGoogleCalendarUrl(rapportino) {
  const base = 'https://calendar.google.com/calendar/render'
  const title = encodeURIComponent(
    `[HydroDesk] ${TIPO_CONFIG[rapportino.tipo]?.label || rapportino.tipo} — ${rapportino.cliente || 'Cliente'}`
  )

  // date-time format richiesto da Google: YYYYMMDDTHHmmssZ
  const toGcalDate = (isoStr) => {
    if (!isoStr) return ''
    try {
      const d = parseISO(isoStr)
      return format(d, "yyyyMMdd'T'HHmmss")
    } catch {
      return ''
    }
  }

  const start = toGcalDate(rapportino.data)
  const end = toGcalDate(rapportino.dataFine)
  const dates = start && end ? `${start}/${end}` : start || ''

  const location = encodeURIComponent(rapportino.indirizzoIntervento || '')
  const details = encodeURIComponent(
    [
      `Tipo: ${TIPO_CONFIG[rapportino.tipo]?.label || rapportino.tipo}`,
      rapportino.tecnico ? `Tecnico: ${rapportino.tecnico}` : '',
      rapportino.descrizione ? `Note: ${rapportino.descrizione}` : '',
    ]
      .filter(Boolean)
      .join('\n')
  )

  return `${base}?action=TEMPLATE&text=${title}&dates=${dates}&location=${location}&details=${details}`
}

// ─── Normalizzazione campi (compatibilità con NuovoRapportino) ───────────────
// NuovoRapportino salva: tipoIntervento, clienteId, tecnicoId, data (YYYY-MM-DD), oraInizio, oraFine
// Calendario si aspetta:  tipo,           cliente,   tecnico,  data (ISO datetime), dataFine

function normalizeRapportino(r, clienti, tecnici) {
  const tipo    = r.tipoIntervento || r.tipo || 'riparazione'
  const cliente = r.cliente || clienti.find(c => c.id === r.clienteId)?.nome || ''
  const tecnico = r.tecnico || tecnici.find(t => t.id === r.tecnicoId)?.nome || ''

  // Costruisce data ISO con orario se disponibile
  let data = r.data || ''
  if (data && r.oraInizio && !data.includes('T')) {
    data = `${data}T${r.oraInizio}`
  }

  // Costruisce dataFine ISO
  let dataFine = r.dataFine || ''
  if (!dataFine && r.data && r.oraFine) {
    dataFine = `${r.data}T${r.oraFine}`
  }

  return { ...r, tipo, cliente, tecnico, data, dataFine }
}

function getRapportiniFromStorage() {
  try {
    const raw = localStorage.getItem('rapportini')
    if (!raw) return []
    const lista   = JSON.parse(raw)
    const clienti = JSON.parse(localStorage.getItem('hydrodesk_clienti') || '[]')
    const tecnici = JSON.parse(localStorage.getItem('tecnici') || '[]')
    return lista.map(r => normalizeRapportino(r, clienti, tecnici))
  } catch {
    return []
  }
}

// ─── Popup Google Calendar ────────────────────────────────────────────────────

function GoogleCalendarPopup({ rapportino, onConfirm, onSkip }) {
  const tipo = TIPO_CONFIG[rapportino?.tipo] || {}
  const TipoIcon = tipo.icon || Calendar

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onSkip}
      />

      {/* Card */}
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white dark:bg-[#0f2040] border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden">
        {/* Header colorato */}
        <div className="bg-slate-50 dark:bg-gradient-to-r dark:from-[#1a3560] dark:to-[#0f2040] px-6 py-5 border-b border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
              <Calendar size={20} className="text-amber-400" />
            </div>
            <div>
              <h3 className="text-slate-900 dark:text-white font-semibold text-base">Aggiungi a Google Calendar</h3>
              <p className="text-slate-400 text-sm">Vuoi sincronizzare questo intervento?</p>
            </div>
          </div>
        </div>

        {/* Dettagli intervento */}
        <div className="px-6 py-4 space-y-3">
          <div className={`flex items-center gap-3 px-3 py-2 rounded-lg ${tipo.colorLight || 'bg-slate-700/50'} border ${tipo.borderColor || 'border-slate-200 dark:border-white/10'}`}>
            <TipoIcon size={16} className={tipo.textColor || 'text-slate-300'} />
            <span className={`text-sm font-medium ${tipo.textColor || 'text-slate-300'}`}>
              {tipo.label || rapportino?.tipo}
            </span>
          </div>

          {rapportino?.cliente && (
            <div className="flex items-center gap-2 text-slate-300 text-sm">
              <User size={14} className="text-slate-500 flex-shrink-0" />
              <span>{rapportino.cliente}</span>
            </div>
          )}

          {rapportino?.indirizzoIntervento && (
            <div className="flex items-start gap-2 text-slate-300 text-sm">
              <MapPin size={14} className="text-slate-500 flex-shrink-0 mt-0.5" />
              <span>{rapportino.indirizzoIntervento}</span>
            </div>
          )}

          {(rapportino?.data) && (
            <div className="flex items-center gap-2 text-slate-300 text-sm">
              <Clock size={14} className="text-slate-500 flex-shrink-0" />
              <span>
                {rapportino.data
                  ? format(parseISO(rapportino.data), 'dd/MM/yyyy HH:mm', { locale: it })
                  : '—'}
                {rapportino.dataFine
                  ? ` → ${format(parseISO(rapportino.dataFine), 'HH:mm', { locale: it })}`
                  : ''}
              </span>
            </div>
          )}
        </div>

        {/* Azioni */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onConfirm}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#060d1f] font-semibold text-sm transition-colors"
          >
            <ExternalLink size={15} />
            Aggiungi a Google Calendar
          </button>
          <button
            onClick={onSkip}
            className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-300 font-medium text-sm transition-colors border border-slate-200 dark:border-white/10"
          >
            Salta
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Dettaglio giorno (pannello laterale) ─────────────────────────────────────

function PannelloGiorno({ giorno, interventi, onClose, onNuovoIntervento, onOpenGcal }) {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-white/10">
        <div>
          <p className="text-slate-400 text-xs uppercase tracking-widest font-medium">
            {format(giorno, 'EEEE', { locale: it })}
          </p>
          <h3 className="text-slate-900 dark:text-white font-bold text-xl mt-0.5">
            {format(giorno, 'd MMMM yyyy', { locale: it })}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* CTA Nuovo */}
      <div className="px-5 py-3 border-b border-slate-200 dark:border-white/10">
        <button
          onClick={() => onNuovoIntervento(giorno)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#060d1f] font-semibold text-sm transition-colors"
        >
          <Plus size={15} />
          Nuovo intervento in questo giorno
        </button>
      </div>

      {/* Lista interventi */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {interventi.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-3">
              <Calendar size={22} className="text-slate-600" />
            </div>
            <p className="text-slate-500 text-sm">Nessun intervento pianificato</p>
            <p className="text-slate-600 text-xs mt-1">Clicca il pulsante sopra per aggiungerne uno</p>
          </div>
        ) : (
          interventi.map((r) => {
            const tipo = TIPO_CONFIG[r.tipo] || {}
            const stato = STATO_CONFIG[r.stato] || STATO_CONFIG.bozza
            const TipoIcon = tipo.icon || Wrench

            return (
              <div
                key={r.id}
                className={`rounded-xl border ${tipo.borderColor || 'border-slate-200 dark:border-white/10'} bg-black/[0.02] dark:bg-white/[0.03] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors overflow-hidden`}
              >
                {/* Banda colorata top */}
                <div className={`h-1 w-full ${tipo.color || 'bg-slate-600'}`} />

                <div className="p-4">
                  {/* Tipo + stato */}
                  <div className="flex items-center justify-between mb-3">
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ${tipo.colorLight || 'bg-slate-700/50'}`}>
                      <TipoIcon size={12} className={tipo.textColor || 'text-slate-300'} />
                      <span className={`text-xs font-medium ${tipo.textColor || 'text-slate-300'}`}>
                        {tipo.label || r.tipo}
                      </span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${stato.bg} ${stato.color}`}>
                      {stato.label}
                    </span>
                  </div>

                  {/* Cliente */}
                  {r.cliente && (
                    <p className="text-slate-900 dark:text-white font-semibold text-sm mb-2">{r.cliente}</p>
                  )}

                  {/* Ora */}
                  {r.data && (
                    <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                      <Clock size={11} />
                      <span>
                        {format(parseISO(r.data), 'HH:mm')}
                        {r.dataFine || r.data ? ` – ${format(parseISO(r.dataFine || r.data), 'HH:mm')}` : ''}
                      </span>
                    </div>
                  )}

                  {/* Indirizzo */}
                  {r.indirizzoIntervento && (
                    <div className="flex items-start gap-1.5 text-slate-400 text-xs mb-1">
                      <MapPin size={11} className="flex-shrink-0 mt-0.5" />
                      <span className="truncate">{r.indirizzoIntervento}</span>
                    </div>
                  )}

                  {/* Tecnico */}
                  {r.tecnico && (
                    <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-3">
                      <User size={11} />
                      <span>{r.tecnico}</span>
                    </div>
                  )}

                  {/* Azioni */}
                  <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-white/5">
                    <button
                      onClick={() => navigate(`/rapportino/${r.id}`)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-300 text-xs font-medium transition-colors"
                    >
                      <FileText size={12} />
                      Apri rapportino
                    </button>
                    {r.data && (
                      <button
                        onClick={() => onOpenGcal(r)}
                        className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-amber-500/20 text-slate-400 hover:text-amber-400 text-xs transition-colors"
                        title="Aggiungi a Google Calendar"
                      >
                        <ExternalLink size={12} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

// ─── Componente principale ────────────────────────────────────────────────────

export default function Calendario({ embedded = false }) {
  const navigate = useNavigate()

  const [meseCorrente, setMeseCorrente] = useState(new Date())
  const [giornoSelezionato, setGiornoSelezionato] = useState(null)
  const [gcalPopup, setGcalPopup] = useState(null) // rapportino da esportare
  const [filtroTipo, setFiltroTipo] = useState(null) // null = tutti

  // Legge rapportini da localStorage
  const rapportini = useMemo(() => getRapportiniFromStorage(), [meseCorrente, giornoSelezionato])

  // Costruisce mappa giorno → [rapportini]
  const mappaGiorni = useMemo(() => {
    const mappa = {}
    rapportini.forEach((r) => {
      const dataStr = r.data?.slice(0, 10) // 'YYYY-MM-DD'
      if (!dataStr) return
      if (filtroTipo && r.tipo !== filtroTipo) return
      if (!mappa[dataStr]) mappa[dataStr] = []
      mappa[dataStr].push(r)
    })
    return mappa
  }, [rapportini, filtroTipo])

  // Giorni da mostrare nella griglia (lunedì → domenica)
  const giorniGriglia = useMemo(() => {
    const inizio = startOfWeek(startOfMonth(meseCorrente), { weekStartsOn: 1 })
    const fine = endOfWeek(endOfMonth(meseCorrente), { weekStartsOn: 1 })
    return eachDayOfInterval({ start: inizio, end: fine })
  }, [meseCorrente])

  const interventiGiornoSelezionato = useMemo(() => {
    if (!giornoSelezionato) return []
    const key = format(giornoSelezionato, 'yyyy-MM-dd')
    return mappaGiorni[key] || []
  }, [giornoSelezionato, mappaGiorni])

  const handleGiornoClick = useCallback((giorno) => {
    setGiornoSelezionato((prev) => (prev && isSameDay(prev, giorno) ? null : giorno))
  }, [])

  const handleNuovoIntervento = useCallback((giorno) => {
    const dataStr = format(giorno, "yyyy-MM-dd'T'09:00")
    navigate(`/rapportino/nuovo?data=${encodeURIComponent(dataStr)}`)
  }, [navigate])

  const handleOpenGcal = useCallback((rapportino) => {
    setGcalPopup(rapportino)
  }, [])

  const handleGcalConfirm = useCallback(() => {
    if (!gcalPopup) return
    window.open(buildGoogleCalendarUrl(gcalPopup), '_blank', 'noopener,noreferrer')
    setGcalPopup(null)
  }, [gcalPopup])

  // Conteggio totale mese corrente
  const totaleInterventiMese = useMemo(() => {
    const prefix = format(meseCorrente, 'yyyy-MM')
    return rapportini.filter((r) => r.data?.startsWith(prefix)).length
  }, [rapportini, meseCorrente])

  return (
    <div className="flex h-full bg-slate-50 dark:bg-[#060d1f] text-slate-900 dark:text-white overflow-hidden">
      {/* ── Colonna principale ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Header */}
        <div className="flex-shrink-0 px-6 pt-6 pb-4">
          {!embedded && (
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Calendario</h1>
                <p className="text-slate-400 text-sm mt-0.5">
                  {totaleInterventiMese} interventi in {format(meseCorrente, 'MMMM yyyy', { locale: it })}
                </p>
              </div>
              <button
                onClick={() => navigate('/rapportino/nuovo')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#060d1f] font-semibold text-sm transition-colors"
              >
                <Plus size={16} />
                Nuovo intervento
              </button>
            </div>
          )}

          {/* Navigazione mese */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMeseCorrente((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
                className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors border border-slate-200 dark:border-white/10"
              >
                <ChevronLeft size={17} />
              </button>

              <h2 className="text-lg font-bold text-slate-900 dark:text-white min-w-[180px] text-center capitalize">
                {format(meseCorrente, 'MMMM yyyy', { locale: it })}
              </h2>

              <button
                onClick={() => setMeseCorrente((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
                className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors border border-slate-200 dark:border-white/10"
              >
                <ChevronRight size={17} />
              </button>

              <button
                onClick={() => setMeseCorrente(new Date())}
                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-xs font-medium border border-slate-200 dark:border-white/10 transition-colors ml-2"
              >
                Oggi
              </button>
            </div>

            {/* Filtro tipo */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setFiltroTipo(null)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filtroTipo === null
                    ? 'bg-black/10 dark:bg-white/15 text-slate-900 dark:text-white'
                    : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10'
                }`}
              >
                Tutti
              </button>
              {Object.entries(TIPO_CONFIG).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setFiltroTipo(filtroTipo === key ? null : key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    filtroTipo === key
                      ? `${cfg.colorLight} ${cfg.textColor} border ${cfg.borderColor}`
                      : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${cfg.color}`} />
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Griglia calendario */}
        <div className="flex-1 overflow-auto px-6 pb-6">
          {/* Intestazioni giorni */}
          <div className="grid grid-cols-7 mb-2">
            {GIORNI_SETTIMANA.map((g) => (
              <div key={g} className="text-center text-xs font-semibold text-slate-500 uppercase tracking-widest py-2">
                {g}
              </div>
            ))}
          </div>

          {/* Celle giorni */}
          <div className="grid grid-cols-7 gap-1.5">
            {giorniGriglia.map((giorno) => {
              const key = format(giorno, 'yyyy-MM-dd')
              const interventi = mappaGiorni[key] || []
              const isCurrentMonth = isSameMonth(giorno, meseCorrente)
              const isSelected = giornoSelezionato && isSameDay(giorno, giornoSelezionato)
              const isHoje = isToday(giorno)

              // Raggruppa interventi per tipo (per dots)
              const tipiPresenti = [...new Set(interventi.map((r) => r.tipo))]

              return (
                <button
                  key={key}
                  onClick={() => handleGiornoClick(giorno)}
                  className={`
                    relative min-h-[90px] p-2 rounded-xl text-left transition-all group
                    ${!isCurrentMonth ? 'opacity-30' : ''}
                    ${isSelected
                      ? 'bg-amber-500/20 border-2 border-amber-500/60 shadow-lg shadow-amber-500/10'
                      : isHoje
                        ? 'bg-black/[0.04] dark:bg-white/[0.07] border border-black/10 dark:border-white/20 hover:bg-black/[0.07] dark:hover:bg-white/10'
                        : 'bg-black/[0.02] dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 hover:bg-black/[0.04] dark:hover:bg-white/[0.07] hover:border-slate-200 dark:hover:border-white/10'
                    }
                  `}
                >
                  {/* Numero giorno */}
                  <div className={`
                    inline-flex items-center justify-center w-7 h-7 rounded-lg text-sm font-semibold mb-1
                    ${isHoje
                      ? 'bg-amber-500 text-[#060d1f]'
                      : isSelected
                        ? 'text-amber-400'
                        : 'text-slate-300'
                    }
                  `}>
                    {format(giorno, 'd')}
                  </div>

                  {/* Badge numero interventi */}
                  {interventi.length > 0 && (
                    <div className="absolute top-2 right-2">
                      <span className={`
                        inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full text-xs font-bold
                        ${isSelected ? 'bg-amber-500 text-[#060d1f]' : 'bg-black/10 dark:bg-white/15 text-slate-800 dark:text-white'}
                      `}>
                        {interventi.length}
                      </span>
                    </div>
                  )}

                  {/* Preview interventi (max 2 visibili) */}
                  <div className="space-y-1 mt-1">
                    {interventi.slice(0, 2).map((r) => {
                      const tipo = TIPO_CONFIG[r.tipo] || {}
                      return (
                        <div
                          key={r.id}
                          className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded-md ${tipo.colorLight || 'bg-slate-700/50'}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${tipo.color || 'bg-slate-500'}`} />
                          <span className="text-[10px] font-medium text-slate-300 truncate leading-tight">
                            {r.cliente || tipo.label || r.tipo}
                          </span>
                        </div>
                      )
                    })}
                    {interventi.length > 2 && (
                      <p className="text-[10px] text-slate-500 pl-1">
                        +{interventi.length - 2} altri
                      </p>
                    )}
                  </div>

                  {/* Dots tipi (se nessuna preview) */}
                  {interventi.length === 0 && (
                    <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Plus size={12} className="text-slate-600" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Legenda */}
          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/5">
            <p className="text-xs text-slate-600 uppercase tracking-widest font-medium mb-3">Legenda</p>
            <div className="flex flex-wrap gap-3">
              {Object.entries(TIPO_CONFIG).map(([key, cfg]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${cfg.color}`} />
                  <span className="text-xs text-slate-400">{cfg.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Pannello laterale giorno selezionato ───────────────────── */}
      {giornoSelezionato && (
        <div className="w-80 flex-shrink-0 border-l border-slate-200 dark:border-slate-200 dark:border-white/10 bg-white dark:bg-[#080f20] overflow-hidden flex flex-col">
          <PannelloGiorno
            giorno={giornoSelezionato}
            interventi={interventiGiornoSelezionato}
            onClose={() => setGiornoSelezionato(null)}
            onNuovoIntervento={handleNuovoIntervento}
            onOpenGcal={handleOpenGcal}
          />
        </div>
      )}

      {/* ── Popup Google Calendar ──────────────────────────────────── */}
      {gcalPopup && (
        <GoogleCalendarPopup
          rapportino={gcalPopup}
          onConfirm={handleGcalConfirm}
          onSkip={() => setGcalPopup(null)}
        />
      )}
    </div>
  )
}
