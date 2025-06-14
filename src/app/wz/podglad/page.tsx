// app/wz/podglad/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/supabaseClient'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'

export default function PodgladWZ() {
  const params = useParams()
  const router = useRouter()
  const [wz, setWz] = useState<any>(null)
  const [sklep, setSklep] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const { data: wzData } = await supabase
        .from('wz_dokumenty')
        .select('*')
        .eq('id', params.id)
        .single()

      if (!wzData) {
        router.push('/')
        return
      }

      const { data: sklepData } = await supabase
        .from('sklepy')
        .select('*')
        .eq('id', wzData.sklep_id)
        .single()

      setWz(wzData)
      setSklep(sklepData)
      setLoading(false)
    }

    fetchData()
  }, [params.id, router])

  if (loading) return <div className="p-4">Ładowanie...</div>

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Dokument WZ</h1>
        <div className="space-x-2">
          <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
            Drukuj
          </button>
          <button className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
            Wyślij e-mail
          </button>
        </div>
      </div>

      <div className="border p-6 rounded-lg space-y-6">
        {/* Nagłówek */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="font-semibold">Sprzedający:</p>
            <p>Trifood Sp. z o.o.</p>
          </div>
          <div>
            <p className="font-semibold">Numer WZ:</p>
            <p>{wz.numer_wz}</p>
          </div>
          <div>
            <p className="font-semibold">Kupujący:</p>
            <p>{sklep?.nazwa || wz.sklep_id}</p>
            <p>{sklep?.ulica}, {sklep?.kod_pocztowy} {sklep?.miejscowosc}</p>
          </div>
          <div>
            <p className="font-semibold">Data:</p>
            <p>{new Date(wz.data).toLocaleDateString()}</p>
          </div>
        </div>

        {/* Produkty */}
        <div>
          <h2 className="font-bold border-b pb-2 mb-2">Sprzedaż</h2>
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Produkt</th>
                <th className="text-right py-2">Waga (kg)</th>
                <th className="text-right py-2">Cena netto/kg</th>
                <th className="text-right py-2">VAT</th>
                <th className="text-right py-2">Wartość brutto</th>
              </tr>
            </thead>
            <tbody>
              {wz.pozycje.map((p: any, i: number) => (
                <tr key={i} className="border-b">
                  <td className="py-2">{p.nazwa}</td>
                  <td className="text-right py-2">{parseFloat(p.waga).toFixed(3)}</td>
                  <td className="text-right py-2">{p.cena_netto.toFixed(2)} zł</td>
                  <td className="text-right py-2">{p.vat.toFixed(2)} zł</td>
                  <td className="text-right py-2">{p.brutto.toFixed(2)} zł</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Zwroty */}
        {wz.zwroty_ciasta < 0 && (
          <div>
            <h2 className="font-bold border-b pb-2 mb-2">Zwroty</h2>
            <table className="w-full">
              <tbody>
                {wz.zwroty_ciasta < 0 && (
                  <tr className="border-b">
                    <td className="py-2">Ciasta</td>
                    <td className="text-right py-2 text-red-600">-{Math.abs(wz.zwroty_ciasta).toFixed(2)} zł</td>
                  </tr>
                )}
                {wz.zwroty_drobnica < 0 && (
                  <tr className="border-b">
                    <td className="py-2">Drobnica</td>
                    <td className="text-right py-2 text-red-600">-{Math.abs(wz.zwroty_drobnica).toFixed(2)} zł</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Podsumowanie */}
        <div className="border-t pt-4">
          <div className="flex justify-between font-semibold">
            <span>Forma płatności:</span>
            <span>{wz.forma_platnosci === 'przelew' ? 'Przelew' : 'Gotówka'}</span>
          </div>
          <div className="flex justify-between mt-2 font-bold text-lg">
            <span>Do zapłaty:</span>
            <span>{wz.do_zaplaty.toFixed(2)} zł</span>
          </div>
        </div>
      </div>

      <div className="mt-6 text-center">
        <Link href="/" className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">
          Powrót
        </Link>
      </div>
    </div>
  )
}