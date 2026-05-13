import { useState, useEffect, createContext, useContext, useRef } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { X, Clock } from 'lucide-react'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import Dashboard from './pages/Dashboard'
import NuovoRapportino from './pages/NuovoRapportino'
import Clienti from "./pages/Clienti"
import Calendario from "./pages/Calendario"
import Rapportini from "./pages/Rapportini"
import Magazzino from "./pages/Magazzino"
import CommessePage from './pages/CommessePage'
import Manutenzioni from './pages/Manutenzioni'
import Report from './pages/Report'
import Backup from './pages/Backup'
import Impostazioni from './pages/Impostazioni'
import Login from './pages/Login'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { DataProvider } from './context/DataContext'

// ─── Theme Context ────────────────────────────────────────────────────────────

export const ThemeContext = createContext({
  theme: 'dark',
  toggleTheme: () => {},
})

export function useTheme() {
  return useContext(ThemeContext)
}

function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('hydrodesk:theme') ?? 'light'
  })

  useEffect(() => {
    localStorage.setItem('hydrodesk:theme', theme)
    // Aggiunge/rimuove la classe "dark" sull'elemento root per Tailwind dark mode
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [theme])

  // Applica subito al mount senza flash
  useEffect(() => {
    const saved = localStorage.getItem('hydrodesk:theme') ?? 'light'
    if (saved === 'dark') document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }, [])

  const toggleTheme = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'))

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

// ─── Trial Popup ──────────────────────────────────────────────────────────────

function TrialPopup({ user, onClose }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  if (!user?.trialEndDate) return null

  const [y, m, d] = user.trialEndDate.split('-').map(Number)
  const expiry = new Date(y, m - 1, d, 23, 59, 59, 999)
  const diffMs = expiry - new Date()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays <= 0) return null

  const formatted = new Date(y, m - 1, d).toLocaleDateString('it-IT', {
    day: 'numeric', month: 'long', year: 'numeric'
  })

  const urgency = diffDays <= 3 ? 'red' : diffDays <= 7 ? 'amber' : 'blue'
  const colors = {
    red:   { badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: 'text-red-500', btn: 'bg-red-500 hover:bg-red-600' },
    amber: { badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: 'text-amber-500', btn: 'bg-amber-500 hover:bg-amber-600' },
    blue:  { badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: 'text-blue-500', btn: 'bg-amber-500 hover:bg-amber-600' },
  }[urgency]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className={`w-full max-w-sm rounded-2xl shadow-2xl border p-6
        ${isDark ? 'bg-[#0f2040] border-[#1a3358]' : 'bg-white border-zinc-200'}`}>

        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${colors.badge}`}>
              <Clock size={18} className={colors.icon} />
            </div>
            <div>
              <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                Periodo di prova
              </p>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-zinc-500'}`}>
                Account: {user.nome || user.username}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded-lg transition-colors ${isDark ? 'text-slate-500 hover:text-slate-300 hover:bg-white/5' : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100'}`}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className={`rounded-xl p-4 mb-4 ${isDark ? 'bg-white/5' : 'bg-zinc-50'}`}>
          <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-zinc-600'}`}>
            Il tuo accesso scade il{' '}
            <span className={`font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>{formatted}</span>.
          </p>
          <p className={`text-2xl font-bold mt-2 ${colors.icon}`}>
            {diffDays} {diffDays === 1 ? 'giorno' : 'giorni'} rimanenti
          </p>
        </div>

        <button
          onClick={onClose}
          className={`w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-colors ${colors.btn}`}
        >
          Ho capito
        </button>
      </div>
    </div>
  )
}

// ─── Layout Shell ─────────────────────────────────────────────────────────────

function AppShell({ children }) {
  const { theme } = useTheme()
  const { user } = useAuth()

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const stored = localStorage.getItem('hydrodesk:sidebar:collapsed')
    return stored === 'true'
  })

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  // Trial popup: mostrato una volta per sessione
  const [showTrial, setShowTrial] = useState(false)
  const shownRef = useRef(false)
  useEffect(() => {
    if (user?.trialEndDate && !shownRef.current) {
      const key = `hydrodesk:trial_seen:${user.id}`
      if (!sessionStorage.getItem(key)) {
        setShowTrial(true)
        sessionStorage.setItem(key, '1')
      }
      shownRef.current = true
    }
  }, [user?.id])

  useEffect(() => {
    localStorage.setItem('hydrodesk:sidebar:collapsed', sidebarCollapsed)
  }, [sidebarCollapsed])

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const handler = (e) => { if (e.matches) setMobileSidebarOpen(false) }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return (
    <div className={`flex h-full overflow-hidden transition-colors duration-300
      ${theme === 'dark' ? 'bg-[#060d1f]' : 'bg-zinc-50'}`}>

      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        onToggle={() => setSidebarCollapsed((v) => !v)}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar onMenuClick={() => setMobileSidebarOpen(true)} />

        <main className={`flex-1 overflow-y-auto transition-colors duration-300
          ${theme === 'dark' ? 'bg-[#060d1f]' : 'bg-zinc-50'}`}>
          <div className="page-enter p-4 md:p-6 min-h-full">
            {children}
          </div>
        </main>
      </div>

      {mobileSidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-[15] backdrop-blur-sm"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {showTrial && (
        <TrialPopup user={user} onClose={() => setShowTrial(false)} />
      )}
    </div>
  )
}

// ─── Gate auth ────────────────────────────────────────────────────────────────

function AuthGate({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return null;
  if (!user) return <Login />;
  return <DataProvider>{children}</DataProvider>;
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AuthGate>
            <AppShell>
              <Routes>
                <Route path="/"                   element={<Dashboard />} />
                <Route path="/rapportino/nuovo"   element={<NuovoRapportino />} />
                <Route path="/rapportino/:id"     element={<NuovoRapportino />} />
                <Route path="/rapportini"         element={<Rapportini />} />
                <Route path="/clienti"            element={<Clienti />} />
                <Route path="/clienti/:id"        element={<Clienti />} />
                <Route path="/calendario"         element={<Calendario />} />
                <Route path="/magazzino"          element={<Magazzino />} />
                <Route path="/commesse"           element={<CommessePage />} />
                <Route path="/commesse/:id"       element={<CommessePage />} />
                <Route path="/manutenzioni"       element={<Manutenzioni />} />
                <Route path="/report"             element={<Report />} />
                <Route path="/backup"             element={<Backup />} />
                <Route path="/impostazioni"       element={<Impostazioni />} />
                <Route path="*"                   element={<Navigate to="/" replace />} />
              </Routes>
            </AppShell>
          </AuthGate>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
