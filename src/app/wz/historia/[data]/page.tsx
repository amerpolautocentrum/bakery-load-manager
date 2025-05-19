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
  const dataParam = decodeURIComponent(params?.data || 'Brak daty') // np. "2025-05-19"

  useEffect(() => {
    const fetchDane = async () => {
      // Pobierz sklepy
      const { data: sklepyData } = await supabase.from('sklepy').select('id, nazwa')
      const sklepyMap = sklepyData?.reduce((acc: Record<string, string>, s) => {
        acc[s.id] = s.nazwa
        return acc
      }, {}) || {}
      setSklepyMap(sklepyMap)

      // Pobierz kierowców
      const { data: kierowcyData } = await supabase.from('kierowcy').select('id, imie, nazwisko')
      const kierowcyMap = kierowcyData?.reduce((acc: Record<string, string>, k) => {
        acc[k.id] = `${k.imie} ${k.nazwisko}`
        return acc
      }, {}) || {}
      setKierowcyMap(kierowcyMap)

      // Pobierz dokumenty z danego dnia
      const { data, error } = await supabase
        .from('wz_dokumenty')
        .select('*')
        .eq('data', dataParam)

      if (error) {
        console.error('Błąd pobierania dokumentów:', error)
        return
      }

      if (!data) {
        setDokumenty([])
        return
      }

      // Dodaj nazwy sklepów i kierowców do danych
      const daneZNazwami = data.map(doc => ({
        ...doc,
        id_kierowcy_nazwa: kierowcyMap[doc.id_kierowcy] || 'Nieznany kierowca',
        id_sklepu_nazwa: sklepyMap[doc.id_sklepu] || 'Nieznany sklep'
      }))

      setDokumenty(daneZNazwami)
    }

    if (dataParam) {
      fetchDane()
    }
  }, [dataParam])

  return (
    <div className="p-6 max-w-xl mx-auto">
      <Link href="/wz/historia" className="text-blue-600 hover:text-blue-800 block mb-4">
        ← Wróć do listy dni
      </Link>

      <h1 className="text-2xl font-bold mb-6">
        Dokumenty WZ z dnia: {dataParam}
      </h1>

      {dokumenty.length === 0 ? (
        <p className="text-gray-500">Brak dokumentów dla tej daty.</p>
      ) : (
        <div className="space-y-4">
          {dokumenty.map((doc, index) => (
            <Link key={index} href={`/wz/szczegoly/${doc.id}`} className="block">
              <div className="border p-4 rounded-lg hover:bg-gray-50 transition">
                <div className="flex justify-between items-center">
                  <div>
                    <strong>Sklep:</strong> {doc.id_sklepu_nazwa}
                  </div>
                  <div>
                    <strong>Kierowca:</strong> {doc.id_kierowcy_nazwa}
                  </div>
                  <div>
                    Do zapłaty: <span className="font-semibold">{doc.do_zaplaty.toFixed(2)} zł</span>
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