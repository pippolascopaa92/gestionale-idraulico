import { useLocalStorage } from './useLocalStorage';
import { clientiIniziali } from '../data/mockData';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabase';

export function useClienti() {
  const [clienti, setClienti] = useLocalStorage('clienti', clientiIniziali);

  const aggiungi = async (dati) => {
    const nuovo = { ...dati, id: uuidv4() };
    setClienti((prev) => [...prev, nuovo]);
    try {
      const { error } = await supabase.from('clienti').insert(nuovo);
      if (error) console.warn('Sync Supabase fallita:', error.message);
    } catch (err) {
      console.warn('Sync Supabase fallita:', err);
    }
    return nuovo;
  };

  const aggiorna = async (id, dati) => {
    setClienti((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...dati } : c))
    );
    try {
      const { error } = await supabase.from('clienti').update(dati).eq('id', id);
      if (error) console.warn('Sync Supabase fallita:', error.message);
    } catch (err) {
      console.warn('Sync Supabase fallita:', err);
    }
  };

  const elimina = async (id) => {
    setClienti((prev) => prev.filter((c) => c.id !== id));
    try {
      const { error } = await supabase.from('clienti').delete().eq('id', id);
      if (error) console.warn('Sync Supabase fallita:', error.message);
    } catch (err) {
      console.warn('Sync Supabase fallita:', err);
    }
  };

  const getById = (id) => clienti.find((c) => c.id === id);

  return { clienti, aggiungi, aggiorna, elimina, getById };
}
