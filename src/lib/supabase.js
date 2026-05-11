import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

if (import.meta.env.DEV) {
  supabase.from('clienti').select('id').limit(1)
    .then(({ error }) => {
      if (error) console.warn('[Supabase] Connessione fallita:', error.message)
      else console.log('[Supabase] Connessione OK')
    })
}
