'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/supabaseClient'
import Link from 'next/link'

const miesiacePL = ['styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec',
                   'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień']

type DokumentWZ = {
  id: string
  data: string
  numer_wz: string | null
  wartosc_brutto: number | null
  status: string | null
}

export default function HistoriaWZMiesiaca() {
  const { id, miesiac } = useParams()
  const [dokumenty, setDokumenty] = useState<DokumentWZ[]>([])
  const [kierowca, setKierowca] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      // Pobierz dane kierowcy
      const { data: kierowcaData } = await supabase
        .from('kierowcy')
        .select('imie, nazwisko')
        .eq('id', id)
        .single()
      setKierowca(kierowcaData ? `${kierowcaData.imie} ${kierowcaData.nazwisko}` : 'Nieznany')

      // Oblicz zakres dat dla wybranego miesiąca
      const miesiacLower = miesiac.toString().toLowerCase()
      const [miesiacNazwa, rokStr] = miesiacLower.split('-')
      const miesiacIndex = miesiacePL.indexOf(miesiacNazwa)
      const rok = parseInt(rokStr)

      const dataOd = new Date(rok, miesiacIndex, 1).toISOString().split('T')[0]
      const dataDo = new Date(rok, miesiacIndex + 1, 0).toISOString().split('T')[0]

      // Pobierz dokumenty WZ
      const { data, error } = await supabase
        .from('wz_dokumenty')
        .select('id, data, numer_wz, wartosc_brutto, status')
        .eq('kierowca_id', id)
        .gte('data', dataOd)
        .lte('data', dataDo)
        .order('data', { ascending: false })

      if (error) {
        console.error('Błąd pobierania danych:', error)
      } else {
        setDokumenty(data || [])
      }
      setLoading(false)
    }

    fetchData()
  }, [id, miesiac])

  if (loading) return <div className="p-6 text-center">Ładowanie danych...</div>

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Dokumenty WZ – {kierowca}</h1>
      <h2 className="text-xl mb-6">📄 Dokumenty za: {miesiac}</h2>

      {dokumenty.length === 0 ? (
        <p className="text-gray-500">Brak dokumentów WZ w tym miesiącu.</p>
      ) : (
        <ul className="space-y-4">
          {dokumenty.map(doc => (
            <li key={doc.id} className="border p-4 rounded shadow">
              <div><strong>Data:</strong> {new Date(doc.data).toLocaleDateString('pl-PL')}</div>
              <div><strong>Numer WZ:</strong> {doc.numer_wz || '–'}</div>
              <div><strong>Status:</strong> {doc.status || '–'}</div>
              <div><strong>Wartość brutto:</strong> {doc.wartosc_brutto?.toFixed(2) || '0.00'} zł</div>
              {/* Ewentualny link do szczegółów dokumentu */}
              {/* <Link href={`/wz/szczegoly/${doc.id}`} className="text-blue-600 hover:underline mt-2 inline-block">
                Szczegóły dokumentu →
              </Link> */}
            </li>
          ))}
        </ul>
      )}

      <Link href={`/admin/kierowcy/${id}/historia-wz`} className="inline-block mt-6 text-blue-600 hover:underline">
        ← Wróć do miesięcy
      </Link>
    </div>
  )
}