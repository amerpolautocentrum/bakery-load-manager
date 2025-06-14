'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/supabaseClient'
import { v4 as uuidv4 } from 'uuid'
import { useSearchParams } from 'next/navigation'

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
  produkt_id: string
  waga: number
}

export default function NowyMagazyn() {
  const searchParams = useSearchParams()
  const kierowcaId = searchParams.get('kierowca')

  const [produkty, setProdukty] = useState<Produkt[]>([])
  const [kierowca, setKierowca] = useState<Kierowca | null>(null)
  const [aktualnyMagazyn, setAktualnyMagazyn] = useState<Record<string, number[]>>({})
  const [wybraneCiasto, setWybraneCiasto] = useState('')
  const [waga, setWaga] = useState('1.000')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const dzisiaj = new Date().toISOString().split('T')[0]

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        const [{ data: produktyData }, { data: kierowcaData }] = await Promise.all([
          supabase.from('produkty').select('*'),
          supabase.from('kierowcy').select('*').eq('id', kierowcaId).single()
        ])

        setProdukty(produktyData || [])
        setKierowca(kierowcaData || null)
        
        // Pobierz wszystkie niezapisane magazyny z localStorage
        const saved = localStorage.getItem('magazyn-roboczy')
        if (saved) {
          const allMagazyny = JSON.parse(saved)
          // Ustaw magazyn dla aktualnego kierowcy (jeśli istnieje)
          if (allMagazyny[kierowcaId!]) {
            setAktualnyMagazyn(allMagazyny[kierowcaId!])
          } else {
            setAktualnyMagazyn({})
          }
        }
      } catch (error) {
        console.error('Błąd podczas ładowania danych:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    if (kierowcaId) fetchData()
  }, [kierowcaId])

  useEffect(() => {
    if (kierowcaId && !isLoading) {
      // Aktualizuj localStorage przy zmianie magazynu
      const saved = localStorage.getItem('magazyn-roboczy')
      let allMagazyny = saved ? JSON.parse(saved) : {}
      
      allMagazyny = {
        ...allMagazyny,
        [kierowcaId]: aktualnyMagazyn
      }
      
      localStorage.setItem('magazyn-roboczy', JSON.stringify(allMagazyny))
    }
  }, [aktualnyMagazyn, kierowcaId, isLoading])

  const handleDodaj = () => {
    if (!wybraneCiasto || parseFloat(waga) <= 0) return
    setAktualnyMagazyn(prev => {
      const current = prev[wybraneCiasto] || []
      return { ...prev, [wybraneCiasto]: [...current, parseFloat(waga)] }
    })
    setWaga('1.000')
  }

  const handleUsun = (ciasto: string, index: number) => {
    setAktualnyMagazyn(prev => {
      const updated = [...(prev[ciasto] || [])]
      updated.splice(index, 1)
      if (updated.length === 0) {
        const { [ciasto]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [ciasto]: updated }
    })
  }

  const handleZapisz = async () => {
    if (!kierowcaId || Object.keys(aktualnyMagazyn).length === 0) return
    setIsSaving(true)
    
    try {
      const wersja = uuidv4()
      const rekordy = Object.entries(aktualnyMagazyn).flatMap(([ciasto, wagi]) =>
        wagi.map(w => ({
          id: uuidv4(),
          produkt_id: ciasto,
          waga: w,
          kierowca_id: kierowcaId,
          data: dzisiaj,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          wersja,
          czy_uzyte: false
        }))
      )

      const { error } = await supabase.from('magazyn').insert(rekordy)
      
      if (error) {
        throw error
      }
      
      // Po udanym zapisie, usuń magazyn z localStorage
      const saved = localStorage.getItem('magazyn-roboczy')
      if (saved) {
        const allMagazyny = JSON.parse(saved)
        const { [kierowcaId]: _, ...rest } = allMagazyny
        localStorage.setItem('magazyn-roboczy', JSON.stringify(rest))
      }
      
      alert('✅ Magazyn zapisany pomyślnie')
      setAktualnyMagazyn({})
    } catch (error) {
      console.error('Błąd zapisu:', error)
      alert('❌ Wystąpił błąd podczas zapisywania magazynu: ' + (error as Error).message)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading || !kierowcaId) {
    return (
      <div className="p-4 flex justify-center items-center h-64">
        <div className="text-center">
          <p className="text-lg">Ładowanie...</p>
          <p className="text-sm text-gray-500">Proszę czekać</p>
        </div>
      </div>
    )
  }

  if (!kierowca) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-bold mb-4">Błąd</h1>
        <p className="mb-4">Nie znaleziono kierowcy o podanym ID</p>
        <Link
          href="/produkcja"
          className="bg-gray-300 text-center py-2 px-4 rounded inline-block"
        >
          Wróć do listy kierowców
        </Link>
      </div>
    )
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold mb-4">Tworzenie magazynu</h1>

      <div className="mb-4 p-2 bg-gray-100 rounded">
        <p><strong>Kierowca:</strong> {kierowca.imie} {kierowca.nazwisko}</p>
        <p><strong>Data:</strong> {dzisiaj}</p>
      </div>

      <div className="mb-4">
        <label htmlFor="produkt-select" className="block mb-2 text-sm font-medium text-gray-700">
          Wybierz ciasto:
        </label>
        <select
          id="produkt-select"
          className="w-full border p-2 rounded"
          value={wybraneCiasto}
          onChange={(e) => setWybraneCiasto(e.target.value)}
        >
          <option value="">-- wybierz ciasto --</option>
          {produkty.map(p => (
            <option key={p.id} value={p.id}>{p.nazwa}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-2 mb-4">
        <div className="flex-1">
          <label htmlFor="waga-input" className="block mb-2 text-sm font-medium text-gray-700">
            Waga (kg):
          </label>
          <input
            id="waga-input"
            type="number"
            step="0.001"
            min="0.001"
            value={waga}
            onChange={(e) => setWaga(e.target.value)}
            className="w-full border p-2 rounded"
          />
        </div>
        <div className="flex items-end">
          <button
            onClick={handleDodaj}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Dodaj
          </button>
        </div>
      </div>

      <div className="bg-white rounded shadow p-4 mb-4">
        <h2 className="font-semibold mb-2">Twój magazyn</h2>
        {Object.entries(aktualnyMagazyn).length === 0 ? (
          <p className="text-gray-500">Brak pozycji</p>
        ) : (
          Object.entries(aktualnyMagazyn).map(([ciasto, wagi]) => (
            <div key={ciasto} className="mb-4 border-b pb-2">
              <strong className="text-lg">
                {produkty.find(p => p.id === ciasto)?.nazwa || 'Nieznane ciasto'}
              </strong>
              <ul className="ml-4 mt-1">
                {wagi.map((w, i) => (
                  <li key={i} className="flex justify-between items-center py-1">
                    <span>{w.toFixed(3)} kg</span>
                    <button 
                      onClick={() => handleUsun(ciasto, i)} 
                      className="text-red-500 hover:text-red-700"
                    >
                      Usuń
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>

      <div className="flex gap-2">
        <Link
          href="/produkcja"
          className="w-1/2 bg-gray-300 text-center py-2 rounded hover:bg-gray-400"
        >
          Wróć do listy kierowców
        </Link>

        <button
          onClick={handleZapisz}
          disabled={isSaving || Object.keys(aktualnyMagazyn).length === 0}
          className="w-1/2 bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Zapisywanie...
            </span>
          ) : 'Zapisz magazyn'}
        </button>
      </div>
    </div>
  )
}