'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/supabaseClient'
import Link from 'next/link'

export default function SzczegolyDniaWZ() {
  const params = useParams()
  const [dokumenty, setDokumenty] = useState<any[]>([])
  const [sklepyMap, setSklepyMap] = useState<Record<string, string>>({})
  const [kierowcyMap, setKierowcyMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const dataParam = decodeURIComponent(params?.data || 'Brak daty')

  useEffect(() => {
    const fetchDane = async () => {
      try {
        setLoading(true)
        setError('')

        // Pobierz sklepy
        const { data: sklepyData, error: sklepyError } = await supabase
          .from('sklepy')
          .select('id, nazwa')

        if (sklepyError) throw sklepyError

        const sklepyMap = sklepyData?.reduce((acc: Record<string, string>, s) => {
          acc[s.id] = s.nazwa
          return acc
        }, {}) || {}
        setSklepyMap(sklepyMap)

        // Pobierz kierowców
        const { data: kierowcyData, error: kierowcyError } = await supabase
          .from('kierowcy')
          .select('id, imie, nazwisko')

        if (kierowcyError) throw kierowcyError

        const kierowcyMap = kierowcyData?.reduce((acc: Record<string, string>, k) => {
          acc[k.id] = `${k.imie} ${k.nazwisko}`
          return acc
        }, {}) || {}
        setKierowcyMap(kierowcyMap)

        // Pobierz dokumenty - UŻYJ POPRAWNYCH NAZW KOLUMN
        const { data, error } = await supabase
          .from('wz_dokumenty')
          .select('*')
          .eq('data', dataParam)

        if (error) throw error

        const daneZNazwami = (data || []).map(doc => ({
          ...doc,
          // Używaj właściwych nazw kolumn:
          kierowca_nazwa: kierowcyMap[doc.kierowca_id] || 'Nieznany kierowca', // Zmiana z id_kierowcy
          sklep_nazwa: sklepyMap[doc.sklep_id] || sklepyMap[doc.id_sklepu] || 'Nieznany sklep' // Obsługa obu wersji
        }))

        setDokumenty(daneZNazwami)
      } catch (err) {
        console.error('Błąd pobierania danych:', err)
        setError('Wystąpił błąd podczas ładowania dokumentów')
      } finally {
        setLoading(false)
      }
    }

    if (dataParam && dataParam !== 'Brak daty') {
      fetchDane()
    }
  }, [dataParam])

  if (loading) return <div className="p-6 text-center">Ładowanie dokumentów...</div>
  if (error) return <div className="p-6 text-red-600">{error}</div>

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Link href="/wz/historia" className="text-blue-600 hover:text-blue-800 block mb-4">
        ← Wróć do listy dni
      </Link>

      <h1 className="text-2xl font-bold mb-6">
        Dokumenty WZ z dnia: {new Date(dataParam).toLocaleDateString('pl-PL')}
      </h1>

      {dokumenty.length === 0 ? (
        <p className="text-gray-500">Brak dokumentów dla tej daty.</p>
      ) : (
        <div className="space-y-4">
          {dokumenty.map((doc, index) => (
            <Link key={doc.id || index} href={`/wz/szczegoly/${doc.id}`} className="block">
              <div className="border p-4 rounded-lg hover:bg-gray-50 transition">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <strong>Sklep:</strong> {doc.sklep_nazwa}
                  </div>
                  <div>
                    <strong>Kierowca:</strong> {doc.kierowca_nazwa}
                  </div>
                  <div className="text-right">
                    <strong>Do zapłaty:</strong> {doc.do_zaplaty?.toFixed(2) || '0.00'} zł
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