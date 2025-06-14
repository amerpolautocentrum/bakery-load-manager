'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/supabaseClient'

type Kierowca = {
  id: string
  imie: string
  nazwisko: string
}

export default function ListaKierowcow() {
  const [kierowcy, setKierowcy] = useState<Kierowca[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const fetchKierowcy = async () => {
    const { data, error } = await supabase
      .from('kierowcy')
      .select('id, imie, nazwisko')
      .order('nazwisko', { ascending: true })

    if (!error && data) setKierowcy(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchKierowcy()
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Czy na pewno chcesz usunąć tego kierowcę?')) return

    const { error } = await supabase.from('kierowcy').delete().eq('id', id)
    if (error) {
      alert('Błąd podczas usuwania kierowcy')
      return
    }

    setKierowcy(prev => prev.filter(k => k.id !== id))
  }

  if (loading) return <div className="p-6 text-center">Ładowanie...</div>

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Lista kierowców (zarządzanie)</h1>

      <Link
        href="/admin/kierowcy/dodaj"
        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 inline-block mb-4"
      >
        ➕ Dodaj nowego kierowcę
      </Link>

      <div className="space-y-4">
        {kierowcy.map(k => (
          <div key={k.id} className="border p-4 rounded-lg shadow flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium">{k.imie} {k.nazwisko}</h2>
            </div>
            <div className="flex gap-3">
              <Link
                href={`/admin/kierowcy/${k.id}/edytuj`}
                className="text-blue-600 hover:underline"
              >
                ✏️ Edytuj
              </Link>
              <button
                onClick={() => handleDelete(k.id)}
                className="text-red-600 hover:underline"
              >
                ❌ Usuń
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Przycisk powrotu */}
      <button
        onClick={() => router.push('/admin/kierowcy')}
        className="mt-8 bg-gray-200 hover:bg-gray-300 text-black font-semibold py-2 px-4 rounded"
      >
        ← Powrót
      </button>
    </div>
  )
}
