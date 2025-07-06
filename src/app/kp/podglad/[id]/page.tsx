'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/supabaseClient'

export default function PodgladKP() {
  const params = useParams()
  const router = useRouter()
  const [dokument, setDokument] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDokument = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('kp_dokumenty')
        .select(`
          *,
          sklepy (nazwa, miejscowosc),
          profiles (imie, nazwisko),
          firma:firma_id (nazwa)
        `)
        .eq('id', params.id)
        .single()

      if (error) {
        console.error('Błąd pobierania dokumentu: ', error)
      } else {
        setDokument(data)
      }
      setLoading(false)
    }

    fetchDokument()
  }, [params.id])

  const handleDrukuj = () => {
    window.print()
  }

  if (loading) return <div className="p-4">Ładowanie...</div>
  if (!dokument) return <div className="p-4 text-red-600 font-semibold">Dokument nie znaleziony</div>

  const suma = dokument?.pozycje?.reduce((s: number, poz: any) => s + parseFloat(poz.kwota), 0).toFixed(2)

  return (
    <div className="p-4 max-w-xs mx-auto text-sm print:p-0 print:max-w-full print:text-xs" style={{ width: '100mm' }}>
      <div className="bg-white print:bg-white p-4 print:p-2 shadow rounded">
        <div className="text-center mb-2">
          <h2 className="text-lg font-bold">POKWITOWANIE ODBIORU GOTÓWKI</h2>
          <p>{new Date(dokument.data).toLocaleDateString()}</p>
        </div>

        <div className="mb-2">
          <strong>Numer KP:</strong> {dokument.numer_kp}
        </div>

        <div className="mb-2">
          <strong>Sklep:</strong><br />
          {dokument.sklepy?.nazwa} ({dokument.sklepy?.miejscowosc})
        </div>

        <div className="mb-2">
          <strong>Sprzedawca:</strong><br />
          {dokument.firma?.nazwa || 'Trifood Sp. z o.o.'}
        </div>

        <div className="mb-2">
          <strong>Odbiorca:</strong><br />
          {dokument.profiles?.imie} {dokument.profiles?.nazwisko}
        </div>

        <div className="my-3">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-400">
                <th className="text-left py-1">Dokument</th>
                <th className="text-right py-1">Kwota</th>
              </tr>
            </thead>
            <tbody>
              {dokument.pozycje?.map((poz: any, i: number) => (
                <tr key={i} className="border-b border-gray-200">
                  <td className="py-1">{poz.dokument}</td>
                  <td className="text-right py-1">{parseFloat(poz.kwota).toFixed(2)} PLN</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-bold border-t border-black">
                <td className="py-1">RAZEM:</td>
                <td className="text-right py-1">{suma} PLN</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="mt-6 text-center">
          <p className="mb-1">....................................</p>
          <p className="text-xs">Podpis osoby odbierającej gotówkę</p>
        </div>
      </div>

      {/* Przyciski do działania poza drukiem */}
      <div className="mt-4 flex justify-center gap-4 print:hidden">
        <button
          onClick={handleDrukuj}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Drukuj
        </button>
        <button
          onClick={() => router.back()}
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
        >
          Powrót
        </button>
      </div>
    </div>
  )
}
