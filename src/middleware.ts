import { NextRequest, NextResponse } from 'next/server'

// Unigram — Next.js Proxy (Middleware)
//
// WHY THE COOKIE CHECK WAS REMOVED:
//   Supabase JS v2 stores the session in localStorage (client-side only),
//   NOT in cookies. The previous middleware checked for `sb-*-auth-token`
//   cookies which never exist → every protected page redirected to /login
//   in an infinite loop even after successful login.
//
//   Auth protection is handled client-side by useAuth() in each page:
//   - If not logged in → router.replace('/login')
//   - If pending/banned → router.replace('/pending')
//   - etc.
//
//   This middleware only handles static-asset pass-through and
//   the guidelines/legal pages — no cookie checks.

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Pass through everything — auth is handled client-side by useAuth()
  // (Supabase v2 uses localStorage, not cookies, so server can't check session)
  return NextResponse.next()
}

export const config = {
  // Only run on actual page routes — skip static assets entirely
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|sw.js|manifest.json|css|js|admin\\.html|api).*)'],
}
