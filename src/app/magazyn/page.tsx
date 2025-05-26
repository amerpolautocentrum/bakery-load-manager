'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/supabaseClient'

interface Kierowca {
  id: string
  imie: string
  nazwisko: string
}

export default function Magazyn() {
  const [dzisiejszyMagazyn, setDzisiejszyMagazyn] = useState<any[]>([])
  const [kierowca, setKierowca] = useState<Kierowca | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchDane = async () => {
      setIsLoading(true)
      try {
        const dzisiaj = new Date().toISOString().split('T')[0]
        
        // Pobierz dzisiejszy magazyn
        const { data: magazynData } = await supabase
          .from('magazyn')
          .select('*')
          .eq('data', dzisiaj)
          .eq('czy_uzyte', false)

        if (magazynData && magazynData.length > 0) {
          setDzisiejszyMagazyn(magazynData)
          
          // Pobierz dane kierowcy
          const { data: kierowcaData } = await supabase
            .from('kierowcy')
            .select('*')
            .eq('id', magazynData[0].kierowca_id)
            .single()

          setKierowca(kierowcaData)
        }
      } catch (error) {
        console.error('Błąd:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchDane()
  }, [])

  // Grupuj produkty
  const grupowaneProdukty = dzisiejszyMagazyn.reduce((acc, item) => {
    if (!acc[item.produkt_id]) {
      acc[item.produkt_id] = {
        nazwa: item.produkt_id,
        ilosc: 0,
        waga: item.waga
      }
    }
    acc[item.produkt_id].ilosc += 1
    return acc
  }, {})

  if (isLoading) {
    return <div className="p-6 text-center">Ładowanie...</div>
  }

  return (
    <main className="p-4 max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-4">Magazyn</h1>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <Link
          href="/magazyn/nowy"
          className="bg-green-600 text-white text-center py-2 px-3 rounded-md hover:bg-green-700"
        >
          {dzisiejszyMagazyn.length > 0 ? 'Edytuj' : 'Nowy'}
        </Link>
        <Link
          href="/magazyn/historia"
          className="bg-blue-600 text-white text-center py-2 px-3 rounded-md hover:bg-blue-700"
        >
          Historia
        </Link>
      </div>

      {dzisiejszyMagazyn.length > 0 && kierowca && (
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <h2 className="font-semibold mb-2">Dzisiejszy magazyn</h2>
          <div className="mb-3">
            <p className="text-sm">
              <span className="font-medium">Kierowca:</span> {kierowca.imie} {kierowca.nazwisko}
            </p>
            <p className="text-sm">
              <span className="font-medium">Data:</span> {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="font-semibold mb-3">Zawartość</h2>
        
        {Object.keys(grupowaneProdukty).length > 0 ? (
          <div className="space-y-3">
            {Object.values(grupowaneProdukty).map((produkt: any) => (
              <div key={produkt.nazwa} className="border rounded-md p-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">{produkt.nazwa}</h3>
                  <span className="text-sm bg-gray-100 px-2 py-1 rounded">
                    {produkt.ilosc} szt. × {produkt.waga} kg
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">
            {dzisiejszyMagazyn.length > 0 ? 'Brak ciast w magazynie' : 'Brak dzisiejszego magazynu'}
          </p>
        )}
      </div>
    </main>
  )
}