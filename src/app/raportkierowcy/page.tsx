'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/supabaseClient'
import Link from 'next/link'

export default function RaportKierowcy() {
  const [raport, setRaport] = useState<any>(null)
  const [kpList, setKpList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    const fetchRaport = async () => {
      setLoading(true)
      const { data: userData } = await supabase.auth.getUser()
      const kierowcaId = userData?.user?.id

      if (!kierowcaId) return

      try {
        const { data: sprzedazData } = await supabase
          .from('sprzedaz')
          .select('*')
          .eq('kierowca_id', kierowcaId)
          .eq('data', selectedDate)

        const { data: kpData } = await supabase
          .from('kp_dokumenty')
          .select('id, numer_kp, kwota, data, sklep_id, sklepy(nazwa, miejscowosc)')
          .eq('kierowca_id', kierowcaId)
          .eq('data', selectedDate)

        const sumaNetto = sprzedazData?.reduce((sum, item) => sum + (item.kwota_netto || 0), 0) || 0
        const sumaBrutto = sprzedazData?.reduce((sum, item) => sum + (item.kwota_brutto || 0), 0) || 0
        const sumaZwroty = sprzedazData?.reduce((sum, item) => sum + (item.zwroty || 0), 0) || 0
        const sumaKP = kpData?.reduce((sum, item) => sum + (item.kwota || 0), 0) || 0

        setRaport({
          sumaNetto,
          sumaBrutto,
          sumaZwroty,
          sumaKP,
          doWplaty: sumaBrutto - sumaZwroty - sumaKP
        })

        setKpList(kpData || [])
      } finally {
        setLoading(false)
      }
    }

    fetchRaport()
  }, [selectedDate])

  if (loading) {
    return <div className="p-4">Ładowanie raportu...</div>
  }

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold mb-2">Raport dnia</h2>

      <div>
        <label className="block mb-1 font-semibold">Wybierz datę</label>
        <input
          type="date"
          className="border p-2 rounded w-full max-w-xs"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        />
      </div>

      {raport && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded shadow">
            <h3 className="font-bold">Sprzedaż netto</h3>
            <p className="text-xl">{raport.sumaNetto.toFixed(2)} PLN</p>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <h3 className="font-bold">Sprzedaż brutto</h3>
            <p className="text-xl">{raport.sumaBrutto.toFixed(2)} PLN</p>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <h3 className="font-bold">Zwroty</h3>
            <p className="text-xl text-red-500">–{raport.sumaZwroty.toFixed(2)} PLN</p>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <h3 className="font-bold">Pobrane KP</h3>
            <p className="text-xl text-yellow-600">–{raport.sumaKP.toFixed(2)} PLN</p>
          </div>
          <div className="bg-white p-4 rounded shadow col-span-full border-t-2 border-green-600">
            <h3 className="font-bold text-green-700">Do wpłaty</h3>
            <p className="text-2xl text-green-700">{raport.doWplaty.toFixed(2)} PLN</p>
          </div>
        </div>
      )}

      {kpList.length > 0 && (
        <div className="mt-10">
          <h3 className="text-lg font-bold mb-3">Dokumenty KP</h3>
          <div className="overflow-x-auto bg-white shadow rounded">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left">Numer KP</th>
                  <th className="px-4 py-2 text-left">Sklep</th>
                  <th className="px-4 py-2 text-right">Kwota</th>
                  <th className="px-4 py-2 text-right">Akcja</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {kpList.map((kp) => (
                  <tr key={kp.id}>
                    <td className="px-4 py-2">{kp.numer_kp}</td>
                    <td className="px-4 py-2">
                      {kp.sklepy?.nazwa} ({kp.sklepy?.miejscowosc})
                    </td>
                    <td className="px-4 py-2 text-right">{kp.kwota.toFixed(2)} PLN</td>
                    <td className="px-4 py-2 text-right">
                      <Link
                        href={`/kp/podglad/${kp.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        Podgląd
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
