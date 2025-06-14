'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Sklep {
  id: string
  nazwa: string
}

interface Kierowca {
  id: string
  imie: string
  nazwisko: string | null
}

const DNI_TYGODNIA = [
  'poniedziałek',
  'wtorek',
  'środa',
  'czwartek',
  'piątek',
  'sobota',
  'niedziela',
]

export default function PrzypiszSklep() {
  const router = useRouter()
  const [sklepy, setSklepy] = useState<Sklep[]>([])
  const [kierowcy, setKierowcy] = useState<Kierowca[]>([])

  const [sklepId, setSklepId] = useState('')
  const [kierowcaId, setKierowcaId] = useState('')
  const [dni, setDni] = useState<string[]>([])

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      const sklepyRes = await fetch('/api/sklepy/lista')
      const kierowcyRes = await fetch('/api/kierowcy/lista')
      const sklepyData = await sklepyRes.json()
      const kierowcyData = await kierowcyRes.json()

      setSklepy(sklepyData.sklepy || [])
      setKierowcy(kierowcyData.kierowcy || [])
    }

    fetchData()
  }, [])

  const toggleDzien = (dzien: string) => {
    setDni(prev =>
      prev.includes(dzien)
        ? prev.filter(d => d !== dzien)
        : [...prev, dzien]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    const res = await fetch('/api/sklepy/przypisz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kierowca_id: kierowcaId,
        sklep_id: sklepId,
        dni_tygodnia: dni,
      }),
    })

    const result = await res.json()

    if (!res.ok) {
      setError(result.error || 'Błąd przypisywania sklepu.')
    } else {
      setSuccess('Sklep przypisany do kierowcy.')
      setTimeout(() => router.push('/admin/sklepy'), 1500)
    }
  }

  return (
    <div className="max-w-xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Przypisz sklep do kierowcy</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block font-medium mb-1">Wybierz kierowcę</label>
          <select
            value={kierowcaId}
            onChange={(e) => setKierowcaId(e.target.value)}
            className="w-full border px-4 py-2 rounded"
            required
          >
            <option value="">-- wybierz --</option>
            {kierowcy.map((k) => (
              <option key={k.id} value={k.id}>
                {k.imie} {k.nazwisko}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-medium mb-1">Wybierz sklep</label>
          <select
            value={sklepId}
            onChange={(e) => setSklepId(e.target.value)}
            className="w-full border px-4 py-2 rounded"
            required
          >
            <option value="">-- wybierz --</option>
            {sklepy.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nazwa}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-medium mb-1">Dni tygodnia</label>
          <div className="flex flex-wrap gap-2">
            {DNI_TYGODNIA.map((dzien) => (
              <label key={dzien} className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={dni.includes(dzien)}
                  onChange={() => toggleDzien(dzien)}
                />
                {dzien}
              </label>
            ))}
          </div>
        </div>

        {error && <div className="text-red-600">{error}</div>}
        {success && <div className="text-green-600">{success}</div>}

        <div className="flex gap-4">
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Zapisz przypisanie
          </button>
          <button
            type="button"
            onClick={() => router.push('/admin/sklepy')}
            className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
          >
            Anuluj
          </button>
        </div>
      </form>
    </div>
  )
}
