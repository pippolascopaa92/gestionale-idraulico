import { useNavigate } from 'react-router-dom'
import { X, Calendar, Clock, MapPin, User, FileText, Package, Edit2, Trash2 } from 'lucide-react'

function statoInfo(val) {
  const MAP = {
    bozza:      { label: 'Da svolgere',   bg: '#6b728022', color: '#6b7280' },
    completato: { label: 'In svolgimento', bg: '#10b98122', color: '#10b981' },
    inviato:    { label: 'Lavoro svolto',  bg: '#3b82f622', color: '#3b82f6' },
    fatturato:  { label: 'Fatturato',      bg: '#f59e0b22', color: '#f59e0b' },
  }
  return MAP[val] || MAP.bozza
}

function formatOrari(r) {
  const parts = []
  if (r.mattinaInizio && r.mattinaFine) parts.push(`Mattina ${r.mattinaInizio}–${r.mattinaFine}`)
  if (r.pomeriggioInizio && r.pomeriggioFine) parts.push(`Pomer. ${r.pomeriggioInizio}–${r.pomeriggioFine}`)
  if (parts.length === 0 && r.oraInizio) parts.push(`${r.oraInizio}${r.oraFine ? '–' + r.oraFine : ''}`)
  if (r.oreManodopera) parts.push(`${r.oreManodopera}h manodopera`)
  return parts.join(' · ') || null
}

