'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/supabaseClient'

type Kierowca = {
  id: string
  imie: string
  nazwisko: string
}

export default function ListaKierowcowSprzedaz() {
  const [kierowcy, setKierowcy] = useState<Kierowca[]>([])

  useEffect(() => {
    const fetchKierowcy = async () => {
      const { data, error } = await supabase
        .from('kierowcy')
        .select('id, imie, nazwisko')
        .order('nazwisko', { ascending: true })

      if (!error && data) {
        setKierowcy(data)
      }
    }

    fetchKierowcy()
  }, [])

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Wybierz kierowcę – raport sprzedaży</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {kierowcy.map((kierowca) => (
          <Link
            key={kierowca.id}
            href={`/admin/raporty/sprzedaz/${kierowca.id}`}
            className="block p-4 bg-white shadow rounded hover:bg-gray-100"
          >
            {kierowca.imie} {kierowca.nazwisko}
          </Link>
        ))}
      </div>
    </div>
  )
}
