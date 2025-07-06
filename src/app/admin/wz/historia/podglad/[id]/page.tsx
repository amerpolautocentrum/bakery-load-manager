'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/supabaseClient'
import Link from 'next/link'

export default function PodgladWZAdmin({ params }: { params: { id: string } }) {
  const [wz, setWz] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchWZ = async () => {
      const { data } = await supabase
        .from('wz_dokumenty')
        .select(`
          *,
          kierowcy(imie, nazwisko),
          sklepy(nazwa, adres),
          produkty:produkty_wz(produkt_id, ilosc, cena_jednostkowa, produkty(nazwa))
        `)
        .eq('id', params.id)
        .single()

      setWz(data)
      setLoading(false)
    }
    fetchWZ()
  }, [params.id])

  if (loading) return <div className="p-4">Ładowanie dokumentu...</div>
  if (!wz) return <div className="p-4">Dokument nie znaleziony</div>

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold">Dokument WZ {wz.numer_wz}</h1>
          <p className="text-gray-600">
            Data: {new Date(wz.data).toLocaleDateString()} | 
            Kierowca: {wz.kierowcy?.imie} {wz.kierowcy?.nazwisko} | 
            Sklep: {wz.sklepy?.nazwa}
          </p>
        </div>
        <Link 
          href="/admin/wz/historia"
          className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
        >
          Powrót
        </Link>
      </div>

      {/* ... reszta kodu tak jak wcześniej ... */}
    </div>
  )
}