import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = [
  '/login', '/signup', '/forgot-password', '/pending',
  '/change-password', '/privacy', '/terms', '/contact', '/about',
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public auth pages
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) return NextResponse.next()
  // Allow static assets, API routes, admin.html
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/icons') ||
    pathname.includes('.')
  ) return NextResponse.next()

  // Check Supabase session cookie (sb-*-auth-token)
  const hasSession = Array.from(request.cookies.getAll()).some(
    c => c.name.startsWith('sb-') && c.name.endsWith('-auth-token')
  )

  if (!hasSession) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|sw.js|manifest.json|css).*)'],
}
