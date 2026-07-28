// Campus Wall — Frontend Configuration
// Fill in your Supabase project credentials below.
// The ANON KEY is safe to expose here (it's protected by Row Level Security).
// NEVER put the SERVICE_ROLE_KEY here.

const Config = {
  // Your Supabase project URL (find in: Supabase Dashboard → Settings → API)
  SUPABASE_URL: 'https://YOUR_PROJECT_ID.supabase.co',

  // Your Supabase anon/public key
  SUPABASE_ANON_KEY: 'eyJ...',

  // Base URL for the Express API
  // Leave empty string '' for same-origin (production on Vercel)
  // Use 'http://localhost:3000' for local backend development
  API_BASE: '',

  // App name constants
  UNIVERSITY_NAME: 'Chaudhary Ranbir Singh University',
  UNIVERSITY_SHORT: 'CRSU, Jind',
  APP_NAME: 'Campus Wall',

  // Feature flags
  DAILY_POST_LIMIT_NAMED: 5,
  DAILY_POST_LIMIT_ANON: 3,
  MAX_POST_LENGTH: 1000,
  MAX_COMMENT_LENGTH: 500,
  MAX_BIO_LENGTH: 300,
  POSTS_PER_PAGE: 25,
};

export default Config;
