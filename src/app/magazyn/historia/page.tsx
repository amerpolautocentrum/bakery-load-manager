'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/supabaseClient'
import Link from 'next/link'

export default function HistoriaMagazynow() {
  const [historia, setHistoria] = useState<Record<string, string[]>>({})
  const [kierowcaId, setKierowcaId] = useState<string>('')

  useEffect(() => {
    const fetchHistoria = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user?.id) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('kierowca_id')
        .eq('id', user.id)
        .single()

      if (!profile?.kierowca_id) return

      setKierowcaId(profile.kierowca_id)

      const { data } = await supabase
        .from('magazyn')
        .select('data')
        .eq('kierowca_id', profile.kierowca_id)
        .eq('zatwierdzony_przez_kierowce', true)
        .order('data', { ascending: false })

      if (!data) return

      const posortowane: Record<string, string[]> = {}

      data.forEach((item) => {
        const dzien = item.data
        if (!dzien) return
        const [rok, miesiac] = dzien.split('-')
        const klucz = `${rok}-${miesiac}`

        if (!posortowane[klucz]) posortowane[klucz] = []
        if (!posortowane[klucz].includes(dzien)) {
          posortowane[klucz].push(dzien)
        }
      })

      setHistoria(posortowane)
    }

    fetchHistoria()
  }, [])

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Historia magazynów</h1>
      {Object.entries(historia).map(([miesiac, dni]) => (
        <div key={miesiac} className="mb-6">
          <h2 className="text-lg font-semibold mb-2">{miesiac}</h2>
          <ul className="list-disc pl-6 space-y-1">
            {dni.map((dzien) => (
              <li key={dzien}>
                <Link href={`/magazyn/historia/${dzien}___${kierowcaId}`} className="text-blue-600 hover:underline">
                  {dzien}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
