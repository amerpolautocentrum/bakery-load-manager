'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/supabaseClient'

export default function SklepyLista() {
  const [pokazFormularzSieci, setPokazFormularzSieci] = useState(false)
  const [nazwaNowejSieci, setNazwaNowejSieci] = useState('')
  const [info, setInfo] = useState('')
  const router = useRouter()

  const dodajSiec = async () => {
    if (!nazwaNowejSieci.trim()) {
      setInfo('Podaj nazwę sieci.')
      return
    }

    const { error } = await supabase.from('sieci').insert({ nazwa: nazwaNowejSieci })

    if (error) {
      setInfo('Błąd zapisu: ' + error.message)
    } else {
      setInfo('Sieć dodana pomyślnie.')
      setNazwaNowejSieci('')
      setPokazFormularzSieci(false)
    }
  }

  return (
    <div className="p-8">
      <button
        onClick={() => router.push('/dashboard')}
        className="mb-6 text-blue-600 hover:underline"
      >
        ← Powrót do panelu głównego
      </button>

      <h1 className="text-2xl font-bold mb-6">Sklepy</h1>

      <div className="flex gap-4 mb-6 flex-wrap">
        <Link
          href="/admin/sklepy/dodaj"
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          ➕ Dodaj nowy sklep
        </Link>

        <Link
          href="/admin/sklepy/lista"
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          📋 Lista sklepów
        </Link>

        <Link
          href="/admin/sieci/lista"
          className="bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600"
        >
          🏬 Lista sieci
        </Link>

        <button
          onClick={() => setPokazFormularzSieci(prev => !prev)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          ➕ Dodaj sieć
        </button>
      </div>

      {pokazFormularzSieci && (
        <div className="mb-6 p-4 border rounded bg-gray-50">
          <label className="block font-medium mb-1">Nazwa nowej sieci:</label>
          <input
            type="text"
            value={nazwaNowejSieci}
            onChange={(e) => setNazwaNowejSieci(e.target.value)}
            className="w-full border px-3 py-2 rounded mb-2"
          />
          <button
            onClick={dodajSiec}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Zapisz sieć
          </button>
          {info && <p className="mt-2 text-sm">{info}</p>}
        </div>
      )}
    </div>
  )
}
