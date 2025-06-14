'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/supabaseClient'

interface Kierowca {
  id: string
  imie: string
  nazwisko: string | null
  login: string | null
}

export default function ProdukcjaDashboard() {
  const [kierowcy, setKierowcy] = useState<Kierowca[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchKierowcy = async () => {
      const { data, error } = await supabase
        .from('kierowcy')
        .select('id, imie, nazwisko, login')
        .order('imie', { ascending: true })

      if (error) {
        console.error('Błąd pobierania kierowców:', error)
      } else {
        setKierowcy(data || [])
      }

      setLoading(false)
    }

    fetchKierowcy()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Wybierz kierowcę</h1>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Wyloguj
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500">Ładowanie kierowców...</p>
      ) : kierowcy.length === 0 ? (
        <p className="text-gray-500">Brak dostępnych kierowców.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {kierowcy.map((k) => (
            <Link
              key={k.id}
              href={`/magazyn/nowy?kierowca=${k.id}`}
              className="block p-4 bg-white rounded-xl shadow hover:shadow-md border hover:border-blue-500 transition"
            >
              <h2 className="text-lg font-semibold">
                {k.imie} {k.nazwisko ?? ''}
              </h2>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
