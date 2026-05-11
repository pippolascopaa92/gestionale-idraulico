import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const DataContext = createContext(null);
export const useData = () => useContext(DataContext);

function applyRt(setter, payload) {
  const { eventType, new: n, old: o } = payload;
  if (eventType === 'INSERT') setter(p => [...p, n]);
  else if (eventType === 'UPDATE') setter(p => p.map(x => x.id === n.id ? n : x));
  else if (eventType === 'DELETE') setter(p => p.filter(x => x.id !== o.id));
}

export function DataProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [clienti,    setClienti]    = useState([]);
  const [rapportini, setRapportini] = useState([]);
  const [magazzino,  setMagazzino]  = useState([]);
  const [commesse,   setCommesse]   = useState([]);
  const [tecnici,    setTecnici]    = useState([]);

  useEffect(() => {
    Promise.all([
      supabase.from('clienti').select('*'),
      supabase.from('rapportini').select('*').order('data', { ascending: false }),
      supabase.from('magazzino').select('*'),
      supabase.from('commesse').select('*'),
      supabase.from('tecnici').select('*'),
    ]).then(([c, r, m, co, t]) => {
      if (!c.error)  setClienti(c.data   ?? []);
      if (!r.error)  setRapportini(r.data ?? []);
      if (!m.error)  setMagazzino(m.data  ?? []);
      if (!co.error) setCommesse(co.data  ?? []);
      if (!t.error)  setTecnici(t.data    ?? []);
      setLoading(false);
    });

    const ch = supabase.channel('hydrodesk_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clienti' },    p => applyRt(setClienti,    p))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rapportini' }, p => applyRt(setRapportini, p))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'magazzino' },  p => applyRt(setMagazzino,  p))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'commesse' },   p => applyRt(setCommesse,   p))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tecnici' },    p => applyRt(setTecnici,    p))
      .subscribe();

    return () => supabase.removeChannel(ch);
  }, []);

  // ── clienti ──────────────────────────────────────────────────────────────────
  const addCliente = async (data) => {
    const nuovo = { ...data, id: `c${Date.now()}`, createdAt: new Date().toISOString() };
    setClienti(p => [...p, nuovo]);
    const { error } = await supabase.from('clienti').insert(nuovo);
    if (error) console.warn('clienti insert:', error.message);
    return nuovo;
  };
  const updateCliente = async (id, data) => {
    setClienti(p => p.map(c => c.id === id ? { ...c, ...data } : c));
    const { error } = await supabase.from('clienti').update(data).eq('id', id);
    if (error) console.warn('clienti update:', error.message);
  };
  const deleteCliente = async (id) => {
    setClienti(p => p.filter(c => c.id !== id));
    const { error } = await supabase.from('clienti').delete().eq('id', id);
    if (error) console.warn('clienti delete:', error.message);
  };

  // ── commesse ──────────────────────────────────────────────────────────────────
  const addCommessa = async (data) => {
    setCommesse(p => [...p, data]);
    const { error } = await supabase.from('commesse').insert(data);
    if (error) console.warn('commesse insert:', error.message);
  };
  const updateCommessa = async (id, patch) => {
    setCommesse(p => p.map(c => c.id === id ? { ...c, ...patch } : c));
    const { error } = await supabase.from('commesse').update(patch).eq('id', id);
    if (error) console.warn('commesse update:', error.message);
  };
  const deleteCommessa = async (id) => {
    setCommesse(p => p.filter(c => c.id !== id));
    const { error } = await supabase.from('commesse').delete().eq('id', id);
    if (error) console.warn('commesse delete:', error.message);
  };

  // ── rapportini ────────────────────────────────────────────────────────────────
  const upsertRapportino = async (data) => {
    setRapportini(p => {
      const exists = p.find(r => r.id === data.id);
      return exists ? p.map(r => r.id === data.id ? data : r) : [data, ...p];
    });
    const { error } = await supabase.from('rapportini').upsert(data, { onConflict: 'id' });
    if (error) console.warn('rapportini upsert:', error.message);
    return data;
  };
  const deleteRapportino = async (id) => {
    setRapportini(p => p.filter(r => r.id !== id));
    const { error } = await supabase.from('rapportini').delete().eq('id', id);
    if (error) console.warn('rapportini delete:', error.message);
  };

  // ── magazzino ─────────────────────────────────────────────────────────────────
  const saveProdotto = async (prodotto) => {
    setMagazzino(p => {
      const exists = p.find(x => x.id === prodotto.id);
      return exists ? p.map(x => x.id === prodotto.id ? prodotto : x) : [...p, prodotto];
    });
    const { error } = await supabase.from('magazzino').upsert(prodotto, { onConflict: 'id' });
    if (error) console.warn('magazzino upsert:', error.message);
  };
  const removeProdotto = async (id) => {
    setMagazzino(p => p.filter(x => x.id !== id));
    const { error } = await supabase.from('magazzino').delete().eq('id', id);
    if (error) console.warn('magazzino delete:', error.message);
  };
  const aggiornaQuantita = async (id, delta) => {
    let nuovaQ = 0;
    setMagazzino(p => p.map(x => {
      if (x.id !== id) return x;
      nuovaQ = Math.max(0, (x.quantita || 0) + delta);
      return { ...x, quantita: nuovaQ };
    }));
    const { error } = await supabase.from('magazzino').update({ quantita: nuovaQ }).eq('id', id);
    if (error) console.warn('magazzino quantita:', error.message);
  };
  const scalaMagazzino = async (materiali) => {
    for (const m of (materiali || [])) {
      if (m.magazzinoId && parseFloat(m.quantita) > 0)
        await aggiornaQuantita(m.magazzinoId, -(parseFloat(m.quantita) || 0));
    }
  };
  const ripristinaMagazzino = async (materiali) => {
    for (const m of (materiali || [])) {
      if (m.magazzinoId && parseFloat(m.quantita) > 0)
        await aggiornaQuantita(m.magazzinoId, parseFloat(m.quantita) || 0);
    }
  };

  // ── tecnici ───────────────────────────────────────────────────────────────────
  const addTecnico = async (data) => {
    setTecnici(p => [...p, data]);
    const { error } = await supabase.from('tecnici').insert(data);
    if (error) console.warn('tecnici insert:', error.message);
  };
  const updateTecnico = async (id, data) => {
    setTecnici(p => p.map(t => t.id === id ? { ...t, ...data } : t));
    const { error } = await supabase.from('tecnici').update(data).eq('id', id);
    if (error) console.warn('tecnici update:', error.message);
  };
  const deleteTecnico = async (id) => {
    setTecnici(p => p.filter(t => t.id !== id));
    const { error } = await supabase.from('tecnici').delete().eq('id', id);
    if (error) console.warn('tecnici delete:', error.message);
  };

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#060d1f', gap: 16 }}>
      <div style={{ color: '#f59e0b', fontSize: 22, fontWeight: 700, fontFamily: 'DM Sans, sans-serif' }}>HydroDesk</div>
      <div style={{ color: '#475569', fontSize: 13, fontFamily: 'DM Sans, sans-serif' }}>Caricamento dati…</div>
      <div style={{ width: 28, height: 28, border: '3px solid #1e2d4a', borderTop: '3px solid #f59e0b', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <DataContext.Provider value={{
      clienti, rapportini, magazzino, commesse, tecnici,
      addCliente, updateCliente, deleteCliente,
      addCommessa, updateCommessa, deleteCommessa,
      upsertRapportino, deleteRapportino,
      saveProdotto, removeProdotto, aggiornaQuantita, scalaMagazzino, ripristinaMagazzino,
      addTecnico, updateTecnico, deleteTecnico,
    }}>
      {children}
    </DataContext.Provider>
  );
}
