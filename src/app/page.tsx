import { redirect } from 'next/navigation'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export default async function Home() {
  const cookieStore = await cookies()
  const supabase = createServerComponentClient({ cookies: () => cookieStore })

  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  const role = session.user.user_metadata?.role

  if (role === 'produkcja') {
    redirect('/produkcja')
  } else if (role === 'kierowca') {
    redirect('/dashboard')
  } else if (role === 'admin') {
    redirect('/admin')
  }

  redirect('/dashboard') // fallback
}
