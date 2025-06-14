// app/magazyn/historia/[slug]/page.tsx
'use server'

import { cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/supabase'
import { notFound } from 'next/navigation'

export default async function Page({ params }: { params: { slug: string } }) {
  const cookieStore = cookies()
  const supabase = createServerComponentClient<Database>({ cookies: () => cookieStore })

  const slug = decodeURIComponent(params.slug)
  const [data, kierowcaId] = slug.split('___')

  if (!data || !kierowcaId) notFound()

  // Pobierz wpisy z magazynu
  const { data: wpisy, error } = await supabase
    .from('magazyn')
    .select('waga, produkt_id, produkty(nazwa, typ)')
    .eq('kierowca_id', kierowcaId)
    .eq('data', data)

  if (error || !wpisy || wpisy.length === 0) {
    return <div className="p-4 text-red-500">Nie znaleziono danych</div>
  }

  // Pobierz imię kierowcy
  const { data: kierowca } = await supabase
    .from('kierowcy')
    .select('imie')
    .eq('id', kierowcaId)
    .single()

  const ciasta: Record<string, number> = {}
  const drobnica: Record<string, number> = {}

  wpisy.forEach((w) => {
    const nazwa = w.produkty?.nazwa || 'Nieznane'
    const typ = w.produkty?.typ || 'ciasto'
    if (typ === 'ciasto') {
      ciasta[nazwa] = (ciasta[nazwa] || 0) + 1
    } else {
      drobnica[nazwa] = (drobnica[nazwa] || 0) + 1
    }
  })

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">Magazyn z dnia {data}</h1>
      <p className="text-gray-700">Kierowca: {kierowca?.imie || 'Nieznany'}</p>

      <div>
        <h2 className="text-lg font-semibold mt-4 mb-2">Ciasta:</h2>
        <ul className="list-disc pl-6">
          {Object.entries(ciasta).map(([nazwa, ilosc]) => (
            <li key={nazwa}>{nazwa} – {ilosc} szt.</li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="text-lg font-semibold mt-4 mb-2">Drobnica:</h2>
        <ul className="list-disc pl-6">
          {Object.entries(drobnica).map(([nazwa, ilosc]) => (
            <li key={nazwa}>{nazwa} – {ilosc} szt.</li>
          ))}
        </ul>
      </div>

      <div className="mt-6 font-semibold">
        Podsumowanie: {Object.values(ciasta).reduce((a, b) => a + b, 0)} ciast, {Object.values(drobnica).reduce((a, b) => a + b, 0)} drobnicy
      </div>
    </div>
  )
}
