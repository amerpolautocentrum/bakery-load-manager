'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/supabaseClient'
import { format } from 'date-fns'

export default function PromocjePage() {
  const [produkty, setProdukty] = useState([])
  const [sieci, setSieci] = useState([])
  const [promocje, setPromocje] = useState([])
  const [formData, setFormData] = useState({
    produkt_id: '',
    siec_id: '',
    cena_promocyjna: '',
    data_start: '',
    data_koniec: ''
  })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        const [{ data: produktyData }, { data: sieciData }, { data: promocjeData }] = await Promise.all([
          supabase.from('produkty').select('*'),
          supabase.from('sieci').select('*'),
          supabase.from('promocje_cen').select('*, produkty(nazwa), sieci(nazwa)').order('created_at', { ascending: false })
        ])

        setProdukty(produktyData || [])
        setSieci(sieciData || [])
        setPromocje(promocjeData || [])
      } catch (err) {
        setError('Błąd podczas ładowania danych')
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const dodajPromocje = async (e) => {
    e.preventDefault()
    setError('')
    
    // Walidacja
    if (!formData.produkt_id || !formData.siec_id || !formData.cena_promocyjna || 
        !formData.data_start || !formData.data_koniec) {
      return setError('Wypełnij wszystkie pola')
    }

    if (new Date(formData.data_koniec) <= new Date(formData.data_start)) {
      return setError('Data końca musi być późniejsza niż data startu')
    }

    setIsLoading(true)
    
    try {
      const { data, error } = await supabase.from('promocje_cen').insert([{
        produkt_id: formData.produkt_id,
        siec_id: formData.siec_id,
        cena_promocyjna: parseFloat(formData.cena_promocyjna),
        data_start: formData.data_start,
        data_koniec: formData.data_koniec
      }]).select('*, produkty(nazwa), sieci(nazwa)')

      if (error) throw error

      // Aktualizacja listy promocji
      setPromocje([data[0], ...promocje])
      
      // Reset formularza
      setFormData({
        produkt_id: '',
        siec_id: '',
        cena_promocyjna: '',
        data_start: '',
        data_koniec: ''
      })

    } catch (err) {
      setError(`Błąd: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading && promocje.length === 0) {
    return <div className="p-4 text-center">Ładowanie danych...</div>
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Zarządzanie promocjami</h1>

      {/* Formularz dodawania promocji */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-xl font-semibold mb-4">Dodaj nową promocję</h2>
        
        {error && <div className="text-red-500 mb-4 p-2 bg-red-50 rounded">{error}</div>}

        <form onSubmit={dodajPromocje} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Produkt</label>
            <select
              name="produkt_id"
              value={formData.produkt_id}
              onChange={handleInputChange}
              className="w-full border p-2 rounded"
              required
            >
              <option value="">Wybierz produkt</option>
              {produkty.map((p) => (
                <option key={p.id} value={p.id}>{p.nazwa}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Sieć</label>
            <select
              name="siec_id"
              value={formData.siec_id}
              onChange={handleInputChange}
              className="w-full border p-2 rounded"
              required
            >
              <option value="">Wybierz sieć</option>
              {sieci.map((s) => (
                <option key={s.id} value={s.id}>{s.nazwa}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Cena promocyjna</label>
            <input
              type="number"
              name="cena_promocyjna"
              step="0.01"
              min="0"
              value={formData.cena_promocyjna}
              onChange={handleInputChange}
              className="w-full border p-2 rounded"
              placeholder="np. 19.99"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Data rozpoczęcia</label>
            <input
              type="date"
              name="data_start"
              value={formData.data_start}
              onChange={handleInputChange}
              className="w-full border p-2 rounded"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Data zakończenia</label>
            <input
              type="date"
              name="data_koniec"
              value={formData.data_koniec}
              onChange={handleInputChange}
              className="w-full border p-2 rounded"
              required
            />
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? 'Dodawanie...' : 'Dodaj promocję'}
            </button>
          </div>
        </form>
      </div>

      {/* Lista promocji */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <h2 className="text-xl font-semibold p-4 border-b">Lista promocji</h2>
        
        {promocje.length === 0 ? (
          <p className="p-4 text-center text-gray-500">Brak promocji</p>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-left">Produkt</th>
                <th className="p-3 text-left">Sieć</th>
                <th className="p-3 text-left">Cena promocyjna</th>
                <th className="p-3 text-left">Okres ważności</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {promocje.map((p) => (
                <tr key={p.id}>
                  <td className="p-3">{p.produkty?.nazwa || '-'}</td>
                  <td className="p-3">{p.sieci?.nazwa || '-'}</td>
                  <td className="p-3">{p.cena_promocyjna?.toFixed(2)} zł</td>
                  <td className="p-3">
                    {format(new Date(p.data_start), 'dd.MM.yyyy')} - {format(new Date(p.data_koniec), 'dd.MM.yyyy')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}