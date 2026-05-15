import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// ─── Costanti ─────────────────────────────────────────────────────────────────

const KEY_COMPANY   = 'hydrodesk_company';
const KEY_CATEGORIE = 'hydrodesk_categorie';
const CAT_DEFAULT   = ['Rubinetteria', 'Raccorderia', 'Tubi', 'Caldaie', 'Scarichi', 'Accessori', 'Elettrico', 'Altro'];

// ─── Utility localStorage + dispatch evento storage ───────────────────────────

function readLocal(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; }
}

function writeLocal(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    // Notifica altri hook che ascoltano l'evento storage (es. useCompany in Sidebar)
    window.dispatchEvent(new StorageEvent('storage', { key, newValue: JSON.stringify(value) }));
  } catch {}
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ConfigContext = createContext(null);
export const useConfig = () => useContext(ConfigContext);

export function ConfigProvider({ children }) {
  const [company,   setCompany]   = useState(() => readLocal(KEY_COMPANY,   {}));
  const [categorie, setCategorie] = useState(() => readLocal(KEY_CATEGORIE, CAT_DEFAULT));

  useEffect(() => {
    // Carica da Supabase al mount (sovrascrive localStorage se più recente)
    supabase.from('config').select('*').then(({ data, error }) => {
      if (error) {
        // Tabella config non ancora creata: usa solo localStorage (fallback silenzioso)
        return;
      }
      const compRow = data?.find(r => r.key === 'company');
      const catRow  = data?.find(r => r.key === 'categorie');
      if (compRow?.value) {
        setCompany(compRow.value);
        writeLocal(KEY_COMPANY, compRow.value);
      }
      if (catRow?.value) {
        setCategorie(catRow.value);
        writeLocal(KEY_CATEGORIE, catRow.value);
      }
    });

    // Real-time: aggiorna tutti i dispositivi quando un account modifica il config
    const ch = supabase
      .channel('hydrodesk_config_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'config' },
        ({ new: n }) => {
          if (!n) return;
          if (n.key === 'company') {
            setCompany(n.value);
            writeLocal(KEY_COMPANY, n.value);
          } else if (n.key === 'categorie') {
            setCategorie(n.value);
            writeLocal(KEY_CATEGORIE, n.value);
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(ch);
  }, []);

  const saveCompany = async (data) => {
    setCompany(data);
    writeLocal(KEY_COMPANY, data);
    const { error } = await supabase
      .from('config')
      .upsert({ key: 'company', value: data }, { onConflict: 'key' });
    if (error) console.warn('[Config] saveCompany error:', error.message);
  };

  const saveCategorie = async (cats) => {
    setCategorie(cats);
    writeLocal(KEY_CATEGORIE, cats);
    const { error } = await supabase
      .from('config')
      .upsert({ key: 'categorie', value: cats }, { onConflict: 'key' });
    if (error) console.warn('[Config] saveCategorie error:', error.message);
  };

  return (
    <ConfigContext.Provider value={{ company, categorie, saveCompany, saveCategorie }}>
      {children}
    </ConfigContext.Provider>
  );
}
