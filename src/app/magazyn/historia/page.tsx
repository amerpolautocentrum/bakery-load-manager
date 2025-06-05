'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/supabaseClient'

export default function HistoriaMagazynu() {
  const [dni, setDni] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [kierowcy, setKierowcy] = useState<Record<string, string>>({})

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        // Pobierz unikalne wersje magazynów
        const { data: magazynData } = await supabase
          .from('magazyn')
          .select('data, wersja, kierowca_id')
          .order('data', { ascending: false })
          .order('updated_at', { ascending: false })

        // Pobierz dane kierowców
        const { data: kierowcyData } = await supabase
          .from('kierowcy')
          .select('id, imie, nazwisko')

        // Stwórz mapę kierowców
        const kierowcyMap = kierowcyData?.reduce((acc, curr) => {
          acc[curr.id] = `${curr.imie} ${curr.nazwisko}`
          return acc
        }, {} as Record<string, string>)

        setKierowcy(kierowcyMap || {})

        // Grupuj dane
        const dniMap = new Map()
        magazynData?.forEach(item => {
          if (!dniMap.has(item.data)) {
            dniMap.set(item.data, {
              data: item.data,
              wersje: new Set([item.wersja]),
              kierowcy: new Set([item.kierowca_id])
            })
          } else {
            const dzien = dniMap.get(item.data)
            dzien.wersje.add(item.wersja)
            dzien.kierowcy.add(item.kierowca_id)
          }
        })

        // Pobierz pełne dane dla każdej wersji
        const dniZDanymi = await Promise.all(
          Array.from(dniMap.values()).map(async dzien => {
            const { data } = await supabase
              .from('magazyn')
              .select('*')
              .eq('data', dzien.data)
              .eq('wersja', Array.from(dzien.wersje)[0])
              .order('produkt_id')

            return {
              data: dzien.data,
              kierowca: Array.from(dzien.kierowcy).map((k: any) => kierowcyMap?.[k] || k).join(', '),
              ciasta: data?.reduce((acc, curr) => {
                const existing = acc.find(c => c.produkt_id === curr.produkt_id && c.waga === curr.waga)
                if (existing) {
                  existing.ilosc++
                } else {
                  acc.push({
                    produkt_id: curr.produkt_id,
                    waga: curr.waga,
                    ilosc: 1
                  })
                }
                return acc
              }, [] as any[]) || []
            }
          })
        )

        setDni(dniZDanymi)
      } catch (error) {
        console.error('Błąd:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  if (isLoading) return <div className="p-6 text-center">Ładowanie...</div>
return (
  <div className="p-4 max-w-md mx-auto">
    <h1 className="text-xl font-bold mb-6">Historia magazynu</h1>
    
    {dni.length === 0 ? (
      <p className="text-gray-500">Brak danych</p>
    ) : (
      <div className="space-y-4">
        {dni.map((dzien, index) => (
          <div key={index} className="bg-white p-4 rounded-lg shadow">
            <h2 className="font-semibold">{dzien.data}</h2>
            <p className="text-sm text-gray-600 mb-2">Kierowca: {dzien.kierowca}</p>
            
            <ul className="mt-2 space-y-2">
              {dzien.ciasta.map((ciasto, idx) => (
                <li key={idx} className="flex justify-between">
                  <span>{ciasto.produkt_id}</span>
                  <span>{ciasto.ilosc} × {ciasto.waga} kg</span>
                </li>
              ))}
            </ul>

            <Link
              href={`/magazyn/historia/${encodeURIComponent(`${dzien.data}___${Object.keys(kierowcy).find(id => kierowcy[id] === dzien.kierowca)}`)}`}
              className="inline-block mt-3 text-blue-600 text-sm"
            >
              Szczegóły →
            </Link>
          </div>
        ))}
      </div>
    )}

    <Link href="/magazyn" className="inline-block mt-6 text-blue-600">
      ← Powrót
    </Link>
  </div>
)  
}