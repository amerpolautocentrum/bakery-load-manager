'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/supabaseClient'

type DokumentWZ = {
  id: string
  data: string
  numer_wz: string | null
  wartosc_brutto: number | null
  status: string | null
}

export default function HistoriaWZ() {
  const { id } = useParams()
  const [dokumenty, setDokumenty] = useState<DokumentWZ[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase
        .from('wz_dokumenty')
        .select('id, data, numer_wz, wartosc_brutto, status')
        .eq('kierowca_id', id)
        .order('data', { ascending: false })

      if (error) {
        console.error('Błąd pobierania danych:', error)
      } else {
        setDokumenty(data || [])
      }
      setLoading(false)
    }

    fetchData()
  }, [id])

  if (loading) return <div className="p-6">Ładowanie dokumentów WZ...</div>

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">📄 Historia dokumentów WZ</h1>

      {dokumenty.length === 0 ? (
        <p>Brak dokumentów WZ dla tego kierowcy.</p>
      ) : (
        <ul className="space-y-4">
          {dokumenty.map(doc => (
            <li key={doc.id} className="border p-4 rounded shadow">
              <div><strong>Data:</strong> {new Date(doc.data).toLocaleDateString()}</div>
              <div><strong>Numer WZ:</strong> {doc.numer_wz || '–'}</div>
              <div><strong>Status:</strong> {doc.status || '–'}</div>
              <div><strong>Wartość brutto:</strong> {doc.wartosc_brutto?.toFixed(2) || '0.00'} zł</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
