import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const MOCK = [
  { id: 'p1', nome: 'Rubinetto monocomando', categoria: 'Rubinetteria', quantita: 8, unita: 'pz', codice: 'RUB-001', note: '' },
  { id: 'p2', nome: 'Guarnizioni assortite', categoria: 'Raccorderia', quantita: 15, unita: 'kit', codice: 'GAR-001', note: '' },
  { id: 'p3', nome: 'Tubo flessibile 40cm', categoria: 'Tubi', quantita: 12, unita: 'pz', codice: 'TUB-040', note: '' },
  { id: 'p4', nome: 'Filtro olio caldaia', categoria: 'Caldaie', quantita: 6, unita: 'pz', codice: 'FIL-001', note: '' },
  { id: 'p5', nome: 'Sifone cucina', categoria: 'Scarichi', quantita: 4, unita: 'pz', codice: 'SIF-001', note: '' },
  { id: 'p6', nome: 'Nastro teflon', categoria: 'Accessori', quantita: 30, unita: 'pz', codice: 'TEF-001', note: '' },
]

export function useMagazzino() {
  const [prodotti, setProdotti] = useState(() => {
    try {
      const stored = localStorage.getItem('hydrodesk_magazzino')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
      return MOCK
    } catch {
      return MOCK
    }
  })

  useEffect(() => {
    localStorage.setItem('hydrodesk_magazzino', JSON.stringify(prodotti))
  }, [prodotti])

  const save = async (prodotto) => {
    setProdotti(prev => {
      const exists = prev.find(p => p.id === prodotto.id)
      if (exists) return prev.map(p => p.id === prodotto.id ? prodotto : p)
      return [...prev, prodotto]
    })
    try {
      const { error } = await supabase.from('magazzino').upsert(prodotto, { onConflict: 'id' })
      if (error) console.warn('Sync Supabase fallita:', error.message)
    } catch (err) {
      console.warn('Sync Supabase fallita:', err)
    }
  }

  const remove = async (id) => {
    setProdotti(prev => prev.filter(p => p.id !== id))
    try {
      const { error } = await supabase.from('magazzino').delete().eq('id', id)
      if (error) console.warn('Sync Supabase fallita:', error.message)
    } catch (err) {
      console.warn('Sync Supabase fallita:', err)
    }
  }

  const getById = (id) => prodotti.find(p => p.id === id)

  const aggiornaQuantita = async (id, delta) => {
    let nuovaQuantita = 0
    setProdotti(prev => prev.map(p => {
      if (p.id === id) {
        nuovaQuantita = Math.max(0, (p.quantita || 0) + delta)
        return { ...p, quantita: nuovaQuantita }
      }
      return p
    }))
    try {
      const { error } = await supabase.from('magazzino').update({ quantita: nuovaQuantita }).eq('id', id)
      if (error) console.warn('Sync Supabase fallita:', error.message)
    } catch (err) {
      console.warn('Sync Supabase fallita:', err)
    }
  }

  return { prodotti, save, remove, getById, aggiornaQuantita }
}
