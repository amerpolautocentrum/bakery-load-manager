'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'

export default function WZFormularz() {
  const kierowcaId = '70e2c26d-63cd-4a52-9580-d7ee5437413b'
  const [produkty, setProdukty] = useState<any[]>([]) // Załadunki
  const [wybraneCiasto, setWybraneCiasto] = useState('')
  const [dostepneWagi, setDostepneWagi] = useState<any[]>([]) // Wagi ciasta
  const [pozycjeWZ, setPozycjeWZ] = useState<any[]>([])

  useEffect(() => {
    const fetchDane = async () => {
      // Pobieramy ciasta z bazy danych (załadunek)
      const { data: zaladunekData } = await supabase
        .from('zaladunek') // Możliwe, że nazwa tabeli to "zaladunek" (czyli załadunki ciast)
        .select('*')
        .eq('id_kierowca', kierowcaId) // Filtrujemy dane po kierowcy
        .eq('czy_uzyte', false) // Możliwe, że ta kolumna wskazuje na wykorzystanie ciasta

      setProdukty(zaladunekData || []) // Przechowujemy ciasta w stanie
    }

    fetchDane()
  }, [])

  const handleWybierzProdukt = (produkt: string) => {
    setWybraneCiasto(produkt)

    // Filtrowanie wag dla wybranego ciasta
    const wagi = produkty.filter((p) => p.produkt === produkt)
    setDostepneWagi(wagi) // Ustawiamy dostępne wagi
  }

  const handleZatwierdzWagi = (waga: any) => {
    const nowePozycje = [{
      nazwa: wybraneCiasto,
      waga: waga.waga,
      cena: waga.cena, // Przy założeniu, że cena jest przechowywana w tabeli
      netto: waga.waga * waga.cena,
      vat: (waga.waga * waga.cena) * 0.05,
      brutto: (waga.waga * waga.cena) * 1.05
    }]

    setPozycjeWZ((prev) => [...prev, ...nowePozycje])

    setDostepneWagi((prev) => prev.filter((w) => w.id !== waga.id)) // Usuwamy wybraną wagę
  }

  const handleUsunPozycje = (index: number) => {
    setPozycjeWZ((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <main className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Wystaw dokument WZ</h1>

      <label className="block mb-2 font-semibold">Wybierz ciasto:</label>
      <select
        value={wybraneCiasto}
        onChange={(e) => handleWybierzProdukt(e.target.value)}
        className="border p-2 mb-4 w-full"
      >
        <option value="">-- wybierz ciasto --</option>
        {produkty.map((produkt) => (
          <option key={produkt.id} value={produkt.produkt}>{produkt.produkt}</option>
        ))}
      </select>

      {wybraneCiasto && (
        <div>
          <label className="block mb-2 font-semibold">Wybierz wagę:</label>
          {dostepneWagi.map((waga) => (
            <div key={waga.id}>
              <button onClick={() => handleZatwierdzWagi(waga)} className="border p-2 mb-2 w-full">
                {waga.waga} kg - Cena: {waga.cena} zł/kg
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6">
        <h3 className="font-semibold">Pozycje zamówienia</h3>
        <table className="w-full table-auto">
          <thead>
            <tr>
              <th>Ciasto</th>
              <th>Waga (kg)</th>
              <th>Cena netto</th>
              <th>VAT</th>
              <th>Cena brutto</th>
              <th>Usuń</th>
            </tr>
          </thead>
          <tbody>
            {pozycjeWZ.map((pozycja, index) => (
              <tr key={index}>
                <td>{pozycja.nazwa}</td>
                <td>{pozycja.waga} kg</td>
                <td>{pozycja.netto} zł</td>
                <td>{pozycja.vat} zł</td>
                <td>{pozycja.brutto} zł</td>
                <td>
                  <button onClick={() => handleUsunPozycje(index)} className="text-red-600">
                    Usuń
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        onClick={() => console.log("Funkcja zapisu dokumentu WZ została wyłączona")}
        className="mt-6 bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
      >
        Zapisz dokument WZ
      </button>
    </main>
  )
}
