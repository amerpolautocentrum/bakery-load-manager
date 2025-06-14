'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/supabaseClient'

export default function HistoriaWZKierowcy() {
  const { id } = useParams()
  const [dni, setDni] = useState<{ data: string; liczba: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError('')

        // Pobierz dokumenty tylko dla danego kierowcy
        const { data: dokumenty, error: dokumentyError } = await supabase
          .from('wz_dokumenty')
          .select('data')
          .eq('kierowca_id', id)
          .order('data', { ascending: false })

        if (dokumentyError) throw dokumentyError
        if (!dokumenty) return

        // Grupuj po dacie
        const dniMap = new Map<string, number>()
        dokumenty.forEach(doc => {
          const data = doc.data
          dniMap.set(data, (dniMap.get(data) || 0) + 1)
        })

        const wynik = Array.from(dniMap.entries()).map(([data, liczba]) => ({
          data,
          liczba
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
  }, [id])

  if (loading) return <div className="p-6 text-center">Ładowanie historii...</div>
  if (error) return <div className="p-6 text-red-600">{error}</div>

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">📄 Historia WZ kierowcy</h1>

      {dni.length === 0 ? (
        <p className="text-gray-500">Brak dokumentów WZ dla tego kierowcy.</p>
      ) : (
        <div className="space-y-3">
          {dni.map((dzien, index) => (
            <div key={index} className="border p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium">
                  {new Date(dzien.data).toLocaleDateString('pl-PL')}
                </span>
                <span className="text-md font-semibold text-blue-600">
                  {dzien.liczba} {dzien.liczba === 1 ? 'dokument' : 'dokumenty'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
