import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, ClipboardList, Plus, Warehouse, Menu } from 'lucide-react'
import { useTheme } from '../App'
import { useAuth } from '../auth/AuthContext'

function NavTab({ to, icon: Icon, label, end, isDark, onClose }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClose}
      className={({ isActive }) =>
        `flex flex-col items-center justify-center gap-1 min-w-[56px] min-h-[52px] px-2 transition-colors ${
          isActive
            ? isDark ? 'text-amber-400' : 'text-amber-600'
            : isDark ? 'text-slate-500' : 'text-slate-400'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={23} strokeWidth={isActive ? 2.2 : 1.8} />
          <span className="text-[10px] font-medium leading-none tracking-wide">{label}</span>
        </>
      )}
    </NavLink>
  )
}

export default function MobileNav({ onMenuClick, onClose }) {
  const { theme } = useTheme()
  const { user } = useAuth()
  const navigate = useNavigate()
  const isDark = theme === 'dark'

  const p = user?.permissions || {}
  const showMagazzino = user?.role !== 'dipendente' || p.magazzino?.visualizza
  const canCreate     = user?.role !== 'dipendente' || p.rapportini?.crea

  function handleFab() {
    onClose?.()
    navigate('/rapportino/nuovo')
  }

  return (
    <nav
      className={`md:hidden fixed bottom-0 inset-x-0 z-30 border-t ${
        isDark
          ? 'bg-[#080f20] border-[#1a3358]/60'
          : 'bg-white border-slate-200 shadow-[0_-2px_12px_rgba(0,0,0,0.07)]'
      }`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around h-16 px-1">

        <NavTab to="/" icon={LayoutDashboard} label="Dashboard" end isDark={isDark} onClose={onClose} />

        <NavTab to="/rapportini" icon={ClipboardList} label="Rapportini" isDark={isDark} onClose={onClose} />

        {canCreate && (
          <button
            onClick={handleFab}
            className="flex items-center justify-center w-14 h-14 -mt-5 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/30 active:scale-95 transition-transform shrink-0"
            aria-label="Nuovo Rapportino"
          >
            <Plus size={26} className="text-white" strokeWidth={2.5} />
          </button>
        )}

        {showMagazzino && (
          <NavTab to="/magazzino" icon={Warehouse} label="Magazzino" isDark={isDark} onClose={onClose} />
        )}

        <button
          onClick={onMenuClick}
          className={`flex flex-col items-center justify-center gap-1 min-w-[56px] min-h-[52px] px-2 transition-colors ${
            isDark ? 'text-slate-500' : 'text-slate-400'
          }`}
        >
          <Menu size={23} strokeWidth={1.8} />
          <span className="text-[10px] font-medium leading-none tracking-wide">Altro</span>
        </button>
      </div>
    </nav>
  )
}
