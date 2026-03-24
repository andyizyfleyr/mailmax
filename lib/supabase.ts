import { createClient } from '@supabase/supabase-js'

// Assurez-vous que ces variables existent dans votre .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Crée le client Supabase unique à l'application
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
