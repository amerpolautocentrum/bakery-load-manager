// app/wz/historia/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/supabaseClient'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function HistoriaWZ() {
  const router = useRouter()
  const [wzList, setWZList] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        
        // Pobierz aktualnego użytkownika
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        // Pobierz profile użytkownika
        const { data: profile } = await supabase
          .from('profiles')
          .select('kierowca_id')
          .eq('id', user.id)
          .single()

        if (!profile?.kierowca_id) {
          throw new Error('Nie znaleziono kierowcy')
        }

        // Pobierz WZ dla kierowcy
        const { data: wzData, error } = await supabase
          .from('wz_dokumenty')
          .select(`
            id,
            numer_wz,
            data,
            sklep_id,
            sklepy:sklep_id (nazwa),
            status
          `)
          .eq('kierowca_id', profile.kierowca_id)
          .order('data', { ascending: false })

        if (error) throw error
        setWZList(wzData || [])
      } catch (error) {
        console.error('Błąd:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  if (isLoading) {
    return (
      <div className="p-4 flex justify-center items-center h-64">
        <div className="text-center">
          <p className="text-lg">Ładowanie historii...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold">Historia dokumentów WZ</h1>
        <Link href="/wz" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Nowy WZ
        </Link>
      </div>

      {wzList.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">Brak dokumentów WZ w historii</p>
        </div>
      ) : (
        <div className="border rounded overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left p-3">Numer WZ</th>
                <th className="text-left p-3">Data</th>
                <th className="text-left p-3">Sklep</th>
                <th className="text-left p-3">Status</th>
                <th className="text-right p-3">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {wzList.map((wz) => (
                <tr key={wz.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">{wz.numer_wz}</td>
                  <td className="p-3">{new Date(wz.data).toLocaleDateString()}</td>
                  <td className="p-3">{wz.sklepy?.nazwa || wz.sklep_id}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      wz.status === 'zapisany' ? 'bg-green-100 text-green-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {wz.status === 'zapisany' ? 'Zakończony' : 'W trakcie'}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <Link 
                      href={`/wz/podglad/${wz.id}`} 
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Podgląd
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}