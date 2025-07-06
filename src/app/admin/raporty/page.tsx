'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/supabaseClient'

export default function RaportyAdmin() {
  const [kierowcy, setKierowcy] = useState<any[]>([])
  const [selectedKierowca, setSelectedKierowca] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [raport, setRaport] = useState<any | null>(null)

  useEffect(() => {
    // pobierz listę kierowców
    const fetchKierowcy = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, imie, nazwisko')
        .eq('role', 'kierowca_id')

      if (data) setKierowcy(data)
    }

    fetchKierowcy()
  }, [])

  useEffect(() => {
    const fetchRaport = async () => {
      if (!selectedKierowca || !selectedDate) return

      // WZ – sprzedaż i zwroty
      const { data: wzData } = await supabase
        .from('wz_dokumenty')
        .select('produkty, zwroty_ciasta')
        .eq('kierowca_id', selectedKierowca)
        .eq('data', selectedDate)

      // KP – wpłaty
      const { data: kpData } = await supabase
        .from('kp_dokumenty')
        .select('kwota')
        .eq('kierowca_id', selectedKierowca)
        .eq('data', selectedDate)

      let sprzedaneKg = 0
      let zwroconeKg = 0
      let wartoscNetto = 0
      let wartoscBrutto = 0

      wzData?.forEach(wz => {
        wz.produkty?.forEach((p: any) => {
          sprzedaneKg += parseFloat(p.waga || 0)
          wartoscNetto += parseFloat(p.cena_netto || 0)
          wartoscBrutto += parseFloat(p.cena_brutto || 0)
        })

        wz.zwroty_ciasta?.forEach((z: any) => {
          zwroconeKg += parseFloat(z.waga || 0)
        })
      })

      const sumaKP = kpData?.reduce((sum, k) => sum + (k.kwota || 0), 0) || 0

      setRaport({
        sprzedaneKg,
        zwroconeKg,
        wartoscNetto,
        wartoscBrutto,
        sumaKP,
        doRozliczenia: wartoscBrutto - sumaKP,
      })
    }

    fetchRaport()
  }, [selectedKierowca, selectedDate])

  return (
    <div className="p-6 space-y-4 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold">Raport dzienny kierowcy</h1>

      <div className="flex gap-4">
        <select
          className="border rounded p-2"
          value={selectedKierowca}
          onChange={(e) => setSelectedKierowca(e.target.value)}
        >
          <option value="">Wybierz kierowcę</option>
          {kierowcy.map((k) => (
            <option key={k.id} value={k.id}>
              {k.imie} {k.nazwisko}
            </option>
          ))}
        </select>

        <input
          type="date"
          className="border rounded p-2"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        />
      </div>

      {raport && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
          <div className="bg-white p-4 rounded shadow">
            <h3 className="font-semibold">Sprzedaż netto</h3>
            <p>{raport.wartoscNetto.toFixed(2)} PLN</p>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <h3 className="font-semibold">Sprzedaż brutto</h3>
            <p>{raport.wartoscBrutto.toFixed(2)} PLN</p>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <h3 className="font-semibold">Zwroty (kg)</h3>
            <p>{raport.zwroconeKg.toFixed(3)} kg</p>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <h3 className="font-semibold">Sprzedano (kg)</h3>
            <p>{raport.sprzedaneKg.toFixed(3)} kg</p>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <h3 className="font-semibold">Pobrano KP</h3>
            <p>{raport.sumaKP.toFixed(2)} PLN</p>
          </div>
          <div className="bg-white p-4 rounded shadow col-span-2 md:col-span-1">
            <h3 className="font-bold text-green-600">Do rozliczenia</h3>
            <p className="text-green-600 text-lg">{raport.doRozliczenia.toFixed(2)} PLN</p>
          </div>
        </div>
      )}
    </div>
  )
}
