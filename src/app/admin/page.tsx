'use server'

import Link from 'next/link'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/supabase'

export default async function AdminPage() {
  const cookieStore = cookies()
  const supabase = createServerComponentClient<Database>({ cookies: () => cookieStore })

  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  if (!session || sessionError) {
    redirect('/login')
  }

  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .limit(1)

  const profile = profileData?.[0]

  if (profileError || !profile || profile.role !== 'admin') {
    redirect('/dashboard')
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-start mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Panel administratora</h1>

        <form action={handleSignOut}>
          <button
            type="submit"
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition"
          >
            Wyloguj
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {/* Magazyny */}
        <div className="border rounded-lg p-6 bg-white shadow">
          <h2 className="text-xl font-semibold mb-4">Magazyny kierowców</h2>
          <Link
            href="/admin/kierowcy"
            className="block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mb-3 text-center"
          >
            Lista kierowców
          </Link>
          <Link
            href="/admin/kierowcy/dodaj"
            className="block bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 text-center"
          >
            Dodaj nowego kierowcę
          </Link>
        </div>

        {/* Produkty */}
        <div className="border rounded-lg p-6 bg-white shadow">
          <h2 className="text-xl font-semibold mb-4">Produkty</h2>
          <Link
            href="/admin/produkty"
            className="block bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 text-center"
          >
            Zarządzaj produktami
          </Link>
        </div>

        {/* Sklepy */}
        <div className="border rounded-lg p-6 bg-white shadow">
          <h2 className="text-xl font-semibold mb-4">Sklepy</h2>
          <Link
            href="/admin/sklepy"
            className="block bg-teal-600 text-white px-4 py-2 rounded hover:bg-teal-700 mb-3 text-center"
          >
            Lista sklepów
          </Link>
          <Link
            href="/admin/sklepy/dodaj"
            className="block bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700 text-center"
          >
            Dodaj nowy sklep
          </Link>
        </div>

        {/* Raporty */}
        <div className="border rounded-lg p-6 col-span-full bg-white shadow">
          <h2 className="text-xl font-semibold mb-4">Raporty</h2>
          <Link
            href="/admin/raporty"
            className="block bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-center"
          >
            Generuj raporty
          </Link>
        </div>
      </div>
    </div>
  )
}

async function handleSignOut() {
  'use server'
  const cookieStore = cookies()
  const supabase = createServerComponentClient<Database>({ cookies: () => cookieStore })
  await supabase.auth.signOut()
  redirect('/login')
}
