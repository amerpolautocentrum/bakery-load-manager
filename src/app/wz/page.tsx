'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/supabaseClient'
import { v4 as uuidv4 } from 'uuid'

interface Produkt {
  id: string
  produkt_id: string
  waga: number
  data: string
  czy_uzyte: boolean
}

interface Sklep {
  id: string
  nazwa: string
}

export default function WZFormularz() {
  const [produkty, setProdukty] = useState<Produkt[]>([])
  const [sklepy, setSklepy] = useState<Sklep[]>([])
  const [ceny, setCeny] = useState<Record<string, number>>({})
  const [sklepId, setSklepId] = useState<string>('')
  const [wybraneCiasto, setWybraneCiasto] = useState<string>('')
  const [dostepneWagi, setDostepneWagi] = useState<Produkt[]>([])
  const [wybraneWagi, setWybraneWagi] = useState<string[]>([])
  const [pozycjeWZ, setPozycjeWZ] = useState<any[]>([])
  const [zwrotyCiasta, setZwrotyCiasta] = useState('0.000')
  const [zwrotyDrobnica, setZwrotyDrobnica] = useState('0.000')
  const [formaPlatnosci, setFormaPlatnosci] = useState<'gotowka' | 'przelew'>('gotowka')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const kierowcaId = '70e2c26d-63cd-4a52-9580-d7ee5437413b'
  const CENA_ZWROT_CIASTA = 24.60
  const CENA_ZWROT_DROBNICA = 40.00
  const STAWKA_VAT = 0.05

  // Pobierz dane przy montowaniu
  useEffect(() => {
    const fetchDane = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Pobierz dane równolegle
        const [{ data: sklepyData }, { data: cenyData }, { data: magazynData }] = await Promise.all([
          supabase.from('sklepy').select('*'),
          supabase.from('ceny').select('*'),
          supabase
            .from('magazyn')
            .select('*')
            .eq('czy_uzyte', false)
            .eq('kierowca_id', kierowcaId)
            .order('created_at', { ascending: false })
        ])

        setSklepy(sklepyData || [])
        setCeny(
          (cenyData || []).reduce((acc, curr) => {
            const key = curr.produkt.trim().toLowerCase()
            if (key) acc[key] = Number(curr.cena_netto) || 0
            return acc
          }, {} as Record<string, number>)
        )

        if (!magazynData || magazynData.length === 0) {
          setProdukty([])
          alert('Brak danych załadunku dla tego kierowcy')
          return
        }

        // Znajdź najnowszą datę
        const najnowszaData = magazynData.reduce((max, curr) => (curr.data > max ? curr.data : max), magazynData[0].data)
        const tylkoOstatni = magazynData.filter(p => p.data === najnowszaData)
        setProdukty(tylkoOstatni)

      } catch (err: any) {
        console.error('Błąd ładowania danych:', err)
        setError(`Nie można pobrać danych: ${err.message}`)
      } finally {
        setIsLoading(false)
      }
    }

    fetchDane()
  }, [])

  // Filtruj dostępne wagi po wybranym ciastku
  useEffect(() => {
    if (!produkty || !wybraneCiasto) {
      setDostepneWagi([])
      setWybraneWagi([])
      return
    }

    const filtrowane = produkty.filter(
      (p) =>
        p.produkt_id?.toLowerCase() === wybraneCiasto.toLowerCase() &&
        !pozycjeWZ.some((poz) => poz.sztuki.some((s: any) => s.id === p.id))
    )

    setDostepneWagi(filtrowane)
    setWybraneWagi([])

  }, [wybraneCiasto, produkty, pozycjeWZ])

  const handleZatwierdzWagi = () => {
    if (!wybraneCiasto || !dostepneWagi.length || !wybraneWagi.length) return

    const nowePozycje = dostepneWagi
      .filter(w => wybraneWagi.includes(w.id))
      .map(sztuka => {
        const waga = parseFloat(sztuka.waga)
        const cenaKg = ceny[wybraneCiasto.trim().toLowerCase()] || 0
        const netto = waga * cenaKg
        const vat = netto * STAWKA_VAT
        const brutto = netto + vat

        return {
          sztuki: [sztuka],
          nazwa: sztuka.produkt_id,
          waga,
          cenaZaKg: cenaKg,
          netto,
          vat,
          brutto
        }
      })

    setPozycjeWZ(prev => [...prev, ...nowePozycje])
    setWybraneWagi([])
  }

  const handleUsunPozycje = (index: number) => {
    setPozycjeWZ(pozycjeWZ.filter((_, i) => i !== index))
  }

  const handleZapiszWZ = async () => {
    if (!sklepId || pozycjeWZ.length === 0) {
      alert('Wybierz sklep i dodaj przynajmniej jedną pozycję!')
      return
    }

    setIsSaving(true)
    try {
      const data = new Date().toISOString().split('T')[0]
      const uzyteIds = pozycjeWZ.flatMap(p => p.sztuki.map((s: any) => s.id))

      const sumaNetto = pozycjeWZ.reduce((sum, p) => sum + (p.netto || 0), 0)
      const sumaVat = pozycjeWZ.reduce((sum, p) => sum + (p.vat || 0), 0)
      const sumaBrutto = sumaNetto + sumaVat
      const wartoscZwrotow =
        (parseFloat(zwrotyCiasta) || 0) * CENA_ZWROT_CIASTA +
        (parseFloat(zwrotyDrobnica) || 0) * CENA_ZWROT_DROBNICA
      const doZaplaty = sumaBrutto - wartoscZwrotow

      const { error: insertError } = await supabase.rpc('zapisz_wz', {
  dokument_id: uuidv4(),
  kierowca_id: kierowcaId,
  sklep_id: sklepId,
  data,
  pozycje: JSON.stringify(pozycjeWZ),
  zwroty_ciasta: parseFloat(zwrotyCiasta) || 0,
  zwroty_drobnica: parseFloat(zwrotyDrobnica) || 0,
  suma_netto: sumaNetto,
  suma_vat: sumaVat,
  suma_brutto: sumaBrutto,
  wartosc_zwrotow: wartoscZwrotow,
  uzyte_ids: uzyteIds
})

      if (insertError) throw insertError

      // Oznacz sztuki jako użyte
      const { error: updateError } = await supabase
        .from('magazyn')
        .update({ czy_uzyte: true })
        .in('id', uzyteIds)

      if (updateError) throw updateError

      // Odśwież stan lokalny
      setPozycjeWZ([])
      setProdukty(prev => prev.filter(p => !uzyteIds.includes(p.id)))
      setZwrotyCiasta('0.000')
      setZwrotyDrobnica('0.000')

      alert('✅ Dokument WZ został zapisany!')

    } catch (err: any) {
      console.error('Błąd zapisu:', err)
      alert(`❌ Błąd zapisu: ${err.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  // Unikalne ciasta do selecta
  const unikalneCiasta = Array.from(new Set(produkty.map(p => p.produkt_id).filter(Boolean))) as string[]

  // Obliczenia finansowe
  const sumaNetto = pozycjeWZ.reduce((sum, p) => sum + (p.netto || 0), 0)
  const sumaVat = pozycjeWZ.reduce((sum, p) => sum + (p.vat || 0), 0)
  const sumaBrutto = sumaNetto + sumaVat
  const wartoscZwrotow =
    (parseFloat(zwrotyCiasta) || 0) * CENA_ZWROT_CIASTA +
    (parseFloat(zwrotyDrobnica) || 0) * CENA_ZWROT_DROBNICA
  const doZaplaty = sumaBrutto - wartoscZwrotow

  if (isLoading) {
    return (
      <div className="p-6 text-center">Ładowanie danych...</div>
    )
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-600">{error}</div>
    )
  }

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
              disabled={!unikalneCiasta.length}
            >
              <option value="">-- wybierz ciasto --</option>
              {unikalneCiasta.map((ciasto, idx) => (
                <option key={idx} value={ciasto}>
                  {ciasto}
                </option>
              ))}
            </select>
          </div>

          {/* Lista wag */}
          {wybraneCiasto && (
            <div className="border p-4 rounded shadow bg-white">
              <h3 className="font-semibold mb-3">Dostępne wagi ({wybraneCiasto})</h3>
              {dostepneWagi.length === 0 ? (
                <p className="text-gray-500 py-2">Brak dostępnych wag</p>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {dostepneWagi.map((waga) => (
                    <div key={waga.id} className="flex items-center p-2 border rounded hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={wybraneWagi.includes(waga.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setWybraneWagi([...wybraneWagi, waga.id])
                          } else {
                            setWybraneWagi(wybraneWagi.filter(id => id !== waga.id))
                          }
                        }}
                        className="mr-3 h-5 w-5"
                      />
                      <span>{waga.waga} kg</span>
                    </div>
                  ))}
                </div>
              )}

              {dostepneWagi.length > 0 && (
                <button
                  onClick={handleZatwierdzWagi}
                  disabled={!wybraneWagi.length}
                  className={`mt-4 w-full py-2 px-4 rounded ${
                    !wybraneWagi.length ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
                  } text-white`}
                >
                  Dodaj wybrane wagi
                </button>
              )}
            </div>
          )}

          {/* Zwroty */}
          <div className="border p-4 rounded bg-white shadow">
            <h3 className="font-semibold mb-3">Zwroty:</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-1">Ciasta (kg):</label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={zwrotyCiasta}
                  onChange={(e) => setZwrotyCiasta(e.target.value)}
                  className="border p-2 w-full rounded"
                />
              </div>
              <div>
                <label className="block mb-1">Drobnica (kg):</label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={zwrotyDrobnica}
                  onChange={(e) => setZwrotyDrobnica(e.target.value)}
                  className="border p-2 w-full rounded"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Prawa kolumna - podgląd WZ */}
        <div className="space-y-6">
          <div className="border p-4 rounded bg-white shadow">
            <h3 className="font-semibold mb-3">Podgląd WZ:</h3>
            {pozycjeWZ.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Brak pozycji</p>
            ) : (
              <table className="min-w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-3 text-left">Nazwa</th>
                    <th className="p-3 text-right">Waga</th>
                    <th className="p-3 text-right">Cena/kg</th>
                    <th className="p-3 text-right">Netto</th>
                    <th className="p-3 text-right">VAT</th>
                    <th className="p-3 text-right">Brutto</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {pozycjeWZ.map((pozycja, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="p-3">{pozycja.nazwa}</td>
                      <td className="p-3 text-right">{pozycja.waga.toFixed(3)} kg</td>
                      <td className="p-3 text-right">{pozycja.cenaZaKg.toFixed(2)} zł</td>
                      <td className="p-3 text-right">{pozycja.netto.toFixed(2)} zł</td>
                      <td className="p-3 text-right">{pozycja.vat.toFixed(2)} zł</td>
                      <td className="p-3 text-right">{pozycja.brutto.toFixed(2)} zł</td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleUsunPozycje(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Usuń
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Podsumowanie finansowe */}
          <div className="border p-4 rounded bg-gray-50">
            <h3 className="font-semibold mb-3">Podsumowanie finansowe:</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Suma netto:</span>
                <span>{sumaNetto.toFixed(2)} zł</span>
              </div>
              <div className="flex justify-between">
                <span>VAT ({STAWKA_VAT * 100}%):</span>
                <span>{sumaVat.toFixed(2)} zł</span>
              </div>
              <div className="flex justify-between pt-2 border-t font-medium">
                <span>Do zapłaty:</span>
                <span>{doZaplaty.toFixed(2)} zł</span>
              </div>
            </div>
          </div>

          {/* Przyciski akcji */}
          <div className="flex space-x-3 mt-4">
            <Link href="/magazyn" className="flex-1 text-center bg-gray-200 py-2 px-4 rounded hover:bg-gray-300 flex-1">
              ← Powrót
            </Link>
            <button
              onClick={handleZapiszWZ}
              disabled={!sklepId || pozycjeWZ.length === 0 || isSaving}
              className={`flex-1 py-2 px-4 rounded text-white ${
                !sklepId || pozycjeWZ.length === 0 || isSaving
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {isSaving ? 'Zapisywanie...' : 'Zapisz WZ'}
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}