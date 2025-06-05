'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/supabaseClient'

export default function SzczegolyWZ() {
  const params = useParams()
  const [dokument, setDokument] = useState<any>(null)
  const [sklepNazwa, setSklepNazwa] = useState('Ładowanie...')
  const [kierowcaNazwa, setKierowcaNazwa] = useState('Ładowanie...')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchDane = async () => {
      try {
        setLoading(true)
        
        // Pobierz dokument
        const { data, error: docError } = await supabase
          .from('wz_dokumenty')
          .select('*')
          .eq('id', params.id)
          .single()

        if (docError) throw docError
        if (!data) throw new Error('Dokument nie znaleziony')

        setDokument(data)

        // Pobierz nazwę sklepu
        const { data: sklepData, error: sklepError } = await supabase
          .from('sklepy')
          .select('nazwa')
          .eq('id', data.id_sklepu)
          .single()

        setSklepNazwa(sklepError ? 'Błąd ładowania' : sklepData?.nazwa || 'Nieznany sklep')

        // Pobierz nazwę kierowcy
        const { data: kierowcaData, error: kierowcaError } = await supabase
          .from('kierowcy')
          .select('imie, nazwisko')
          .eq('id', data.kierowca_id)  // Używamy kierowca_id zamiast id_kierowcy
          .single()

        setKierowcaNazwa(
          kierowcaError 
            ? 'Błąd ładowania' 
            : `${kierowcaData?.imie || ''} ${kierowcaData?.nazwisko || ''}`.trim() || 'Nieznany kierowca'
        )

      } catch (err) {
        console.error('Błąd pobierania danych:', err)
        setError('Wystąpił błąd podczas ładowania danych')
      } finally {
        setLoading(false)
      }
    }

    fetchDane()
  }, [params.id])

  const getSafePozycje = () => {
    try {
      if (!dokument?.pozycje) return []
      return typeof dokument.pozycje === 'string' 
        ? JSON.parse(dokument.pozycje) 
        : dokument.pozycje
    } catch (e) {
      console.error('Błąd parsowania pozycji:', e)
      return []
    }
  }

  if (loading) return <div className="p-6 text-center">Ładowanie danych...</div>
  if (error) return <div className="p-6 text-red-600">{error}</div>
  if (!dokument) return <div className="p-6">Dokument nie znaleziony</div>

  const pozycje = getSafePozycje()

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">WZ z dnia {new Date(dokument.data).toLocaleDateString()}</h1>
      
      <div className="mb-6 border p-4 rounded bg-gray-50">
        <p><strong>Numer WZ:</strong> {dokument.numer || 'Brak numeru'}</p>
        <p><strong>Sklep:</strong> {sklepNazwa}</p>
        <p><strong>Kierowca:</strong> {kierowcaNazwa}</p>
        <p><strong>Forma płatności:</strong> {dokument.forma_platnosci || 'Nie określono'}</p>
      </div>

      {pozycje.length > 0 ? (
        <table className="min-w-full border-collapse mb-6">
          {/* ... istniejąca implementacja tabeli ... */}
        </table>
      ) : (
        <div className="text-center py-4 text-gray-500">Brak danych pozycji</div>
      )}
    </div>
  )
}