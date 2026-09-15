import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

let supabase = null
let supabaseConfigError = ''

if (!supabaseUrl || !supabaseAnonKey) {
  supabaseConfigError = 'Faltan VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY en las variables de entorno.'
} else {
  try {
    const url = new URL(supabaseUrl)

    if (url.protocol !== 'https:' || !url.hostname.endsWith('.supabase.co') || url.pathname !== '/' || url.search || url.hash) {
      throw new Error('VITE_SUPABASE_URL debe ser solamente https://TU-PROYECTO.supabase.co, sin /rest/v1/.')
    }

    supabase = createClient(supabaseUrl, supabaseAnonKey)
  } catch (error) {
    supabaseConfigError = error?.message || 'La configuración de Supabase no es válida.'
  }
}

export { supabase, supabaseConfigError }
