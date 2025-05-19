'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { v4 as uuidv4 } from 'uuid'

export default function WZFormularz() {
  const [isClient, setIsClient] = useState(false)
  const kierowcaId = '70e2c26d-63cd-4a52-9580-d7ee5437413b' // stałe ID kierowcy
  const CENA_ZWROT_CIASTA = 24.60
  const CENA_ZWROT_DROBNICA = 40.00
  const STAWKA_VAT = 0.05 // Poprawiono na dokładne 5%

  const [sklepy, setSklepy] = useState<{ id: string; nazwa: string }[]>([])
  const [produkty, setProdukty] = useState<any[]>([])
  const [ceny, setCeny] = useState<Record<string, number>>({})
  const [sklepId, setSklepId] = useState<string>('')
  const [wybraneCiasto, setWybraneCiasto] = useState<string>('')
  const [dostepneWagi, setDostepneWagi] = useState<any[]>([])
  const [wybraneWagi, setWybraneWagi] = useState<string[]>([])
  const [pozycjeWZ, setPozycjeWZ] = useState<any[]>([])
  const [zwrotyCiasta, setZwrotyCiasta] = useState('0.000')
  const [zwrotyDrobnica, setZwrotyDrobnica] = useState('0.000')
  const [formaPlatnosci, setFormaPlatnosci] = useState<'gotowka' | 'przelew'>('gotowka')

  useEffect(() => {
    setIsClient(true)

    const fetchDane = async () => {
      // Pobierz sklepy
      const { data: sklepyData } = await supabase.from('sklepy').select('id, nazwa')
      setSklepy(sklepyData || [])

      // Pobierz załadunki nieużyte dla tego kierowcy
      const { data: zaladunekData } = await supabase
        .from('zaladunek')
        .select('*')
        .eq('id_kierowcy', kierowcaId)
        .eq('czy_uzyte', false)

      if (!zaladunekData || zaladunekData.length === 0) {
        console.log('Brak danych załadunku')
        return
      }

      // Weź najnowszy załadunek po dacie
      const ostatniaData = zaladunekData.reduce((naj, curr) =>
        curr.data > naj ? curr.data : naj,
        zaladunekData[0].data
      )
      const tylkoOstatnie = zaladunekData.filter((z) => z.data === ostatniaData)
      setProdukty(tylkoOstatnie)

      // Pobierz ceny netto produktów
      const { data: cenyData } = await supabase.from('ceny').select('produkt, cena_netto')
      const mapaCen = (cenyData || []).reduce((acc, curr) => {
        acc[curr.produkt.trim().toLowerCase()] = Number(curr.cena_netto)
        return acc
      }, {} as Record<string, number>)
      setCeny(mapaCen)
    }

    fetchDane()
  }, [])

  // Filtruj dostępne wagi po wybraniu ciasta
  useEffect(() => {
    if (wybraneCiasto) {
      const wagiDlaCiasta = produkty.filter(
        (p) => p.produkt === wybraneCiasto && !pozycjeWZ.some((wz) => wz.sztuki.some((s: any) => s.id === p.id))
      )
      setDostepneWagi(wagiDlaCiasta)
      setWybraneWagi([])
    }
  }, [wybraneCiasto, produkty, pozycjeWZ])

  if (!isClient) return null

  const handleZatwierdzWagi = () => {
    if (!wybraneCiasto || wybraneWagi.length === 0) return

    const klucz = Object.keys(ceny).find(
      (key) => key.trim().toLowerCase() === wybraneCiasto.trim().toLowerCase()
    )

    const cenaZaKg = klucz ? ceny[klucz] : 0

    const nowePozycje = dostepneWagi
      .filter((w) => wybraneWagi.includes(w.id))
      .map((sztuka) => {
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
    setWybraneWagi([])
  }

  const handleUsunPozycje = (index: number) => {
    setPozycjeWZ((prev) => prev.filter((_, i) => i !== index))
  }

  const handleZapiszWZ = async () => {
    if (!sklepId || pozycjeWZ.length === 0) {
      alert('Wybierz sklep i dodaj pozycje przed zapisem!')
      return
    }

    const data = new Date().toISOString().split('T')[0]
    const sumaNetto = pozycjeWZ.reduce((sum, p) => sum + p.netto, 0)
    const sumaVat = pozycjeWZ.reduce((sum, p) => sum + p.vat, 0)
    const sumaBrutto = sumaNetto + sumaVat
    const wartoscZwrotow = parseFloat(zwrotyCiasta) * CENA_ZWROT_CIASTA + parseFloat(zwrotyDrobnica) * CENA_ZWROT_DROBNICA
    const kwotaDoZaplaty = sumaBrutto - wartoscZwrotow

    const { error } = await supabase.from('wz_dokumenty').insert([
      {
        id: uuidv4(),
        id_kierowcy: kierowcaId,
        id_sklepu: sklepId,
        data,
        pozycje: JSON.stringify(pozycjeWZ),
        zwroty_ciasta: parseFloat(zwrotyCiasta),
        zwroty_drobnica: parseFloat(zwrotyDrobnica),
        forma_platnosci: formaPlatnosci,
        suma_netto: sumaNetto,
        suma_vat: sumaVat,
        suma_brutto: sumaBrutto,
        wartosc_zwrotow: wartoscZwrotow,
        do_zaplaty: kwotaDoZaplaty
      }
    ])

    if (error) {
      alert('❌ Błąd zapisu dokumentu WZ')
      console.error(error)
    } else {
      alert('✅ Dokument WZ zapisany')
      const uzyteIds = pozycjeWZ.flatMap((p) => p.sztuki.map((s: any) => s.id))
      await supabase
        .from('zaladunek')
        .update({ czy_uzyte: true })
        .in('id', uzyteIds)
      setPozycjeWZ([])
      setZwrotyCiasta('0.000')
      setZwrotyDrobnica('0.000')
      setProdukty((prev) => prev.filter((p) => !uzyteIds.includes(p.id)))
    }
  }

  const unikalneCiasta = Array.from(new Set(produkty.map((p: any) => p.produkt)))

  // Obliczenia finansowe
  const sumaNetto = pozycjeWZ.reduce((sum, p) => sum + p.netto, 0)
  const sumaVat = pozycjeWZ.reduce((sum, p) => sum + p.vat, 0)
  const sumaBrutto = sumaNetto + sumaVat
  const wartoscZwrotow = parseFloat(zwrotyCiasta) * CENA_ZWROT_CIASTA + parseFloat(zwrotyDrobnica) * CENA_ZWROT_DROBNICA
  const doZaplaty = sumaBrutto - wartoscZwrotow

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
                {dostepneWagi.length > 0 ? (
                  dostepneWagi.map((waga) => (
                    <div key={waga.id} className="flex items-center p-2 border rounded">
                      <input
                        type="checkbox"
                        id={`waga-${waga.id}`}
                        checked={wybraneWagi.includes(waga.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setWybraneWagi([...wybraneWagi, waga.id])
                          } else {
                            setWybraneWagi(wybraneWagi.filter((id) => id !== waga.id))
                          }
                        }}
                        className="mr-3"
                      />
                      <label htmlFor={`waga-${waga.id}`} className="flex-1">
                        {waga.waga} kg
                      </label>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500">Brak dostępnych wag</p>
                )}
              </div>
              {wybraneWagi.length > 0 && (
                <button
                  onClick={handleZatwierdzWagi}
                  className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Dodaj wybrane wagi
                </button>
              )}
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
                    <th className="p-3"></th>
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
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleUsunPozycje(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          Usuń
                        </button>
                      </td>
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
              <div className="flex justify-between border-t pt-2 font-medium">
                <span>Wartość brutto:</span>
                <span>{sumaBrutto.toFixed(2)} zł</span>
              </div>
              <div className="flex justify-between">
                <span>Wartość zwrotów:</span>
                <span>-{wartoscZwrotow.toFixed(2)} zł</span>
              </div>
              <div className="flex justify-between border-t pt-2 font-bold">
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