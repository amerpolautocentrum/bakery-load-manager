'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/supabaseClient'
import { v4 as uuidv4 } from 'uuid'

export default function NowyMagazyn() {
  const [produkty, setProdukty] = useState([])
  const [kierowcy, setKierowcy] = useState([])
  const [wybranyKierowca, setWybranyKierowca] = useState('')
  const [lista, setLista] = useState<{ produkt_id: string; waga: string }[]>([])

  useEffect(() => {
    const fetchDane = async () => {
      const { data: prod } = await supabase.from('produkty').select('*')
      setProdukty(prod || [])

      const { data: kier } = await supabase.from('kierowcy').select('id, imie, nazwisko')
      setKierowcy(kier || [])
    }

    fetchDane()
  }, [])

  const dodajProdukt = () => {
    setLista([...lista, { produkt_id: '', waga: '' }])
  }

  const zapiszMagazyn = async () => {
    const dzisiaj = new Date().toISOString().split('T')[0]

    const wpisy = lista.map(item => ({
      id: uuidv4(),
      produkt_id: item.produkt_id,
      waga: parseFloat(item.waga),
      data: dzisiaj,
      kierowca_id: wybranyKierowca,
      status: 'oczekuje_na_kierowce',
      zatwierdzony_przez_kierowce: false,
      zatwierdzony_przez_kontrolera: false,
    }))

    const { error } = await supabase.from('magazyn').insert(wpisy)

    if (error) {
      alert('Błąd zapisu: ' + error.message)
    } else {
      alert('Magazyn zapisany!')
      setLista([])
    }
  }

  return (
    <div className="p-4">
      <h2 className="text-xl mb-4">Nowy magazyn (produkcja)</h2>

      <select
        value={wybranyKierowca}
        onChange={(e) => setWybranyKierowca(e.target.value)}
        className="mb-4 border p-2"
      >
        <option value="">Wybierz kierowcę</option>
        {kierowcy.map((k: any) => (
          <option key={k.id} value={k.id}>
            {k.imie} {k.nazwisko}
          </option>
        ))}
      </select>

      {lista.map((item, index) => (
        <div key={index} className="flex gap-2 mb-2">
          <select
            value={item.produkt_id}
            onChange={(e) => {
              const nowaLista = [...lista]
              nowaLista[index].produkt_id = e.target.value
              setLista(nowaLista)
            }}
            className="border p-2"
          >
            <option value="">Wybierz produkt</option>
            {produkty.map((p: any) => (
              <option key={p.id} value={p.id}>{p.nazwa}</option>
            ))}
          </select>
          <input
            type="number"
            step="0.001"
            placeholder="Waga"
            value={item.waga}
            onChange={(e) => {
              const nowaLista = [...lista]
              nowaLista[index].waga = e.target.value
              setLista(nowaLista)
            }}
            className="border p-2 w-24"
          />
        </div>
      ))}

      <button onClick={dodajProdukt} className="bg-gray-200 px-4 py-2 rounded mr-2">Dodaj</button>
      <button onClick={zapiszMagazyn} className="bg-blue-500 text-white px-4 py-2 rounded">Zapisz magazyn</button>
    </div>
  )
}
