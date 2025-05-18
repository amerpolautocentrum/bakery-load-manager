// src/app/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const dzisiaj = new Date().toISOString().split('T')[0] // yyyy-mm-dd

type Produkt = {
  id: string
  nazwa: string
}

export default function Zaladunek() {
  const [produkty, setProdukty] = useState<Produkt[]>([])
  const [wagi, setWagi] = useState<Record<string, string[]>>({})
  const [kierowcaImie, setKierowcaImie] = useState('')
  const kierowcaId = '70e2c26d-63cd-4a52-9580-d7ee5437413b'

  useEffect(() => {
    const fetchProdukty = async () => {
      const { data, error } = await supabase.from('produkty').select('id, nazwa')
      if (error) {
        console.error('Błąd pobierania produktów:', error)
      } else {
        setProdukty(data || [])
        const initialWagi = Object.fromEntries(data.map((p) => [p.id, ['']]))
        setWagi(initialWagi)
      }

      const { data: kierowcaData, error: kierowcaError } = await supabase
        .from('kierowcy')
        .select('imie, nazwisko')
        .eq('id', kierowcaId)
        .single()

      if (kierowcaData) {
        setKierowcaImie(`${kierowcaData.imie} ${kierowcaData.nazwisko}`)
      }
    }
    fetchProdukty()
  }, [])

  const handleWagaChange = (produktId: string, index: number, value: string) => {
    setWagi((prev) => {
      const nowe = [...(prev[produktId] || [])]
      nowe[index] = value
      return { ...prev, [produktId]: nowe }
    })
  }

  const addWagaField = (produktId: string) => {
    setWagi((prev) => {
      const nowe = [...(prev[produktId] || []), '']
      return { ...prev, [produktId]: nowe }
    })
  }

  const removeWagaField = (produktId: string, index: number) => {
    setWagi((prev) => {
      const nowe = [...(prev[produktId] || [])]
      nowe.splice(index, 1)
      return { ...prev, [produktId]: nowe }
    })
  }

  const saveAll = async () => {
    const wpisy = Object.entries(wagi).flatMap(([produktId, wagiArr]) =>
      wagiArr
        .filter((w) => w.trim() !== '')
        .map((waga) => ({
          id_kierowcy: kierowcaId,
          produkt: produkty.find((p) => p.id === produktId)?.nazwa || '',
          waga: parseFloat(waga.replace(',', '.')),
          data: dzisiaj,
        }))
    )
    const { error } = await supabase.from('zaladunek').insert(wpisy)
    if (error) {
      console.error('Błąd zapisu:', error)
      alert('Błąd zapisu danych.')
    } else {
      alert('Załadunek zapisany ✅')
    }
  }

  return (
    <main className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">
        Załadunek – {kierowcaImie || '...'} – {dzisiaj}
      </h1>
      {produkty.map((produkt) => (
        <div key={produkt.id} className="mb-6">
          <h2 className="text-lg font-semibold mb-2">{produkt.nazwa}</h2>
          {wagi[produkt.id]?.map((waga, index) => (
            <div key={index} className="flex gap-2 mb-1 items-center">
              <input
                type="text"
                value={waga}
                onChange={(e) => handleWagaChange(produkt.id, index, e.target.value)}
                placeholder="Waga (kg)"
                className="border p-2 w-40"
              />
              <button
                onClick={() => removeWagaField(produkt.id, index)}
                className="text-red-500 hover:underline text-sm"
              >
                Usuń
              </button>
            </div>
          ))}
          <button
            className="text-sm text-blue-600 underline"
            onClick={() => addWagaField(produkt.id)}
          >
            + Dodaj kolejną wagę
          </button>
        </div>
      ))}
      <button
        onClick={saveAll}
        className="mt-6 bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
      >
        Zapisz załadunek
      </button>
    </main>
  )
}
