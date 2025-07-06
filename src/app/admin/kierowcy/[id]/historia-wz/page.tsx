'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/supabaseClient'

const miesiacePL = [
  'styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec',
  'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień'
]

export default function HistoriaWZ() {
  const { id } = useParams()
  const [kierowca, setKierowca] = useState('')
  const [miesiace, setMiesiace] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      // Imię i nazwisko kierowcy
      const { data: kierowcaData } = await supabase
        .from('kierowcy')
        .select('imie, nazwisko')
        .eq('id', id)
        .single()

      if (kierowcaData) {
        setKierowca(`${kierowcaData.imie} ${kierowcaData.nazwisko}`)
      }

      // Miesiące z dokumentami WZ
      const { data: dokumenty } = await supabase
        .from('wz_dokumenty')
        .select('data')
        .eq('kierowca_id', id)

      if (dokumenty) {
        const miesiaceSet = new Set<string>()
        dokumenty.forEach(doc => {
          const d = new Date(doc.data)
          const miesiac = miesiacePL[d.getMonth()]
          const rok = d.getFullYear()
          miesiaceSet.add(`${miesiac}-${rok}`)
        })

        const posortowane = Array.from(miesiaceSet).sort((a, b) => {
          const [ma, ra] = a.split('-')
          const [mb, rb] = b.split('-')
          return rb.localeCompare(ra) || miesiacePL.indexOf(mb) - miesiacePL.indexOf(ma)
        })

        setMiesiace(posortowane)
      }

      setLoading(false)
    }

    fetchData()
  }, [id])

  if (loading) return <div className="p-6 text-center">Ładowanie danych...</div>

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Historia WZ – {kierowca}</h1>

      {miesiace.length === 0 ? (
        <p className="text-gray-500">Brak dokumentów WZ.</p>
      ) : (
        <ul className="space-y-3">
          {miesiace.map(m => (
            <li key={m}>
              <Link
                href={`/admin/kierowcy/${id}/historia-wz/${m}`}
                className="text-blue-600 hover:underline"
              >
                📄 {m}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Link
        href="/admin/kierowcy"
        className="inline-block mt-6 text-gray-600 hover:underline"
      >
        ← Powrót do listy kierowców
      </Link>
    </div>
  )
}
