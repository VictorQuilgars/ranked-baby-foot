import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

// Singleton paresseux — créé à la première utilisation, pas au chargement du module
export function getSupabase(): SupabaseClient {
  if (!_client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error('SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis. Copie .env.example → .env et remplis les valeurs.');
    }

    _client = createClient(url, key, {
      auth: { persistSession: false },
    });
  }
  return _client;
}
