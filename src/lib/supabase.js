'use strict';
// Campus Wall — Supabase Admin Client (server-side only)
//
// WHY ws IS REQUIRED:
//   @supabase/realtime-js calls WebSocketFactory.getWebSocketConstructor() at
//   RealtimeClient construction time.  On Node.js < 22, there is no native
//   globalThis.WebSocket, so the factory throws:
//     "Node.js detected but native WebSocket not found."
//   This crashes the module at require() time — before any route handler runs —
//   making every Vercel function return a raw HTML 500 (FUNCTION_INVOCATION_FAILED).
//
//   Fix: pass the 'ws' package explicitly as realtime.transport in createClient.
//   When a transport is provided, the factory is bypassed entirely.
//   This works on Node 20 AND Node 22+.

const { createClient } = require('@supabase/supabase-js');
const Ws = require('ws'); // WebSocket implementation for Node.js (bypasses factory)

const supabaseUrl            = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error('[FATAL] SUPABASE_URL is not set. Add it in Vercel > Settings > Environment Variables.');
}
if (!supabaseServiceRoleKey) {
  console.error('[FATAL] SUPABASE_SERVICE_ROLE_KEY is not set. Add it in Vercel > Settings > Environment Variables.');
}

// Use placeholder URL so createClient() does NOT throw at module-load time
// when env vars are missing — routes will fail at query time with a clear error
// rather than crashing the whole Express app before any request is handled.
const supabaseAdmin = createClient(
  supabaseUrl            || 'https://placeholder-not-configured.supabase.co',
  supabaseServiceRoleKey || 'placeholder-key-not-configured',
  {
    auth: {
      autoRefreshToken: false,
      persistSession:   false,
    },
    // Pass ws as the WebSocket transport so WebSocketFactory is never called.
    // The backend never uses Realtime subscriptions; this just prevents the
    // factory from throwing on Node < 22 during module load.
    realtime: {
      transport: Ws,
    },
  }
);

module.exports = { supabaseAdmin };
