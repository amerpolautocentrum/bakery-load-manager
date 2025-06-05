'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/supabaseClient'
import { useRouter } from 'next/navigation'

type WZDokument = {
  id: string
  kierowca_id: string  // Poprawione z id_kierowcy
  sklep_id: string     // Poprawione z id_sklepu
  data: string
  pozycje: any
  forma_platnosci: 'gotowka' | 'przelew'
  suma_brutto: number
  created_at: string
}

export default function HistoriaWZ() {
  const [dni, setDni] = useState<{ data: string; liczba: number; kierowca: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError('')

        // Pobierz dokumenty z sortowaniem
        const { data: dokumenty, error: dokumentyError } = await supabase
          .from('wz_dokumenty')
          .select('*')
          .order('data', { ascending: false })
          .order('created_at', { ascending: false })

        if (dokumentyError) throw dokumentyError
        if (!dokumenty) return

        // Pobierz kierowców
        const { data: kierowcyData, error: kierowcyError } = await supabase
          .from('kierowcy')
          .select('id, imie, nazwisko')

        if (kierowcyError) throw kierowcyError

        // Utwórz mapę kierowców
        const kierowcyMap = kierowcyData?.reduce((acc: Record<string, string>, k) => {
          acc[k.id] = `${k.imie} ${k.nazwisko}`
          return acc
        }, {}) || {}

        // Grupuj dokumenty po dacie
        const dniMap = new Map<string, { 
          data: string; 
          liczba: number; 
          kierowca_id: string 
        }>()

        dokumenty.forEach((doc: WZDokument) => {
          const key = doc.data
          if (!dniMap.has(key)) {
            dniMap.set(key, {
              data: key,
              liczba: 1,
              kierowca_id: doc.kierowca_id  // Poprawione z id_kierowcy
            })
          } else {
            const aktualne = dniMap.get(key)!
            dniMap.set(key, {
              ...aktualne,
              liczba: aktualne.liczba + 1
            })
          }
        })

        const wynik = Array.from(dniMap.values()).map(info => ({
          data: info.data,
          liczba: info.liczba,
          kierowca: kierowcyMap[info.kierowca_id] || 'Nieznany kierowca'
        }))

        setDni(wynik)
      } catch (err) {
        console.error('Błąd pobierania danych:', err)
        setError('Wystąpił błąd podczas ładowania historii')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) return <div className="p-6 text-center">Ładowanie historii...</div>
  if (error) return <div className="p-6 text-red-600">{error}</div>

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Historia dokumentów WZ</h1>

      {dni.length === 0 ? (
        <p className="text-gray-500">Brak zapisanych dokumentów WZ.</p>
      ) : (
        <div className="space-y-3">
          {dni.map((dzien, index) => (
            <Link 
              key={index} 
              href={`/wz/historia/${dzien.data}`}
              passHref
            >
              <div className="border p-4 rounded-lg hover:bg-gray-50 cursor-pointer">
                <div className="flex justify-between items-center">
                  <span className="font-medium">
                    {new Date(dzien.data).toLocaleDateString('pl-PL', { 
                      day: '2-digit', 
                      month: '2-digit', 
                      year: 'numeric' 
                    })}
                  </span>
                  <div className="text-right">
                    <span className="block text-sm">{dzien.kierowca}</span>
                    <span className="text-md font-semibold text-blue-600">
                      {dzien.liczba} {dzien.liczba === 1 ? 'dokument' : 'dokumenty'}
                    </span>
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