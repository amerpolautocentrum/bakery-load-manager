import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const supabase = createMiddlewareClient({ req: request, res: response })

  const pathname = request.nextUrl.pathname
  const publicRoutes = ['/login', '/reset-hasla', '/auth/callback']

  // Ignoruj statyczne pliki i publiczne trasy
  if (pathname.startsWith('/_next/') || pathname.startsWith('/api/') || pathname.includes('.') || publicRoutes.includes(pathname)) {
    return response
  }

  try {
    // Pobierz sesję z cookies
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error || !session) {
      console.error('Brak sesji lub błąd:', error)
      const url = new URL('/login', request.url)
      url.searchParams.set('redirect', pathname)
      return NextResponse.redirect(url)
    }

    // Wymuś odświeżenie tokena jeśli jest blisko wygaśnięcia
    const expiresAt = new Date(session.expires_at! * 1000)
    if (expiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
      const { data: { session: refreshedSession }, error: refreshError } = 
        await supabase.auth.refreshSession()
      
      if (refreshError || !refreshedSession) {
        console.error('Błąd odświeżania sesji:', refreshError)
        throw refreshError || new Error('Nie udało się odświeżyć sesji')
      }
    }

    return response

  } catch (error) {
    console.error('Błąd middleware:', error)
    const url = new URL('/login', request.url)
    url.searchParams.set('error', 'session_error')
    return NextResponse.redirect(url)
  }
}