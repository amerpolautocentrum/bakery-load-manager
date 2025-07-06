'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/supabaseClient'
import { 
  LineChart, 
  BarChart,
  KpiCard 
} from '@/components/analytics' // Nowe komponenty do dodania

type ProduktAnaliza = {
  produkt_id: string
  nazwa: string
  wyprodukowano: number
  sprzedano: number
  roznica: number
  zysk: number
  zwroty: number // Nowe pole
  marza: number // Nowe pole
}

export default function AnalizaProdukcji() {
  const [analiza, setAnaliza] = useState<ProduktAnaliza[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'7dni' | '30dni' | '90dni'>('30dni')

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase
        .rpc('analiza_produkcji_sprzedazy', {
          okres: timeRange
        })
        .select(`
          produkt_id,
          nazwa,
          wyprodukowano,
          sprzedano,
          roznica,
          zysk,
          zwroty,
          marza
        `)
      
      setAnaliza(data || [])
      setLoading(false)
    }
    fetchData()
  }, [timeRange])

  if (loading) return <div className="p-6 text-center">Ładowanie analizy...</div>

  // Oblicz metryki podsumowujące
  const sumaZysku = analiza.reduce((sum, item) => sum + (item.zysk || 0), 0)
  const sredniaMarza = analiza.length > 0 
    ? analiza.reduce((sum, item) => sum + item.marza, 0) / analiza.length 
    : 0

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Analiza produkcyjno-sprzedażowa</h1>
      
      {/* Kontrolki filtrowania */}
      <div className="flex gap-4">
        <select 
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as any)}
          className="border p-2 rounded"
        >
          <option value="7dni">Ostatnie 7 dni</option>
          <option value="30dni">Ostatnie 30 dni</option>
          <option value="90dni">Ostatnie 90 dni</option>
        </select>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard 
          title="Całkowity zysk" 
          value={`${sumaZysku.toFixed(2)} zł`} 
          trend={sumaZysku > 0 ? 'up' : 'down'}
        />
        <KpiCard 
          title="Średnia marża" 
          value={`${sredniaMarza.toFixed(1)}%`}
          trend={sredniaMarza > 30 ? 'up' : 'down'}
        />
        <KpiCard 
          title="Wskaźnik zwrotów" 
          value={`${analiza.length > 0 
            ? (analiza.reduce((sum, item) => sum + item.zwroty, 0) / 
               analiza.reduce((sum, item) => sum + item.sprzedano, 0) * 100).toFixed(1)
            : 0}%`}
        />
      </div>

      {/* Wykresy */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-4">Sprzedaż vs produkcja</h3>
          <BarChart
            data={analiza}
            xKey="nazwa"
            bars={[
              { key: 'wyprodukowano', color: '#3b82f6', label: 'Wyprodukowano' },
              { key: 'sprzedano', color: '#10b981', label: 'Sprzedano' }
            ]}
          />
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-4">Marża produktów</h3>
          <LineChart
            data={analiza}
            xKey="nazwa"
            lineKey="marza"
            color="#8b5cf6"
            unit="%"
          />
        </div>
      </div>

      {/* Tabela szczegółowa */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-left">Produkt</th>
              <th className="p-3 text-left">Wyprodukowano</th>
              <th className="p-3 text-left">Sprzedano</th>
              <th className="p-3 text-left">Zwroty</th>
              <th className="p-3 text-left">Marża</th>
              <th className="p-3 text-left">Zysk</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {analiza.map((item) => (
              <tr key={item.produkt_id}>
                <td className="p-3">{item.nazwa}</td>
                <td className="p-3">{item.wyprodukowano}</td>
                <td className="p-3">{item.sprzedano}</td>
                <td className={`p-3 ${
                  item.zwroty > 0 ? 'text-red-600' : 'text-gray-500'
                }`}>
                  {item.zwroty || '-'}
                </td>
                <td className={`p-3 ${
                  item.marza > 30 ? 'text-green-600' : 'text-yellow-600'
                }`}>
                  {item.marza?.toFixed(1)}%
                </td>
                <td className={`p-3 ${
                  item.zysk > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {item.zysk?.toFixed(2)} zł
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}