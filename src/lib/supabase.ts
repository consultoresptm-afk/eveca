import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "⚠️ ATENCIÓN: Las credenciales de Supabase no están completas en .env. " +
    "Por favor, configure VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en su gestor de variables de entorno."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Helper to check connection and database capability.
 * Tests if tables exist and RLS permits read.
 */
export async function testDatabaseConnection() {
  try {
    const { data, error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, count: data };
  } catch (err: any) {
    return { success: false, error: err.message || String(err) };
  }
}
