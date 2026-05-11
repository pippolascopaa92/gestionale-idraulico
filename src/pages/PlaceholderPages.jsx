import {
  LayoutDashboard,
  FilePlus2,
  Users,
  CalendarDays,
  Ticket,
  FolderKanban,
  Wrench,
  FileBarChart2,
  Settings,
  Construction,
} from 'lucide-react'

const PAGE_META = {
  dashboard: {
    icon: LayoutDashboard,
    label: 'Dashboard',
    desc: 'Panoramica interventi, statistiche giornaliere e ticket aperti.',
    color: 'from-blue-500 to-blue-700',
  },
  rapportino: {
    icon: FilePlus2,
    label: 'Nuovo Rapportino',
    desc: 'Form completo per registrare un intervento: cliente, materiali, ore, firma.',
    color: 'from-amber-400 to-orange-500',
  },
  clienti: {
    icon: Users,
    label: 'Clienti',
    desc: 'Anagrafica clienti con storico interventi e contatti.',
    color: 'from-emerald-500 to-teal-600',
  },
  calendario: {
    icon: CalendarDays,
    label: 'Calendario',
    desc: 'Pianificazione interventi per tecnico, vista mensile e settimanale.',
    color: 'from-violet-500 to-purple-700',
  },
  tickets: {
    icon: Ticket,
    label: 'Tickets',
    desc: 'Segnalazioni aperte, in corso e chiuse con priorità.',
    color: 'from-red-500 to-rose-700',
  },
  commesse: {
    icon: FolderKanban,
    label: 'Commesse',
    desc: 'Raggruppamento interventi per cantiere o progetto.',
    color: 'from-cyan-500 to-sky-700',
  },
  manutenzioni: {
    icon: Wrench,
    label: 'Manutenzioni Ricorrenti',
    desc: 'Scadenze caldaie, impianti e promemoria manutenzione.',
    color: 'from-amber-600 to-amber-800',
  },
  report: {
    icon: FileBarChart2,
    label: 'Report & PDF',
    desc: 'Statistiche aggregate ed export PDF dei rapportini.',
    color: 'from-slate-500 to-slate-700',
  },
  impostazioni: {
    icon: Settings,
    label: 'Impostazioni',
    desc: 'Configurazione tecnici, azienda e preferenze app.',
    color: 'from-slate-600 to-slate-800',
  },
}

export function PlaceholderPage({ pageKey }) {
  const meta = PAGE_META[pageKey] || PAGE_META.dashboard
  const Icon = meta.icon

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] gap-6 text-center px-6">
      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${meta.color} flex items-center justify-center shadow-2xl`}>
        <Icon size={28} className="text-white" strokeWidth={1.8} />
      </div>

      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">{meta.label}</h1>
        <p className="text-zinc-500 dark:text-slate-400 max-w-md text-sm leading-relaxed">{meta.desc}</p>
      </div>

      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-100 dark:bg-[#0f2040] border border-zinc-200 dark:border-[#1a3358] text-xs text-zinc-500 dark:text-slate-500">
        <Construction size={13} />
        <span>Modulo in sviluppo — prossima chat</span>
      </div>
    </div>
  )
}

export const DashboardPage = () => <PlaceholderPage pageKey="dashboard" />
export const NuovoRapportinoPage = () => <PlaceholderPage pageKey="rapportino" />
export const ClientiPage = () => <PlaceholderPage pageKey="clienti" />
export const CalendarioPage = () => <PlaceholderPage pageKey="calendario" />
export const TicketsPage = () => <PlaceholderPage pageKey="tickets" />
export const CommessePage = () => <PlaceholderPage pageKey="commesse" />
export const ManutenzioniPage = () => <PlaceholderPage pageKey="manutenzioni" />
export const ReportPage = () => <PlaceholderPage pageKey="report" />
export const ImpostazioniPage = () => <PlaceholderPage pageKey="impostazioni" />
