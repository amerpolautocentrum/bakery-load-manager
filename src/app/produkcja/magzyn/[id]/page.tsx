'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/supabaseClient'
import { v4 as uuidv4 } from 'uuid'

interface Produkt {
  id: string
  nazwa: string
}

interface MagazynPozycja {
  produkt_id: string
  waga: string
}

export default function ProdukcjaMagazynFormularz() {
  const params = useParams()
  const router = useRouter()
  const kierowcaId = params.id as string

  const [produkty, setProdukty] = useState<Produkt[]>([])
  const [pozycje, setPozycje] = useState<MagazynPozycja[]>([])
  const [nowaPozycja, setNowaPozycja] = useState<MagazynPozycja>({ produkt_id: '', waga: '1.000' })
  const [isSaving, setIsSaving] = useState(false)

  const dzisiaj = new Date().toISOString().split('T')[0]

  useEffect(() => {
    const fetchData = async () => {
      const { data: produktyData } = await supabase.from('produkty').select('*')
      setProdukty(produktyData || [])
    }

    fetchData()
  }, [])

  const handleDodajPozycje = () => {
    if (!nowaPozycja.produkt_id || parseFloat(nowaPozycja.waga) <= 0) return
    setPozycje([...pozycje, nowaPozycja])
    setNowaPozycja({ produkt_id: '', waga: '1.000' })
  }

  const handleUsun = (index: number) => {
    setPozycje(pozycje.filter((_, i) => i !== index))
  }

  const handleZapisz = async () => {
    if (!pozycje.length) return
    setIsSaving(true)

    const nowaWersja = uuidv4()
    const rekordy = pozycje.map(p => ({
      id: uuidv4(),
      produkt_id: p.produkt_id,
      waga: parseFloat(p.waga),
      data: dzisiaj,
      kierowca_id: kierowcaId,
      czy_uzyte: false,
      wersja: nowaWersja,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      edycja: false
    }))

    await supabase.from('magazyn').delete().eq('data', dzisiaj).eq('kierowca_id', kierowcaId)
    const { error } = await supabase.from('magazyn').insert(rekordy)
    if (!error) router.push('/produkcja/magazyn')
    else alert('Błąd zapisu')
    setIsSaving(false)
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-4 text-center">Załadunek – krok 2</h1>

      <div className="bg-white rounded shadow p-4 mb-4 space-y-3">
        <div>
          <label className="block mb-1">Ciasto</label>
          <select
            value={nowaPozycja.produkt_id}
            onChange={e => setNowaPozycja({ ...nowaPozycja, produkt_id: e.target.value })}
            className="w-full p-2 border rounded"
          >
            <option value="">-- wybierz --</option>
            {produkty.map(p => (
              <option key={p.id} value={p.nazwa}>{p.nazwa}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block mb-1">Waga (kg)</label>
          <input
            type="number"
            min="0.001"
            step="0.001"
            value={nowaPozycja.waga}
            onChange={e => setNowaPozycja({ ...nowaPozycja, waga: e.target.value })}
            className="w-full p-2 border rounded"
          />
        </div>

        <button
          onClick={handleDodajPozycje}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          Dodaj pozycję
        </button>
      </div>

      <div className="bg-white rounded shadow p-4 mb-4">
        <h2 className="font-semibold mb-2">Twój załadunek:</h2>
        {pozycje.length === 0 ? (
          <p className="text-gray-500">Brak pozycji</p>
        ) : (
          <ul className="space-y-2">
            {pozycje.map((p, index) => (
              <li key={index} className="flex justify-between items-center border-b py-1">
                <span>{p.produkt_id} – {p.waga} kg</span>
                <button
                  onClick={() => handleUsun(index)}
                  className="text-red-500 text-sm hover:underline"
                >
                  Usuń
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        onClick={handleZapisz}
        disabled={isSaving || pozycje.length === 0}
        className={`w-full py-2 rounded text-white ${
          isSaving || pozycje.length === 0 ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'
        }`}
      >
        {isSaving ? 'Zapisywanie...' : 'Zapisz załadunek'}
      </button>
    </div>
  )
}
