'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DodajKierowcePage() {
  const [email, setEmail] = useState('')
  const [haslo, setHaslo] = useState('')
  const [imie, setImie] = useState('')
  const [nazwisko, setNazwisko] = useState('')
  const [telefon, setTelefon] = useState('')
  const [blad, setBlad] = useState('')
  const router = useRouter()

  const handleDodaj = async () => {
    setBlad('')

    try {
      const res = await fetch('/api/kierowcy/dodaj', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password: haslo,
          imie,
          nazwisko,
          telefon
        })
      })

      const wynik = await res.json()

      if (!res.ok) {
        setBlad(wynik.error || 'Nieznany błąd')
        return
      }

      router.push('/admin/kierowcy')
    } catch (err) {
      console.error('Błąd:', err)
      setBlad('Błąd połączenia z serwerem.')
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white shadow rounded">
      <h1 className="text-xl font-bold mb-4">Dodaj kierowcę</h1>

      {blad && <p className="text-red-600 mb-4">{blad}</p>}

      <input placeholder="Imię" value={imie} onChange={e => setImie(e.target.value)} className="mb-2 w-full p-2 border rounded" />
      <input placeholder="Nazwisko" value={nazwisko} onChange={e => setNazwisko(e.target.value)} className="mb-2 w-full p-2 border rounded" />
      <input placeholder="Telefon" value={telefon} onChange={e => setTelefon(e.target.value)} className="mb-2 w-full p-2 border rounded" />
      <input placeholder="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} className="mb-2 w-full p-2 border rounded" />
      <input placeholder="Hasło" type="password" value={haslo} onChange={e => setHaslo(e.target.value)} className="mb-4 w-full p-2 border rounded" />

      <button
        onClick={handleDodaj}
        className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
      >
        Dodaj kierowcę
      </button>
    </div>
  )
}
