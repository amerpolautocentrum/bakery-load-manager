'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabase } from '@/supabaseClient'

export default function DniMagazynuMiesiac() {
  const params = useParams()
  const [dni, setDni] = useState<string[]>([])
  const [kierowca, setKierowca] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase
        .from('magazyn')
        .select('data')
        .eq('kierowca_id', params.id)

      if (error) {
        console.error('Błąd pobierania danych:', error)
        return
      }

      const filtered = data?.filter(entry => {
        const [rok, miesiac] = entry.data.split('-')
        const miesiacSlownie = new Date(`${rok}-${miesiac}-01`).toLocaleString('pl-PL', { month: 'long' })
        const miesiacRok = `${miesiacSlownie} ${rok}`
        return miesiacRok === decodeURIComponent(params.miesiac as string)
      })

      const unikalneDni = [...new Set(filtered?.map(entry => entry.data))]
      setDni(unikalneDni)
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
  }, [params.id, params.miesiac])

  return (
    <div className="p-4 max-w-md mx-auto">
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <Link href={`/admin/kierowcy/${params.id}`} className="text-blue-600 hover:underline">
          ← Powrót do miesięcy
        </Link>
        <Link href="/dashboard" className="text-blue-600 hover:underline">
          ← Panel administratora
        </Link>
      </div>

      <h1 className="text-xl font-bold mb-4">Magazyn: {params.miesiac}</h1>
      <p className="mb-2 text-gray-600">Kierowca: {kierowca}</p>

      {dni.length === 0 ? (
        <p className="text-gray-500">Brak danych</p>
      ) : (
        <ul className="space-y-2">
          {dni.map((dzien, index) => (
            <li key={index}>
              <Link
                href={`/magazyn/historia/${dzien}___${params.id}`}
                className="block p-3 bg-white rounded shadow hover:bg-gray-50"
              >
                {dzien}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
