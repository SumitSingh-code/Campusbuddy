const { createClient } = require('@supabase/supabase-js');

const supabaseUrl            = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error('[FATAL] SUPABASE_URL is not set. Set it in Vercel > Settings > Environment Variables.');
}
if (!supabaseServiceRoleKey) {
  console.error('[FATAL] SUPABASE_SERVICE_ROLE_KEY is not set. Set it in Vercel > Settings > Environment Variables.');
}

// Use a placeholder URL when env vars are missing so createClient() does not
// throw at module-load time (which would crash the entire Express app before
// any request is even received, causing Vercel to return a raw HTML 500).
const supabaseAdmin = createClient(
  supabaseUrl            || 'https://placeholder-not-configured.supabase.co',
  supabaseServiceRoleKey || 'placeholder-key-not-configured',
  {
    auth: {
      autoRefreshToken: false,
      persistSession:   false,
    },
  }
);

module.exports = { supabaseAdmin };
