import { useState, useEffect, createContext, useContext } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
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

// ─── Layout Shell ─────────────────────────────────────────────────────────────

function AppShell({ children }) {
  const { theme } = useTheme()

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const stored = localStorage.getItem('hydrodesk:sidebar:collapsed')
    return stored === 'true'
  })

  useEffect(() => {
    localStorage.setItem('hydrodesk:sidebar:collapsed', sidebarCollapsed)
  }, [sidebarCollapsed])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const handler = (e) => { if (e.matches) setSidebarCollapsed(true) }
    if (mq.matches) setSidebarCollapsed(true)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return (
    <div className={`flex h-full overflow-hidden transition-colors duration-300
      ${theme === 'dark' ? 'bg-[#060d1f]' : 'bg-zinc-50'}`}>

      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((v) => !v)}
      />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar />

        <main className={`flex-1 overflow-y-auto transition-colors duration-300
          ${theme === 'dark' ? 'bg-[#060d1f]' : 'bg-zinc-50'}`}>
          <div className="page-enter p-5 md:p-6 min-h-full">
            {children}
          </div>
        </main>
      </div>

      {!sidebarCollapsed && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-[5] backdrop-blur-sm"
          onClick={() => setSidebarCollapsed(true)}
        />
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
