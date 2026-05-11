import { useState, useEffect } from 'react';
import { Droplets, Eye, EyeOff, LogIn, AlertCircle, Clock } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

function readCompany() {
  try { return JSON.parse(localStorage.getItem('hydrodesk_company')) || {}; } catch { return {}; }
}

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername]   = useState('');
  const [password, setPassword]   = useState('');
  const [remember, setRemember]   = useState(false);
  const [showPwd, setShowPwd]     = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [trialExpired, setTrialExpired] = useState(false);
  const [company, setCompany]     = useState({});

  useEffect(() => { setCompany(readCompany()); }, []);

  const appName = company.nomeApp || 'HydroDesk';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) { setError('Inserisci username e password'); return; }
    setLoading(true);
    setError('');
    setTrialExpired(false);
    const result = await login(username.trim(), password, remember);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      setTrialExpired(!!result.trialExpired);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          {company.logo ? (
            <img src={company.logo} alt="Logo" className="h-14 w-auto object-contain mb-4" />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-xl shadow-amber-500/20 mb-4">
              <Droplets size={24} className="text-white" strokeWidth={2.5} />
            </div>
          )}
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">{appName}</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {company.nomeAzienda ? company.nomeAzienda : 'Gestionale Idraulico'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-7 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900 mb-6">Accedi al tuo account</h2>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Username */}
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">Username</label>
              <input
                autoFocus
                type="text"
                value={username}
                onChange={e => { setUsername(e.target.value); setError(''); setTrialExpired(false); }}
                placeholder="Il tuo username"
                autoComplete="username"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 text-sm placeholder-zinc-400 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10 transition-all"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); setTrialExpired(false); }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 text-sm placeholder-zinc-400 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors">
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Ricordami */}
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <div
                onClick={() => setRemember(v => !v)}
                className={`w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0 ${
                  remember ? 'bg-amber-500 border-amber-500' : 'border-zinc-300 bg-white'
                }`}>
                {remember && (
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className="text-sm text-zinc-500">Ricordami su questo dispositivo</span>
            </label>

            {/* Errore */}
            {error && (
              <div className={`flex items-start gap-2.5 px-3.5 py-3 rounded-xl border ${
                trialExpired
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-red-50 border-red-200'
              }`}>
                {trialExpired
                  ? <Clock size={15} className="text-amber-500 shrink-0 mt-0.5" />
                  : <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />}
                <p className={`text-sm ${trialExpired ? 'text-amber-700' : 'text-red-600'}`}>{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors mt-2 shadow-sm shadow-amber-500/20">
              {loading ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <LogIn size={16} />
              )}
              {loading ? 'Accesso…' : 'Accedi'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-zinc-400 mt-6">
          Password dimenticata? Contatta l&apos;amministratore.
        </p>
      </div>
    </div>
  );
}
