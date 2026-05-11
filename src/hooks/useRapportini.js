import { useLocalStorage } from './useLocalStorage';
import { rapportiniIniziali } from '../data/mockData';
import { v4 as uuidv4 } from 'uuid';

export function useRapportini() {
  const [rapportini, setRapportini] = useLocalStorage(
    'rapportini',
    rapportiniIniziali
  );

  const aggiungi = (dati) => {
    const nuovo = { ...dati, id: uuidv4() };
    setRapportini((prev) => [nuovo, ...prev]);
    return nuovo;
  };

  const aggiorna = (id, dati) => {
    setRapportini((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...dati } : r))
    );
  };

  const elimina = (id) => {
    setRapportini((prev) => prev.filter((r) => r.id !== id));
  };

  const eliminaConRipristino = (id) => {
    const rap = rapportini.find((r) => r.id === id);
    if (rap?.materiali?.length > 0) {
      try {
        const mag = JSON.parse(localStorage.getItem('hydrodesk_magazzino') || '[]');
        const updated = mag.map((p) => {
          const usato = rap.materiali
            .filter((m) => m.magazzinoId === p.id)
            .reduce((s, m) => s + (parseFloat(m.quantita) || 0), 0);
          return usato > 0 ? { ...p, quantita: (p.quantita || 0) + usato } : p;
        });
        localStorage.setItem('hydrodesk_magazzino', JSON.stringify(updated));
      } catch {}
    }
    setRapportini((prev) => prev.filter((r) => r.id !== id));
  };

  const getById = (id) => rapportini.find((r) => r.id === id);

  return { rapportini, aggiungi, aggiorna, elimina, eliminaConRipristino, getById };
}
