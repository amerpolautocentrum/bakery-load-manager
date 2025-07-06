'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/supabaseClient'

interface PozycjaKP {
  id: string
  dokument: string
  kwota: string
}

export default function NowyKP() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [sklepy, setSklepy] = useState<any[]>([])
  const [sklepId, setSklepId] = useState<string>('')
  const [sklepNazwa, setSklepNazwa] = useState<string>('')
  const [pozycje, setPozycje] = useState<PozycjaKP[]>([{ id: generateId(), dokument: '', kwota: '' }])
  const [zapisano, setZapisano] = useState(false)
  const [dokumentKP, setDokumentKP] = useState<any>(null)
  const [sprzedawca, setSprzedawca] = useState('')
  const [firmaNazwa, setFirmaNazwa] = useState('')
  const [loading, setLoading] = useState(true)

  // Funkcja do generowania unikalnych ID
  function generateId() {
    return Math.random().toString(36).substring(2, 9)
  }

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const { data: userData } = await supabase.auth.getUser()
      const kierowcaId = userData?.user?.id

      if (!kierowcaId) return

      try {
        // Pobierz dane firmy
        const { data: firmaData } = await supabase
          .from('firma')
          .select('nazwa')
          .single()
        
        if (firmaData) {
          setFirmaNazwa(firmaData.nazwa)
        }

        // Sprawdź czy przyszedł sklep z query param
        const sklepZQuery = searchParams.get('sklep_id')
        if (sklepZQuery) {
          await ustawSklep(sklepZQuery)
        }

        // Pobierz sklepy kierowcy
        const { data, error } = await supabase
          .from('kierowcy_sklepy')
          .select('sklep_id, sklepy(nazwa, miejscowosc)')
          .eq('kierowca_id', kierowcaId)

        if (!error && data) {
          const lista = data.map((s) => ({
            id: s.sklep_id,
            nazwa: `${s.sklepy.nazwa} (${s.sklepy.miejscowosc})`,
          }))
          setSklepy(lista)
        }

        // Pobierz dane użytkownika (sprzedawcy)
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', kierowcaId)
          .single()
        
        if (userProfile) {
          setSprzedawca(userProfile.full_name || '')
        }
      } finally {
        setLoading(false)
      }
    }

    const ustawSklep = async (sklepId: string) => {
      const { data: sklepData } = await supabase
        .from('sklepy')
        .select('nazwa, miejscowosc')
        .eq('id', sklepId)
        .single()
      
      if (sklepData) {
        setSklepId(sklepId)
        setSklepNazwa(`${sklepData.nazwa} (${sklepData.miejscowosc})`)
      }
    }

    fetchData()
  }, [searchParams])

  const handleSklepChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedSklepId = e.target.value
    if (!selectedSklepId) {
      setSklepId('')
      setSklepNazwa('')
      return
    }

    const { data: sklepData } = await supabase
      .from('sklepy')
      .select('nazwa, miejscowosc')
      .eq('id', selectedSklepId)
      .single()
    
    if (sklepData) {
      setSklepId(selectedSklepId)
      setSklepNazwa(`${sklepData.nazwa} (${sklepData.miejscowosc})`)
    }
  }

  const dodajPozycje = () => {
    setPozycje([...pozycje, { id: generateId(), dokument: '', kwota: '' }])
  }

  const usunPozycje = (index: number) => {
    const nowePozycje = [...pozycje]
    nowePozycje.splice(index, 1)
    setPozycje(nowePozycje)
  }

  const zmienPozycje = (index: number, field: keyof PozycjaKP, value: string) => {
    const nowePozycje = [...pozycje]
    nowePozycje[index][field] = value
    setPozycje(nowePozycje)
  }

  const obliczSuma = () => {
    return pozycje.reduce((suma, poz) => {
      const kwota = parseFloat(poz.kwota) || 0
      return suma + kwota
    }, 0).toFixed(2)
  }

  const handleZapisz = async () => {
    const { data: userData } = await supabase.auth.getUser()
    const kierowcaId = userData?.user?.id
    if (!kierowcaId || !sklepId || pozycje.length === 0) return

    // Walidacja pozycji
    const niepelnePozycje = pozycje.some(poz => !poz.dokument || !poz.kwota)
    if (niepelnePozycje) {
      alert('Wypełnij wszystkie pozycje (dokument i kwota)')
      return
    }

    const kwotaBrutto = parseFloat(obliczSuma())

    // Generuj numer KP (RRRR/MM/NNN)
    const dzis = new Date()
    const rok = dzis.getFullYear()
    const miesiac = String(dzis.getMonth() + 1).padStart(2, '0')
    
    // Pobierz ostatni numer KP w tym miesiącu
    const { count } = await supabase
      .from('kp_dokumenty')
      .select('*', { count: 'exact' })
      .like('numer_kp', `${rok}/${miesiac}%`)

    const numerKP = `${rok}/${miesiac}/${String((count || 0) + 1).padStart(3, '0')}`

    const { data, error } = await supabase
      .from('kp_dokumenty')
      .insert({
        kierowca_id: kierowcaId,
        sklep_id: sklepId,
        data: dzis.toISOString().split('T')[0],
        kwota: kwotaBrutto,
        kwota_brutto: kwotaBrutto,
        numer_kp: numerKP,
        pozycje: pozycje.map(poz => ({ dokument: poz.dokument, kwota: poz.kwota })),
        metoda_platnosci: 'gotówka',
        waluta: 'PLN'
      })
      .select()
      .single()

    if (error) {
      alert('Błąd zapisu: ' + error.message)
    } else {
      setDokumentKP(data)
      setZapisano(true)
    }
  }

  const handleDrukuj = () => {
    window.print()
  }

  const handleNowyKP = () => {
    setZapisano(false)
    setPozycje([{ id: generateId(), dokument: '', kwota: '' }])
  }

  if (loading) {
    return <div className="p-4 max-w-lg mx-auto">Ładowanie...</div>
  }

  if (zapisano && dokumentKP) {
    return (
      <div className="p-4 max-w-lg mx-auto">
        <div className="print-only" style={{ width: '100mm', padding: '5mm', fontSize: '10pt' }}>
          <h2 className="text-center font-bold mb-2">POKWITOWANIE ODBIORU GOTÓWKI</h2>
          
          <div className="mb-2">
            <div className="flex justify-between">
              <span>Numer KP:</span>
              <span className="font-bold">{dokumentKP.numer_kp}</span>
            </div>
            <div className="flex justify-between">
              <span>Data:</span>
              <span>{new Date(dokumentKP.data).toLocaleDateString()}</span>
            </div>
          </div>
          
          <div className="mb-2">
            <div>Sklep: <span className="font-bold">{sklepNazwa}</span></div>
            <div>Sprzedawca: <span className="font-bold">{firmaNazwa}</span></div>
            <div>Odbiorca: <span className="font-bold">{sprzedawca}</span></div>
          </div>
          
          <table className="w-full border-collapse mb-4">
            <thead>
              <tr className="border-b">
                <th className="text-left py-1">Dokument</th>
                <th className="text-right py-1">Kwota (PLN)</th>
              </tr>
            </thead>
            <tbody>
              {dokumentKP.pozycje.map((poz: any, index: number) => (
                <tr key={index} className="border-b">
                  <td className="py-1">{poz.dokument}</td>
                  <td className="text-right py-1">{parseFloat(poz.kwota).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t font-bold">
                <td className="py-1">RAZEM:</td>
                <td className="text-right py-1">{dokumentKP.kwota_brutto.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
          
          <div className="mt-8">
            <div className="text-center mb-1">....................................</div>
            <div className="text-center">Podpis osoby upoważnionej do odbioru</div>
          </div>
        </div>

        <div className="no-print mt-4">
          <button
            className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 mr-2"
            onClick={handleDrukuj}
          >
            Drukuj KP
          </button>
          <button
            className="bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600"
            onClick={handleNowyKP}
          >
            Nowy dokument KP
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-xl font-bold mb-4">Wystaw dokument KP</h1>

      {!searchParams.get('sklep_id') && (
        <div className="mb-4">
          <label className="block mb-1 font-semibold">Wybierz sklep</label>
          <select
            className="w-full border p-2 rounded"
            value={sklepId}
            onChange={handleSklepChange}
          >
            <option value="">-- wybierz --</option>
            {sklepy.map((sklep) => (
              <option key={sklep.id} value={sklep.id}>
                {sklep.nazwa}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="mb-4">
        <label className="block mb-1 font-semibold">Pozycje KP</label>
        {pozycje.map((poz, index) => (
          <div key={poz.id} className="flex mb-2 gap-2">
            <input
              type="text"
              className="flex-1 border p-2 rounded"
              placeholder="Nazwa dokumentu"
              value={poz.dokument}
              onChange={(e) => zmienPozycje(index, 'dokument', e.target.value)}
            />
            <input
              type="number"
              className="w-24 border p-2 rounded"
              placeholder="Kwota"
              value={poz.kwota}
              onChange={(e) => zmienPozycje(index, 'kwota', e.target.value)}
              step="0.01"
              min="0"
            />
            {pozycje.length > 1 && (
              <button
                className="bg-red-500 text-white px-2 rounded"
                onClick={() => usunPozycje(index)}
              >
                ×
              </button>
            )}
          </div>
        ))}
        <button
          className="bg-gray-200 py-1 px-3 rounded text-sm"
          onClick={dodajPozycje}
        >
          + Dodaj pozycję
        </button>
      </div>

      <div className="mb-4 p-2 bg-gray-100 rounded">
        <div className="font-semibold">Suma: {obliczSuma()} PLN</div>
      </div>

      <button
        className="w-full bg-yellow-500 text-white py-2 rounded hover:bg-yellow-600"
        onClick={handleZapisz}
        disabled={!sklepId || pozycje.length === 0 || pozycje.some(poz => !poz.dokument || !poz.kwota)}
      >
        Zapisz KP
      </button>
    </div>
  )
}