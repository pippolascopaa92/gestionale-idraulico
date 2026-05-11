import { useState, useMemo } from 'react'
import { Plus, Search, X, Edit2, Trash2, Package, ChevronUp, ChevronDown, Tag, Check } from 'lucide-react'
import { useMagazzino } from '../hooks/useMagazzino'

// ─── Categorie in localStorage ────────────────────────────────────────────────
const CAT_KEY = 'hydrodesk_categorie'
const CAT_DEFAULT = ['Rubinetteria', 'Raccorderia', 'Tubi', 'Caldaie', 'Scarichi', 'Accessori', 'Elettrico', 'Altro']
const UNITA = ['pz', 'mt', 'kg', 'l', 'kit', 'rotolo', 'conf']

function loadCategorie() {
  try {
    const stored = JSON.parse(localStorage.getItem(CAT_KEY))
    if (Array.isArray(stored) && stored.length > 0) return stored
  } catch {}
  return CAT_DEFAULT
}

function persistCategorie(cats) {
  localStorage.setItem(CAT_KEY, JSON.stringify(cats))
}

function genId() {
  return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

function emptyForm(categorie) {
  return { nome: '', categoria: categorie[0] || 'Altro', quantita: 0, unita: 'pz', codice: '', note: '', prezzoAcquisto: '', ricarico: '' }
}

// ─── Calcolo prezzo vendita ───────────────────────────────────────────────────
function calcVendita(acquisto, ricarico) {
  const a = parseFloat(acquisto)
  const r = parseFloat(ricarico)
  if (isNaN(a) || a <= 0) return ''
  return (a * (1 + (isNaN(r) ? 0 : r) / 100)).toFixed(2)
}

function fmt(v) {
  if (v === '' || v === undefined || v === null || isNaN(Number(v))) return '—'
  return Number(v).toFixed(2) + ' €'
}

// ─── Stile input condiviso ────────────────────────────────────────────────────
const inputCls = `w-full px-3 py-2 rounded-lg border text-sm
  dark:bg-[#080f20] bg-white dark:border-[#1e2d4a] border-slate-200
  dark:text-slate-100 text-slate-800 focus:outline-none focus:border-amber-500 transition-colors`

// ─── Form prodotto ────────────────────────────────────────────────────────────
function ProdottoForm({ initial, categorie, onSave, onCancel }) {
  const [form, setForm] = useState({ ...emptyForm(categorie), ...initial })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const prezzoVendita = calcVendita(form.prezzoAcquisto, form.ricarico)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.nome.trim()) return
    onSave({ ...form, prezzoVendita })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {/* Nome */}
        <div className="col-span-2 space-y-1.5">
          <label className="text-xs font-medium dark:text-slate-400 text-slate-500 uppercase tracking-wider">
            Nome prodotto <span className="text-amber-400">*</span>
          </label>
          <input className={inputCls} value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="es. Rubinetto monocomando" required />
        </div>

        {/* Categoria */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium dark:text-slate-400 text-slate-500 uppercase tracking-wider">Categoria</label>
          <select className={inputCls} value={form.categoria} onChange={e => set('categoria', e.target.value)}>
            {categorie.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>

        {/* Codice */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium dark:text-slate-400 text-slate-500 uppercase tracking-wider">Codice</label>
          <input className={inputCls} value={form.codice} onChange={e => set('codice', e.target.value)} placeholder="es. RUB-001" />
        </div>

        {/* Quantità */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium dark:text-slate-400 text-slate-500 uppercase tracking-wider">Quantità</label>
          <input className={inputCls} type="number" min="0" value={form.quantita} onChange={e => set('quantita', Number(e.target.value))} />
        </div>

        {/* Unità */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium dark:text-slate-400 text-slate-500 uppercase tracking-wider">Unità</label>
          <select className={inputCls} value={form.unita} onChange={e => set('unita', e.target.value)}>
            {UNITA.map(u => <option key={u}>{u}</option>)}
          </select>
        </div>

        {/* ── Sezione prezzi ── */}
        <div className="col-span-2 pt-3 mt-1 border-t dark:border-[#1e2d4a] border-slate-100">
          <p className="text-xs font-semibold dark:text-slate-500 text-slate-400 uppercase tracking-wider mb-3">
            Prezzi (IVA esclusa)
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium dark:text-slate-400 text-slate-500 uppercase tracking-wider">
                Acquisto €/pz
              </label>
              <input
                className={inputCls}
                type="number" min="0" step="0.01"
                value={form.prezzoAcquisto}
                onChange={e => set('prezzoAcquisto', e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium dark:text-slate-400 text-slate-500 uppercase tracking-wider">
                Ricarico %
              </label>
              <input
                className={inputCls}
                type="number" min="0" step="0.1"
                value={form.ricarico}
                onChange={e => set('ricarico', e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium dark:text-slate-400 text-slate-500 uppercase tracking-wider">
                Vendita €/pz
              </label>
              <div className={`${inputCls} dark:bg-[#060d1f] bg-slate-50 font-mono font-semibold cursor-not-allowed text-amber-400`}>
                {prezzoVendita ? prezzoVendita + ' €' : '—'}
              </div>
            </div>
          </div>
        </div>

        {/* Note */}
        <div className="col-span-2 space-y-1.5">
          <label className="text-xs font-medium dark:text-slate-400 text-slate-500 uppercase tracking-wider">Note</label>
          <textarea className={`${inputCls} resize-none`} rows={2} value={form.note} onChange={e => set('note', e.target.value)} placeholder="Note interne..." />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel}
          className="px-4 py-2 rounded-xl border dark:border-[#1e2d4a] border-slate-200 text-sm dark:text-slate-400 text-slate-500 hover:dark:bg-white/5 hover:bg-slate-50 transition-colors">
          Annulla
        </button>
        <button type="submit"
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-xl text-sm transition-colors">
          Salva
        </button>
      </div>
    </form>
  )
}

// ─── Modal generico ───────────────────────────────────────────────────────────
function Modal({ title, children, onClose, wide }) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className={`w-full ${wide ? 'max-w-2xl' : 'max-w-md'} rounded-2xl border dark:border-[#1e2d4a] border-slate-200 dark:bg-[#0d1a35] bg-white p-6 shadow-xl`}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold dark:text-white text-slate-800">{title}</h2>
          <button onClick={onClose} className="dark:text-slate-400 text-slate-500 hover:dark:text-white hover:text-slate-800 transition-colors">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ─── Modal gestione categorie ─────────────────────────────────────────────────
function CategorieModal({ categorie, onChange, onClose }) {
  const [lista, setLista] = useState([...categorie])
  const [nuova, setNuova] = useState('')
  const [editing, setEditing] = useState(null) // { idx, value }

  const aggiungi = () => {
    const trim = nuova.trim()
    if (!trim || lista.includes(trim)) return
    setLista(l => [...l, trim])
    setNuova('')
  }

  const elimina = (idx) => setLista(l => l.filter((_, i) => i !== idx))

  const salvaRinomina = () => {
    if (!editing) return
    const trim = editing.value.trim()
    if (trim) setLista(l => l.map((c, i) => i === editing.idx ? trim : c))
    setEditing(null)
  }

  const conferma = () => { onChange(lista); onClose() }

  return (
    <Modal title="Gestione categorie" onClose={onClose}>
      <div className="space-y-2 max-h-72 overflow-y-auto mb-4 pr-1">
        {lista.map((cat, idx) => (
          <div key={idx} className="flex items-center gap-2">
            {editing?.idx === idx ? (
              <>
                <input
                  autoFocus
                  className={`${inputCls} flex-1`}
                  value={editing.value}
                  onChange={e => setEditing(ed => ({ ...ed, value: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') salvaRinomina(); if (e.key === 'Escape') setEditing(null) }}
                />
                <button onClick={salvaRinomina}
                  className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center hover:bg-amber-500/30 transition-colors">
                  <Check size={14} />
                </button>
                <button onClick={() => setEditing(null)}
                  className="w-8 h-8 rounded-lg dark:bg-white/5 bg-slate-100 dark:text-slate-400 text-slate-500 flex items-center justify-center transition-colors">
                  <X size={14} />
                </button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm dark:text-slate-200 text-slate-700 px-3 py-2 rounded-lg dark:bg-white/5 bg-slate-50 border dark:border-[#1e2d4a] border-slate-200">
                  {cat}
                </span>
                <button onClick={() => setEditing({ idx, value: cat })}
                  className="w-8 h-8 rounded-lg dark:text-slate-500 text-slate-400 hover:dark:text-white hover:text-slate-800 hover:dark:bg-white/10 hover:bg-slate-100 flex items-center justify-center transition-colors">
                  <Edit2 size={13} />
                </button>
                <button onClick={() => elimina(idx)}
                  className="w-8 h-8 rounded-lg text-red-400 hover:bg-red-500/10 flex items-center justify-center transition-colors">
                  <Trash2 size={13} />
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Aggiungi nuova */}
      <div className="flex gap-2 mb-5">
        <input
          className={`${inputCls} flex-1`}
          value={nuova}
          onChange={e => setNuova(e.target.value)}
          placeholder="Nuova categoria..."
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); aggiungi() } }}
        />
        <button onClick={aggiungi}
          className="px-4 py-2 bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap">
          <Plus size={14} /> Aggiungi
        </button>
      </div>

      <div className="flex justify-end gap-2">
        <button onClick={onClose}
          className="px-4 py-2 rounded-xl border dark:border-[#1e2d4a] border-slate-200 text-sm dark:text-slate-400 text-slate-500 hover:dark:bg-white/5 hover:bg-slate-50 transition-colors">
          Annulla
        </button>
        <button onClick={conferma}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-xl text-sm transition-colors">
          Salva categorie
        </button>
      </div>
    </Modal>
  )
}

// ─── Colore quantità ──────────────────────────────────────────────────────────
const QTA_COLOR = (q) => {
  if (q === 0) return 'text-red-400 bg-red-500/10'
  if (q <= 3) return 'text-amber-400 bg-amber-500/10'
  return 'dark:text-emerald-400 text-emerald-600 bg-emerald-500/10'
}

// ─── Pagina principale ────────────────────────────────────────────────────────
export default function Magazzino() {
  const { prodotti, save, remove, aggiornaQuantita } = useMagazzino()
  const [search, setSearch]       = useState('')
  const [catFilter, setCatFilter] = useState('Tutti')
  const [modal, setModal]         = useState(null) // null | 'new' | { tipo:'edit', prodotto } | 'categorie'
  const [categorie, setCategorie] = useState(loadCategorie)

  // Unisce categorie salvate + quelle presenti nei prodotti (per retrocompatibilità)
  const categorieLista = useMemo(() => {
    const fromProdotti = prodotti.map(p => p.categoria).filter(Boolean)
    const merged = [...new Set([...categorie, ...fromProdotti])].sort()
    return ['Tutti', ...merged]
  }, [prodotti, categorie])

  const filtered = useMemo(() =>
    prodotti.filter(p => {
      const q = search.toLowerCase()
      const matchSearch = p.nome.toLowerCase().includes(q) || (p.codice?.toLowerCase() || '').includes(q)
      const matchCat = catFilter === 'Tutti' || p.categoria === catFilter
      return matchSearch && matchCat
    }),
    [prodotti, search, catFilter]
  )

  const handleSave = (form) => {
    if (modal === 'new') save({ ...form, id: genId() })
    else if (modal?.tipo === 'edit') save({ ...modal.prodotto, ...form })
    setModal(null)
  }

  const handleDelete = (id) => {
    if (!window.confirm('Eliminare questo prodotto dal magazzino?')) return
    remove(id)
  }

  const handleSaveCategorie = (nuove) => {
    setCategorie(nuove)
    persistCategorie(nuove)
  }

  const scorteBasseCount = prodotti.filter(p => p.quantita <= 3).length

  return (
    <>
      {/* Modal prodotto */}
      {(modal === 'new' || modal?.tipo === 'edit') && (
        <Modal title={modal === 'new' ? 'Nuovo prodotto' : 'Modifica prodotto'} onClose={() => setModal(null)} wide>
          <ProdottoForm
            initial={modal === 'new' ? emptyForm(categorie) : modal.prodotto}
            categorie={categorie}
            onSave={handleSave}
            onCancel={() => setModal(null)}
          />
        </Modal>
      )}

      {/* Modal categorie */}
      {modal === 'categorie' && (
        <CategorieModal
          categorie={categorie}
          onChange={handleSaveCategorie}
          onClose={() => setModal(null)}
        />
      )}

      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold dark:text-white text-slate-800">Magazzino</h1>
            <p className="text-sm dark:text-slate-400 text-slate-500 mt-0.5">
              {prodotti.length} prodotti
              {scorteBasseCount > 0 && (
                <span className="ml-2 text-amber-400">· {scorteBasseCount} in esaurimento</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setModal('categorie')}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border dark:border-[#1e2d4a] border-slate-200 dark:text-slate-400 text-slate-500 hover:dark:text-white hover:text-slate-800 hover:dark:bg-white/5 hover:bg-slate-50 text-sm transition-colors"
            >
              <Tag size={15} /> Categorie
            </button>
            <button
              onClick={() => setModal('new')}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-xl text-sm transition-colors"
            >
              <Plus size={16} /> Nuovo Prodotto
            </button>
          </div>
        </div>

        {/* Filtri categoria + ricerca */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 dark:text-slate-500 text-slate-400" />
            <input
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm dark:bg-[#080f20] bg-white dark:border-[#1e2d4a] border-slate-200 dark:text-slate-100 text-slate-800 focus:outline-none focus:border-amber-500 transition-colors"
              placeholder="Cerca per nome o codice..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 dark:text-slate-500 text-slate-400">
                <X size={14} />
              </button>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            {categorieLista.map(c => (
              <button key={c} onClick={() => setCatFilter(c)}
                className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors
                  ${catFilter === c
                    ? 'bg-amber-500 text-black'
                    : 'dark:bg-[#080f20] bg-white border dark:border-[#1e2d4a] border-slate-200 dark:text-slate-400 text-slate-500 hover:dark:text-white hover:text-slate-800'
                  }`}>
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Tabella — scrollabile orizzontalmente per stare nel layout */}
        <div className="rounded-xl border dark:border-[#1e2d4a] border-slate-200 dark:bg-[#080f20] bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b dark:border-[#1e2d4a] border-slate-100">
                  {[
                    ['Prodotto',    'text-left',   'w-48'],
                    ['Categoria',   'text-left',   ''],
                    ['Q.tà',        'text-center', ''],
                    ['U.M.',        'text-center', ''],
                    ['Acq. €/pz',   'text-right',  ''],
                    ['Ric. %',      'text-right',  ''],
                    ['Vend. €/pz',  'text-right',  ''],
                    ['',            '',            'w-20'],
                  ].map(([label, align, w], i) => (
                    <th key={i} className={`px-4 py-2.5 text-[10px] font-semibold uppercase tracking-widest dark:text-slate-600 text-slate-400 ${align} ${w}`}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-[#1e2d4a] divide-slate-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-14 text-center">
                      <Package size={32} className="mx-auto mb-3 dark:text-slate-700 text-slate-300" />
                      <p className="text-sm dark:text-slate-500 text-slate-400">
                        {search || catFilter !== 'Tutti' ? 'Nessun risultato' : 'Magazzino vuoto'}
                      </p>
                    </td>
                  </tr>
                ) : filtered.map(p => {
                  const vendita = p.prezzoVendita || calcVendita(p.prezzoAcquisto, p.ricarico)
                  return (
                    <tr key={p.id} className="hover:dark:bg-white/5 hover:bg-slate-50 transition-colors group">
                      {/* Prodotto */}
                      <td className="px-4 py-3">
                        <p className="font-medium dark:text-white text-slate-800 truncate max-w-[180px]">{p.nome}</p>
                        {p.codice && <p className="text-xs dark:text-slate-500 text-slate-400 font-mono">{p.codice}</p>}
                      </td>
                      {/* Categoria */}
                      <td className="px-4 py-3">
                        <span className="text-xs dark:text-slate-400 text-slate-500">{p.categoria}</span>
                      </td>
                      {/* Quantità */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => aggiornaQuantita(p.id, -1)} disabled={p.quantita === 0}
                            className="w-5 h-5 flex items-center justify-center rounded dark:text-slate-500 text-slate-400 hover:dark:text-white hover:text-slate-800 hover:dark:bg-white/10 hover:bg-slate-100 disabled:opacity-30 transition-colors">
                            <ChevronDown size={13} />
                          </button>
                          <span className={`text-sm font-bold font-mono px-2 py-0.5 rounded-lg min-w-[36px] text-center ${QTA_COLOR(p.quantita)}`}>
                            {p.quantita}
                          </span>
                          <button onClick={() => aggiornaQuantita(p.id, 1)}
                            className="w-5 h-5 flex items-center justify-center rounded dark:text-slate-500 text-slate-400 hover:dark:text-white hover:text-slate-800 hover:dark:bg-white/10 hover:bg-slate-100 transition-colors">
                            <ChevronUp size={13} />
                          </button>
                        </div>
                      </td>
                      {/* U.M. */}
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs dark:text-slate-500 text-slate-400">{p.unita}</span>
                      </td>
                      {/* Prezzo acquisto */}
                      <td className="px-4 py-3 text-right">
                        <span className="text-xs font-mono dark:text-slate-300 text-slate-600">{fmt(p.prezzoAcquisto)}</span>
                      </td>
                      {/* Ricarico */}
                      <td className="px-4 py-3 text-right">
                        <span className="text-xs font-mono dark:text-slate-400 text-slate-500">
                          {p.ricarico !== '' && p.ricarico !== undefined && p.ricarico !== null ? p.ricarico + '%' : '—'}
                        </span>
                      </td>
                      {/* Prezzo vendita */}
                      <td className="px-4 py-3 text-right">
                        <span className="text-xs font-mono font-semibold text-amber-400">{fmt(vendita)}</span>
                      </td>
                      {/* Azioni */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setModal({ tipo: 'edit', prodotto: p })}
                            className="w-7 h-7 rounded-lg dark:text-slate-500 text-slate-400 hover:dark:text-white hover:text-slate-800 hover:dark:bg-white/10 hover:bg-slate-100 flex items-center justify-center transition-colors">
                            <Edit2 size={13} />
                          </button>
                          <button onClick={() => handleDelete(p.id)}
                            className="w-7 h-7 rounded-lg text-red-400 hover:bg-red-500/10 flex items-center justify-center transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Legenda scorte */}
        <div className="flex gap-4 text-xs dark:text-slate-500 text-slate-400">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> Disponibile</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Scorte basse (≤3)</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Esaurito</span>
        </div>

      </div>
    </>
  )
}
