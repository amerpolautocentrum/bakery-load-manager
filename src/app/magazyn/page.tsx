'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/supabaseClient'
import dayjs from 'dayjs'
import { useRouter } from 'next/navigation'

export default function MagazynKierowcy() {
  const router = useRouter()
  const [pozycje, setPozycje] = useState<any[]>([])
  const [produkty, setProdukty] = useState<any[]>([])
  const [nowaPozycja, setNowaPozycja] = useState({ produkt_id: '', waga: '' })
  const [zatwierdzony, setZatwierdzony] = useState(false)
  const [czyZapisano, setCzyZapisano] = useState(false)
  const [zaladowano, setZaladowano] = useState(false)
  const [kierowcaId, setKierowcaId] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('kierowca_id')
        .eq('id', user.id)
        .single()

      if (!profile?.kierowca_id) return

      setKierowcaId(profile.kierowca_id)

      const dzisiaj = dayjs().format('YYYY-MM-DD')
      const { data: istniejacyMagazyn } = await supabase
        .from('magazyn')
        .select('id, produkt_id, waga, zatwierdzony_przez_kontrolera, zatwierdzony_przez_kierowce, produkty(nazwa, typ)')
        .eq('kierowca_id', profile.kierowca_id)
        .eq('data', dzisiaj)

      if (istniejacyMagazyn && istniejacyMagazyn.length > 0) {
        const przetworzony = istniejacyMagazyn.map((m) => ({
          produkt_id: m.produkt_id,
          waga: m.waga,
          nazwa: m.produkty?.nazwa || 'Nieznany',
          typ: m.produkty?.typ || 'ciasto'
        }))
        setPozycje(przetworzony)
        setZatwierdzony(!!istniejacyMagazyn[0].zatwierdzony_przez_kierowce)
      }

      const { data: prod } = await supabase.from('produkty').select('id, nazwa, typ')
      setProdukty(prod || [])

      setZaladowano(true)
    }

    init()
  }, [])

  const dodajPozycje = () => {
    if (!nowaPozycja.produkt_id || !nowaPozycja.waga || zatwierdzony) return
    const produkt = produkty.find((p) => p.id === nowaPozycja.produkt_id)
    if (!produkt) return
    setPozycje([...pozycje, { ...produkt, waga: nowaPozycja.waga }])
    setNowaPozycja({ produkt_id: '', waga: '' })
  }

  const usunPozycje = (index: number) => {
    if (zatwierdzony) return
    setPozycje(pozycje.filter((_, i) => i !== index))
  }

  const zapiszMagazyn = async () => {
  const dzisiaj = dayjs().format('YYYY-MM-DD')

  if (!kierowcaId) {
    alert('Brak ID kierowcy')
    return
  }

  // Usuń stare pozycje z tego dnia (tylko robocze)
  await supabase
    .from('magazyn')
    .delete()
    .eq('data', dzisiaj)
    .eq('kierowca_id', kierowcaId)
    .eq('status', 'roboczy')

  // Sprawdź, czy wszystkie pozycje mają poprawny produkt_id
  for (const p of pozycje) {
    if (!p.produkt_id && !p.id) {
      console.error('Brak ID produktu w pozycji:', p)
      alert('Wystąpił problem z jednym z produktów – brak ID.')
      return
    }
  }

  const nowePozycje = pozycje.map((p) => ({
    produkt_id: p.produkt_id || p.id, // preferuj produkt_id, bo to UUID z selecta
    waga: p.waga,
    data: dzisiaj,
    kierowca_id: kierowcaId,
    status: 'roboczy',
    zatwierdzony_przez_kierowce: true,
    wersja: new Date().toISOString()
  }))

  const { error } = await supabase.from('magazyn').insert(nowePozycje)
  if (error) {
    console.error('Błąd zapisu magazynu:', error)
    alert('Błąd zapisu magazynu – sprawdź konsolę.')
    return
  }

  setZatwierdzony(true)
  setCzyZapisano(true)
  router.push('/magazyn/historia')
}


  if (!zaladowano) return <div className="p-4">Ładowanie...</div>

  if (zatwierdzony || czyZapisano) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-bold mb-4">Twój magazyn</h1>
        <p className="text-green-600">Magazyn został zapisany i zatwierdzony.</p>
        <button
          onClick={() => router.push('/dashboard')}
          className="mt-4 bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
        >
          Wróć do panelu
        </button>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">Twój magazyn – {dayjs().format('DD.MM.YYYY')}</h1>

      <div className="space-y-2">
        {pozycje.map((p, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="w-1/2">{p.nazwa}</div>
            <div className="w-1/4">{p.waga} kg</div>
            <button onClick={() => usunPozycje(i)} className="text-red-600">Usuń</button>
          </div>
        ))}
      </div>

      <div className="flex gap-2 items-center">
        <select
          className="border px-2 py-1"
          value={nowaPozycja.produkt_id}
          onChange={(e) => setNowaPozycja((prev) => ({ ...prev, produkt_id: e.target.value }))}
        >
          <option value="">Wybierz ciasto</option>
          {produkty.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nazwa} ({p.typ})
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Waga (np. 1.250)"
          className="border px-2 py-1"
          value={nowaPozycja.waga}
          onChange={(e) => setNowaPozycja((prev) => ({ ...prev, waga: e.target.value }))}
        />

        <button onClick={dodajPozycje} className="bg-green-600 text-white px-3 py-1 rounded">
          Dodaj
        </button>
      </div>

      <div className="flex gap-4 mt-4">
        <button
          onClick={zapiszMagazyn}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Zapisz magazyn
        </button>
        <button
          onClick={() => router.push('/dashboard')}
          className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
        >
          Wróć do panelu
        </button>
      </div>
    </div>
  )
}
