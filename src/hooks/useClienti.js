import { useLocalStorage } from './useLocalStorage';
import { clientiIniziali } from '../data/mockData';
import { v4 as uuidv4 } from 'uuid';

export function useClienti() {
  const [clienti, setClienti] = useLocalStorage('clienti', clientiIniziali);

  const aggiungi = (dati) => {
    const nuovo = { ...dati, id: uuidv4() };
    setClienti((prev) => [...prev, nuovo]);
    return nuovo;
  };

  const aggiorna = (id, dati) => {
    setClienti((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...dati } : c))
    );
  };

  const elimina = (id) => {
    setClienti((prev) => prev.filter((c) => c.id !== id));
  };

  const getById = (id) => clienti.find((c) => c.id === id);

  return { clienti, aggiungi, aggiorna, elimina, getById };
}
