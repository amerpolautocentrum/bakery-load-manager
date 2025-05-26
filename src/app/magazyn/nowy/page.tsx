'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/supabaseClient'
import { v4 as uuidv4 } from 'uuid'

interface Produkt {
  id: string
  nazwa: string
}

interface Kierowca {
  id: string
  imie: string
  nazwisko: string
}

interface MagazynItem {
  id: string
  produkt_id: string
  waga: number
  kierowca_id: string
  data: string
  created_at: string
  updated_at: string
  wersja: string
}

export default function NowyMagazyn() {
  const [produkty, setProdukty] = useState<Produkt[]>([])
  const [kierowcy, setKierowcy] = useState<Kierowca[]>([])
  const [wybraneCiasto, setWybraneCiasto] = useState('')
  const [waga, setWaga] = useState('1.000')
  const [wybranyKierowca, setWybranyKierowca] = useState('')
  const [aktualnyMagazyn, setAktualnyMagazyn] = useState<MagazynItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const dzisiaj = new Date().toISOString().split('T')[0]

  // Pobierz dane przy montowaniu
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Produkty
        const { data: produktyData } = await supabase.from('produkty').select('*')
        setProdukty(produktyData || [])

        // Kierowcy
        const { data: kierowcyData } = await supabase.from('kierowcy').select('*')
        setKierowcy(kierowcyData || [])

        // Dzisiejszy stan magazynu
        const { data: magazynData } = await supabase
          .from('magazyn')
          .select('*')
          .eq('data', dzisiaj)
          .eq('czy_uzyte', false)
          .eq('kierowca_id', '70e2c26d-63cd-4a52-9580-d7ee5437413b')

        if (magazynData?.length > 0) {
          setAktualnyMagazyn(magazynData)
          setWybranyKierowca(magazynData[0].kierowca_id)
        }
      } catch (error) {
        console.error('Błąd ładowania:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleDodajCiasto = () => {
    if (!wybraneCiasto || !wybranyKierowca || parseFloat(waga) <= 0) {
      alert('Wypełnij wszystkie pola!')
      return
    }

    const noweCiasto: MagazynItem = {
      id: uuidv4(), // ✅ Unikalny identyfikator sztuki
      produkt_id: wybraneCiasto,
      waga: parseFloat(waga),
      kierowca_id: wybranyKierowca,
      data: dzisiaj,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      wersja: uuidv4() // ✅ Nowa wersja dla całej edycji
    }

    setAktualnyMagazyn(prev => [...prev, noweCiasto])
    setWybraneCiasto('')
    setWaga('1.000')
  }

  const handleUsunCiasto = (id: string) => {
    setAktualnyMagazyn(prev => prev.filter(item => item.id !== id))
  }

  const handleZapiszMagazyn = async () => {
    if (!aktualnyMagazyn.length || !wybranyKierowca) {
      alert('Uzupełnij dane!')
      return
    }

    setIsSaving(true)
    try {
      const nowaWersja = uuidv4()

      // 1. Usuń stare dane tego dnia i kierowcy
      const { error: deleteError } = await supabase
        .from('magazyn')
        .delete()
        .eq('data', dzisiaj)
        .eq('kierowca_id', wybranyKierowca)

      if (deleteError) throw deleteError

      // 2. Przygotuj nowe dane z tą samą wersją
      const rekordyDoZapisu = aktualnyMagazyn.map(item => ({
        ...item,
        id: uuidv4(), // ✅ Nowe ID dla każdej sztuki
        data: dzisiaj,
        kierowca_id: wybranyKierowca,
        czy_uzyte: false,
        wersja: nowaWersja
      }))

      // 3. Zapisz nowe dane
      const { error: insertError } = await supabase
        .from('magazyn')
        .insert(rekordyDoZapisu)

      if (insertError) throw insertError

      alert('✅ Załadunek został nadpisany')
      window.location.href = '/magazyn/historia' // Odśwież stronę

    } catch (error: any) {
      console.error('Błąd zapisu:', error)
      alert(`❌ Błąd zapisu: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  // Grupowanie ciast do podglądu
  const groupedProducts = aktualnyMagazyn.reduce((acc, item) => {
    const key = `${item.produkt_id}-${item.waga}`
    if (!acc[key]) {
      acc[key] = {
        nazwa: item.produkt_id,
        waga: item.waga,
        ilosc: 0,
        items: []
      }
    }
    acc[key].ilosc += 1
    acc[key].items.push(item)
    return acc
  }, {} as Record<string, {nazwa: string; waga: number; ilosc: number; items: MagazynItem[]}>)

  if (isLoading) return <div className="p-6 text-center">Ładowanie...</div>

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-4">Nowy magazyn</h1>

      <div className="mb-6">
        <label className="block mb-2">Wybierz kierowcę:</label>
        <select
          value={wybranyKierowca}
          onChange={(e) => setWybranyKierowca(e.target.value)}
          className="w-full p-2 border rounded"
          disabled={!!aktualnyMagazyn.length}
        >
          <option value="">-- wybierz --</option>
          {kierowcy.map(k => (
            <option key={k.id} value={k.id}>
              {k.imie} {k.nazwisko}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h2 className="font-semibold mb-3">Dodaj ciasto</h2>
        <div className="space-y-3">
          <div>
            <label className="block mb-1">Ciasto:</label>
            <select
              value={wybraneCiasto}
              onChange={(e) => setWybraneCiasto(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="">-- wybierz --</option>
              {produkty.map(p => (
                <option key={p.id} value={p.nazwa}>{p.nazwa}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block mb-1">Waga (kg):</label>
            <input
              type="number"
              step="0.001"
              min="0.001"
              value={waga}
              onChange={(e) => setWaga(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
          <button
            onClick={handleDodajCiasto}
            disabled={!wybraneCiasto || !wybranyKierowca}
            className={`w-full py-2 rounded ${
              !wybraneCiasto || !wybranyKierowca ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
            } text-white`}
          >
            Dodaj ciasto
          </button>
        </div>
      </div>

      {/* Lista ciast */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h2 className="font-semibold mb-3">Twój magazyn:</h2>
        {Object.keys(groupedProducts).length > 0 ? (
          <ul className="space-y-2">
            {Object.values(groupedProducts).map((product) => (
              <li key={`${product.nazwa}-${product.waga}`}>
                <div className="flex justify-between border-b pb-2">
                  <span>{product.nazwa}: {product.ilosc} × {product.waga} kg</span>
                  <button
                    onClick={() => handleUsunCiasto(product.items[0].id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Usuń
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 text-center">Brak ciast</p>
        )}
      </div>

      {/* Przyciski */}
      <div className="flex space-x-3">
        <Link href="/magazyn" className="flex-1 text-center bg-gray-200 py-2 rounded">
          Anuluj
        </Link>
        <button
          onClick={handleZapiszMagazyn}
          disabled={isSaving || aktualnyMagazyn.length === 0}
          className={`flex-1 py-2 rounded text-white ${
            isSaving || aktualnyMagazyn.length === 0
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          {isSaving ? 'Zapisywanie...' : 'Zapisz załadunek'}
        </button>
      </div>
    </div>
  )
}