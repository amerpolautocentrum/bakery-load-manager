'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/supabaseClient'

export default function RaportSprzedazKierowcy() {
  const params = useParams()
  const kierowcaId = params.kierowcaId as string
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [sprzedaz, setSprzedaz] = useState<any[]>([])
  const [sumaNetto, setSumaNetto] = useState(0)
  const [sumaBrutto, setSumaBrutto] = useState(0)
  const [sumaZwroty, setSumaZwroty] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSprzedaz = async () => {
      setLoading(true)

      const { data, error } = await supabase
        .from('sprzedaz')
        .select('kwota_netto, kwota_brutto, zwroty')
        .eq('kierowca_id', kierowcaId)
        .eq('data', selectedDate)

      if (error) {
        console.error('Błąd pobierania danych:', error)
      } else {
        const netto = data?.reduce((sum, row) => sum + (row.kwota_netto || 0), 0) || 0
        const brutto = data?.reduce((sum, row) => sum + (row.kwota_brutto || 0), 0) || 0
        const zwroty = data?.reduce((sum, row) => sum + (row.zwroty || 0), 0) || 0

        setSprzedaz(data || [])
        setSumaNetto(netto)
        setSumaBrutto(brutto)
        setSumaZwroty(zwroty)
      }

      setLoading(false)
    }

    if (kierowcaId) fetchSprzedaz()
  }, [kierowcaId, selectedDate])

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h2 className="text-xl font-bold mb-4">Raport sprzedaży kierowcy</h2>

      <div className="mb-4">
        <label className="block mb-1 font-semibold">Wybierz datę</label>
        <input
          type="date"
          className="border p-2 rounded"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="text-gray-600">Ładowanie danych...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white shadow rounded p-4">
            <h3 className="font-semibold mb-1">Suma netto</h3>
            <p className="text-2xl">{sumaNetto.toFixed(2)} PLN</p>
          </div>
          <div className="bg-white shadow rounded p-4">
            <h3 className="font-semibold mb-1">Suma brutto</h3>
            <p className="text-2xl">{sumaBrutto.toFixed(2)} PLN</p>
          </div>
          <div className="bg-white shadow rounded p-4">
            <h3 className="font-semibold mb-1">Zwroty</h3>
            <p className="text-2xl text-red-500">–{sumaZwroty.toFixed(2)} PLN</p>
          </div>
        </div>
      )}
    </div>
  )
}
