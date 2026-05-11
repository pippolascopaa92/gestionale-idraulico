import { useLocalStorage } from './useLocalStorage';
import { rapportiniIniziali } from '../data/mockData';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabase';

export function useRapportini() {
  const [rapportini, setRapportini] = useLocalStorage(
    'rapportini',
    rapportiniIniziali
  );

  const aggiungi = async (dati) => {
    const nuovo = { ...dati, id: uuidv4() };
    setRapportini((prev) => [nuovo, ...prev]);
    try {
      const { error } = await supabase.from('rapportini').insert(nuovo);
      if (error) console.warn('Sync Supabase fallita:', error.message);
    } catch (err) {
      console.warn('Sync Supabase fallita:', err);
    }
    return nuovo;
  };

  const aggiorna = async (id, dati) => {
    setRapportini((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...dati } : r))
    );
    try {
      const { error } = await supabase.from('rapportini').update(dati).eq('id', id);
      if (error) console.warn('Sync Supabase fallita:', error.message);
    } catch (err) {
      console.warn('Sync Supabase fallita:', err);
    }
  };

  const elimina = async (id) => {
    setRapportini((prev) => prev.filter((r) => r.id !== id));
    try {
      const { error } = await supabase.from('rapportini').delete().eq('id', id);
      if (error) console.warn('Sync Supabase fallita:', error.message);
    } catch (err) {
      console.warn('Sync Supabase fallita:', err);
    }
  };

  const eliminaConRipristino = async (id) => {
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
    try {
      const { error } = await supabase.from('rapportini').delete().eq('id', id);
      if (error) console.warn('Sync Supabase fallita:', error.message);
    } catch (err) {
      console.warn('Sync Supabase fallita:', err);
    }
  };

  const getById = (id) => rapportini.find((r) => r.id === id);

  return { rapportini, aggiungi, aggiorna, elimina, eliminaConRipristino, getById };
}
