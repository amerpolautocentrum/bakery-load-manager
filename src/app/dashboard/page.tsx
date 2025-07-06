'use server'

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies as getCookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Database } from '@/types/supabase'
import Link from 'next/link'

export default async function DashboardPage() {
  const cookieStore = await getCookies()
  const supabase = createServerComponentClient<Database>({ cookies: () => cookieStore })

  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  if (!session || sessionError) {
    redirect('/login')
  }

  const userId = session.user.id

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, login')
    .eq('id', userId)
    .single()

  if (profileError || !profile) {
    return (
      <div className="p-8 text-center text-red-600">
        Błąd ładowania danych profilu. Skontaktuj się z administratorem.
      </div>
    )
  }

  const isKierowca = profile.role === 'kierowca_id'

  if (!isKierowca) {
    if (profile.role === 'produkcja') redirect('/produkcja')
    if (profile.role === 'admin') redirect('/admin')
    return <div className="text-center text-gray-600">Nieznana rola: {profile.role}</div>
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-start mb-8">
        <img src="/logo/CakeTrack_cleaned.svg" alt="CakeTrack logo" className="h-10" />


        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">
            Zalogowany jako: {profile.login}
            <span className="ml-2 px-2 py-1 bg-gray-100 rounded text-xs">{profile.role}</span>
          </div>
          <form action={handleSignOut}>
            <button
              type="submit"
              className="text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
            >
              Wyloguj
            </button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link href="/magazyn" className="block bg-blue-600 text-white p-4 rounded shadow hover:bg-blue-700 transition">
          Twój magazyn
        </Link>
        <Link href="/wz" className="block bg-green-600 text-white p-4 rounded shadow hover:bg-green-700 transition">
          Wystaw dokument WZ
        </Link>
        <Link href="/magazyn/historia" className="block bg-gray-600 text-white p-4 rounded shadow hover:bg-gray-700 transition">
          Historia magazynów
        </Link>
        <Link
  href="/dashboard/trasy"
  className="block bg-purple-600 text-white p-4 rounded shadow hover:bg-purple-700 transition"
>
  Trasy
</Link>
<Link
  href="/kp/nowy"
  className="block bg-yellow-500 text-white p-4 rounded shadow hover:bg-yellow-600 transition"
>
  Wystaw KP
</Link>

        <Link href="/wz/historia" className="block bg-gray-600 text-white p-4 rounded shadow hover:bg-gray-700 transition">
          Historia WZ
        </Link>
        <Link href="/pozostale" className="block bg-orange-600 text-white p-4 rounded shadow hover:bg-orange-700 transition">
          Magazyn po trasie
        </Link>
        <Link href="/raportkierowcy" className="block bg-gray-600 text-white p-4 rounded shadow hover:bg-gray-700 transition">
  Raport dnia
</Link>

      </div>
    </div>
  )
}

async function handleSignOut() {
  'use server'
  const cookieStore = await getCookies()
  const supabase = createServerComponentClient<Database>({ cookies: () => cookieStore })
  await supabase.auth.signOut()
  redirect('/login')
}
