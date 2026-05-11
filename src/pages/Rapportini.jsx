import { useState } from 'react';
import { useRapportini } from '../hooks/useRapportini';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Search, Trash2, Edit2, Check, Calendar, User, MapPin, Wrench, AlertTriangle, X } from 'lucide-react';

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
  const { rapportini, eliminaConRipristino } = useRapportini();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStato, setFilterStato] = useState('');
  const [toDelete, setToDelete] = useState(null);

  const STATI = [
    { value: 'bozza', label: 'Bozza' },
    { value: 'completato', label: 'Completato' },
    { value: 'inviato', label: 'Inviato' },
    { value: 'fatturato', label: 'Fatturato' },
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
      <div className="px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-1)" }}>
            Lista Rapportini
          </h1>
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Cerca rapportini..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg px-4 py-2 text-sm"
              style={{
                background: "var(--bg-input)",
                border: "1px solid var(--border)",
                color: "var(--input-color)",
                width: "200px",
                maxWidth: "200px"
              }}
            />
            <select
              value={filterStato}
              onChange={(e) => setFilterStato(e.target.value)}
              className="rounded-lg px-3 py-2 text-sm"
              style={{
                background: "var(--bg-input)",
                border: "1px solid var(--border)",
                color: "var(--input-color)",
                minWidth: "100px"
              }}
            >
              <option value="">Tutti gli stati</option>
              {STATI.map(stato => (
                <option key={stato.value} value={stato.value}>
                  {stato.label}
                </option>
              ))}
            </select>
            {hasPermission('rapportini.crea') && (
              <button
                onClick={() => navigate('/rapportino/nuovo')}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{ background: "var(--bg-elevated)", color: "var(--text-2)", border: "1px solid var(--border)" }}
              >
                <Wrench size={16} /> Nuovo Rapportino
              </button>
            )}
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
          <div className="divide-y divide-solid divide-white/10">
            {filteredRapportini.map(rapportino => (
              <div key={rapportino.id} className="px-4 py-5 hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
                   onClick={() => navigate(`/rapportino/${rapportino.id}`)}>
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-xl"
                           style={{ background: "#f59e0b22", border: "1.5px solid #f59e0b44" }}>
                        <Calendar size={18} style={{ color: "#f59e0b" }} />
                      </div>
                      <div>
                        <p className="font-medium" style={{ color: "var(--text-1)" }}>
                          Rapportino #{rapportino.id.slice(0, 8).toUpperCase()}
                        </p>
                        <p className="text-sm" style={{ color: "var(--text-4)" }}>
                          {new Date(rapportino.data).toLocaleDateString('it-IT')} {rapportino.oraInizio || ''}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2">
                      <p className="text-sm font-medium" style={{ color: "var(--text-2)" }}>
                        {rapportino.clienteId ? 'Cliente: ' + (rapportino.clienteId || '') : 'Cliente non specificato'}
                      </p>
                      <p className="text-sm" style={{ color: "var(--text-3)" }}>
                        {rapportino.indirizzoIntervento || 'Indirizzo non specificato'}
                      </p>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{ background: "#f59e0b22", color: "#f59e0b" }}>
                        {rapportino.tipoIntervento || 'Tipo non specificato'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{ background:
                              rapportino.stato === 'completato' ? '#10b98122' :
                              rapportino.stato === 'bozza' ? '#6b728022' :
                              rapportino.stato === 'inviato' ? '#3b82f622' :
                              '#f59e0b22',
                              color:
                              rapportino.stato === 'completato' ? '#10b981' :
                              rapportino.stato === 'bozza' ? '#6b7280' :
                              rapportino.stato === 'inviato' ? '#3b82f6' :
                              '#f59e0b' }}>
                        {rapportino.stato.charAt(0).toUpperCase() + rapportino.stato.slice(1)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/rapportino/${rapportino.id}`);
                      }}
                      className="flex items-center gap-1 p-2 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors"
                      style={{ color: "var(--text-2)" }}
                    >
                      <Edit2 size={16} />
                    </button>
                    {hasPermission('rapportini.elimina') && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(rapportino.id);
                        }}
                        className="flex items-center gap-1 p-2 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors"
                        style={{ color: "#ef4444" }}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}