"use client"

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/supabaseClient'
import Link from 'next/link'

export default function RaportKPKierowcy() {
  const params = useParams()
  const kierowcaId = params.kierowcaId as string
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [dokumenty, setDokumenty] = useState<any[]>([])
  const [suma, setSuma] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchKP = async () => {
      setLoading(true)

      const { data, error } = await supabase
        .from('kp_dokumenty')
        .select(`id, data, numer_kp, kwota, sklep_id, sklepy(nazwa, miejscowosc)`) // opcjonalnie możesz dodać firmę lub kierowcę
        .eq('kierowca_id', kierowcaId)
        .eq('data', selectedDate)

      if (error) {
        console.error('Błąd pobierania KP:', error)
      } else {
        setDokumenty(data || [])
        const suma = data?.reduce((sum, d) => sum + parseFloat(d.kwota), 0) || 0
        setSuma(suma)
      }

      setLoading(false)
    }

    if (kierowcaId) fetchKP()
  }, [kierowcaId, selectedDate])

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h2 className="text-xl font-bold mb-4">Raport KP kierowcy</h2>

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
        <>
          <table className="w-full text-sm border border-gray-300">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="p-2 border">Data</th>
                <th className="p-2 border">Numer KP</th>
                <th className="p-2 border">Sklep</th>
                <th className="p-2 border text-right">Kwota</th>
                <th className="p-2 border text-right">Podgląd</th>
              </tr>
            </thead>
            <tbody>
              {dokumenty.map((kp) => (
                <tr key={kp.id}>
                  <td className="p-2 border">{kp.data}</td>
                  <td className="p-2 border">{kp.numer_kp}</td>
                  <td className="p-2 border">{kp.sklepy?.nazwa} ({kp.sklepy?.miejscowosc})</td>
                  <td className="p-2 border text-right">{parseFloat(kp.kwota).toFixed(2)} PLN</td>
                  <td className="p-2 border text-right">
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
            <tfoot>
              <tr className="font-bold">
                <td className="p-2 border" colSpan={3}>Razem</td>
                <td className="p-2 border text-right">{suma.toFixed(2)} PLN</td>
                <td className="p-2 border"></td>
              </tr>
            </tfoot>
          </table>
        </>
      )}
    </div>
  )
}
