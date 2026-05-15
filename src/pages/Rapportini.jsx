import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useData } from '../context/DataContext';
import { Search, Trash2, Edit2, Check, Calendar, User, MapPin, Wrench, AlertTriangle, X, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';

const TRASH_KEY = 'hydrodesk:trash_rapportini';
const readTrash  = () => { try { return JSON.parse(localStorage.getItem(TRASH_KEY) || '[]'); } catch { return []; } };
const saveTrash  = (list) => { try { localStorage.setItem(TRASH_KEY, JSON.stringify(list)); } catch {} };

function DeleteModal({ rapportino, onConfirm, onCancel }) {
  const tipoLabel = rapportino?.tipoIntervento
    ? rapportino.tipoIntervento.charAt(0).toUpperCase() + rapportino.tipoIntervento.slice(1)
    : 'Rapportino';
  const dataLabel = rapportino?.data
    ? new Date(rapportino.data).toLocaleDateString('it-IT')
    : '';
  const nMat = rapportino?.materiali?.filter(m => m.magazzinoId)?.length || 0;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative rounded-2xl p-6 w-full max-w-sm shadow-2xl"
           style={{ background: 'var(--bg-elevated)', border: '1px solid rgba(239,68,68,0.2)' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full flex items-center justify-center"
               style={{ background: 'rgba(239,68,68,0.1)' }}>
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
          Eliminare{' '}
          <span className="font-medium" style={{ color: 'var(--text-1)' }}>{tipoLabel}</span>
          {dataLabel && <> del <span className="font-medium" style={{ color: 'var(--text-1)' }}>{dataLabel}</span></>}?
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 px-4 py-2 rounded-xl text-sm transition-colors"
            style={{ border: '1px solid var(--border)', color: 'var(--text-3)' }}>
            Annulla
          </button>
          <button onClick={onConfirm}
            className="flex-1 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
            Elimina
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Rapportini() {
  const { rapportini, clienti, deleteRapportino, ripristinaMagazzino, upsertRapportino } = useData();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const [trash, setTrash] = useState(readTrash);
  const [showTrash, setShowTrash] = useState(false);

  const eliminaConRipristino = async (id) => {
    const rap = rapportini.find(r => r.id === id);
    if (rap) {
      const newTrash = [{ ...rap, deletedAt: new Date().toISOString() }, ...trash];
      saveTrash(newTrash);
      setTrash(newTrash);
    }
    if (rap?.materiali?.length > 0) await ripristinaMagazzino(rap.materiali);
    await deleteRapportino(id);
  };

  const ripristinaRapportino = async (rap) => {
    const { deletedAt, ...data } = rap;
    await upsertRapportino(data);
    const newTrash = trash.filter(r => r.id !== rap.id);
    saveTrash(newTrash);
    setTrash(newTrash);
  };

  const eliminaDefinitivo = (id) => {
    const newTrash = trash.filter(r => r.id !== id);
    saveTrash(newTrash);
    setTrash(newTrash);
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStato, setFilterStato] = useState('');
  const [toDelete, setToDelete] = useState(null);

  const STATI = [
    { value: 'bozza',      label: 'Da svolgere'    },
    { value: 'completato', label: 'In svolgimento'  },
    { value: 'inviato',    label: 'Lavoro svolto'   },
    { value: 'fatturato',  label: 'Fatturato'       },
  ];

  const filteredRapportini = rapportini.filter(r => {
    const matchesSearch =
      r.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.clienteId && r.clienteId.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (r.descrizione && r.descrizione.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (r.indirizzoIntervento && r.indirizzoIntervento.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStato = !filterStato || r.stato === filterStato;

    return matchesSearch && matchesStato;
  });

  const handleDelete = (id) => {
    const rap = rapportini.find(r => r.id === id);
    if (rap) setToDelete(rap);
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-page)" }}>
      {toDelete && (
        <DeleteModal
          rapportino={toDelete}
          onConfirm={() => { eliminaConRipristino(toDelete.id); setToDelete(null); }}
          onCancel={() => setToDelete(null)}
        />
      )}
      <div className="px-4 sm:px-6 py-6 sm:py-8">
        <div className="mb-5">
          {/* Riga titolo + pulsante nuovo (solo desktop) */}
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl sm:text-2xl font-bold" style={{ color: "var(--text-1)" }}>
              Lista Rapportini
            </h1>
            {hasPermission('rapportini.crea') && (
              <button
                onClick={() => navigate('/rapportino/nuovo')}
                className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{ background: "var(--bg-elevated)", color: "var(--text-2)", border: "1px solid var(--border)" }}
              >
                <Wrench size={16} /> Nuovo Rapportino
              </button>
            )}
          </div>
          {/* Ricerca + filtro stato */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" style={{ color: "var(--text-3)" }} />
              <input
                type="text"
                placeholder="Cerca cliente, descrizione, indirizzo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl pl-9 pr-4 py-3 text-sm"
                style={{
                  background: "var(--bg-input)",
                  border: "1px solid var(--border)",
                  color: "var(--input-color)",
                }}
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-70">
                  <X size={14} style={{ color: "var(--text-3)" }} />
                </button>
              )}
            </div>
            <select
              value={filterStato}
              onChange={(e) => setFilterStato(e.target.value)}
              className="rounded-xl px-4 py-3 text-sm sm:w-44"
              style={{
                background: "var(--bg-input)",
                border: "1px solid var(--border)",
                color: "var(--input-color)",
              }}
            >
              <option value="">Tutti gli stati</option>
              {STATI.map(stato => (
                <option key={stato.value} value={stato.value}>
                  {stato.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredRapportini.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-lg text-center" style={{ color: "var(--text-3)" }}>
              Nessun rapporto trovato
            </p>
            {searchTerm || filterStato ? (
              <p className="text-sm mt-2" style={{ color: "var(--text-4)" }}>
                Prova a modificare i filtri di ricerca
              </p>
            ) : (
              <p className="text-sm mt-2" style={{ color: "var(--text-4)" }}>
                Inizia creando il tuo primo rapporto di lavoro
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-0 sm:divide-y sm:divide-solid sm:divide-white/10">
            {filteredRapportini.map(rapportino => {
              const nomeCliente = rapportino.clienteNome
                || clienti.find(c => c.id === rapportino.clienteId)?.nome
                || rapportino.clienteId
                || 'Cliente non specificato';
              const statoBg = rapportino.stato === 'completato' ? '#10b98122' : rapportino.stato === 'bozza' ? '#6b728022' : rapportino.stato === 'inviato' ? '#3b82f622' : '#f59e0b22';
              const statoColor = rapportino.stato === 'completato' ? '#10b981' : rapportino.stato === 'bozza' ? '#6b7280' : rapportino.stato === 'inviato' ? '#3b82f6' : '#f59e0b';
              return (
                <div key={rapportino.id}
                     className="rounded-xl sm:rounded-none px-4 py-4 sm:py-5 transition-colors cursor-pointer active:opacity-70"
                     style={{ background: 'var(--bg-elevated)', border: '1px solid var(--divide)' }}
                     onClick={() => navigate(`/rapportino/${rapportino.id}`)}>
                  <div className="flex items-start justify-between gap-3">
                    {/* Icona + info principali */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="flex items-center justify-center w-11 h-11 rounded-xl shrink-0"
                           style={{ background: "#f59e0b22", border: "1.5px solid #f59e0b44" }}>
                        <Calendar size={20} style={{ color: "#f59e0b" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate" style={{ color: "var(--text-1)" }}>
                          {nomeCliente}
                        </p>
                        <p className="text-sm truncate mt-0.5" style={{ color: "var(--text-3)" }}>
                          {rapportino.indirizzoIntervento || 'Indirizzo non specificato'}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          {rapportino.data && (
                            <span className="text-xs flex items-center gap-1" style={{ color: "var(--text-4)" }}>
                              <Calendar size={10} />
                              {new Date(rapportino.data).toLocaleDateString('it-IT')}
                              {rapportino.oraInizio ? ` · ${rapportino.oraInizio}` : ''}
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                                style={{ background: "#f59e0b22", color: "#f59e0b" }}>
                            {rapportino.tipoIntervento || '—'}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                                style={{ background: statoBg, color: statoColor }}>
                            {STATI.find(s => s.value === rapportino.stato)?.label || rapportino.stato}
                          </span>
                        </div>
                      </div>
                    </div>
                    {/* Azioni */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/rapportino/${rapportino.id}`); }}
                        className="flex items-center justify-center w-10 h-10 rounded-xl transition-colors"
                        style={{ color: "var(--text-2)", background: 'var(--bg-page)' }}
                      >
                        <Edit2 size={17} />
                      </button>
                      {hasPermission('rapportini.elimina') && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(rapportino.id); }}
                          className="flex items-center justify-center w-10 h-10 rounded-xl transition-colors"
                          style={{ color: "#ef4444", background: 'rgba(239,68,68,0.08)' }}
                        >
                          <Trash2 size={17} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Cestino interventi eliminati ── */}
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
                  <div key={rap.id + rap.deletedAt}
                    className="flex items-center gap-3 px-4 py-3"
                    style={{ background: 'var(--bg-elevated)' }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text-2)' }}>
                        #{rap.id.slice(0, 8).toUpperCase()} — {rap.clienteNome || rap.clienteId || 'Cliente'}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-4)' }}>
                        {rap.data ? new Date(rap.data).toLocaleDateString('it-IT') : '—'}
                        {' · '}Eliminato il {new Date(rap.deletedAt).toLocaleDateString('it-IT')}
                      </p>
                    </div>
                    <button
                      onClick={() => ripristinaRapportino(rap)}
                      title="Ripristina"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                      style={{ background: '#10b98120', color: '#10b981', border: '1px solid #10b98130' }}>
                      <RotateCcw size={13} /> Ripristina
                    </button>
                    <button
                      onClick={() => eliminaDefinitivo(rap.id)}
                      title="Elimina definitivamente"
                      className="p-1.5 rounded-lg transition-colors"
                      style={{ color: '#ef4444' }}>
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