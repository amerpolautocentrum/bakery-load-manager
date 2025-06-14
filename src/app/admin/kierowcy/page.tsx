'use client'

import Link from 'next/link'

export default function ListaKierowcowPanel() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Zarządzaj kierowcami</h1>

      <div className="space-y-3">
        <Link
          href="/admin/kierowcy/dodaj"
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 block"
        >
          ➕ Dodaj kierowcę
        </Link>

        <Link
          href="/admin/kierowcy/historia-magazynow"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 block"
        >
          📦 Historia magazynów
        </Link>

        <Link
          href="/admin/kierowcy/historia-wz"
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 block"
        >
          📄 Historia WZ
        </Link>

        <Link
          href="/admin/kierowcy/lista"
          className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 block"
        >
          👤 Lista kierowców (edycja / usuwanie)
        </Link>
      </div>
    </div>
  )
}
