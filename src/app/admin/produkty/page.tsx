'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'


interface Produkt {
  id: string
  nazwa: string
  typ: 'ciasto' | 'drobnica'
}

export default function ListaProduktowPage() {
  const [produkty, setProdukty] = useState<Produkt[]>([])
  const [blad, setBlad] = useState('')
  const [nazwa, setNazwa] = useState('')
  const [typ, setTyp] = useState<'ciasto' | 'drobnica'>('ciasto')
  const [info, setInfo] = useState('')

  const fetchProdukty = async () => {
    try {
      const res = await fetch('/api/produkty/lista')
      const data = await res.json()

      if (!res.ok) {
        setBlad(data.error || 'Nie udało się pobrać listy.')
        return
      }

      setProdukty(data.produkty)
    } catch (err) {
      console.error(err)
      setBlad('Błąd połączenia z serwerem.')
    }
  }

  useEffect(() => {
    fetchProdukty()
  }, [])

  const handleDodajProdukt = async () => {
    setBlad('')
    setInfo('')

    try {
      const res = await fetch('/api/produkty/dodaj', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nazwa, typ })
      })

      const wynik = await res.json()

      if (!res.ok) {
        setBlad(wynik.error || 'Nie udało się dodać produktu.')
        return
      }

      setInfo('Produkt dodany pomyślnie.')
      setNazwa('')
      setTyp('ciasto')
      fetchProdukty()
    } catch (err) {
      console.error(err)
      setBlad('Błąd połączenia z serwerem.')
    }
  }

  const handleUsunProdukt = async (id: string) => {
    if (!confirm('Czy na pewno chcesz usunąć ten produkt?')) return

    try {
      const res = await fetch('/api/produkty/usun', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      })

      const wynik = await res.json()

      if (!res.ok) {
        setBlad(wynik.error || 'Nie udało się usunąć produktu.')
        return
      }

      setInfo('Produkt usunięty.')
      fetchProdukty()
    } catch (err) {
      console.error(err)
      setBlad('Błąd połączenia z serwerem.')
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white shadow rounded">
        <Link href="/dashboard" className="inline-block mb-4 text-blue-600 hover:underline">
  ← Powrót do menu
</Link>

      <h1 className="text-2xl font-bold mb-4">Produkty cukierni</h1>

      {/* Formularz dodawania */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Dodaj nowy produkt</h2>

        {blad && <p className="text-red-600 mb-2">{blad}</p>}
        {info && <p className="text-green-600 mb-2">{info}</p>}

        <input
          placeholder="Nazwa produktu"
          value={nazwa}
          onChange={(e) => setNazwa(e.target.value)}
          className="mb-2 w-full p-2 border rounded"
        />
        <select
          value={typ}
          onChange={(e) => setTyp(e.target.value as 'ciasto' | 'drobnica')}
          className="mb-4 w-full p-2 border rounded"
        >
          <option value="ciasto">Ciasto</option>
          <option value="drobnica">Drobnica</option>
        </select>
        <button
          onClick={handleDodajProdukt}
          className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
        >
          Dodaj produkt
        </button>
      </div>

      {/* Lista produktów */}
      <table className="w-full table-auto border">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-4 py-2">Nazwa</th>
            <th className="border px-4 py-2">Typ</th>
            <th className="border px-4 py-2">Akcje</th>
          </tr>
        </thead>
        <tbody>
          {produkty.map(produkt => (
            <tr key={produkt.id}>
              <td className="border px-4 py-2">{produkt.nazwa}</td>
              <td className="border px-4 py-2 capitalize">{produkt.typ}</td>
              <td className="border px-4 py-2 text-center">
                <button
                  onClick={() => handleUsunProdukt(produkt.id)}
                  className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                >
                  Usuń
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
