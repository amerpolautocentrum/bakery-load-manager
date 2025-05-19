// src/app/(dashboard)/page.tsx
import Link from 'next/link'

export default function Dashboard() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-8">System Cukierni</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sekcja załadunków */}
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Załadunki</h2>
          <Link 
            href="/zaladunki"
            className="inline-block bg-blue-600 text-white px-4 py-2 rounded mb-4"
          >
            Utwórz nowy załadunek
          </Link>
          <Link 
            href="/zaladunki/historia"
            className="block text-blue-600 hover:underline"
          >
            Historia załadunków →
          </Link>
        </div>

        {/* Sekcja WZ */}
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Dokumenty WZ</h2>
          <Link 
            href="/wz"
            className="inline-block bg-green-600 text-white px-4 py-2 rounded mb-4"
          >
            Utwórz nowy WZ
          </Link>
          <Link 
            href="/wz/historia"
            className="block text-green-600 hover:underline"
          >
            Historia WZ →
          </Link>
        </div>
      </div>
    </div>
  )
}