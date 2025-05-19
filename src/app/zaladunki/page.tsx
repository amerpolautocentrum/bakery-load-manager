'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/supabaseClient'
import { useRouter } from 'next/navigation'

type Produkt = {
  id: string
  nazwa: string
}

export default function ZaladunekFormularz() {
  const router = useRouter()
  const [produkty, setProdukty] = useState<Produkt[]>([])
  const [wagi, setWagi] = useState<Record<string, string[]>>({})
  const dzisiaj = new Date().toISOString().split('T')[0] // dzisiejsza data

  // Załadowanie danych produktów
  useEffect(() => {
    const fetchProdukty = async () => {
      const { data, error } = await supabase.from('produkty').select('id, nazwa')
      if (error) {
        console.error('Błąd pobierania produktów:', error)
      } else {
        setProdukty(data || [])
        // Inicjalizacja pustych wag dla każdego produktu
        const initialWagi = data.reduce((acc, produkt) => {
          acc[produkt.id] = [''] // Początkowo każdemu produktowi przypisujemy jedną wagę
          return acc
        }, {} as Record<string, string[]>)
        setWagi(initialWagi)
      }
    }
    fetchProdukty()
  }, [])

  // Funkcja do zmiany wag
  const handleWagaChange = (produktId: string, index: number, value: string) => {
    setWagi(prev => ({
      ...prev,
      [produktId]: prev[produktId].map((w, i) => i === index ? value : w)
    }))
  }

  // Funkcja do dodania nowego pola wagi
  const addWagaField = (produktId: string) => {
    setWagi(prev => ({
      ...prev,
      [produktId]: [...prev[produktId], ''] // Dodajemy nowe pole wagi
    }))
  }

  // Funkcja do usunięcia pola wagi
  const removeWagaField = (produktId: string, index: number) => {
    setWagi(prev => ({
      ...prev,
      [produktId]: prev[produktId].filter((_, i) => i !== index) // Usuwamy wagę o podanym indeksie
    }))
  }

  // Funkcja do zapisywania załadunku w bazie
  const handleSubmit = async () => {
    // Mapowanie wagi na dane do zapisania
    const wpisy = Object.entries(wagi).flatMap(([produktId, wagiArray]) =>
      wagiArray
        .filter(w => w.trim() !== '') // Usuwamy puste wagi
        .map(waga => ({
          produkt_id: produktId,
          nazwa: produkty.find(p => p.id === produktId)?.nazwa || '',
          waga: parseFloat(waga.replace(',', '.')), // Zamiana przecinka na kropkę
          data: dzisiaj,
          kierowca_id: '70e2c26d-63cd-4a52-9580-d7ee5437413b'
        }))
    )

    // Wysyłanie danych do bazy
    const { error } = await supabase.from('zaladunki').insert(wpisy)
    
    if (error) {
      console.error('Błąd zapisu:', error)
      alert('Wystąpił błąd podczas zapisywania załadunku.')
    } else {
      alert('Załadunek zapisany pomyślnie!')
      router.push('/zaladunki/historia') // Po zapisaniu, przekierowujemy do historii załadunków
    }
  }

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Nowy załadunek - {dzisiaj}</h1>
      
      {/* Sprawdzanie, czy produkty zostały załadowane */}
      {produkty.length === 0 ? (
        <p>Ładowanie produktów...</p>
      ) : (
        produkty.map(produkt => (
          <div key={produkt.id} className="mb-6 border-b pb-4">
            <h2 className="text-lg font-semibold mb-2">{produkt.nazwa}</h2>
            
            {/* Pola do wprowadzania wag */}
            {wagi[produkt.id]?.map((waga, index) => (
              <div key={index} className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={waga}
                  onChange={(e) => handleWagaChange(produkt.id, index, e.target.value)}
                  placeholder="Waga (kg)"
                  className="border p-2 rounded w-32"
                />
                <button
                  type="button"
                  onClick={() => removeWagaField(produkt.id, index)}
                  className="text-red-500 hover:text-red-700"
                >
                  Usuń
                </button>
              </div>
            ))}
            
            <button
              type="button"
              onClick={() => addWagaField(produkt.id)}
              className="text-blue-600 hover:text-blue-800 text-sm mt-2"
            >
              + Dodaj wagę
            </button>
          </div>
        ))
      )}
      
      {/* Przycisk do zapisania załadunku */}
      <button
        onClick={handleSubmit}
        disabled={!produkty.length}
        className="mt-6 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded disabled:bg-gray-400"
      >
        Zapisz załadunek
      </button>
    </div>
  )
}
