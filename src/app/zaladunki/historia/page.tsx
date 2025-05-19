'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/supabaseClient'

type ZaładunekDnia = {
  data: string
  kierowca_id: string
  kierowca_imie: string
}

export default function HistoriaZaladunkow() {
  const [dni, setDni] = useState<ZaładunekDnia[]>([])
  const [wybranyDzien, setWybranyDzien] = useState<string | null>(null)
  const [szczegoly, setSzczegoly] = useState<any[]>([])

  // Pobierz unikalne daty załadunków
  useEffect(() => {
    const fetchDni = async () => {
      // 1. Pobierz wszystkie rekordy z minimalnymi danymi
      const { data: wszystkieZaladunki } = await supabase
        .from('zaladunki')
        .select('data, kierowca_id')
        .order('data', { ascending: false })

      if (!wszystkieZaladunki) return

      // 2. Filtruj unikalne daty po stronie klienta
      const unikalneDaty = Array.from(
        new Set(wszystkieZaladunki.map(z => z.data))
      )

      // 3. Dla każdej daty pobierz dane kierowcy
      const dniZKierowcami = await Promise.all(
        unikalneDaty.map(async (data) => {
          const pierwszyRekord = wszystkieZaladunki.find(z => z.data === data)
          if (!pierwszyRekord) return null

          const { data: kierowca } = await supabase
            .from('kierowcy')
            .select('imie, nazwisko')
            .eq('id', pierwszyRekord.kierowca_id)
            .single()

          return {
            data,
            kierowca_id: pierwszyRekord.kierowca_id,
            kierowca_imie: `${kierowca?.imie} ${kierowca?.nazwisko}` || 'Nieznany kierowca'
          }
        })
      )

      setDni(dniZKierowcami.filter(Boolean) as ZaładunekDnia[])
    }

    fetchDni()
  }, [])

  // Pobierz szczegóły dla wybranego dnia
  useEffect(() => {
    if (!wybranyDzien) return

    const fetchSzczegoly = async () => {
      const { data } = await supabase
        .from('zaladunki')
        .select('*')
        .eq('data', wybranyDzien)

      if (!data) return

      // Grupowanie produktów po stronie klienta
      const produktyMap = new Map<string, number[]>()
      data.forEach(item => {
        if (!produktyMap.has(item.nazwa)) {
          produktyMap.set(item.nazwa, [])
        }
        produktyMap.get(item.nazwa)?.push(parseFloat(item.waga))
      })

      const wynik = Array.from(produktyMap.entries()).map(([nazwa, wagi]) => ({
        nazwa,
        wagi,
        liczba_sztuk: wagi.length,
        laczna_waga: wagi.reduce((sum, w) => sum + w, 0).toFixed(3)
      }))

      setSzczegoly(wynik)
    }

    fetchSzczegoly()
  }, [wybranyDzien])

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Historia załadunków</h1>
      
      {!wybranyDzien ? (
        <div className="space-y-3">
          {dni.map((dzien, index) => (
            <div 
              key={index}
              onClick={() => setWybranyDzien(dzien.data)}
              className="border p-4 rounded-lg cursor-pointer hover:bg-gray-50"
            >
              <div className="flex justify-between">
                <span className="font-medium">
                  {new Date(dzien.data).toLocaleDateString('pl-PL')}
                </span>
                <span>{dzien.kierowca_imie}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div>
          <button 
            onClick={() => setWybranyDzien(null)}
            className="mb-4 text-blue-600 hover:underline"
          >
            ← Wróć do listy
          </button>
          
          <h2 className="text-xl font-semibold mb-4">
            Załadunek z {new Date(wybranyDzien).toLocaleDateString('pl-PL')}
          </h2>
          
          <div className="space-y-4">
            {szczegoly.map((produkt, index) => (
              <div key={index} className="border p-4 rounded-lg">
                <div className="flex justify-between">
                  <h3 className="font-medium">{produkt.nazwa}</h3>
                  <span>{produkt.liczba_sztuk} szt.</span>
                </div>
                <div className="mt-2">
                  <p className="text-sm text-gray-600">
                    Wagi: {produkt.wagi.map(w => `${w} kg`).join(', ')}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Łącznie: {produkt.laczna_waga} kg
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}