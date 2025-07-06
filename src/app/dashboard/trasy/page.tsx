// app/dashboard/trasy/page.tsx
'use client'

import Link from 'next/link'

const dniTygodnia = [
  { slug: '1', label: 'Poniedziałek' },
  { slug: '2', label: 'Wtorek' },
  { slug: '3', label: 'Środa' },
  { slug: '4', label: 'Czwartek' },
  { slug: '5', label: 'Piątek' },
  { slug: '6', label: 'Sobota' },
  { slug: '7', label: 'Niedziela' },
]


export default function TrasyPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Twoje trasy</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {dniTygodnia.map((dzien) => (
          <Link
            key={dzien.slug}
            href={`/dashboard/trasy/${dzien.slug}`}
            className="bg-indigo-100 hover:bg-indigo-200 text-indigo-800 font-semibold py-3 px-4 rounded shadow text-center transition"
          >
            {dzien.label}
          </Link>
        ))}
      </div>
    </div>
  )
}
