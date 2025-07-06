// app/admin/raporty/kp/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/supabaseClient'
import Link from 'next/link'

type Kierowca = {
  id: string
  imie: string
  nazwisko: string
}

export default function ListaKierowcowKP() {
  const [kierowcy, setKierowcy] = useState<Kierowca[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (!user || userError) {
        alert('Brak dostępu – zaloguj się.')
        window.location.href = '/login'
        return
      }

      const { data, error } = await supabase
        .from('kierowcy')
        .select('id, imie, nazwisko')
        .order('nazwisko', { ascending: true })

      if (!error && data) {
        setKierowcy(data)
      }

      setLoading(false)
    }

    fetchData()
  }, [])

  if (loading) return <div className="p-6 text-center">Ładowanie...</div>

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Raporty KP – Wybierz kierowcę</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {kierowcy.map(k => (
          <Link key={k.id} href={`/admin/raporty/kp/${k.id}`} className="block">
            <div className="border p-4 rounded-lg shadow hover:bg-gray-50 transition cursor-pointer">
              <h2 className="text-lg font-medium">{k.imie} {k.nazwisko}</h2>
              <p className="text-sm text-gray-500">Zobacz raport KP</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
