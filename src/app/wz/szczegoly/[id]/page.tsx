'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/supabaseClient'

export default function SzczegolyWZ() {
  const params = useParams()
  const [dokument, setDokument] = useState<any>(null)
  const [sklepNazwa, setSklepNazwa] = useState('')
  const [kierowcaNazwa, setKierowcaNazwa] = useState('')

  useEffect(() => {
    const fetchDane = async () => {
      const { data, error } = await supabase
        .from('wz_dokumenty')
        .select('*')
        .eq('id', params.id)
        .single()

      if (error) {
        console.error('Błąd pobierania dokumentu:', error)
        return
      }

      setDokument(data)

      // Pobierz nazwę sklepu
      const { data: sklepData } = await supabase
        .from('sklepy')
        .select('nazwa')
        .eq('id', data.id_sklepu)
        .single()
      setSklepNazwa(sklepData?.nazwa || 'Nieznany sklep')

      // Pobierz nazwę kierowcy
      const { data: kierowcaData } = await supabase
        .from('kierowcy')
        .select('imie, nazwisko')
        .eq('id', data.id_kierowcy)
        .single()
      setKierowcaNazwa(`${kierowcaData?.imie} ${kierowcaData?.nazwisko}` || 'Nieznany kierowca')
    }

    fetchDane()
  }, [params.id])

  if (!dokument) {
    return <div>Ładowanie danych...</div>
  }

  const parsedPozycje = JSON.parse(dokument.pozycje)

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">WZ z dnia {dokument.data}</h1>
      <div className="mb-6 border p-4 rounded bg-gray-50">
        <p><strong>Sklep:</strong> {sklepNazwa}</p>
        <p><strong>Kierowca:</strong> {kierowcaNazwa}</p>
        <p><strong>Forma płatności:</strong> {dokument.forma_platnosci}</p>
      </div>

      {/* Pozycje */}
      <table className="min-w-full border-collapse mb-6">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-4 py-2">Nazwa</th>
            <th className="border px-4 py-2">Waga (kg)</th>
            <th className="border px-4 py-2">Cena/kg</th>
            <th className="border px-4 py-2">Netto</th>
            <th className="border px-4 py-2">VAT</th>
            <th className="border px-4 py-2">Brutto</th>
          </tr>
        </thead>
        <tbody>
          {parsedPozycje.map((p: any, index: number) => (
            <tr key={index} className="hover:bg-gray-50">
              <td className="border px-4 py-2">{p.nazwa}</td>
              <td className="border px-4 py-2 text-right">{p.waga.toFixed(3)}</td>
              <td className="border px-4 py-2 text-right">{p.cenaZaKg.toFixed(2)} zł</td>
              <td className="border px-4 py-2 text-right">{p.netto.toFixed(2)} zł</td>
              <td className="border px-4 py-2 text-right">{p.vat.toFixed(2)} zł</td>
              <td className="border px-4 py-2 text-right">{p.brutto.toFixed(2)} zł</td>
            </tr>
          ))}

          <tr className="bg-gray-100 font-semibold">
            <td colSpan={3}>Podsumowanie</td>
            <td className="text-right">{dokument.suma_netto} zł</td>
            <td className="text-right">{dokument.suma_vat} zł</td>
            <td className="text-right">{dokument.suma_brutto} zł</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}