import { useState, useRef, useEffect } from 'react';
import {
  Settings, User, Building2, Palette, Plus, Edit2, Trash2,
  Shield, UserCheck, HardHat, Eye, EyeOff, Check, X,
  AlertTriangle, Lock, Upload, Image, KeyRound, Users,
  ToggleLeft, ToggleRight, Sun, Moon, Clock,
} from 'lucide-react';
import { useAuth, ALL_PERMS, EMPTY_PERMS } from '../auth/AuthContext';
import { useTheme } from '../App';
import { useConfig } from '../context/ConfigContext';

// ─── Storage company ──────────────────────────────────────────────────────────

const KEY_COMPANY = 'hydrodesk_company';

function readCompany() {
  try { return JSON.parse(localStorage.getItem(KEY_COMPANY)) || {}; } catch { return {}; }
}
function saveCompany(data) {
  try { localStorage.setItem(KEY_COMPANY, JSON.stringify(data)); } catch {}
}

// ─── Utility ─────────────────────────────────────────────────────────────────

const RUOLI = [
  { value: 'superadmin', label: 'Super Admin', icon: Shield,    color: 'text-red-600 dark:text-red-400',    bg: 'bg-red-50 dark:bg-red-500/10',    border: 'border-red-200 dark:border-red-500/20'    },
  { value: 'socio',      label: 'Socio',       icon: UserCheck, color: 'text-amber-600 dark:text-amber-400',  bg: 'bg-amber-50 dark:bg-amber-500/10',  border: 'border-amber-200 dark:border-amber-500/20'  },
  { value: 'dipendente', label: 'Dipendente',  icon: HardHat,   color: 'text-sky-600 dark:text-sky-400',    bg: 'bg-sky-50 dark:bg-sky-500/10',    border: 'border-sky-200 dark:border-sky-500/20'    },
];

