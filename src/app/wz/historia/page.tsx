'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/supabaseClient'
import { useRouter } from 'next/navigation'

type WZDokument = {
  id: string
  id_kierowcy: string
  id_sklepu: string
  data: string
  pozycje: string
  forma_platnosci: 'gotowka' | 'przelew'
  suma_brutto: number
}

type Kierowca = {
  id: string
  imie: string
  nazwisko: string
}

export default function HistoriaWZ() {
  const [dni, setDni] = useState<{ data: string; liczba: number; kierowca: string }[]>([])
  const [kierowcyMap, setKierowcyMap] = useState<Record<string, string>>({})
  const router = useRouter()

  useEffect(() => {
    const fetchData = async () => {
      const { data: dokumenty } = await supabase
        .from('wz_dokumenty')
        .select('*')
        .order('data', { ascending: false })

      if (!dokumenty) return

      // Pobierz kierowców
      const { data: kierowcyData } = await supabase.from('kierowcy').select('id, imie, nazwisko')

      // Utwórz mapę kierowców
      const kierowcyMap = kierowcyData?.reduce((acc: Record<string, string>, k) => {
        acc[k.id] = `${k.imie} ${k.nazwisko}`
        return acc
      }, {}) || {}

      setKierowcyMap(kierowcyMap)

      // Grupuj dokumenty po dacie
      const dniMap = new Map<string, { data: string; liczba: number; kierowca_id: string }>()

      dokumenty.forEach((doc) => {
        const key = doc.data // np. "2025-05-19"
        if (!dniMap.has(key)) {
          dniMap.set(key, {
            data: key,
            liczba: 1,
            kierowca_id: doc.id_kierowcy
          })
        } else {
          const aktualne = dniMap.get(key)!
          dniMap.set(key, {
            ...aktualne,
            liczba: aktualne.liczba + 1
          })
        }
      })

      const wynik = Array.from(dniMap.entries()).map(([data, info]) => ({
        data,
        liczba: info.liczba,
        kierowca: kierowcyMap[info.kierowca_id] || 'Nieznany kierowca'
      }))

      setDni(wynik)
    }

    fetchData()
  }, [])

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Historia dokumentów WZ</h1>

      {dni.length === 0 ? (
        <p className="text-gray-500">Brak zapisanych dokumentów WZ.</p>
      ) : (
        <div className="space-y-3">
          {dni.map((dzien, index) => (
            <Link key={index} href={`/wz/historia/${dzien.data}`}>
              <div className="border p-4 rounded-lg hover:bg-gray-50 cursor-pointer">
                <div className="flex justify-between items-center">
                  <span className="font-medium">
                    {new Date(dzien.data).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </span>
                  <div className="text-right">
                    <span className="block text-sm">{dzien.kierowca}</span>
                    <span className="text-md font-semibold text-blue-600">{dzien.liczba} dokumentów</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}