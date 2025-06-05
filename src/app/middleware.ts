// app/middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const response = NextResponse.next()
  const supabase = createMiddlewareClient({ req: request, res: response })
  
  // 1. Pobierz sesję (tylko dla chronionych tras)
  const pathname = request.nextUrl.pathname
  const publicRoutes = ['/login', '/reset-hasla', '/auth/callback']
  const protectedRoutes = ['/dashboard', '/magazyn', '/wz', '/admin']

  // Pomijaj middleware dla plików statycznych i publicznych
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/') ||
    pathname.includes('.') || // Pliki z rozszerzeniami
    publicRoutes.includes(pathname)
  ) {
    return response
  }

  // 2. Sprawdź sesję tylko dla chronionych tras
  if (protectedRoutes.some(route => pathname.startsWith(route))) {
    const { data: { session }, error } = await supabase.auth.getSession()

    if (!session || error) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // 3. Przekierowania dla zalogowanych
  if (pathname === '/login' || pathname === '/') {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, etc.
     * - api routes
     */
    '/((?!_next/static|_next/image|favicon.ico|api|auth|images|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ]
}