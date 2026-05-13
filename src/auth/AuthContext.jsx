import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// ─── Costanti ─────────────────────────────────────────────────────────────────

const KEY_ACCOUNTS = 'hydrodesk_accounts';
const KEY_SESSION_SS = 'hydrodesk_session';          // sessionStorage (sessione temporanea)
const KEY_SESSION_LS = 'hydrodesk_session_persist';  // localStorage  (ricordami)

export const ALL_PERMS = {
  rapportini: { crea: true, modifica: true, elimina: true },
  magazzino:  { visualizza: true, modifica: true },
  clienti:    { visualizza: true, gestisci: true },
  prezzi: true,
};

export const EMPTY_PERMS = {
  rapportini: { crea: false, modifica: false, elimina: false },
  magazzino:  { visualizza: false, modifica: false },
  clienti:    { visualizza: false, gestisci: false },
  prezzi: false,
};

// ─── Utility ──────────────────────────────────────────────────────────────────

export async function hashPassword(password) {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(password + ':hydrodesk'));
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function readAccounts() {
  try { return JSON.parse(localStorage.getItem(KEY_ACCOUNTS)); } catch { return null; }
}

function saveAccounts(accounts) {
  try { localStorage.setItem(KEY_ACCOUNTS, JSON.stringify(accounts)); } catch {}
}

function readSession() {
  try {
    const ss = sessionStorage.getItem(KEY_SESSION_SS);
    if (ss) return JSON.parse(ss);
    const ls = localStorage.getItem(KEY_SESSION_LS);
    if (ls) return JSON.parse(ls);
    return null;
  } catch { return null; }
}

function writeSession(session, persist) {
  const str = JSON.stringify(session);
  if (persist) {
    localStorage.setItem(KEY_SESSION_LS, str);
  } else {
    sessionStorage.setItem(KEY_SESSION_SS, str);
  }
}

function clearSession() {
  sessionStorage.removeItem(KEY_SESSION_SS);
  localStorage.removeItem(KEY_SESSION_LS);
}

