// Campus Wall — Supabase Client (Frontend)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Config from './config.js';

if (!Config.SUPABASE_URL || Config.SUPABASE_URL.includes('YOUR_PROJECT_ID')) {
  console.error(
    '[CampusWall] Supabase not configured!\n' +
    'Edit public/js/config.js and fill in SUPABASE_URL and SUPABASE_ANON_KEY.'
  );
}

export const supabase = createClient(Config.SUPABASE_URL, Config.SUPABASE_ANON_KEY, {
  auth: {
    // Store session in localStorage so it persists across tabs/refreshes
    persistSession: true,
    autoRefreshToken: true,
    // Detect auth redirect automatically (handles Google OAuth callback)
    detectSessionInUrl: true,
    storageKey: 'cw_auth_token',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export default supabase;
