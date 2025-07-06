'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/supabaseClient'
import Link from 'next/link'

export default function HistoriaWZAdmin() {
  const [wzList, setWzList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchWZ = async () => {
      try {
        const { data, error } = await supabase
          .from('wz_dokumenty')
          .select(`
            id,
            numer_wz,
            data,
            sklep_id,
            kierowca_id,
            kierowcy(imie, nazwisko),
            sklepy(nazwa),
            status,
            wartosc_brutto
          `)
          .order('data', { ascending: false })

        if (error) throw error
        setWzList(data || [])
      } catch (err) {
        setError('Błąd pobierania danych: ' + err.message)
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchWZ()
  }, [])

  if (loading) return <div className="p-4">Ładowanie historii WZ...</div>
  if (error) return <div className="p-4 text-red-500">{error}</div>

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Historia dokumentów WZ (wszyscy kierowcy)</h1>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-left">Numer WZ</th>
              <th className="p-3 text-left">Data</th>
              <th className="p-3 text-left">Kierowca</th>
              <th className="p-3 text-left">Sklep</th>
              <th className="p-3 text-left">Wartość</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Akcje</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {wzList.map((wz) => (
              <tr key={wz.id}>
                <td className="p-3">{wz.numer_wz}</td>
                <td className="p-3">{new Date(wz.data).toLocaleDateString()}</td>
                <td className="p-3">{wz.kierowcy?.imie} {wz.kierowcy?.nazwisko}</td>
                <td className="p-3">{wz.sklepy?.nazwa}</td>
                <td className="p-3">{wz.wartosc_brutto?.toFixed(2)} zł</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    wz.status === 'zakończone' ? 'bg-green-100 text-green-800' :
                    wz.status === 'anulowane' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {wz.status}
                  </span>
                </td>
                <td className="p-3">
                  <Link
                    href={`/admin/wz/podglad/${wz.id}`}
                    className="text-blue-600 hover:text-blue-800"
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
  )
}