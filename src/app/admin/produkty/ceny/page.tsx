'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/supabaseClient'
import Link from 'next/link'

export default function CenyPage() {
  const [produkty, setProdukty] = useState<any[]>([])
  const [ceny, setCeny] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      // Pobierz produkty
      const { data: produktyData } = await supabase
        .from('produkty')
        .select('*')
        .order('nazwa', { ascending: true })

      // Pobierz ceny
      const { data: cenyData } = await supabase
        .from('ceny')
        .select('produkt, cena_netto')

      // Przygotuj mapę cen
      const cenyMap: Record<string, number> = {}
      cenyData?.forEach(c => {
        cenyMap[c.produkt] = c.cena_netto
      })

      setProdukty(produktyData || [])
      setCeny(cenyMap)
      setIsLoading(false)
    }

    fetchData()
  }, [])

  const updateCena = async (produktId: string, newCena: number) => {
    // Sprawdź czy cena już istnieje
    const { data: existingPrice } = await supabase
      .from('ceny')
      .select('*')
      .eq('produkt', produktId)
      .maybeSingle()

    if (existingPrice) {
      // Aktualizuj istniejącą cenę
      await supabase
        .from('ceny')
        .update({ cena_netto: newCena })
        .eq('produkt', produktId)
    } else {
      // Dodaj nową cenę
      await supabase
        .from('ceny')
        .insert([{ produkt: produktId, cena_netto: newCena }])
    }

    // Aktualizuj lokalny stan
    setCeny(prev => ({ ...prev, [produktId]: newCena }))
  }

  if (isLoading) return <div>Ładowanie...</div>

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Zarządzanie cenami produktów</h1>
        <Link
          href="/admin/produkty"
          className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
        >
          Powrót
        </Link>
      </div>

      <table className="w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 border">Produkt</th>
            <th className="p-2 border">Aktualna cena netto</th>
            <th className="p-2 border">Nowa cena netto</th>
            <th className="p-2 border">Akcje</th>
          </tr>
        </thead>
        <tbody>
          {produkty.map((produkt) => (
            <tr key={produkt.id}>
              <td className="p-2 border">{produkt.nazwa}</td>
              <td className="p-2 border">
                {ceny[produkt.id]?.toFixed(2) || 'Brak ceny'} zł
              </td>
              <td className="p-2 border">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={ceny[produkt.id] || ''}
                  className="border p-1 rounded w-24"
                  onBlur={(e) => {
                    const newCena = parseFloat(e.target.value)
                    if (!isNaN(newCena)) {
                      updateCena(produkt.id, newCena)
                    }
                  }}
                />
              </td>
              <td className="p-2 border">
                <button
                  onClick={() => {
                    const input = document.querySelector(`input[defaultValue="${ceny[produkt.id]}"]`) as HTMLInputElement
                    if (input) {
                      const newCena = parseFloat(input.value)
                      if (!isNaN(newCena)) {
                        updateCena(produkt.id, newCena)
                      }
                    }
                  }}
                  className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                >
                  Zapisz
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}