export default function RapportinoModal({ rapportino, clienti = [], tecnici = [], onClose, canDelete, onDelete }) {
  const navigate = useNavigate()

  const cliente  = clienti.find(c => c.id === rapportino.clienteId)
  const nomeCliente = rapportino.clienteNome || cliente?.nome || '—'
  const tecnico  = tecnici.find(t => t.id === rapportino.tecnicoId)
  const nomeTecnico = rapportino.tecnicoNome || tecnico?.nome || null
  const stato    = statoInfo(rapportino.stato)
  const orari    = formatOrari(rapportino)

  const materiali     = rapportino.materiali || []
  const totMateriali  = materiali.reduce((s, m) => s + (parseFloat(m.quantita) || 0) * (parseFloat(m.prezzoVendita) || 0), 0)
  const totManodopera = (parseFloat(rapportino.oreManodopera) || 0) * (parseFloat(rapportino.costoOrario) || 0)
  const totTotale     = totMateriali + totManodopera

  function handleEdit() {
    onClose()
    navigate(`/rapportino/${rapportino.id}`)
  }

  function handleDelete() {
    onDelete?.()
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" onClick={onClose}>
      <div className="min-h-full flex items-end sm:items-center justify-center sm:p-4">
        <div
          className="relative w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--divide)' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Drag handle mobile */}
          <div className="flex justify-center pt-3 pb-1 sm:hidden">
            <div className="w-10 h-1 rounded-full" style={{ background: 'var(--divide)' }} />
          </div>

          {/* Header */}
          <div className="flex items-start justify-between px-5 pt-3 pb-4 border-b" style={{ borderColor: 'var(--divide)' }}>
            <div className="flex-1 min-w-0 pr-3">
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                {rapportino.tipoIntervento && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: '#f59e0b22', color: '#f59e0b' }}>
                    {rapportino.tipoIntervento.charAt(0).toUpperCase() + rapportino.tipoIntervento.slice(1)}
                  </span>
                )}
                <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: stato.bg, color: stato.color }}>
                  {stato.label}
                </span>
              </div>
              <p className="font-bold text-lg leading-tight" style={{ color: 'var(--text-1)' }}>{nomeCliente}</p>
              <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--text-4)' }}>
                #{rapportino.id?.slice(0, 8).toUpperCase()}
              </p>
            </div>
            <button onClick={onClose}
              className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
              style={{ background: 'var(--bg-page)', color: 'var(--text-4)' }}>
              <X size={17} />
            </button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto px-5 py-4 space-y-4" style={{ maxHeight: '55vh' }}>

            {/* Info principali */}
            <div className="space-y-2.5">
              {rapportino.data && (
                <div className="flex items-start gap-3">
                  <Calendar size={15} className="shrink-0 mt-0.5" style={{ color: '#f59e0b' }} />
                  <span className="text-sm" style={{ color: 'var(--text-2)' }}>
                    {new Date(rapportino.data + 'T00:00:00').toLocaleDateString('it-IT', {
                      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                    })}
                  </span>
                </div>
              )}
              {orari && (
                <div className="flex items-start gap-3">
                  <Clock size={15} className="shrink-0 mt-0.5" style={{ color: 'var(--text-4)' }} />
                  <span className="text-sm" style={{ color: 'var(--text-2)' }}>{orari}</span>
                </div>
              )}
              {rapportino.indirizzoIntervento && (
                <div className="flex items-start gap-3">
                  <MapPin size={15} className="shrink-0 mt-0.5" style={{ color: 'var(--text-4)' }} />
                  <span className="text-sm" style={{ color: 'var(--text-2)' }}>{rapportino.indirizzoIntervento}</span>
                </div>
              )}
              {nomeTecnico && (
                <div className="flex items-start gap-3">
                  <User size={15} className="shrink-0 mt-0.5" style={{ color: 'var(--text-4)' }} />
                  <span className="text-sm" style={{ color: 'var(--text-2)' }}>{nomeTecnico}</span>
                </div>
              )}
            </div>

            {/* Descrizione */}
            {rapportino.descrizione && (
              <div className="rounded-xl p-3.5" style={{ background: 'var(--bg-page)', border: '1px solid var(--divide)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <FileText size={13} style={{ color: 'var(--text-4)' }} />
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-4)' }}>Descrizione</p>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>{rapportino.descrizione}</p>
              </div>
            )}

            {/* Materiali */}
            {materiali.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Package size={13} style={{ color: 'var(--text-4)' }} />
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-4)' }}>
                    Materiali ({materiali.length})
                  </p>
                </div>
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--divide)' }}>
                  {materiali.map((m, i) => {
                    const tot = (parseFloat(m.quantita) || 0) * (parseFloat(m.prezzoVendita) || 0)
                    return (
                      <div key={i}
                        className="flex items-center justify-between px-3.5 py-2.5"
                        style={{
                          borderBottom: i < materiali.length - 1 ? '1px solid var(--divide)' : 'none',
                          background: 'var(--bg-page)'
                        }}>
                        <span className="text-sm" style={{ color: 'var(--text-2)' }}>{m.nome || '—'}</span>
                        <span className="text-xs font-mono shrink-0 ml-3" style={{ color: 'var(--text-4)' }}>
                          {m.quantita} {m.unita}{tot > 0 ? ` · ${tot.toFixed(2)} €` : ''}
                        </span>
                      </div>
                    )
                  })}
                </div>
                {totTotale > 0 && (
                  <div className="flex justify-between items-center mt-2 px-1">
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-3)' }}>Totale intervento</span>
                    <span className="text-base font-mono font-bold" style={{ color: '#f59e0b' }}>
                      {totTotale.toFixed(2)} €
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Anomalie */}
            {rapportino.anomalie && (
              <div className="rounded-xl p-3.5"
                   style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#ef4444' }}>
                  Anomalie / Note
                </p>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>{rapportino.anomalie}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center gap-2 px-5 py-4 border-t" style={{ borderColor: 'var(--divide)' }}>
            {canDelete && onDelete && (
              <button onClick={handleDelete}
                className="flex items-center justify-center w-12 h-12 rounded-xl shrink-0"
                style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)' }}>
                <Trash2 size={18} />
              </button>
            )}
            <button onClick={handleEdit}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold"
              style={{ background: '#f59e0b', color: '#060d1f' }}>
              <Edit2 size={16} />
              Modifica rapportino
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