function RuoloBadge({ role }) {
  const r = RUOLI.find(r => r.value === role) || RUOLI[2];
  const Icon = r.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${r.color} ${r.bg} ${r.border}`}>
      <Icon className="w-3 h-3" /> {r.label}
    </span>
  );
}

function iniziali(nome) {
  return (nome || '?').trim().split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

const AVATAR_COLORS = ['from-amber-500 to-orange-600', 'from-sky-500 to-blue-600', 'from-emerald-500 to-teal-600', 'from-violet-500 to-purple-600'];
function avatarColor(id) {
  const i = id ? id.charCodeAt(id.length - 1) % AVATAR_COLORS.length : 0;
  return AVATAR_COLORS[i];
}

function TrialBadge({ trialEndDate }) {
  if (!trialEndDate) return null;
  const [y, m, d] = trialEndDate.split('-').map(Number);
  const expiry = new Date(y, m - 1, d, 23, 59, 59, 999);
  const now = new Date();
  const expired = expiry < now;
  const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
  if (expired) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400">
        <Clock className="w-3 h-3" /> Prova scaduta
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/20 text-violet-700 dark:text-violet-300">
      <Clock className="w-3 h-3" /> Prova: {daysLeft}g rimanenti
    </span>
  );
}

const PERM_LABELS = [
  { section: 'Rapportini', key: 'rapportini', fields: [
    { k: 'crea',     label: 'Crea nuovi rapportini' },
    { k: 'modifica', label: 'Modifica rapportini esistenti' },
    { k: 'elimina',  label: 'Elimina rapportini' },
  ]},
  { section: 'Magazzino', key: 'magazzino', fields: [
    { k: 'visualizza', label: 'Visualizza magazzino' },
    { k: 'modifica',   label: 'Modifica prodotti e quantità' },
  ]},
  { section: 'Clienti', key: 'clienti', fields: [
    { k: 'visualizza', label: 'Visualizza clienti e storico' },
    { k: 'gestisci',   label: 'Aggiungi / modifica / elimina clienti' },
  ]},
];

// ─── Classi input/card riutilizzabili ─────────────────────────────────────────

const inputCls = 'w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-slate-600 outline-none focus:border-amber-400 dark:focus:border-amber-500/50 focus:ring-2 focus:ring-amber-400/10 dark:focus:ring-0 transition-all';
const cardCls  = 'bg-white dark:bg-[#0c1a35] border border-zinc-200 dark:border-white/5 rounded-2xl';

// ─── Modal account ────────────────────────────────────────────────────────────

function AccountModal({ account, onSave, onCancel, isSelf }) {
  const { user } = useAuth();
  const isNew = !account;

  const [form, setForm] = useState({
    username: account?.username || '',
    nome:     account?.nome     || '',
    email:    account?.email    || '',
    role:     account?.role     || 'dipendente',
    password: '',
    confirmPwd: '',
  });
  const [perms, setPerms] = useState(() => {
    if (account?.permissions) return account.permissions;
    return { ...EMPTY_PERMS, rapportini: { ...EMPTY_PERMS.rapportini }, magazzino: { ...EMPTY_PERMS.magazzino }, clienti: { ...EMPTY_PERMS.clienti } };
  });
  const [showPwd, setShowPwd] = useState(false);
  const [errors, setErrors]   = useState({});
  const [trial, setTrial]     = useState({
    enabled: !!(account?.trialEndDate),
    endDate: account?.trialEndDate || '',
  });

  const setTrialPreset = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setTrial({ enabled: true, endDate: d.toISOString().split('T')[0] });
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: null })); };

  const togglePerm = (section, field) => {
    setPerms(p => ({
      ...p,
      [section]: typeof p[section] === 'boolean'
        ? !p[section]
        : { ...p[section], [field]: !p[section][field] }
    }));
  };

  const validate = () => {
    const e = {};
    if (!form.username.trim()) e.username = 'Username obbligatorio';
    if (!form.nome.trim()) e.nome = 'Nome obbligatorio';
    if (isNew && !form.password) e.password = 'Password obbligatoria';
    if (form.password && form.password !== form.confirmPwd) e.confirmPwd = 'Le password non coincidono';
    if (form.password && form.password.length < 4) e.password = 'Minimo 4 caratteri';
    return e;
  };

  const submit = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    onSave({
      id: account?.id,
      username: form.username.trim(),
      nome: form.nome.trim(),
      email: form.email.trim(),
      role: form.role,
      password: form.password || null,
      permissions: form.role === 'dipendente' ? { ...perms, prezzi: !!perms.prezzi } : ALL_PERMS,
      trialEndDate: (trial.enabled && trial.endDate) ? trial.endDate : null,
    });
  };

  const canChangeRole = user?.role === 'superadmin' && !isSelf;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-12 overflow-y-auto">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className={`relative ${cardCls} w-full max-w-lg shadow-xl mb-4`}>

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-100 dark:border-white/5">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-amber-500" />
            <h2 className="font-semibold text-zinc-900 dark:text-white">{isNew ? 'Nuovo account' : 'Modifica account'}</h2>
          </div>
          <button onClick={onCancel} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">

          {/* Ruolo */}
          {canChangeRole && (
            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-slate-400 mb-2">Ruolo</label>
              <div className="flex gap-2">
                {RUOLI.map(r => (
                  <button key={r.value} onClick={() => set('role', r.value)}
                    className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-medium transition-all
                      ${form.role === r.value
                        ? `${r.color} ${r.bg} ${r.border}`
                        : 'border-zinc-200 dark:border-white/10 text-zinc-400 dark:text-slate-400 hover:border-zinc-300 dark:hover:border-white/20'}`}>
                    <r.icon className="w-4 h-4" />
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Dati */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { k: 'username', label: 'Username *', placeholder: 'es. mario.rossi', full: false },
              { k: 'nome',     label: 'Nome completo *', placeholder: 'Mario Rossi', full: false },
              { k: 'email',    label: 'Email', placeholder: 'mario@esempio.it', full: true },
            ].map(({ k, label, placeholder, full }) => (
              <div key={k} className={full ? 'col-span-2' : 'col-span-1'}>
                <label className="block text-xs font-medium text-zinc-500 dark:text-slate-400 mb-1">{label}</label>
                <input
                  value={form[k]}
                  onChange={e => set(k, e.target.value)}
                  placeholder={placeholder}
                  className={`${inputCls} ${errors[k] ? '!border-red-400 dark:!border-red-500/50' : ''}`}
                />
                {errors[k] && <p className="text-xs text-red-500 mt-1">{errors[k]}</p>}
              </div>
            ))}
          </div>

          {/* Password */}
          <div className="border-t border-zinc-100 dark:border-white/5 pt-4">
            <p className="text-xs text-zinc-400 dark:text-slate-500 uppercase tracking-wider mb-3">
              {isNew ? 'Password' : 'Nuova password (lascia vuoto per non cambiare)'}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {['password', 'confirmPwd'].map((k, i) => (
                <div key={k}>
                  <label className="block text-xs font-medium text-zinc-500 dark:text-slate-400 mb-1">
                    {i === 0 ? 'Password' : 'Conferma password'}
                  </label>
                  <div className="relative">
                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={form[k]}
                      onChange={e => set(k, e.target.value)}
                      placeholder="••••••••"
                      className={`${inputCls} pr-9 ${errors[k] ? '!border-red-400 dark:!border-red-500/50' : ''}`}
                    />
                    {i === 0 && (
                      <button type="button" onClick={() => setShowPwd(v => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-slate-300 transition-colors">
                        {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    )}
                  </div>
                  {errors[k] && <p className="text-xs text-red-500 mt-1">{errors[k]}</p>}
                </div>
              ))}
            </div>
          </div>

          {/* Permessi dipendente */}
          {form.role === 'dipendente' && (
            <div className="border-t border-zinc-100 dark:border-white/5 pt-4">
              <p className="text-xs text-zinc-400 dark:text-slate-500 uppercase tracking-wider mb-3">Permessi</p>
              <div className="space-y-4">
                {PERM_LABELS.map(({ section, key, fields }) => (
                  <div key={key}>
                    <p className="text-xs font-semibold text-zinc-700 dark:text-slate-300 mb-2">{section}</p>
                    <div className="space-y-1.5">
                      {fields.map(({ k, label }) => (
                        <label key={k} className="flex items-center gap-2.5 cursor-pointer">
                          <div
                            onClick={() => togglePerm(key, k)}
                            className={`w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0
                              ${perms[key]?.[k]
                                ? 'bg-amber-500 border-amber-500'
                                : 'border-zinc-300 dark:border-white/20 bg-white dark:bg-white/5'}`}>
                            {perms[key]?.[k] && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                          </div>
                          <span className="text-sm text-zinc-700 dark:text-slate-300">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
                <div>
                  <p className="text-xs font-semibold text-zinc-700 dark:text-slate-300 mb-2">Prezzi e importi</p>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <div
                      onClick={() => setPerms(p => ({ ...p, prezzi: !p.prezzi }))}
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0
                        ${perms.prezzi
                          ? 'bg-amber-500 border-amber-500'
                          : 'border-zinc-300 dark:border-white/20 bg-white dark:bg-white/5'}`}>
                      {perms.prezzi && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                    </div>
                    <span className="text-sm text-zinc-700 dark:text-slate-300">Visualizza prezzi, costi e totali</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {(form.role === 'superadmin' || form.role === 'socio') && (
            <p className="text-xs text-zinc-400 dark:text-slate-600 italic">
              {form.role === 'superadmin' ? 'Il Super Admin ha accesso completo a tutto.' : 'Il Socio ha accesso completo a tutto.'}
            </p>
          )}

          {/* Periodo di prova */}
          {canChangeRole && (
            <div className="border-t border-zinc-100 dark:border-white/5 pt-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-violet-500 dark:text-violet-400" />
                  <p className="text-xs font-medium text-zinc-500 dark:text-slate-400 uppercase tracking-wider">Periodo di prova</p>
                </div>
                <button
                  type="button"
                  onClick={() => setTrial(t => ({ enabled: !t.enabled, endDate: t.enabled ? '' : t.endDate }))}
                  className="flex items-center gap-1.5 text-xs transition-colors">
                  {trial.enabled
                    ? <><ToggleRight className="w-5 h-5 text-violet-500 dark:text-violet-400" /><span className="text-violet-600 dark:text-violet-300">Attivo</span></>
                    : <><ToggleLeft className="w-5 h-5 text-zinc-400 dark:text-slate-500" /><span className="text-zinc-400 dark:text-slate-500">Disattivato</span></>}
                </button>
              </div>
              {trial.enabled && (
                <div className="space-y-3 pl-1">
                  <div className="flex gap-2 flex-wrap">
                    {[{days:7,label:'7 giorni'},{days:14,label:'14 giorni'},{days:30,label:'1 mese'},{days:90,label:'3 mesi'}].map(({days, label}) => {
                      const presetDate = new Date();
                      presetDate.setDate(presetDate.getDate() + days);
                      const presetStr = presetDate.toISOString().split('T')[0];
                      return (
                        <button key={days} type="button" onClick={() => setTrialPreset(days)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
                            ${trial.endDate === presetStr
                              ? 'bg-violet-50 dark:bg-violet-500/20 border-violet-300 dark:border-violet-500/40 text-violet-700 dark:text-violet-300'
                              : 'border-zinc-200 dark:border-white/10 text-zinc-500 dark:text-slate-400 hover:border-zinc-300 dark:hover:border-white/20 hover:text-zinc-900 dark:hover:text-white'}`}>
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 dark:text-slate-400 mb-1">Data scadenza personalizzata</label>
                    <input
                      type="date"
                      value={trial.endDate}
                      min={todayStr}
                      onChange={e => setTrial(t => ({ ...t, endDate: e.target.value }))}
                      className="px-3 py-2 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white text-sm outline-none focus:border-violet-400 dark:focus:border-violet-500/50 transition-colors"
                    />
                  </div>
                  {trial.endDate && (
                    <p className="text-xs text-violet-600 dark:text-violet-300/80">
                      L&apos;account scadrà il{' '}
                      {(() => {
                        const [y, m, d] = trial.endDate.split('-').map(Number);
                        return new Date(y, m - 1, d).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
                      })()}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-5 border-t border-zinc-100 dark:border-white/5">
          <button onClick={onCancel}
            className="px-5 py-2 rounded-xl border border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-slate-300 text-sm hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors">
            Annulla
          </button>
          <button onClick={submit}
            className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-sm font-semibold transition-colors shadow-sm shadow-amber-500/20">
            {isNew ? 'Crea account' : 'Salva modifiche'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal elimina account ────────────────────────────────────────────────────

function DeleteAccountModal({ account, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white dark:bg-[#0f2040] border border-red-200 dark:border-red-500/20 rounded-2xl p-6 w-full max-w-sm shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-500 dark:text-red-400" />
          </div>
          <div>
            <p className="font-semibold text-zinc-900 dark:text-white text-sm">Elimina account</p>
            <p className="text-xs text-zinc-500 dark:text-slate-400">Operazione irreversibile</p>
          </div>
        </div>
        <p className="text-sm text-zinc-600 dark:text-slate-300 mb-6">
          Eliminare l&apos;account di <span className="text-zinc-900 dark:text-white font-medium">{account.nome}</span> ({account.username})?
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 px-4 py-2 rounded-xl border border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-slate-300 text-sm hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors">
            Annulla
          </button>
          <button onClick={onConfirm}
            className="flex-1 px-4 py-2 rounded-xl bg-red-50 dark:bg-red-500/20 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-100 dark:hover:bg-red-500/30 transition-colors">
            Elimina
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Account ─────────────────────────────────────────────────────────────

function TabAccount() {
  const { user, accounts, addAccount, updateAccount, deleteAccount, toggleAccountActive, changeOwnPassword } = useAuth();
  const [modal, setModal]       = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [pwdForm, setPwdForm]   = useState({ current: '', new: '', confirm: '' });
  const [pwdShow, setPwdShow]   = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [pwdOk, setPwdOk]       = useState(false);
  const [saving, setSaving]     = useState(false);

  const isSuperAdmin = user?.role === 'superadmin';

  const handleSave = async (data) => {
    setSaving(true);
    if (data.id) await updateAccount(data);
    else await addAccount(data);
    setSaving(false);
    setModal(null);
  };

  const handleDelete = (acc) => {
    if (acc.id === user?.id) return;
    setToDelete(acc);
  };

  const confirmDelete = () => {
    deleteAccount(toDelete.id);
    setToDelete(null);
  };

  const handleChangePwd = async () => {
    setPwdError('');
    if (!pwdForm.current) { setPwdError('Inserisci la password attuale'); return; }
    if (!pwdForm.new || pwdForm.new.length < 4) { setPwdError('Nuova password: minimo 4 caratteri'); return; }
    if (pwdForm.new !== pwdForm.confirm) { setPwdError('Le password non coincidono'); return; }
    const result = await changeOwnPassword(pwdForm.current, pwdForm.new);
    if (!result.ok) { setPwdError(result.error); return; }
    setPwdOk(true);
    setPwdForm({ current: '', new: '', confirm: '' });
    setTimeout(() => setPwdOk(false), 3000);
  };

  return (
    <div className="space-y-5">

      {/* Lista account (solo superadmin) */}
      {isSuperAdmin && (
        <div className={`${cardCls} overflow-hidden`}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-white/5">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-500" />
              <h3 className="font-semibold text-zinc-900 dark:text-white text-sm">Gestione account</h3>
              <span className="px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-mono">{accounts.length}</span>
            </div>
            <button onClick={() => setModal('new')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-white text-xs font-medium transition-colors shadow-sm shadow-amber-500/20">
              <Plus className="w-3.5 h-3.5" /> Nuovo account
            </button>
          </div>

          <div className="divide-y divide-zinc-100 dark:divide-white/5">
            {accounts.map(acc => (
              <div key={acc.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-zinc-50 dark:hover:bg-white/2 transition-colors">
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${avatarColor(acc.id)} flex items-center justify-center text-white font-bold text-xs shrink-0`}>
                  {iniziali(acc.nome)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-white">{acc.nome}</p>
                    <RuoloBadge role={acc.role} />
                    <TrialBadge trialEndDate={acc.trialEndDate} />
                    {!acc.active && (
                      <span className="px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-slate-500/10 border border-zinc-200 dark:border-slate-500/20 text-zinc-500 dark:text-slate-500 text-xs">Disattivato</span>
                    )}
                    {acc.id === user?.id && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs">Tu</span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 dark:text-slate-500 mt-0.5">@{acc.username}{acc.email ? ` · ${acc.email}` : ''}</p>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  {acc.id !== user?.id && acc.role !== 'superadmin' && (
                    <button onClick={() => toggleAccountActive(acc.id)}
                      title={acc.active ? 'Disattiva' : 'Attiva'}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-all">
                      {acc.active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                    </button>
                  )}
                  <button onClick={() => setModal(acc)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-all">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  {acc.id !== user?.id && (
                    <button onClick={() => handleDelete(acc)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cambia password personale */}
      <div className={`${cardCls} overflow-hidden`}>
        <div className="flex items-center gap-2 px-5 py-4 border-b border-zinc-100 dark:border-white/5">
          <Lock className="w-4 h-4 text-amber-500" />
          <h3 className="font-semibold text-zinc-900 dark:text-white text-sm">Cambia la tua password</h3>
        </div>
        <div className="p-5 space-y-3">
          {[
            { k: 'current', label: 'Password attuale',  ph: '••••••••' },
            { k: 'new',     label: 'Nuova password',    ph: 'Minimo 4 caratteri' },
            { k: 'confirm', label: 'Conferma password', ph: '••••••••' },
          ].map(({ k, label, ph }) => (
            <div key={k} className="max-w-sm">
              <label className="block text-xs font-medium text-zinc-500 dark:text-slate-400 mb-1">{label}</label>
              <div className="relative">
                <input
                  type={pwdShow ? 'text' : 'password'}
                  value={pwdForm[k]}
                  onChange={e => { setPwdForm(f => ({ ...f, [k]: e.target.value })); setPwdError(''); setPwdOk(false); }}
                  placeholder={ph}
                  className={`${inputCls} pr-9`}
                />
                {k === 'current' && (
                  <button type="button" onClick={() => setPwdShow(v => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-slate-300 transition-colors">
                    {pwdShow ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                )}
              </div>
            </div>
          ))}
          {pwdError && (
            <div className="flex items-center gap-2 text-sm text-red-500 dark:text-red-400">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {pwdError}
            </div>
          )}
          {pwdOk && (
            <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
              <Check className="w-4 h-4 shrink-0" /> Password aggiornata!
            </div>
          )}
          <button onClick={handleChangePwd}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-sm font-semibold transition-colors mt-1 shadow-sm shadow-amber-500/20">
            <KeyRound className="w-4 h-4" /> Cambia password
          </button>
        </div>
      </div>

      {/* Modals */}
      {modal && (
        <AccountModal
          account={modal === 'new' ? null : modal}
          isSelf={modal !== 'new' && modal?.id === user?.id}
          onSave={handleSave}
          onCancel={() => setModal(null)}
        />
      )}
      {toDelete && (
        <DeleteAccountModal
          account={toDelete}
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </div>
  );
}

// ─── Tab: Azienda ─────────────────────────────────────────────────────────────

function TabAzienda() {
  const { company: companySync, saveCompany } = useConfig();
  const [company, setCompany] = useState(() => readCompany());
  const [saved, setSaved]     = useState(false);
  const fileRef               = useRef();

  // Aggiorna il form se Supabase carica dati più recenti di localStorage
  useEffect(() => {
    if (companySync && Object.keys(companySync).length > 0) setCompany(companySync);
  }, [companySync]);

  const set = (k, v) => setCompany(c => ({ ...c, [k]: v }));

  const handleLogo = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 500_000) { alert('Immagine troppo grande (max 500 KB)'); return; }
    const reader = new FileReader();
    reader.onload = ev => set('logo', ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    saveCompany(company);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    if (company.nomeApp) document.title = company.nomeApp;
  };

  const FIELDS = [
    { k: 'nomeAzienda',   label: 'Nome azienda / ragione sociale', ph: 'Es. Idraulica Rossi S.r.l.',  full: true  },
    { k: 'piva',          label: 'Partita IVA',                    ph: '02345678901',                  full: false, mono: true },
    { k: 'codiceFiscale', label: 'Codice Fiscale',                  ph: 'RSSMRA80A01A794F',             full: false, mono: true },
    { k: 'indirizzo',     label: 'Indirizzo',                       ph: 'Via Roma 12',                  full: true  },
    { k: 'citta',         label: 'Città',                           ph: 'Bergamo',                      full: false },
    { k: 'cap',           label: 'CAP',                             ph: '24121',                        full: false, mono: true },
    { k: 'provincia',     label: 'Provincia',                       ph: 'BG',                           full: false },
    { k: 'email',         label: 'Email',                           ph: 'info@idraulica.it',             full: false },
    { k: 'telefono',      label: 'Telefono',                        ph: '035 123 4567',                 full: false, mono: true },
    { k: 'sito',          label: 'Sito web',                        ph: 'www.idraulica.it',             full: false },
  ];

  return (
    <div className="space-y-5">

      {/* Logo */}
      <div className={`${cardCls} p-5`}>
        <div className="flex items-center gap-2 mb-4">
          <Image className="w-4 h-4 text-amber-500" />
          <h3 className="font-semibold text-zinc-900 dark:text-white text-sm">Logo aziendale</h3>
        </div>
        <div className="flex items-center gap-5">
          <div className="w-24 h-24 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/3 flex items-center justify-center overflow-hidden shrink-0">
            {company.logo
              ? <img src={company.logo} alt="Logo" className="w-full h-full object-contain p-2" />
              : <Image className="w-8 h-8 text-zinc-300 dark:text-slate-600" />
            }
          </div>
          <div className="space-y-2">
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-600 dark:text-amber-400 text-sm font-medium hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors">
              <Upload className="w-4 h-4" /> Carica logo
            </button>
            {company.logo && (
              <button
                onClick={() => set('logo', null)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-500 dark:text-red-400 text-sm hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors">
                <Trash2 className="w-4 h-4" /> Rimuovi
              </button>
            )}
            <p className="text-xs text-zinc-400 dark:text-slate-500">PNG, JPG, SVG — max 500 KB<br />Visibile nella home e nelle fatture</p>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogo} />
        </div>
      </div>

      {/* Dati sociali */}
      <div className={`${cardCls} p-5`}>
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-4 h-4 text-amber-500" />
          <h3 className="font-semibold text-zinc-900 dark:text-white text-sm">Dati aziendali</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {FIELDS.map(({ k, label, ph, full, mono }) => (
            <div key={k} className={full ? 'col-span-2' : 'col-span-1'}>
              <label className="block text-xs font-medium text-zinc-500 dark:text-slate-400 mb-1">{label}</label>
              <input
                value={company[k] || ''}
                onChange={e => set(k, e.target.value)}
                placeholder={ph}
                className={`${inputCls} ${mono ? 'font-mono' : ''}`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Salva */}
      <div className="flex items-center gap-3">
        <button onClick={handleSave}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-sm font-semibold transition-colors shadow-sm shadow-amber-500/20">
          {saved ? <Check className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
          {saved ? 'Salvato!' : 'Salva dati aziendali'}
        </button>
        {saved && <span className="text-sm text-emerald-600 dark:text-emerald-400">Modifiche salvate</span>}
      </div>
    </div>
  );
}

// ─── Tab: Aspetto ─────────────────────────────────────────────────────────────

function TabAspetto() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { company: companySync, saveCompany } = useConfig();
  const canEdit = user?.role === 'superadmin' || user?.role === 'socio';

  const [company, setCompanyState] = useState(() => readCompany());
  const [saved, setSaved]          = useState(false);

  useEffect(() => {
    if (companySync && Object.keys(companySync).length > 0) setCompanyState(companySync);
  }, [companySync]);

  const handleSaveAppName = () => {
    saveCompany(company);
    setSaved(true);
    if (company.nomeApp) document.title = company.nomeApp;
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-5">

      {canEdit && (
        <div className={`${cardCls} p-5`}>
          <div className="flex items-center gap-2 mb-4">
            <Settings className="w-4 h-4 text-amber-500" />
            <h3 className="font-semibold text-zinc-900 dark:text-white text-sm">Nome dell&apos;applicazione</h3>
          </div>
          <p className="text-xs text-zinc-400 dark:text-slate-500 mb-3">Visibile nella sidebar, nella schermata di login e nelle fatture.</p>
          <div className="flex items-center gap-3 max-w-sm">
            <input
              value={company.nomeApp || ''}
              onChange={e => setCompanyState(c => ({ ...c, nomeApp: e.target.value }))}
              placeholder="HydroDesk"
              className={inputCls}
            />
            <button onClick={handleSaveAppName}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-sm font-semibold transition-colors shrink-0 shadow-sm shadow-amber-500/20">
              {saved ? <Check className="w-4 h-4" /> : 'Salva'}
            </button>
          </div>
        </div>
      )}

      {/* Tema */}
      <div className={`${cardCls} p-5`}>
        <div className="flex items-center gap-2 mb-4">
          <Palette className="w-4 h-4 text-amber-500" />
          <h3 className="font-semibold text-zinc-900 dark:text-white text-sm">Tema</h3>
        </div>
        <div className="flex gap-3">
          {[
            { value: 'light', label: 'Chiaro', icon: Sun,  desc: 'Sfondo chiaro, ideale in ambienti luminosi' },
            { value: 'dark',  label: 'Scuro',  icon: Moon, desc: 'Sfondo scuro, meno affatica gli occhi' },
          ].map(({ value, label, icon: Icon, desc }) => (
            <button key={value} onClick={() => theme !== value && toggleTheme()}
              className={`flex-1 flex items-center gap-3 p-4 rounded-xl border text-left transition-all
                ${theme === value
                  ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/30 text-amber-700 dark:text-amber-300'
                  : 'border-zinc-200 dark:border-white/10 text-zinc-500 dark:text-slate-400 hover:border-zinc-300 dark:hover:border-white/20 hover:bg-zinc-50 dark:hover:bg-white/5'}`}>
              <Icon className="w-5 h-5 shrink-0" />
              <div>
                <p className="text-sm font-semibold">{label}</p>
                <p className="text-xs opacity-70 mt-0.5">{desc}</p>
              </div>
              {theme === value && <Check className="w-4 h-4 ml-auto shrink-0 text-amber-500" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Pagina principale Impostazioni ──────────────────────────────────────────

const TABS = [
  { key: 'account', label: 'Account', icon: User },
  { key: 'azienda', label: 'Azienda', icon: Building2 },
  { key: 'aspetto', label: 'Aspetto', icon: Palette },
];

export default function Impostazioni() {
  const { user } = useAuth();
  const canViewAzienda = user?.role === 'superadmin' || user?.role === 'socio';
  const [tab, setTab] = useState('account');

  const visibleTabs = TABS.filter(t => {
    if (t.key === 'azienda' && !canViewAzienda) return false;
    return true;
  });

  return (
    <div className="max-w-2xl">

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 flex items-center justify-center">
          <Settings className="w-4 h-4 text-amber-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Impostazioni</h1>
          <p className="text-sm text-zinc-400 dark:text-slate-500">Account, azienda e preferenze</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-zinc-100 dark:bg-[#0c1a35] border border-zinc-200 dark:border-white/5 rounded-xl mb-6 w-fit">
        {visibleTabs.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${tab === key
                ? 'bg-white dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 shadow-sm border border-zinc-200 dark:border-amber-500/20'
                : 'text-zinc-500 dark:text-slate-500 hover:text-zinc-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/5'}`}>
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'account' && <TabAccount />}
      {tab === 'azienda' && canViewAzienda && <TabAzienda />}
      {tab === 'aspetto' && <TabAspetto />}
    </div>
  );
}
