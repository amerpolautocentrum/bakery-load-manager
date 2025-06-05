'use server'

import Link from 'next/link'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Database } from '@/types/supabase'

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const supabase = createServerComponentClient<Database>({ cookies: () => cookieStore })

  // 1. Sprawdź sesję
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()

  if (!session || sessionError) {
    redirect('/login')
  }

  // 2. Pobierz dane profilu
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .limit(1)

  const profile = profileData?.[0]

  if (profileError || !profile) {
    console.error('Błąd pobierania profilu:', profileError?.message || 'Brak danych')
    return (
      <div className="p-8">
        <div className="text-red-600">Błąd ładowania danych profilu</div>
        <Link 
          href="/dashboard"
          className="mt-4 inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Odśwież stronę
        </Link>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-start mb-8">
        <h1 className="text-2xl font-bold">System Cukierni</h1>
        
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">
            Zalogowany jako: <span className="font-medium">{session.user.email}</span> 
            <span className="ml-2 px-2 py-1 bg-gray-100 rounded">{profile.role}</span>
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sekcja magazynów */}
        <div className="border rounded-lg p-6 bg-white shadow">
          <h2 className="text-xl font-semibold mb-4">Magazyn</h2>
          <Link 
            href="/magazyn"
            className="inline-block bg-blue-600 text-white px-4 py-2 rounded mb-4 hover:bg-blue-700 transition-colors"
          >
            {profile.role === 'cukiernia' ? 'Zarządzaj magazynem' : 'Twój magazyn'}
          </Link>
          <Link 
            href="/magazyn/historia"
            className="block text-blue-600 hover:text-blue-800 hover:underline"
          >
            Historia magazynów →
          </Link>
        </div>

        {/* Sekcja WZ */}
        <div className="border rounded-lg p-6 bg-white shadow">
          <h2 className="text-xl font-semibold mb-4">Dokumenty WZ</h2>
          <Link 
            href="/wz"
            className="inline-block bg-green-600 text-white px-4 py-2 rounded mb-4 hover:bg-green-700 transition-colors"
          >
            Utwórz nowy WZ
          </Link>
          <Link 
            href="/wz/historia"
            className="block text-green-600 hover:text-green-800 hover:underline"
          >
            Historia WZ →
          </Link>
        </div>

        {/* Panel administracyjny – tylko dla admina */}
        {profile.role === 'admin' && (
          <div className="border rounded-lg p-6 col-span-full bg-white shadow">
            <h2 className="text-xl font-semibold mb-4">Panel administracyjny</h2>
            <div className="flex flex-wrap gap-4">
              <Link 
                href="/admin/kierowcy"
                className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition-colors"
              >
                Zarządzaj kierowcami
              </Link>
              <Link 
                href="/admin/kierowcy/dodaj"
                className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition-colors"
              >
                Dodaj kierowcę
              </Link>
              <Link 
                href="/admin/raporty"
                className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition-colors"
              >
                Generuj raporty
              </Link>
              <Link 
                href="/admin/produkty"
                className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition-colors"
              >
                Zarządzaj produktami
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Funkcja wylogowania – musi być poza JSX
async function handleSignOut() {
  'use server'
  const supabase = createServerComponentClient<Database>({ cookies })
  await supabase.auth.signOut()
  redirect('/login')
}
