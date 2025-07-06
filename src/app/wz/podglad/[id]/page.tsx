'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/supabaseClient'

interface Zwrot {
  id?: string
  waga: number
  cena?: number // Stare pole dla kompatybilności wstecznej
  cena_netto?: number
  vat?: number
  wartosc_netto?: number
  wartosc_brutto?: number
}

interface Produkt {
  id: string
  produkt_id: string
  nazwa: string
  waga: number
  cena_netto: number
}

interface WZDocument {
  id: string
  numer_wz: string
  data: string
  sklep_id: string
  forma_platnosci: string
  produkty: Produkt[]
  zwroty_ciasta: Zwrot[]
  zwroty_drobnica: Zwrot[]
  wartosc_netto: number
  wartosc_vat: number
  wartosc_brutto: number
  do_zaplaty: number
}

export default function PodgladWZ({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [wz, setWZ] = useState<WZDocument | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [sklep, setSklep] = useState<any>(null)

  // Rozpakowanie dynamicznego parametru
  const { id } = React.use(params)

  // Funkcja pomocnicza do bezpiecznego pobierania ceny
  const getCena = (zwrot: Zwrot): number => {
    return zwrot.cena ?? zwrot.cena_netto ?? 0
  }

  // Funkcja pomocnicza do obliczania wartości zwrotu
  const getWartoscZwrotu = (zwrot: Zwrot): number => {
    if (zwrot.wartosc_brutto !== undefined) return zwrot.wartosc_brutto
    if (zwrot.wartosc_netto !== undefined) return zwrot.wartosc_netto * 1.05
    return zwrot.waga * getCena(zwrot)
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)

        // Pobierz dokument WZ
        const { data: wzData, error: wzError } = await supabase
          .from('wz_dokumenty')
          .select('*')
          .eq('id', id)
          .single()

        if (wzError || !wzData) throw new Error('Nie znaleziono dokumentu WZ')

        // Parsowanie danych
        const parsedWZ: WZDocument = {
          ...wzData,
          produkty: typeof wzData.produkty === 'string' ? JSON.parse(wzData.produkty) : wzData.produkty || [],
          zwroty_ciasta: typeof wzData.zwroty_ciasta === 'string' ? JSON.parse(wzData.zwroty_ciasta) : wzData.zwroty_ciasta || [],
          zwroty_drobnica: typeof wzData.zwroty_drobnica === 'string' ? JSON.parse(wzData.zwroty_drobnica) : wzData.zwroty_drobnica || []
        }

        setWZ(parsedWZ)

        // Pobierz sklep
        if (parsedWZ.sklep_id) {
          const { data: sklepData } = await supabase
            .from('sklepy')
            .select('*')
            .eq('id', parsedWZ.sklep_id)
            .single()

          setSklep(sklepData || {})
        }
      } catch (error) {
        console.error('Błąd ładowania WZ:', error)
        router.push('/wz')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [id, router])

  if (isLoading) {
    return (
      <div className="p-4 flex justify-center items-center h-64">
        <div className="text-center">
          <p className="text-lg">Ładowanie dokumentu...</p>
        </div>
      </div>
    )
  }

  if (!wz) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-bold mb-4">Błąd</h1>
        <p className="mb-4">Nie znaleziono dokumentu WZ</p>
        <Link href="/wz" className="bg-blue-600 text-white py-2 px-4 rounded inline-block hover:bg-blue-700">
          Wróć do listy WZ
        </Link>
      </div>
    )
  }

  // Obliczenia - używamy wartości z dokumentu lub obliczamy jeśli brak
  const sumaNetto = wz.wartosc_netto ?? wz.produkty?.reduce((sum: number, p: Produkt) => sum + (p.waga * p.cena_netto), 0) ?? 0
  const sumaVat = wz.wartosc_vat ?? sumaNetto * 0.05
  const sumaBrutto = wz.wartosc_brutto ?? sumaNetto + sumaVat

  // Obliczanie sumy zwrotów - uwzględniamy nową i starą strukturę
  const sumaZwrotow = [
    ...(wz.zwroty_ciasta?.map(z => getWartoscZwrotu(z)) || []),
    ...(wz.zwroty_drobnica?.map(z => getWartoscZwrotu(z)) || [])
  ].reduce((sum: number, val: number) => sum + val, 0)

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">Dokument WZ: {wz.numer_wz}</h1>
        <Link href="/wz" className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300">
          Powrót
        </Link>
      </div>

      {/* Dane podstawowe */}
      <div className="grid grid-cols-2 gap-4">
        <div className="border p-4 rounded">
          <h2 className="font-semibold mb-2">Dane podstawowe</h2>
          <p><strong>Data:</strong> {new Date(wz.data).toLocaleDateString()}</p>
          <p><strong>Sklep:</strong> {sklep?.nazwa || wz.sklep_id}</p>
          <p><strong>Forma płatności:</strong> {wz.forma_platnosci === 'gotówka' ? 'Gotówka' : 'Przelew'}</p>
        </div>

        {/* Podsumowanie */}
        <div className="border p-4 rounded">
          <h2 className="font-semibold mb-2">Podsumowanie</h2>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Wartość netto:</span>
              <span>{sumaNetto.toFixed(2)} zł</span>
            </div>
            <div className="flex justify-between">
              <span>VAT (5%):</span>
              <span>{sumaVat.toFixed(2)} zł</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>Wartość brutto:</span>
              <span>{sumaBrutto.toFixed(2)} zł</span>
            </div>
            {sumaZwrotow > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Zwroty łącznie:</span>
                <span>-{sumaZwrotow.toFixed(2)} zł</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-2 font-bold">
              <span>Do zapłaty:</span>
              <span>{(sumaBrutto - sumaZwrotow).toFixed(2)} zł</span>
            </div>
          </div>
        </div>
      </div>

      {/* Produkty */}
      {wz.produkty?.length > 0 ? (
        <div className="border p-4 rounded">
          <h2 className="font-semibold mb-2">Produkty</h2>
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left pb-2">Nazwa</th>
                <th className="text-right pb-2">Waga (kg)</th>
                <th className="text-right pb-2">Cena netto</th>
                <th className="text-right pb-2">Wartość netto</th>
              </tr>
            </thead>
            <tbody>
              {wz.produkty.map((p: Produkt, i: number) => (
                <tr key={`produkt-${p.id || i}`} className="border-b">
                  <td className="py-2">{p.nazwa || 'Brak nazwy'}</td>
                  <td className="text-right">{parseFloat(p.waga.toString()).toFixed(3)}</td>
                  <td className="text-right">{parseFloat(p.cena_netto.toString()).toFixed(2)} zł</td>
                  <td className="text-right">{(p.waga * p.cena_netto).toFixed(2)} zł</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="border p-4 rounded">
          <h2 className="font-semibold mb-2">Produkty</h2>
          <p className="text-gray-500">Brak produktów w dokumencie.</p>
        </div>
      )}

      {/* Zwroty */}
      {(wz.zwroty_ciasta?.length > 0 || wz.zwroty_drobnica?.length > 0) && (
        <div className="border p-4 rounded">
          <h2 className="font-semibold mb-2">Zwroty</h2>

          {/* Ciasta */}
          {wz.zwroty_ciasta?.length > 0 && (
            <div className="mb-4">
              <h3 className="font-medium">Ciasta:</h3>
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left pb-2">Waga</th>
                    <th className="text-right pb-2">Cena netto</th>
                    <th className="text-right pb-2">Wartość netto</th>
                    <th className="text-right pb-2">VAT</th>
                    <th className="text-right pb-2">Wartość brutto</th>
                  </tr>
                </thead>
                <tbody>
                  {wz.zwroty_ciasta.map((z: Zwrot, i: number) => (
                    <tr key={`ciasto-${z.id || i}`} className="border-b">
                      <td className="py-2">{z.waga.toFixed(3)} kg</td>
                      <td className="text-right">{getCena(z).toFixed(2)} zł</td>
                      <td className="text-right">
                        {(z.wartosc_netto ?? z.waga * getCena(z)).toFixed(2)} zł
                      </td>
                      <td className="text-right">5%</td>
                      <td className="text-right">
                        {getWartoscZwrotu(z).toFixed(2)} zł
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Drobnica */}
          {wz.zwroty_drobnica?.length > 0 && (
            <div>
              <h3 className="font-medium">Drobnica:</h3>
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left pb-2">Waga</th>
                    <th className="text-right pb-2">Cena netto</th>
                    <th className="text-right pb-2">Wartość netto</th>
                    <th className="text-right pb-2">VAT</th>
                    <th className="text-right pb-2">Wartość brutto</th>
                  </tr>
                </thead>
                <tbody>
                  {wz.zwroty_drobnica.map((z: Zwrot, i: number) => (
                    <tr key={`drobnica-${z.id || i}`} className="border-b">
                      <td className="py-2">{z.waga.toFixed(3)} kg</td>
                      <td className="text-right">{getCena(z).toFixed(2)} zł</td>
                      <td className="text-right">
                        {(z.wartosc_netto ?? z.waga * getCena(z)).toFixed(2)} zł
                      </td>
                      <td className="text-right">5%</td>
                      <td className="text-right">
                        {getWartoscZwrotu(z).toFixed(2)} zł
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Przycisk drukowania */}
      <div className="flex justify-end">
        <button
          onClick={() => window.print()}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Drukuj WZ
        </button>
      </div>
    </div>
  )
}