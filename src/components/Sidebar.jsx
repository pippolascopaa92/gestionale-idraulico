import { NavLink } from 'react-router-dom'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard,
  FilePlus2,
  Users,
  CalendarDays,
  FolderKanban,
  Wrench,
  FileBarChart2,
  ChevronLeft,
  ChevronRight,
  Droplets,
  Settings,
  Warehouse,
  HardDriveDownload,
  LogOut,
} from 'lucide-react'
import { useAuth } from '../auth/AuthContext'

function readCompany() {
  try { return JSON.parse(localStorage.getItem('hydrodesk_company')) || {}; } catch { return {}; }
}

function useCompany() {
  const [company, setCompany] = useState(readCompany);
  useEffect(() => {
    const handler = () => setCompany(readCompany());
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);
  return company;
}

const NAV_SECTIONS = [
  {
    label: 'Principale',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
      { to: '/rapportino/nuovo', icon: FilePlus2, label: 'Nuovo Rapportino', accent: true },
    ],
  },
  {
    label: 'Gestione',
    items: [
      { to: '/clienti', icon: Users, label: 'Clienti' },
      { to: '/calendario', icon: CalendarDays, label: 'Calendario' },
      { to: '/magazzino', icon: Warehouse, label: 'Magazzino' },
      { to: '/commesse', icon: FolderKanban, label: 'Commesse' },
    ],
  },
  {
    label: 'Pianificazione',
    items: [
      { to: '/manutenzioni', icon: Wrench, label: 'Manutenzioni' },
      { to: '/report', icon: FileBarChart2, label: 'Report & PDF' },
      { to: '/backup', icon: HardDriveDownload, label: 'Backup' },
    ],
  },
]

function NavItem({ item, collapsed }) {
  const { to, icon: Icon, label, accent, badge, badgeColor, end } = item

  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        [
          'group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
          'border border-transparent',
          isActive
            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
            : accent
            ? 'text-amber-500 dark:text-amber-300 hover:bg-amber-500/8 hover:text-amber-600 dark:hover:text-amber-300'
            : 'text-zinc-500 dark:text-slate-400 hover:text-zinc-900 dark:hover:text-slate-200 hover:bg-zinc-100 dark:hover:bg-white/5',
          collapsed ? 'justify-center px-2' : '',
        ].join(' ')
      }
      title={collapsed ? label : undefined}
    >
      {({ isActive }) => (
        <>
          {/* Active indicator bar */}
          {isActive && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-amber-400 rounded-r-full" />
          )}

          <Icon
            size={18}
            className={[
              'shrink-0 transition-colors',
              isActive ? 'text-amber-600 dark:text-amber-400' : accent ? 'text-amber-500 dark:text-amber-400' : 'text-zinc-400 dark:text-slate-500 group-hover:text-zinc-700 dark:group-hover:text-slate-300',
            ].join(' ')}
            strokeWidth={isActive ? 2.2 : 1.8}
          />

          {!collapsed && (
            <>
              <span className="flex-1 truncate">{label}</span>
              {badge != null && (
                <span
                  className={[
                    'text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-full leading-none',
                    badgeColor === 'amber'
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-red-500/20 text-red-400',
                  ].join(' ')}
                >
                  {badge}
                </span>
              )}
            </>
          )}

          {/* Collapsed badge dot */}
          {collapsed && badge != null && (
            <span
              className={[
                'absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full',
                badgeColor === 'amber' ? 'bg-amber-400' : 'bg-red-400',
              ].join(' ')}
            />
          )}
        </>
      )}
    </NavLink>
  )
}

function iniziali(nome) {
  return (nome || '?').trim().split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function filterNav(sections, user) {
  if (!user || user.role !== 'dipendente') return sections;
  const p = user.permissions || {};
  return sections.map(s => ({
    ...s,
    items: s.items.filter(item => {
      if (item.to === '/rapportino/nuovo') return p.rapportini?.crea;
      if (item.to === '/magazzino')         return p.magazzino?.visualizza;
      if (item.to === '/clienti')           return p.clienti?.visualizza;
      return true;
    }),
  })).filter(s => s.items.length > 0);
}

export default function Sidebar({ collapsed, onToggle }) {
  const { user, logout } = useAuth();
  const company = useCompany();
  const brandName = company.nomeAzienda || company.nomeApp || 'HydroDesk';
  const brandSub  = company.piva ? `P.IVA ${company.piva}` : company.citta || company.indirizzo || 'Gestionale';
  return (
    <aside
      className={[
        'relative flex flex-col h-full bg-white dark:bg-[#080f20] border-r border-slate-200 dark:border-[#1a3358]/60',
        'sidebar-transition shrink-0',
        collapsed ? 'w-16' : 'w-60',
      ].join(' ')}
    >
      {/* Logo / Brand */}
      <div
        className={[
          'flex items-center gap-3 px-4 py-5 border-b border-slate-200 dark:border-[#1a3358]/60',
          collapsed ? 'justify-center px-2' : '',
        ].join(' ')}
      >
        <div className="relative shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Droplets size={16} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full border border-white dark:border-[#080f20] pulse-dot" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-slate-900 dark:text-white leading-none tracking-tight truncate">{brandName}</p>
            <p className="text-[10px] text-slate-500 mt-0.5 tracking-wider uppercase truncate">{brandSub}</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-5">
        {filterNav(NAV_SECTIONS, user).map((section) => (
          <div key={section.label}>
            {!collapsed && (
              <p className="section-title px-2 mb-2">{section.label}</p>
            )}
            {collapsed && (
              <div className="border-t border-slate-200 dark:border-[#1a3358]/40 mx-2 mb-2" />
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavItem key={item.to} item={item} collapsed={collapsed} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom bar */}
      <div className="border-t border-slate-200 dark:border-[#1a3358]/60 p-2 space-y-0.5">
        <NavLink
          to="/impostazioni"
          className={({ isActive }) =>
            [
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
              isActive
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                : 'text-zinc-500 dark:text-slate-500 hover:text-zinc-900 dark:hover:text-slate-300 hover:bg-zinc-100 dark:hover:bg-white/5',
              collapsed ? 'justify-center px-2' : '',
            ].join(' ')
          }
          title={collapsed ? 'Impostazioni' : undefined}
        >
          <Settings size={17} strokeWidth={1.8} className="shrink-0" />
          {!collapsed && <span>Impostazioni</span>}
        </NavLink>

        {/* Utente loggato */}
        <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg bg-zinc-50 dark:bg-white/3 border border-zinc-100 dark:border-transparent ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shrink-0">
            <span className="text-[11px] font-bold text-white">{iniziali(user?.nome || user?.username)}</span>
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-zinc-800 dark:text-slate-300 truncate">{user?.nome || user?.username}</p>
                <p className="text-[10px] text-zinc-500 dark:text-slate-500 truncate capitalize">{user?.role === 'superadmin' ? 'Super Admin' : user?.role}</p>
              </div>
              <button onClick={logout} title="Esci"
                className="text-slate-500 hover:text-red-400 transition-colors shrink-0">
                <LogOut size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className={[
          'absolute -right-3 top-20 w-6 h-6 rounded-full',
          'bg-white dark:bg-[#0f2040] border border-slate-200 dark:border-[#1a3358] text-slate-400',
          'hover:text-amber-400 hover:border-amber-500/40',
          'flex items-center justify-center shadow-lg',
          'transition-colors duration-150 z-10',
        ].join(' ')}
        title={collapsed ? 'Espandi sidebar' : 'Comprimi sidebar'}
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </aside>
  )
}
