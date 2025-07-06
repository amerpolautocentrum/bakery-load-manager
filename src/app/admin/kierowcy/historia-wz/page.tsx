'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/supabaseClient'

type Kierowca = {
  id: string
  imie: string
  nazwisko: string
}

export default function HistoriaWZ() {
  const [kierowcy, setKierowcy] = useState<Kierowca[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchKierowcy = async () => {
      const { data, error } = await supabase
        .from('kierowcy')
        .select('id, imie, nazwisko')
        .order('nazwisko', { ascending: true })

      if (!error && data) {
        setKierowcy(data)
      }
      setLoading(false)
    }

    fetchKierowcy()
  }, [])

  if (loading) return <div className="p-6 text-center">Ładowanie...</div>

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Historia dokumentów WZ kierowców</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {kierowcy.map(k => (
          <Link 
            key={k.id} 
            href={`/admin/kierowcy/${k.id}/historia-wz`} 
            className="block"
          >
            <div className="border p-4 rounded-lg shadow hover:bg-gray-50 transition cursor-pointer">
              <h2 className="text-lg font-medium">{k.imie} {k.nazwisko}</h2>
              <p className="text-sm text-gray-500">Zobacz historię WZ</p>
            </div>
          </Link>
        ))}
      </div>
      
      <div className="mt-6">
        <Link 
          href="/admin/kierowcy" 
          className="text-blue-600 hover:underline"
        >
          ← Wróć do panelu kierowców
        </Link>
      </div>
    </div>
  )
}