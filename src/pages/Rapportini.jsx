import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useData } from '../context/DataContext';
import {
  Search, Trash2, Edit2, Calendar, User, MapPin, Wrench, AlertTriangle,
  X, RotateCcw, ChevronDown, ChevronUp, Clock, Package, FileText,
} from 'lucide-react';

const TRASH_KEY = 'hydrodesk:trash_rapportini';
const readTrash  = () => { try { return JSON.parse(localStorage.getItem(TRASH_KEY) || '[]'); } catch { return []; } };
const saveTrash  = (list) => { try { localStorage.setItem(TRASH_KEY, JSON.stringify(list)); } catch {} };

const STATI = [
  { value: 'bozza',      label: 'Da svolgere',   bg: '#6b728022', color: '#6b7280' },
  { value: 'completato', label: 'In svolgimento', bg: '#10b98122', color: '#10b981' },
  { value: 'inviato',    label: 'Lavoro svolto',  bg: '#3b82f622', color: '#3b82f6' },
  { value: 'fatturato',  label: 'Fatturato',      bg: '#f59e0b22', color: '#f59e0b' },
];

function statoInfo(val) {
  return STATI.find(s => s.value === val) || STATI[0];
}

function formatOrari(r) {
  const parts = [];
  if (r.mattinaInizio && r.mattinaFine) parts.push(`Mattina ${r.mattinaInizio}–${r.mattinaFine}`);
  if (r.pomeriggioInizio && r.pomeriggioFine) parts.push(`Pomer. ${r.pomeriggioInizio}–${r.pomeriggioFine}`);
  if (parts.length === 0 && r.oraInizio) parts.push(`${r.oraInizio}${r.oraFine ? '–' + r.oraFine : ''}`);
  if (r.oreManodopera) parts.push(`${r.oreManodopera}h manodopera`);
  return parts.join(' · ') || null;
}

