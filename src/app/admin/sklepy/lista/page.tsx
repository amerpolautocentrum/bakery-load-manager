'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/supabaseClient'

export default function ListaSklepow() {
  const [sklepy, setSklepy] = useState<any[]>([])
  const [sieci, setSieci] = useState<any[]>([])
  const [kierowcy, setKierowcy] = useState<any[]>([])
  const [wybranaSiec, setWybranaSiec] = useState('')
  const [wybranyKierowca, setWybranyKierowca] = useState('')
  const [edytowanySklep, setEdytowanySklep] = useState<any | null>(null)
  const [dniTygodnia, setDniTygodnia] = useState<string[]>([])
  const router = useRouter()

  const wszystkieDni = ['poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota', 'niedziela']

  useEffect(() => {
    const fetchData = async () => {
      const { data: sklepyData } = await supabase.from('sklepy').select('*')
      const { data: sieciData } = await supabase.from('sieci').select('*')
      const { data: kierowcyData } = await supabase.from('kierowcy').select('*')

      if (sklepyData) setSklepy(sklepyData)
      if (sieciData) setSieci(sieciData)
      if (kierowcyData) setKierowcy(kierowcyData)
    }

    fetchData()
  }, [])

  const rozpocznijEdycje = (sklep: any) => {
    setEdytowanySklep({ ...sklep })
    setDniTygodnia(sklep.dni_tygodnia || [])
  }

const zapiszEdycje = async () => {
  if (!edytowanySklep) return

  const sklepUpdate = {
    nazwa: edytowanySklep.nazwa?.trim() || '',
    ulica: edytowanySklep.ulica?.trim() || '',
    miejscowosc: edytowanySklep.miejscowosc?.trim() || '',
    kod_pocztowy: edytowanySklep.kod_pocztowy?.trim() || '',
    kontakt: edytowanySklep.kontakt?.trim() || '',
    osoba_decyzyjna: edytowanySklep.osoba_decyzyjna?.trim() || '',
    siec: edytowanySklep.siec?.trim() || '',
    platnosc: edytowanySklep.platnosc || '',
    kierowca_id: edytowanySklep.kierowca_id || '',
    dni_tygodnia: dniTygodnia.length > 0 ? dniTygodnia : null,
  }

  const { error } = await supabase
    .from('sklepy')
    .update(sklepUpdate)
    .eq('id', edytowanySklep.id)

  if (!error) {
    setSklepy(prev => prev.map(s => (s.id === edytowanySklep.id ? { ...s, ...sklepUpdate } : s)))
    setEdytowanySklep(null)
    setDniTygodnia([])
  } else {
    console.error('Błąd podczas zapisu:', error)
    alert('Wystąpił błąd podczas zapisu zmian.')
  }
}


  const toggleDzien = (dzien: string) => {
    setDniTygodnia(prev =>
      prev.includes(dzien) ? prev.filter(d => d !== dzien) : [...prev, dzien]
    )
  }

  const usunSklep = async (id: string) => {
    if (confirm('Czy na pewno chcesz usunąć ten sklep?')) {
      await supabase.from('sklepy').delete().eq('id', id)
      setSklepy(prev => prev.filter(s => s.id !== id))
    }
  }

  const filtrowaneSklepy = sklepy.filter((s) => {
    return (
      (!wybranaSiec || s.siec === wybranaSiec) &&
      (!wybranyKierowca || s.kierowca_id === wybranyKierowca)
    )
  })

  return (
    <div className="p-8">
      <button
        onClick={() => router.push('/admin/sklepy')}
        className="mb-6 text-blue-600 hover:underline"
      >
        ← Powrót do sklepów
      </button>

      <h1 className="text-2xl font-bold mb-6">Lista sklepów</h1>

      <div className="flex gap-4 mb-6">
        <select
          value={wybranaSiec}
          onChange={(e) => setWybranaSiec(e.target.value)}
          className="border px-4 py-2 rounded"
        >
          <option value="">Filtruj po sieci</option>
          {sieci.map((s) => (
            <option key={s.id} value={s.nazwa}>{s.nazwa}</option>
          ))}
        </select>

        <select
          value={wybranyKierowca}
          onChange={(e) => setWybranyKierowca(e.target.value)}
          className="border px-4 py-2 rounded"
        >
          <option value="">Filtruj po kierowcy</option>
          {kierowcy.map((k) => (
            <option key={k.id} value={k.id}>{k.imie} {k.nazwisko}</option>
          ))}
        </select>
      </div>

      {edytowanySklep && (
        <div className="mb-6 p-4 border rounded bg-gray-50">
          <input
            type="text"
            placeholder="Nazwa sklepu"
            value={edytowanySklep.nazwa || ''}
            onChange={(e) => setEdytowanySklep({ ...edytowanySklep, nazwa: e.target.value })}
            className="w-full border px-3 py-2 rounded mb-2"
          />
          <input
            type="text"
            placeholder="Ulica i numer"
            value={edytowanySklep.ulica || ''}
            onChange={(e) => setEdytowanySklep({ ...edytowanySklep, ulica: e.target.value })}
            className="w-full border px-3 py-2 rounded mb-2"
          />
          <input
            type="text"
            placeholder="Miejscowość"
            value={edytowanySklep.miejscowosc || ''}
            onChange={(e) => setEdytowanySklep({ ...edytowanySklep, miejscowosc: e.target.value })}
            className="w-full border px-3 py-2 rounded mb-2"
          />
          <input
            type="text"
            placeholder="Kod pocztowy"
            value={edytowanySklep.kod_pocztowy || ''}
            onChange={(e) => setEdytowanySklep({ ...edytowanySklep, kod_pocztowy: e.target.value })}
            className="w-full border px-3 py-2 rounded mb-2"
          />
          <input
            type="text"
            placeholder="Kontakt"
            value={edytowanySklep.kontakt || ''}
            onChange={(e) => setEdytowanySklep({ ...edytowanySklep, kontakt: e.target.value })}
            className="w-full border px-3 py-2 rounded mb-2"
          />
          <input
            type="text"
            placeholder="Osoba decyzyjna"
            value={edytowanySklep.osoba_decyzyjna || ''}
            onChange={(e) => setEdytowanySklep({ ...edytowanySklep, osoba_decyzyjna: e.target.value })}
            className="w-full border px-3 py-2 rounded mb-2"
          />

          <select
            value={edytowanySklep.siec || ''}
            onChange={(e) => setEdytowanySklep({ ...edytowanySklep, siec: e.target.value })}
            className="w-full border px-3 py-2 rounded mb-2"
          >
            <option value="">-- wybierz sieć --</option>
            {sieci.map((s) => (
              <option key={s.id} value={s.nazwa}>{s.nazwa}</option>
            ))}
          </select>

          <select
            value={edytowanySklep.platnosc || ''}
            onChange={(e) => setEdytowanySklep({ ...edytowanySklep, platnosc: e.target.value })}
            className="w-full border px-3 py-2 rounded mb-2"
          >
            <option value="">-- wybierz --</option>
            <option value="gotówka">Gotówka</option>
            <option value="przelew">Przelew</option>
          </select>

          <select
            value={edytowanySklep.kierowca_id || ''}
            onChange={(e) => setEdytowanySklep({ ...edytowanySklep, kierowca_id: e.target.value })}
            className="w-full border px-3 py-2 rounded mb-2"
          >
            <option value="">-- wybierz kierowcę --</option>
            {kierowcy.map((k) => (
              <option key={k.id} value={k.id}>{k.imie} {k.nazwisko}</option>
            ))}
          </select>

          <div className="mb-4">
            <label className="block font-medium mb-1">Dni trasy</label>
            <div className="flex flex-wrap gap-2">
              {wszystkieDni.map((dzien) => (
                <label key={dzien} className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={dniTygodnia.includes(dzien)}
                    onChange={() => toggleDzien(dzien)}
                  />
                  {dzien}
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={zapiszEdycje}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 z-10 relative"
            >
              Zapisz
            </button>

            <button
              type="button"
              onClick={() => setEdytowanySklep(null)}
              className="bg-gray-400 text-white px-4 py-2 rounded"
            >
              Anuluj
            </button>
          </div>
        </div>
      )}

      <ul className="space-y-2">
        {filtrowaneSklepy.map((sklep) => (
          <li
            key={sklep.id}
            className="p-4 bg-white rounded shadow border flex justify-between items-center"
          >
            <span>{sklep.nazwa}</span>
            <div className="flex gap-2">
              <button onClick={() => rozpocznijEdycje(sklep)} className="text-blue-600 hover:underline">Edytuj</button>
              <button onClick={() => usunSklep(sklep.id)} className="text-red-600 hover:underline">Usuń</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
