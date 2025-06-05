'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/supabaseClient'
import Link from 'next/link'

const miesiacePL = [
  'styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec',
  'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień'
]

export default function HistoriaMiesiaca() {
  const { id, miesiac } = useParams()
  const [dane, setDane] = useState<{ data: string }[]>([])
  const [kierowca, setKierowca] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const miesiacLower = miesiac.toString().toLowerCase()
      const [miesiacNazwa, rokStr] = miesiacLower.split('-')
      const miesiacIndex = miesiacePL.indexOf(miesiacNazwa)
      const rok = parseInt(rokStr)

      const dataOd = new Date(rok, miesiacIndex, 1).toISOString().split('T')[0]
      const dataDo = new Date(rok, miesiacIndex + 1, 0).toISOString().split('T')[0]

      const { data: kierowcaData } = await supabase
        .from('kierowcy')
        .select('imie, nazwisko')
        .eq('id', id)
        .single()
      setKierowca(kierowcaData ? `${kierowcaData.imie} ${kierowcaData.nazwisko}` : 'Nieznany')

      const { data: magazynData } = await supabase
        .from('magazyn')
        .select('data')
        .eq('kierowca_id', id)
        .gte('data', dataOd)
        .lte('data', dataDo)

      const unikalneDni = Array.from(
        new Set(magazynData?.map(item => item.data))
      ).sort().reverse()

      setDane(unikalneDni.map(d => ({ data: d })))
      setLoading(false)
    }

    fetchData()
  }, [id, miesiac])

  if (loading) return <div className="p-6 text-center">Ładowanie danych...</div>

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Magazyn – {kierowca}</h1>
      <h2 className="text-xl mb-6">📅 Historia załadunków za: {miesiac}</h2>

      {dane.length === 0 ? (
        <p className="text-gray-500">Brak danych w tym miesiącu.</p>
      ) : (
        <ul className="space-y-3">
          {dane.map((dzien, index) => (
            <li key={index}>
              <Link 
                href={`/magazyn/historia/${encodeURIComponent(dzien.data)}`}
                className="text-blue-600 hover:underline"
              >
                {new Date(dzien.data).toLocaleDateString('pl-PL')}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Link href={`/admin/kierowcy/${id}`} className="inline-block mt-6 text-blue-600 hover:underline">
        ← Wróć do miesięcy
      </Link>
    </div>
  )
}
