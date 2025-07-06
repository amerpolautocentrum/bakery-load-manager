'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/supabaseClient'

export default function DodajSklep() {
  const router = useRouter()

  const [nazwa, setNazwa] = useState('')
  const [ulica, setUlica] = useState('')
  const [miejscowosc, setMiejscowosc] = useState('')
  const [kodPocztowy, setKodPocztowy] = useState('')
  const [kontakt, setKontakt] = useState('')
  const [osoba, setOsoba] = useState('')
  const [siec, setSiec] = useState('')
  const [platnosc, setPlatnosc] = useState('')
  const [sieci, setSieci] = useState<any[]>([])
  const [kierowcy, setKierowcy] = useState<any[]>([])
  const [kierowcaId, setKierowcaId] = useState('')
  const [dniTygodnia, setDniTygodnia] = useState<string[]>([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const wszystkieDni = [
    { label: 'Poniedziałek', value: '1' },
    { label: 'Wtorek', value: '2' },
    { label: 'Środa', value: '3' },
    { label: 'Czwartek', value: '4' },
    { label: 'Piątek', value: '5' },
    { label: 'Sobota', value: '6' },
    { label: 'Niedziela', value: '7' },
  ]

  useEffect(() => {
    const fetchData = async () => {
      const { data: sieciData } = await supabase.from('sieci').select('id, nazwa')
      if (sieciData) setSieci(sieciData)

      const { data: kierowcyData } = await supabase.from('kierowcy').select('id, imie, nazwisko')
      if (kierowcyData) setKierowcy(kierowcyData)
    }
    fetchData()
  }, [])

  const toggleDzien = (value: string) => {
    setDniTygodnia((prev) =>
      prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    const res = await fetch('/api/sklepy/dodaj', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nazwa,
        ulica,
        miejscowosc,
        kod_pocztowy: kodPocztowy,
        kontakt,
        osoba_decyzyjna: osoba,
        platnosc,
        siec,
        kierowca_id: kierowcaId,
        dni_tygodnia: dniTygodnia,
      }),
    })

    const result = await res.json()
    if (!res.ok) {
      setError(result.error || 'Błąd dodawania sklepu.')
    } else {
      setSuccess('Sklep dodany pomyślnie.')
      setTimeout(() => router.push('/admin/sklepy'), 1500)
    }
  }

  return (
    <div className="max-w-xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Dodaj nowy sklep</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-medium">Nazwa sklepu *</label>
          <input type="text" value={nazwa} onChange={(e) => setNazwa(e.target.value)} className="w-full border px-4 py-2 rounded" required />
        </div>

        <div>
          <label className="block font-medium">Ulica i numer *</label>
          <input type="text" value={ulica} onChange={(e) => setUlica(e.target.value)} className="w-full border px-4 py-2 rounded" required />
        </div>

        <div>
          <label className="block font-medium">Miejscowość *</label>
          <input type="text" value={miejscowosc} onChange={(e) => setMiejscowosc(e.target.value)} className="w-full border px-4 py-2 rounded" required />
        </div>

        <div>
          <label className="block font-medium">Kod pocztowy *</label>
          <input type="text" value={kodPocztowy} onChange={(e) => setKodPocztowy(e.target.value)} className="w-full border px-4 py-2 rounded" required />
        </div>

        <div>
          <label className="block font-medium">Kontakt (opcjonalnie)</label>
          <input type="text" value={kontakt} onChange={(e) => setKontakt(e.target.value)} className="w-full border px-4 py-2 rounded" />
        </div>

        <div>
          <label className="block font-medium">Osoba decyzyjna (opcjonalnie)</label>
          <input type="text" value={osoba} onChange={(e) => setOsoba(e.target.value)} className="w-full border px-4 py-2 rounded" />
        </div>

        <div>
          <label className="block font-medium">Nazwa sieci handlowej</label>
          <select value={siec} onChange={(e) => setSiec(e.target.value)} className="w-full border px-4 py-2 rounded">
            <option value="">-- wybierz sieć --</option>
            {sieci.map((s) => (
              <option key={s.id} value={s.nazwa}>{s.nazwa}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-medium">Forma płatności</label>
          <select value={platnosc} onChange={(e) => setPlatnosc(e.target.value)} className="w-full border px-4 py-2 rounded">
            <option value="">-- wybierz --</option>
            <option value="gotówka">Gotówka</option>
            <option value="przelew">Przelew</option>
          </select>
        </div>

        <div>
          <label className="block font-medium">Kierowca</label>
          <select value={kierowcaId} onChange={(e) => setKierowcaId(e.target.value)} className="w-full border px-4 py-2 rounded">
            <option value="">-- wybierz kierowcę --</option>
            {kierowcy.map((k) => (
              <option key={k.id} value={k.id}>{k.imie} {k.nazwisko}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-medium">Dni trasy</label>
          <div className="flex flex-wrap gap-2">
            {wszystkieDni.map(({ label, value }) => (
              <label key={value} className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={dniTygodnia.includes(value)}
                  onChange={() => toggleDzien(value)}
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        {error && <div className="text-red-600">{error}</div>}
        {success && <div className="text-green-600">{success}</div>}

        <div className="flex gap-4">
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Dodaj sklep</button>
          <button type="button" onClick={() => router.push('/admin/sklepy')} className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400">Anuluj</button>
        </div>
      </form>
    </div>
  )
}
