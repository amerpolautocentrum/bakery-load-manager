'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '@/supabaseClient'
import { v4 as uuidv4 } from 'uuid'

export default function WZFormularz() {
  const [isClient, setIsClient] = useState(false)
  const kierowcaId = '70e2c26d-63cd-4a52-9580-d7ee5437413b'
  const CENA_ZWROT_CIASTA = 24.60
  const CENA_ZWROT_DROBNICA = 40.00
  const STAWKA_VAT = 0.05

  // Stany
  const [sklepy, setSklepy] = useState<{ id: string; nazwa: string }[]>([])
  const [produkty, setProdukty] = useState<any[]>([])
  const [ceny, setCeny] = useState<Record<string, number>>({})
  const [sklepId, setSklepId] = useState<string>('')
  const [wybraneCiasto, setWybraneCiasto] = useState<string>('')
  const [dostepneWagi, setDostepneWagi] = useState<any[]>([])
  const [pozycjeWZ, setPozycjeWZ] = useState<any[]>([])
  const [zwrotyCiasta, setZwrotyCiasta] = useState('0.000')
  const [zwrotyDrobnica, setZwrotyDrobnica] = useState('0.000')

  // Pobierz dane przy montowaniu
  useEffect(() => {
    const fetchDane = async () => {
      try {
        // 1. Sklepy
        const { data: sklepyData } = await supabase.from('sklepy').select('id, nazwa')
        setSklepy(sklepyData || [])

        // 2. Ceny netto
        const { data: cenyData } = await supabase.from('ceny').select('produkt, cena_netto')
        const mapaCen = (cenyData || []).reduce((acc, curr) => {
          acc[curr.produkt.trim().toLowerCase()] = Number(curr.cena_netto)
          return acc
        }, {} as Record<string, number>)
        setCeny(mapaCen)

        // 3. Załadunki – teraz tabela magazyn
        const { data: magazynData, error } = await supabase
          .from('magazyn')         // ✅ Tabela "magazyn"
          .select('*')
          .eq('kierowca_id', kierowcaId) // ✅ Używamy "kierowca_id", NIE "id_kierowcy"
          .eq('czy_uzyte', false)

        if (error) {
          console.error('Błąd pobierania magazynu:', error)
          alert('Nie można pobrać danych – sprawdź połączenie')
          return
        }

        if (!magazynData || magazynData.length === 0) {
          alert('Brak danych załadunku')
          setProdukty([])
          return
        }

        // 4. Najnowsza data
        const ostatniaData = magazynData.reduce(
          (naj, curr) => (curr.data > naj ? curr.data : naj),
          magazynData[0].data
        )

        // 5. Filtruj tylko sztuki z najnowszego dnia
        const tylkoOstatni = magazynData.filter(p => p.data === ostatniaData)
        setProdukty(tylkoOstatni)

      } catch (err) {
        console.error('Krytyczny błąd:', err)
        alert('Wystąpił błąd podczas ładowania danych')
      }
    }

    fetchDane()
    setIsClient(true)
  }, [])

  // Filtruj dostępne wagi po wybranym ciastku
  useEffect(() => {
    if (wybraneCiasto && produkty.length > 0) {
      const wagiDlaCiasta = produkty.filter(
        (p) =>
          p.produkt_id === wybraneCiasto &&
          !pozycjeWZ.some((wz) => wz.sztuki.some((s: any) => s.id === p.id))
      )
      setDostepneWagi(wagiDlaCiasta)
    } else {
      setDostepneWagi([])
    }
  }, [wybraneCiasto, produkty, pozycjeWZ])

  if (!isClient) return null

  const handleZatwierdzWagi = () => {
    if (!wybraneCiasto || dostepneWagi.length === 0) return

    const klucz = Object.keys(ceny).find(
      (key) => key.trim().toLowerCase() === wybraneCiasto.trim().toLowerCase()
    )

    const cenaZaKg = klucz ? ceny[klucz] : 0

    const nowePozycje = dostepneWagi.map((sztuka) => {
      const waga = parseFloat(sztuka.waga)
      const netto = waga * cenaZaKg
      const vat = netto * STAWKA_VAT
      const brutto = netto + vat

      return {
        nazwa: wybraneCiasto,
        sztuki: [sztuka],
        waga,
        cenaZaKg,
        netto,
        vat,
        brutto
      }
    })

    setPozycjeWZ((prev) => [...prev, ...nowePozycje])
    setWybraneCiasto('')
  }

  const handleZapiszWZ = async () => {
    if (!sklepId || pozycjeWZ.length === 0) {
      alert('Wybierz sklep i dodaj pozycję przed zapisem!')
      return
    }

    const data = new Date().toISOString().split('T')[0]
    const sumaNetto = pozycjeWZ.reduce((sum, p) => sum + p.netto, 0)
    const sumaVat = pozycjeWZ.reduce((sum, p) => sum + p.vat, 0)
    const sumaBrutto = sumaNetto + sumaVat
    const wartoscZwrotow =
      (parseFloat(zwrotyCiasta) || 0) * CENA_ZWROT_CIASTA +
      (parseFloat(zwrotyDrobnica) || 0) * CENA_ZWROT_DROBNICA
    const doZaplaty = sumaBrutto - wartoscZwrotow
    const uzyteIds = pozycjeWZ.flatMap((p) => p.sztuki.map((s: any) => s.id))

    // Zapisz dokument WZ
    const { error: insertError } = await supabase.from('wz_dokumenty').insert([
      {
        id: uuidv4(),
        id_kierowcy: kierowcaId,
        id_sklepu: sklepId,
        data,
        pozycje: JSON.stringify(pozycjeWZ),
        zwroty_ciasta: parseFloat(zwrotyCiasta),
        zwroty_drobnica: parseFloat(zwrotyDrobnica),
        forma_platnosci: 'gotowka',
        suma_netto: sumaNetto,
        suma_vat: sumaVat,
        suma_brutto: sumaBrutto,
        wartosc_zwrotow: wartoscZwrotow,
        do_zaplaty: doZaplaty
      }
    ])

    if (insertError) {
      alert('❌ Błąd zapisu dokumentu WZ')
      console.error(insertError)
      return
    }

    // Oznacz użyte sztuki jako "czy_uzyte = true"
    const { error: updateError } = await supabase
      .from('magazyn')
      .update({ czy_uzyte: true })
      .in('id', uzyteIds)

    if (updateError) {
      alert('⚠️ Błąd aktualizacji stanu magazynowego')
      console.error(updateError)
    }

    // Odśwież lokalny stan
    setProdukty((prev) => prev.filter((p) => !uzyteIds.includes(p.id)))
    setPozycjeWZ([])
    setZwrotyCiasta('0.000')
    setZwrotyDrobnica('0.000')
    alert('✅ Dokument WZ zapisany!')
  }

  // Obliczenia finansowe
  const sumaNetto = pozycjeWZ.reduce((sum, p) => sum + p.netto, 0)
  const sumaVat = pozycjeWZ.reduce((sum, p) => sum + p.vat, 0)
  const sumaBrutto = sumaNetto + sumaVat
  const wartoscZwrotow =
    (parseFloat(zwrotyCiasta) || 0) * CENA_ZWROT_CIASTA +
    (parseFloat(zwrotyDrobnica) || 0) * CENA_ZWROT_DROBNICA
  const doZaplaty = sumaBrutto - wartoscZwrotow

  // Generowanie listy unikalnych ciast
  const unikalneCiasta = produkty.length > 0
    ? Array.from(new Set(produkty.map((p: any) => p.produkt_id?.trim()).filter(Boolean)))
    : []

  return (
    <main className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Wystaw dokument WZ</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Lewa kolumna - formularz */}
        <div className="space-y-6">
          {/* Wybór sklepu */}
          <div>
            <label className="block mb-2 font-semibold">Wybierz sklep:</label>
            <select
              value={sklepId}
              onChange={(e) => setSklepId(e.target.value)}
              className="border p-2 w-full rounded"
            >
              <option value="">-- wybierz sklep --</option>
              {sklepy.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nazwa}
                </option>
              ))}
            </select>
          </div>

          {/* Wybór ciasta */}
          <div>
            <label className="block mb-2 font-semibold">Wybierz ciasto:</label>
            <select
              value={wybraneCiasto}
              onChange={(e) => setWybraneCiasto(e.target.value)}
              className="border p-2 w-full rounded"
              disabled={unikalneCiasta.length === 0}
            >
              <option value="">-- wybierz ciasto --</option>
              {unikalneCiasta.map((ciasto, idx) => (
                <option key={idx} value={ciasto}>
                  {ciasto}
                </option>
              ))}
            </select>
          </div>

          {/* Dostępne wagi */}
          {wybraneCiasto && (
            <div className="border p-4 rounded">
              <h3 className="font-semibold mb-3">Dostępne wagi dla {wybraneCiasto}:</h3>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {produkty
                  .filter(p => p.produkt_id === wybraneCiasto)
                  .map((waga) => (
                    <div key={waga.id} className="flex items-center p-2 border rounded">
                      <input
                        type="checkbox"
                        checked={true}
                        onChange={() => {}}
                        className="mr-3"
                      />
                      <span>{waga.waga} kg</span>
                    </div>
                  ))}
              </div>
              <button
                onClick={handleZatwierdzWagi}
                className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Dodaj wszystkie wagi
              </button>
            </div>
          )}

          {/* Zwroty */}
          <div className="border p-4 rounded">
            <h3 className="font-semibold mb-3">Zwroty:</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-1">Ciasta (kg):</label>
                <input
                  type="number"
                  value={zwrotyCiasta}
                  onChange={(e) => setZwrotyCiasta(e.target.value)}
                  step="0.001"
                  min="0"
                  className="border p-2 w-full rounded"
                />
              </div>
              <div>
                <label className="block mb-1">Drobnica (kg):</label>
                <input
                  type="number"
                  value={zwrotyDrobnica}
                  onChange={(e) => setZwrotyDrobnica(e.target.value)}
                  step="0.001"
                  min="0"
                  className="border p-2 w-full rounded"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Prawa kolumna - podgląd WZ */}
        <div className="space-y-6">
          {/* Lista pozycji WZ */}
          {pozycjeWZ.length > 0 ? (
            <div className="border rounded overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-3 text-left">Nazwa</th>
                    <th className="p-3 text-right">Waga (kg)</th>
                    <th className="p-3 text-right">Cena/kg</th>
                    <th className="p-3 text-right">Netto</th>
                    <th className="p-3 text-right">VAT</th>
                    <th className="p-3 text-right">Brutto</th>
                  </tr>
                </thead>
                <tbody>
                  {pozycjeWZ.map((pozycja, index) => (
                    <tr key={index} className="hover:bg-gray-50 border-t">
                      <td className="p-3">{pozycja.nazwa}</td>
                      <td className="p-3 text-right">{pozycja.waga.toFixed(3)} kg</td>
                      <td className="p-3 text-right">{pozycja.cenaZaKg.toFixed(2)} zł</td>
                      <td className="p-3 text-right">{pozycja.netto.toFixed(2)} zł</td>
                      <td className="p-3 text-right">{pozycja.vat.toFixed(2)} zł</td>
                      <td className="p-3 text-right">{pozycja.brutto.toFixed(2)} zł</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="border p-4 rounded text-center text-gray-500">
              Brak dodanych pozycji
            </div>
          )}

          {/* Podsumowanie */}
          <div className="border p-4 rounded bg-gray-50">
            <h3 className="font-semibold mb-3">Podsumowanie:</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Wartość netto:</span>
                <span>{sumaNetto.toFixed(2)} zł</span>
              </div>
              <div className="flex justify-between">
                <span>VAT ({STAWKA_VAT * 100}%):</span>
                <span>{sumaVat.toFixed(2)} zł</span>
              </div>
              <div className="flex justify-between pt-2 border-t font-medium">
                <span>Wartość brutto:</span>
                <span>{sumaBrutto.toFixed(2)} zł</span>
              </div>
              <div className="flex justify-between">
                <span>Zwroty:</span>
                <span>-{wartoscZwrotow.toFixed(2)} zł</span>
              </div>
              <div className="flex justify-between pt-2 border-t font-bold">
                <span>Do zapłaty:</span>
                <span>{doZaplaty.toFixed(2)} zł</span>
              </div>
            </div>
            <button
              onClick={handleZapiszWZ}
              disabled={!sklepId || pozycjeWZ.length === 0}
              className={`mt-4 w-full py-2 rounded text-white ${
                !sklepId || pozycjeWZ.length === 0
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              Zapisz dokument WZ
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}