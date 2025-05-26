'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabase } from '@/supabaseClient'

export default function SzczegolyMagazynu() {
  const params = useParams()
  const [sztuki, setSztuki] = useState<any[]>([])
  const [kierowca, setKierowca] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        const dzien = decodeURIComponent(params.id as string)

        // 1. Pobierz WSZYSTKIE sztuki z tej daty
        const { data: magazynData, error: magazynError } = await supabase
          .from('magazyn')
          .select('*')
          .eq('data', dzien)

        if (magazynError) throw magazynError
        if (!magazynData || magazynData.length === 0) {
          setSztuki([])
          return
        }

        // 2. Najnowsza wersja załadunku dla tego dnia
        const najnowszaWersja = magazynData.reduce((acc, curr) => {
          if (!acc || curr.updated_at > acc.updated_at) return curr
          return acc
        }, magazynData[0])

        // 3. Filtruj tylko sztuki z najnowszej wersji
        const najnowszyMagazyn = magazynData.filter(item => item.wersja === najnowszaWersja.wersja)

        // 4. Pobierz dane kierowcy
        const { data: kierowcaData } = await supabase
          .from('kierowcy')
          .select('imie, nazwisko')
          .eq('id', najnowszyMagazyn[0]?.kierowca_id)
          .single()

        setKierowca(kierowcaData ? `${kierowcaData.imie} ${kierowcaData.nazwisko}` : 'Nieznany kierowca')

        // 5. Ustaw sztuki
        setSztuki(najnowszyMagazyn)

      } catch (error) {
        console.error('Błąd pobierania danych:', error)
        alert('Nie można pobrać danych')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [params.id])

  if (isLoading) return <div className="p-6 text-center">Ładowanie...</div>

  // Grupowanie po ciastach
  const grouped = sztuki.reduce((acc, item) => {
    const key = `${item.produkt_id}-${item.waga}`
    if (!acc[key]) {
      acc[key] = {
        produkt: item.produkt_id,
        waga: item.waga,
        ilosc: 0
      }
    }
    acc[key].ilosc += 1
    return acc
  }, {} as Record<string, { produkt: string; waga: number; ilosc: number }>)

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-4">Magazyn z dnia {params.id}</h1>
      {kierowca && <p className="mb-4">Kierowca: <span className="font-medium">{kierowca}</span></p>}

      <Link href="/magazyn/historia" className="text-blue-600 inline-block mb-4">
        ← Wróć do historii
      </Link>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">Ciasto</th>
              <th className="p-3 text-right">Waga</th>
              <th className="p-3 text-right">Ilość</th>
            </tr>
          </thead>
          <tbody>
            {Object.values(grouped).length > 0 ? (
              Object.values(grouped).map((item, index) => (
                <tr key={index} className="hover:bg-gray-50 border-t">
                  <td className="p-3">{item.produkt}</td>
                  <td className="p-3 text-right">{item.waga} kg</td>
                  <td className="p-3 text-right">{item.ilosc} szt.</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="p-4 text-center text-gray-500">
                  Brak danych
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}