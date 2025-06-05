'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabase } from '@/supabaseClient'

export default function KierowcaHistoria() {
  const params = useParams()
  const [miesiace, setMiesiace] = useState<string[]>([])
  const [kierowca, setKierowca] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      const { data: magazynData, error } = await supabase
        .from('magazyn')
        .select('data')
        .eq('kierowca_id', params.id)

      if (error) {
        console.error('Błąd pobierania danych:', error)
        return
      }

      const miesiaceSet = new Set<string>()
      magazynData?.forEach(entry => {
        const [rok, miesiac] = entry.data.split('-')
        const miesiacSlownie = new Date(`${rok}-${miesiac}-01`).toLocaleString('pl-PL', { month: 'long' })
        miesiaceSet.add(`${miesiacSlownie} ${rok}`)
      })

      setMiesiace(Array.from(miesiaceSet))
    }

    const fetchKierowca = async () => {
      const { data, error } = await supabase
        .from('kierowcy')
        .select('imie, nazwisko')
        .eq('id', params.id)
        .single()

      if (data) setKierowca(`${data.imie} ${data.nazwisko}`)
    }

    fetchData()
    fetchKierowca()
  }, [params.id])

  return (
    <div className="p-4 max-w-md mx-auto">
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <Link href="/admin/kierowcy" className="text-blue-600 hover:underline">
          ← Wróć do listy kierowców
        </Link>
        <Link href="/dashboard" className="text-blue-600 hover:underline">
          ← Powrót do panelu administratora
        </Link>
      </div>

      <h1 className="text-xl font-bold mb-4">Historia magazynów: {kierowca}</h1>

      <ul className="space-y-2">
        {miesiace.sort().map(miesiac => (
          <li key={miesiac}>
            <Link
              href={`/admin/kierowcy/${params.id}/${miesiac}`}
              className="block p-3 bg-white rounded shadow hover:bg-gray-50"
            >
              {miesiac}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