// ─── Modal conferma eliminazione ─────────────────────────────────────────────
function DeleteModal({ rapportino, onConfirm, onCancel }) {
  const tipoLabel = rapportino?.tipoIntervento
    ? rapportino.tipoIntervento.charAt(0).toUpperCase() + rapportino.tipoIntervento.slice(1)
    : 'Rapportino';
  const dataLabel = rapportino?.data ? new Date(rapportino.data).toLocaleDateString('it-IT') : '';
  const nMat = rapportino?.materiali?.filter(m => m.magazzinoId)?.length || 0;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative rounded-2xl p-6 w-full max-w-sm shadow-2xl"
           style={{ background: 'var(--bg-elevated)', border: '1px solid rgba(239,68,68,0.2)' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.1)' }}>
            <AlertTriangle className="w-5 h-5" style={{ color: '#ef4444' }} />
          </div>
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>Elimina rapportino</p>
            <p className="text-xs" style={{ color: 'var(--text-4)' }}>
              {nMat > 0 ? `${nMat} materiale${nMat > 1 ? 'i' : ''} ripristinato${nMat > 1 ? 'i' : ''} in magazzino` : 'Operazione irreversibile'}
            </p>
          </div>
        </div>
        <p className="text-sm mb-6" style={{ color: 'var(--text-3)' }}>
          Eliminare <span className="font-medium" style={{ color: 'var(--text-1)' }}>{tipoLabel}</span>
          {dataLabel && <> del <span className="font-medium" style={{ color: 'var(--text-1)' }}>{dataLabel}</span></>}?
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2.5 rounded-xl text-sm transition-colors"
            style={{ border: '1px solid var(--border)', color: 'var(--text-3)' }}>
            Annulla
          </button>
          <button onClick={onConfirm} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
            style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
            Elimina
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal dettaglio rapportino ───────────────────────────────────────────────
function DetailModal({ rapportino, clienti, tecnici, onClose, onEdit, onDelete, canDelete }) {
  const cliente = clienti.find(c => c.id === rapportino.clienteId);
  const nomeCliente = rapportino.clienteNome || cliente?.nome || '—';
  const tecnico = tecnici.find(t => t.id === rapportino.tecnicoId);
  const nomeTecnico = rapportino.tecnicoNome || tecnico?.nome || null;
  const stato = statoInfo(rapportino.stato);
  const orari = formatOrari(rapportino);

  const materiali = rapportino.materiali || [];
  const totMateriali = materiali.reduce((s, m) => s + (parseFloat(m.quantita) || 0) * (parseFloat(m.prezzoVendita) || 0), 0);
  const totManodopera = (parseFloat(rapportino.oreManodopera) || 0) * (parseFloat(rapportino.costoOrario) || 0);
  const totTotale = totMateriali + totManodopera;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" onClick={onClose}>
      <div className="min-h-full flex items-end sm:items-center justify-center sm:p-4">
        <div
          className="relative w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--divide)' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Handle drag bar su mobile */}
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
              className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0 transition-colors"
              style={{ background: 'var(--bg-page)', color: 'var(--text-4)' }}>
              <X size={17} />
            </button>
          </div>

          {/* Body scrollabile */}
          <div className="overflow-y-auto px-5 py-4 space-y-4" style={{ maxHeight: '55vh' }}>

            {/* Info principali */}
            <div className="space-y-2.5">
              {rapportino.data && (
                <div className="flex items-start gap-3">
                  <Calendar size={15} className="shrink-0 mt-0.5" style={{ color: '#f59e0b' }} />
                  <span className="text-sm" style={{ color: 'var(--text-2)' }}>
                    {new Date(rapportino.data + 'T00:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
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
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-4)' }}>
                    Descrizione
                  </p>
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
                    const tot = (parseFloat(m.quantita) || 0) * (parseFloat(m.prezzoVendita) || 0);
                    return (
                      <div key={i}
                        className="flex items-center justify-between px-3.5 py-2.5"
                        style={{ borderBottom: i < materiali.length - 1 ? '1px solid var(--divide)' : 'none', background: 'var(--bg-page)' }}>
                        <span className="text-sm" style={{ color: 'var(--text-2)' }}>{m.nome || '—'}</span>
                        <span className="text-xs font-mono shrink-0 ml-3" style={{ color: 'var(--text-4)' }}>
                          {m.quantita} {m.unita}{tot > 0 ? ` · ${tot.toFixed(2)} €` : ''}
                        </span>
                      </div>
                    );
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
              <div className="rounded-xl p-3.5" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#ef4444' }}>
                  Anomalie / Note
                </p>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>{rapportino.anomalie}</p>
              </div>
            )}
          </div>

          {/* Footer azioni */}
          <div className="flex items-center gap-2 px-5 py-4 border-t" style={{ borderColor: 'var(--divide)' }}>
            {canDelete && (
              <button onClick={onDelete}
                className="flex items-center justify-center w-12 h-12 rounded-xl shrink-0 transition-colors"
                style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)' }}>
                <Trash2 size={18} />
              </button>
            )}
            <button onClick={onEdit}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold transition-colors"
              style={{ background: '#f59e0b', color: '#060d1f' }}>
              <Edit2 size={16} />
              Modifica rapportino
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Pagina principale ────────────────────────────────────────────────────────
export default function Rapportini() {
  const { rapportini, clienti, tecnici, deleteRapportino, ripristinaMagazzino, upsertRapportino } = useData();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const [trash, setTrash] = useState(readTrash);
  const [showTrash, setShowTrash] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [viewRap, setViewRap] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStato, setFilterStato] = useState('');

  const eliminaConRipristino = async (id) => {
    const rap = rapportini.find(r => r.id === id);
    if (rap) {
      saveTrash([{ ...rap, deletedAt: new Date().toISOString() }, ...trash]);
      setTrash(readTrash());
    }
    if (rap?.materiali?.length > 0) await ripristinaMagazzino(rap.materiali);
    await deleteRapportino(id);
  };

  const ripristinaRapportino = async (rap) => {
    const { deletedAt, ...data } = rap;
    await upsertRapportino(data);
    const next = trash.filter(r => r.id !== rap.id);
    saveTrash(next);
    setTrash(next);
  };

  const eliminaDefinitivo = (id) => {
    const next = trash.filter(r => r.id !== id);
    saveTrash(next);
    setTrash(next);
  };

  const handleDeleteRequest = (rap) => {
    setViewRap(null);
    setToDelete(rap);
  };

  const filteredRapportini = rapportini.filter(r => {
    const q = searchTerm.toLowerCase();
    const nomeCliente = clienti.find(c => c.id === r.clienteId)?.nome || '';
    const matchesSearch =
      r.id.toLowerCase().includes(q) ||
      nomeCliente.toLowerCase().includes(q) ||
      (r.descrizione || '').toLowerCase().includes(q) ||
      (r.indirizzoIntervento || '').toLowerCase().includes(q);
    return matchesSearch && (!filterStato || r.stato === filterStato);
  });

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-page)' }}>

      {/* Modal elimina */}
      {toDelete && (
        <DeleteModal
          rapportino={toDelete}
          onConfirm={() => { eliminaConRipristino(toDelete.id); setToDelete(null); }}
          onCancel={() => setToDelete(null)}
        />
      )}

      {/* Modal dettaglio */}
      {viewRap && (
        <DetailModal
          rapportino={viewRap}
          clienti={clienti}
          tecnici={tecnici}
          onClose={() => setViewRap(null)}
          onEdit={() => { setViewRap(null); navigate(`/rapportino/${viewRap.id}`); }}
          onDelete={() => handleDeleteRequest(viewRap)}
          canDelete={hasPermission('rapportini.elimina')}
        />
      )}

      <div className="px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-1)' }}>
              Lista Rapportini
            </h1>
            {hasPermission('rapportini.crea') && (
              <button
                onClick={() => navigate('/rapportino/nuovo')}
                className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-2)', border: '1px solid var(--border)' }}
              >
                <Wrench size={16} /> Nuovo Rapportino
              </button>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" style={{ color: 'var(--text-3)' }} />
              <input
                type="text"
                placeholder="Cerca cliente, descrizione, indirizzo..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full rounded-xl pl-9 pr-4 py-3 text-sm"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--input-color)' }}
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-70">
                  <X size={14} style={{ color: 'var(--text-3)' }} />
                </button>
              )}
            </div>
            <select
              value={filterStato}
              onChange={e => setFilterStato(e.target.value)}
              className="rounded-xl px-4 py-3 text-sm sm:w-44"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--input-color)' }}
            >
              <option value="">Tutti gli stati</option>
              {STATI.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>

        {/* Lista */}
        {filteredRapportini.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-lg" style={{ color: 'var(--text-3)' }}>Nessun rapportino trovato</p>
            <p className="text-sm mt-2" style={{ color: 'var(--text-4)' }}>
              {searchTerm || filterStato ? 'Prova a modificare i filtri' : 'Inizia creando il tuo primo rapportino'}
            </p>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-0 sm:divide-y sm:divide-solid sm:divide-white/10">
            {filteredRapportini.map(rapportino => {
              const nomeCliente = rapportino.clienteNome
                || clienti.find(c => c.id === rapportino.clienteId)?.nome
                || 'Cliente non specificato';
              const stato = statoInfo(rapportino.stato);
              return (
                <div key={rapportino.id}
                     className="rounded-xl sm:rounded-none px-4 py-4 sm:py-5 transition-colors cursor-pointer active:opacity-70"
                     style={{ background: 'var(--bg-elevated)', border: '1px solid var(--divide)' }}
                     onClick={() => setViewRap(rapportino)}>
                  <div className="flex items-start justify-between gap-3">
                    {/* Icona + info */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="flex items-center justify-center w-11 h-11 rounded-xl shrink-0"
                           style={{ background: '#f59e0b22', border: '1.5px solid #f59e0b44' }}>
                        <Calendar size={20} style={{ color: '#f59e0b' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate" style={{ color: 'var(--text-1)' }}>{nomeCliente}</p>
                        <p className="text-sm truncate mt-0.5" style={{ color: 'var(--text-3)' }}>
                          {rapportino.indirizzoIntervento || 'Indirizzo non specificato'}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          {rapportino.data && (
                            <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-4)' }}>
                              <Calendar size={10} />
                              {new Date(rapportino.data + 'T00:00:00').toLocaleDateString('it-IT')}
                            </span>
                          )}
                          {rapportino.tipoIntervento && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                                  style={{ background: '#f59e0b22', color: '#f59e0b' }}>
                              {rapportino.tipoIntervento}
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                                style={{ background: stato.bg, color: stato.color }}>
                            {stato.label}
                          </span>
                        </div>
                      </div>
                    </div>
                    {/* Bottone modifica rapido */}
                    <button
                      onClick={e => { e.stopPropagation(); navigate(`/rapportino/${rapportino.id}`); }}
                      className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0 transition-colors"
                      style={{ color: 'var(--text-2)', background: 'var(--bg-page)' }}
                      title="Modifica"
                    >
                      <Edit2 size={17} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cestino */}
      <div className="px-4 sm:px-6 pb-8 mt-4">
        <button
          onClick={() => setShowTrash(v => !v)}
          className="flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-xl transition-colors w-full"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-3)' }}
        >
          <Trash2 size={15} />
          Interventi eliminati
          <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs font-mono"
                style={{ background: trash.length > 0 ? '#ef444422' : 'transparent', color: trash.length > 0 ? '#ef4444' : 'var(--text-4)' }}>
            {trash.length}
          </span>
          <span className="ml-auto">{showTrash ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
        </button>

        {showTrash && (
          <div className="mt-3 rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            {trash.length === 0 ? (
              <p className="text-center py-6 text-sm" style={{ color: 'var(--text-4)' }}>Nessun intervento eliminato</p>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--divide)' }}>
                {trash.map(rap => (
                  <div key={rap.id + rap.deletedAt} className="flex items-center gap-3 px-4 py-3"
                       style={{ background: 'var(--bg-elevated)' }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text-2)' }}>
                        #{rap.id.slice(0, 8).toUpperCase()} — {rap.clienteNome || clienti.find(c => c.id === rap.clienteId)?.nome || 'Cliente'}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-4)' }}>
                        {rap.data ? new Date(rap.data + 'T00:00:00').toLocaleDateString('it-IT') : '—'}
                        {' · '}Eliminato il {new Date(rap.deletedAt).toLocaleDateString('it-IT')}
                      </p>
                    </div>
                    <button onClick={() => ripristinaRapportino(rap)} title="Ripristina"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                      style={{ background: '#10b98120', color: '#10b981', border: '1px solid #10b98130' }}>
                      <RotateCcw size={13} /> Ripristina
                    </button>
                    <button onClick={() => eliminaDefinitivo(rap.id)} title="Elimina definitivamente"
                      className="p-1.5 rounded-lg transition-colors" style={{ color: '#ef4444' }}>
                      <X size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
