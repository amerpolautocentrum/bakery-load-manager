'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { v4 as uuidv4 } from 'uuid'

export default function WZFormularz() {
  // Stany
  const [isClient, setIsClient] = useState(false)
  const kierowcaId = '70e2c26d-63cd-4a52-9580-d7ee5437413b'
  const CENA_ZWROT_CIASTA = 24.60
  const CENA_ZWROT_DROBNICA = 40.00
  const STAWKA_VAT = 0.05

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

  // Hook useEffect uruchamiany po załadowaniu komponentu
  useEffect(() => {
    setIsClient(true)
    const fetchDane = async () => {
      // Pobieranie sklepów
      const { data: sklepyData } = await supabase.from('sklepy').select('id, nazwa')
      setSklepy(sklepyData || [])

      // Pobieranie produktów z ostatniego załadunku
      const { data: zaladunekData } = await supabase
        .from('zaladunek')
        .select('*')
        .eq('id_kierowcy', kierowcaId)
        .eq('czy_uzyte', false)

      if (!zaladunekData || zaladunekData.length === 0) {
        console.log('Brak danych załadunku')
        return
      }

      const ostatniaData = zaladunekData.reduce((naj, curr) =>
        curr.data > naj ? curr.data : naj,
        zaladunekData[0].data
      )

      const tylkoOstatnie = zaladunekData.filter((z) => z.data === ostatniaData)
      setProdukty(tylkoOstatnie)

      // Pobieranie cen produktów
      const { data: cenyData } = await supabase.from('ceny').select('produkt, cena_netto')
      const mapaCen = (cenyData || []).reduce((acc, curr) => {
        acc[curr.produkt.trim().toLowerCase()] = Number(curr.cena_netto)
        return acc
      }, {} as Record<string, number>)
      setCeny(mapaCen)
    }
    fetchDane()
  }, [])

  useEffect(() => {
    if (wybraneCiasto) {
      const wagiDlaCiasta = produkty.filter(
        (p) => p.produkt === wybraneCiasto && !pozycjeWZ.some((wz) => wz.sztuki.some((s: any) => s.id === p.id))
      )
      setDostepneWagi(wagiDlaCiasta)
      setWybraneWagi([])
    }
  }, [wybraneCiasto, produkty, pozycjeWZ])

  // Jeśli klient nie jest załadowany, zwróć null (zapobiega problemom na serwerze)
  if (!isClient) return null

  // Funkcja obsługująca dodawanie wybranych wag
  const handleZatwierdzWagi = () => {
    if (!wybraneCiasto || wybraneWagi.length === 0) return

    const klucz = Object.keys(ceny).find(
      (key) => key.trim().toLowerCase() === wybraneCiasto.trim().toLowerCase()
    )
    const cenaZaKg = klucz ? ceny[klucz] : 0

    const nowePozycje = dostepneWagi
      .filter((w) => wybraneWagi.includes(w.id))
      .map((sztuka) => {
        const waga = Number(sztuka.waga)
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

  // Funkcja usuwająca pozycje z WZ
  const handleUsunPozycje = (index: number) => {
    setPozycjeWZ((prev) => prev.filter((_, i) => i !== index))
  }

  // Funkcja zapisująca dokument WZ
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
        id_sklepu: sklepId, // Sklep musi być wybrany, aby kontynuować
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
      // Oznacz użyte sztuki w załadunku
      const uzyteIds = pozycjeWZ.flatMap(p => p.sztuki.map((s: any) => s.id))
      await supabase
        .from('zaladunek')
        .update({ czy_uzyte: true })
        .in('id', uzyteIds)
      
      // Reset formularza
      setPozycjeWZ([])
      setZwrotyCiasta('0.000')
      setZwrotyDrobnica('0.000')
      setProdukty(prev => prev.filter(p => !uzyteIds.includes(p.id)))
    }
  }

  // Obliczenia podsumowania
  const sumaNetto = pozycjeWZ.reduce((sum, p) => sum + p.netto, 0)
  const sumaVat = pozycjeWZ.reduce((sum, p) => sum + p.vat, 0)
  const sumaBrutto = sumaNetto + sumaVat
  const wartoscZwrotow = parseFloat(zwrotyCiasta) * CENA_ZWROT_CIASTA + parseFloat(zwrotyDrobnica) * CENA_ZWROT_DROBNICA
  const doZaplaty = sumaBrutto - wartoscZwrotow

  const unikalneCiasta = Array.from(new Set(produkty.map(p => p.produkt)))

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Nagłówek */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Dokument Wydania Zewnętrznego</h1>
          <p className="text-gray-600">Cukiernia - System obsługi dostaw</p>
        </header>

        {/* Główny kontener */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Lewa kolumna - formularz */}
          <div className="lg:col-span-2 space-y-6">
            {/* Karta wyboru sklepu i ciasta */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-700">1. Wybierz dane</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Wybór sklepu */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sklep</label>
                  <div className="relative">
                    <select
                      value={sklepId}
                      onChange={(e) => setSklepId(e.target.value)}
                      className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-lg"
                    >
                      <option value="">-- Wybierz sklep --</option>
                      {sklepy.map((s) => (
                        <option key={s.id} value={s.id}>{s.nazwa}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Wybór ciasta */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Produkt</label>
                  <div className="relative">
                    <select
                      value={wybraneCiasto}
                      onChange={(e) => setWybraneCiasto(e.target.value)}
                      className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-lg"
                      disabled={unikalneCiasta.length === 0}
                    >
                      <option value="">-- Wybierz ciasto --</option>
                      {unikalneCiasta.map((ciasto) => (
                        <option key={ciasto} value={ciasto}>{ciasto}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Karta dostępnych wag */}
            {wybraneCiasto && (
              <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-700">2. Wybierz wagi</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Dostępne sztuki: <span className="font-medium">{dostepneWagi.length}</span> • 
                    Łączna waga: <span className="font-medium">
                      {dostepneWagi.reduce((sum, w) => sum + Number(w.waga), 0).toFixed(3)} kg
                    </span>
                  </p>
                </div>
                
                <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                  {dostepneWagi.length > 0 ? (
                    dostepneWagi.map((waga) => (
                      <label 
                        key={waga.id}
                        htmlFor={`waga-${waga.id}`}
                        className={`flex items-center px-6 py-3 hover:bg-blue-50 cursor-pointer ${wybraneWagi.includes(waga.id) ? 'bg-blue-50' : ''}`}
                      >
                        <input
                          type="checkbox"
                          id={`waga-${waga.id}`}
                          checked={wybraneWagi.includes(waga.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setWybraneWagi([...wybraneWagi, waga.id])
                            } else {
                              setWybraneWagi(wybraneWagi.filter(id => id !== waga.id))
                            }
                          }}
                          className="h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <div className="ml-4 flex-1">
                          <div className="flex justify-between">
                            <span className="font-medium">{waga.waga} kg</span>
                            <span className="text-sm text-gray-500">ID: {waga.id.slice(0, 6)}...</span>
                          </div>
                        </div>
                      </label>
                    ))
                  ) : (
                    <div className="px-6 py-8 text-center text-gray-500">
                      Brak dostępnych wag dla wybranego produktu
                    </div>
                  )}
                </div>

                {wybraneWagi.length > 0 && (
                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
                    <button
                      onClick={handleZatwierdzWagi}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Dodaj wybrane ({wybraneWagi.length})
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Karta zwrotów */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-700">3. Zwroty</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Zwrot ciast (kg)</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <input
                      type="number"
                      value={zwrotyCiasta}
                      onChange={(e) => setZwrotyCiasta(e.target.value)}
                      className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-3 pr-12 py-2 sm:text-sm border-gray-300 rounded-md"
                      step="0.001"
                      min="0"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">kg</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Zwrot drobnicy (kg)</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <input
                      type="number"
                      value={zwrotyDrobnica}
                      onChange={(e) => setZwrotyDrobnica(e.target.value)}
                      className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-3 pr-12 py-2 sm:text-sm border-gray-300 rounded-md"
                      step="0.001"
                      min="0"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">kg</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Prawa kolumna - podsumowanie */}
          <div className="space-y-6">
            {/* Karta podglądu WZ */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-700">Podgląd dokumentu</h2>
              </div>

              {pozycjeWZ.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {pozycjeWZ.map((pozycja, index) => (
                    <div key={index} className="px-6 py-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium text-gray-900">{pozycja.nazwa}</h3>
                          <p className="text-sm text-gray-500 mt-1">
                            {pozycja.waga.toFixed(3)} kg × {pozycja.cenaZaKg.toFixed(2)} zł
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{pozycja.brutto.toFixed(2)} zł</p>
                          <p className="text-xs text-gray-500 mt-1">
                            netto: {pozycja.netto.toFixed(2)} zł
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 flex justify-end">
                        <button
                          onClick={() => handleUsunPozycje(index)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Usuń
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-6 py-8 text-center text-gray-500">
                  Brak dodanych pozycji
                </div>
              )}
            </div>

            {/* Karta podsumowania */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-xl font-semibold text-gray-700">Podsumowanie</h2>
              </div>

              <div className="px-6 py-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Wartość netto:</span>
                  <span className="font-medium">{sumaNetto.toFixed(2)} zł</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">VAT ({STAWKA_VAT * 100}%):</span>
                  <span className="font-medium">{sumaVat.toFixed(2)} zł</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-200">
                  <span className="text-gray-600 font-medium">Wartość brutto:</span>
                  <span className="font-medium text-blue-600">{sumaBrutto.toFixed(2)} zł</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Wartość zwrotów:</span>
                  <span className="font-medium text-red-600">-{wartoscZwrotow.toFixed(2)} zł</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-200">
                  <span className="text-gray-900 font-bold">Do zapłaty:</span>
                  <span className="text-xl font-bold text-green-600">{doZaplaty.toFixed(2)} zł</span>
                </div>
              </div>

              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <button
                  onClick={handleZapiszWZ}
                  disabled={!sklepId || pozycjeWZ.length === 0}
                  className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white ${
                    !sklepId || pozycjeWZ.length === 0
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500'
                  }`}
                >
                  Zatwierdź dokument
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
