'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/supabaseClient'
import { useRouter } from 'next/navigation'

export default function ListaSieciPage() {
  const [sieci, setSieci] = useState<any[]>([])
  const [info, setInfo] = useState('')
  const router = useRouter()

  useEffect(() => {
    const fetchSieci = async () => {
      const { data, error } = await supabase.from('sieci').select('*')
      if (data) setSieci(data)
    }

    fetchSieci()
  }, [])

  const usunSiec = async (id: string) => {
    if (!confirm('Czy na pewno chcesz usunąć tę sieć?')) return

    const { error } = await supabase.from('sieci').delete().eq('id', id)

    if (error) {
      setInfo('Błąd usuwania: ' + error.message)
    } else {
      setSieci(prev => prev.filter(s => s.id !== id))
      setInfo('Sieć została usunięta.')
    }
  }

  return (
    <div className="p-8">
      <button
        onClick={() => router.push('/admin/sklepy')}
        className="mb-6 text-blue-600 hover:underline"
      >
        ← Powrót do sklepów
      </button>

      <h1 className="text-2xl font-bold mb-4">Lista sieci</h1>

      {info && <p className="text-sm mb-4 text-red-600">{info}</p>}

      <ul className="space-y-2">
        {sieci.map((siec) => (
          <li
            key={siec.id}
            className="p-4 bg-white border rounded shadow flex justify-between items-center"
          >
            <span>{siec.nazwa}</span>
            <button
              onClick={() => usunSiec(siec.id)}
              className="text-red-600 hover:underline"
            >
              Usuń
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
