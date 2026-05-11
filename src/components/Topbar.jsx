import { useLocation } from 'react-router-dom'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../App'

// ─── Mappa breadcrumb ─────────────────────────────────────────────────────────

const ROUTE_LABELS = {
  '/':             ['Dashboard'],
  '/rapportino':   ['Rapportini'],
  '/clienti':      ['Clienti'],
  '/calendario':   ['Calendario'],
  '/tickets':      ['Tickets'],
  '/commesse':     ['Commesse'],
  '/manutenzioni': ['Manutenzioni'],
  '/report':       ['Report & PDF'],
  '/impostazioni': ['Impostazioni'],
}

function getBreadcrumb(pathname) {
  if (pathname === '/') return ['Dashboard']
  const base = '/' + pathname.split('/')[1]
  return ROUTE_LABELS[base] ?? [base.replace('/', '')]
}

// ─── Toggle button ────────────────────────────────────────────────────────────

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      onClick={toggleTheme}
      title={isDark ? 'Passa a Light Mode' : 'Passa a Dark Mode'}
      className={`relative w-[52px] h-[26px] rounded-full border transition-all duration-300 focus:outline-none
        ${isDark
          ? 'bg-[#0f2040] border-amber-500/30 hover:border-amber-500/60'
          : 'bg-white border-slate-300 hover:border-amber-400 shadow-sm'
        }`}
    >
      {/* Track glow */}
      {isDark && (
        <span className="absolute inset-0 rounded-full bg-amber-500/5 pointer-events-none" />
      )}

      {/* Thumb */}
      <span className={`absolute top-[3px] w-[18px] h-[18px] rounded-full flex items-center justify-center
        transition-all duration-300 shadow-md
        ${isDark
          ? 'left-[3px] bg-[#1a3060]'
          : 'left-[29px] bg-amber-400'
        }`}>
        {isDark
          ? <Moon   className="w-2.5 h-2.5 text-amber-400" />
          : <Sun    className="w-2.5 h-2.5 text-white" />
        }
      </span>
    </button>
  )
}

// ─── Topbar ───────────────────────────────────────────────────────────────────

export default function Topbar() {
  const { theme } = useTheme()
  const location  = useLocation()
  const crumbs    = getBreadcrumb(location.pathname)
  const isDark    = theme === 'dark'

  return (
    <header className={`flex items-center justify-between h-14 px-5 shrink-0 border-b transition-colors duration-300
      ${isDark
        ? 'bg-[#080f20] border-white/5'
        : 'bg-white border-slate-200 shadow-sm'
      }`}>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm">
        <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>
          HydroDesk
        </span>
        <span className={isDark ? 'text-slate-700' : 'text-slate-300'}>/</span>
        <span className={`font-medium ${isDark ? 'text-white' : 'text-slate-800'}`}>
          {crumbs[0]}
        </span>
      </div>

      {/* Destra: toggle + eventuale avatar */}
      <div className="flex items-center gap-3">
        <ThemeToggle />

        {/* Dot stato online */}
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className={`text-xs hidden sm:inline ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            Offline
          </span>
        </div>
      </div>
    </header>
  )
}