function buildSession(acc) {
  return {
    id: acc.id,
    username: acc.username,
    nome: acc.nome,
    role: acc.role,
    permissions: acc.role === 'dipendente' ? (acc.permissions ?? EMPTY_PERMS) : ALL_PERMS,
  };
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(() => readSession());
  const [accounts, setAcc]    = useState([]);
  const [ready, setReady]     = useState(false);

  // Inizializza accounts da Supabase (con fallback localStorage)
  useEffect(() => {
    supabase.from('accounts').select('*').then(async ({ data, error }) => {
      if (error) console.error('[Auth] Supabase accounts error:', error.message, error.code);
      else console.log('[Auth] Supabase accounts caricati:', data?.length ?? 0);
      if (!error && data && data.length > 0) {
        saveAccounts(data);
        setAcc(data);
        setReady(true);
        return;
      }
      // Supabase vuoto o errore: prova localStorage
      const local = readAccounts();
      if (local && local.length > 0) {
        setAcc(local);
        setReady(true);
        // Migra su Supabase in background
        supabase.from('accounts').upsert(local, { onConflict: 'id' });
        return;
      }
      // Prima esecuzione assoluta: crea admin default
      const hash = await hashPassword('admin');
      const seed = [{
        id: 'account_superadmin',
        username: 'admin',
        passwordHash: hash,
        role: 'superadmin',
        nome: 'Amministratore',
        email: '',
        active: true,
        createdAt: new Date().toISOString(),
        permissions: ALL_PERMS,
      }];
      saveAccounts(seed);
      supabase.from('accounts').upsert(seed, { onConflict: 'id' });
      setAcc(seed);
      setReady(true);
    });
  }, []);

  const persistAccounts = (list) => {
    saveAccounts(list);
    setAcc(list);
    supabase.from('accounts').upsert(list, { onConflict: 'id' });
  };

  // ── Login ──────────────────────────────────────────────────────────────────

  const login = async (username, password, remember = false) => {
    const accs = accounts.length > 0 ? accounts : (readAccounts() || []);
    const acc = accs.find(
      a => a.username.toLowerCase() === username.toLowerCase() && a.active !== false
    );
    if (!acc) return { ok: false, error: 'Utente non trovato o disattivato' };
    const hash = await hashPassword(password);
    if (hash !== acc.passwordHash) return { ok: false, error: 'Password errata' };
    if (acc.trialEndDate) {
      const [y, m, d] = acc.trialEndDate.split('-').map(Number);
      const expiry = new Date(y, m - 1, d, 23, 59, 59, 999);
      if (expiry < new Date()) {
        const formatted = new Date(y, m - 1, d).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
        return { ok: false, error: `Periodo di prova scaduto il ${formatted}. Contatta l'amministratore.`, trialExpired: true };
      }
    }
    const session = buildSession(acc);
    writeSession(session, remember);
    setUser(session);
    return { ok: true };
  };

  const logout = () => {
    clearSession();
    setUser(null);
  };

  // ── Permessi ───────────────────────────────────────────────────────────────

  const hasPermission = useCallback((perm) => {
    if (!user) return false;
    if (user.role === 'superadmin' || user.role === 'socio') return true;
    const parts = perm.split('.');
    if (parts.length === 1) return !!user.permissions?.[parts[0]];
    return !!user.permissions?.[parts[0]]?.[parts[1]];
  }, [user]);

  // ── CRUD account ───────────────────────────────────────────────────────────

  const addAccount = async ({ username, nome, email, role, password, permissions, trialEndDate }) => {
    const hash = await hashPassword(password);
    const nuovo = {
      id: 'account_' + Date.now().toString(36),
      username: username.trim(),
      passwordHash: hash,
      role,
      nome: nome.trim(),
      email: email?.trim() || '',
      active: true,
      createdAt: new Date().toISOString(),
      permissions: role === 'dipendente' ? permissions : ALL_PERMS,
      trialEndDate: trialEndDate || null,
    };
    persistAccounts([...accounts, nuovo]);
    return nuovo;
  };

  const updateAccount = async ({ id, username, nome, email, role, password, permissions, trialEndDate }) => {
    const updated = await Promise.all(accounts.map(async a => {
      if (a.id !== id) return a;
      const patch = {
        username: username.trim(),
        nome: nome.trim(),
        email: email?.trim() || '',
        role,
        permissions: role === 'dipendente' ? permissions : ALL_PERMS,
        trialEndDate: trialEndDate !== undefined ? (trialEndDate || null) : a.trialEndDate,
      };
      if (password) patch.passwordHash = await hashPassword(password);
      return { ...a, ...patch };
    }));
    persistAccounts(updated);
    // Aggiorna la sessione corrente se l'account modificato è l'utente loggato
    if (user?.id === id) {
      const mine = updated.find(a => a.id === id);
      if (mine) {
        const session = buildSession(mine);
        const isPersist = !!localStorage.getItem(KEY_SESSION_LS);
        writeSession(session, isPersist);
        setUser(session);
      }
    }
  };

  const deleteAccount = (id) => {
    persistAccounts(accounts.filter(a => a.id !== id));
  };

  const toggleAccountActive = (id) => {
    persistAccounts(accounts.map(a => a.id === id ? { ...a, active: !a.active } : a));
  };

  const changeOwnPassword = async (currentPassword, newPassword) => {
    const acc = accounts.find(a => a.id === user?.id);
    if (!acc) return { ok: false, error: 'Account non trovato' };
    const hash = await hashPassword(currentPassword);
    if (hash !== acc.passwordHash) return { ok: false, error: 'Password attuale errata' };
    const newHash = await hashPassword(newPassword);
    persistAccounts(accounts.map(a => a.id === acc.id ? { ...a, passwordHash: newHash } : a));
    return { ok: true };
  };

  return (
    <AuthContext.Provider value={{
      user,
      accounts,
      ready,
      login,
      logout,
      hasPermission,
      addAccount,
      updateAccount,
      deleteAccount,
      toggleAccountActive,
      changeOwnPassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
