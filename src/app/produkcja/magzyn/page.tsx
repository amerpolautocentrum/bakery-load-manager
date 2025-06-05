'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/supabaseClient'

interface Kierowca {
  id: string
  imie: string
  nazwisko: string
}

export default function ProdukcjaMagazynStart() {
  const [kierowcy, setKierowcy] = useState<Kierowca[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const fetchKierowcy = async () => {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('kierowcy')
        .select('id, imie, nazwisko')
        .order('imie', { ascending: true })

      if (error) {
        console.error('Błąd ładowania kierowców:', error)
        return
      }

      setKierowcy(data || [])
      setIsLoading(false)
    }

    fetchKierowcy()
  }, [])

  if (isLoading) return <div className="p-6 text-center">Ładowanie...</div>

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-6 text-center">Wybierz kierowcę</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {kierowcy.map((k) => (
          <button
            key={k.id}
            onClick={() => router.push(`/produkcja/magazyn/${k.id}`)}
            className="w-full bg-blue-600 text-white text-lg py-4 px-3 rounded-xl shadow hover:bg-blue-700 active:scale-95 transition-all"
          >
            {k.imie} {k.nazwisko}
          </button>
        ))}
      </div>
    </div>
  )
}
