
'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/supabaseClient'
import Link from 'next/link'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface Sklep {
  id: string
  nazwa: string
  adres: string
  miejscowosc: string
  kolejnosc: number
}

const dzienMap: Record<string, string> = {
  '1': 'Poniedziałek',
  '2': 'Wtorek',
  '3': 'Środa',
  '4': 'Czwartek',
  '5': 'Piątek',
  '6': 'Sobota',
  '7': 'Niedziela',
}

function SortableSklep({
  sklep,
  obsłużony,
  onClick,
}: {
  sklep: Sklep
  obsłużony: boolean
  onClick: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: sklep.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      style={style}
      className={`rounded-lg p-4 text-center shadow transition relative ${
        obsłużony
          ? 'bg-green-100 text-green-800 border border-green-300'
          : 'bg-white text-black border border-gray-300 hover:bg-gray-100'
      }`}
    >
      {/* Przeciąganie tylko za uchwyt */}
      <div
        {...listeners}
        className="absolute left-2 top-2 text-xl cursor-grab select-none"
        title="Przeciągnij"
      >
        ≡
      </div>

      {/* Reszta klikalna */}
      <div onClick={onClick} className="cursor-pointer">
        <div className="font-semibold text-sm">
          {sklep.nazwa}
          <span className="block text-xs text-gray-500">{sklep.miejscowosc}</span>
        </div>
        {obsłużony && <div className="text-xs mt-1 italic">Obsłużony</div>}
      </div>
    </div>
  )
}


export default function TrasaDniaPage() {
  const params = useParams()
  const dzien = params?.dzien as string
  const [sklepy, setSklepy] = useState<Sklep[]>([])
  const [zaladowane, setZaladowane] = useState(false)
  const [wybranySklep, setWybranySklep] = useState<Sklep | null>(null)
  const [obsłużoneSklepy, setObsłużoneSklepy] = useState<string[]>([])

  const today = new Date().toISOString().slice(0, 10)

  const sensors = useSensors(useSensor(PointerSensor))

  useEffect(() => {
    const fetchSklepy = async () => {
      const { data: userData } = await supabase.auth.getUser()
      const kierowcaId = userData?.user?.id
      if (!kierowcaId) return

      const { data, error } = await supabase
        .from('kierowcy_sklepy')
        .select('kolejnosc, sklep_id, sklepy(nazwa, ulica, kod_pocztowy, miejscowosc)')
        .eq('kierowca_id', kierowcaId)
        .contains('dni_tygodnia', [dzien])
        .order('kolejnosc', { ascending: true })

      if (error) {
        console.error('Błąd pobierania sklepów:', error)
        return
      }

      const sklepyZmapowane = data.map((item) => ({
        id: item.sklep_id,
        nazwa: item.sklepy.nazwa,
        adres: `${item.sklepy.ulica || ''}, ${item.sklepy.kod_pocztowy || ''} ${item.sklepy.miejscowosc || ''}`,
        miejscowosc: item.sklepy.miejscowosc || '',
        kolejnosc: item.kolejnosc,
      }))

      setSklepy(sklepyZmapowane)

      const { data: wizyty, error: wErr } = await supabase
        .from('odbyte_wizyty')
        .select('sklep_id')
        .eq('kierowca_id', kierowcaId)
        .eq('data', today)

      if (wErr) console.error('Błąd pobierania wizyt:', wErr)
      if (wizyty) setObsłużoneSklepy(wizyty.map((w) => w.sklep_id))

      setZaladowane(true)
    }

    fetchSklepy()
  }, [dzien])

  const handleZakonczWizyte = async (sklepId: string) => {
    const { data: userData } = await supabase.auth.getUser()
    const kierowcaId = userData?.user?.id
    if (!kierowcaId) return

    const { error } = await supabase.from('odbyte_wizyty').insert({
      kierowca_id: kierowcaId,
      sklep_id: sklepId,
      data: today,
    })

    if (!error) {
      setObsłużoneSklepy((prev) => [...prev, sklepId])
      setWybranySklep(null)
    } else {
      console.error('Błąd zapisu wizyty:', error)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
  const { active, over } = event

  if (active.id !== over?.id) {
    const oldIndex = sklepy.findIndex((sklep) => sklep.id === active.id)
    const newIndex = sklepy.findIndex((sklep) => sklep.id === over?.id)

    const noweSklepy = arrayMove(sklepy, oldIndex, newIndex)
    setSklepy(noweSklepy)

    // Zapisz nową kolejność do Supabase
    const { data: userData } = await supabase.auth.getUser()
    const kierowcaId = userData?.user?.id
    if (!kierowcaId) return

    const aktualizacje = noweSklepy.map((sklep, index) => ({
      sklep_id: sklep.id,
      kierowca_id: kierowcaId,
      kolejnosc: index + 1,
    }))

    for (const u of aktualizacje) {
      await supabase
        .from('kierowcy_sklepy')
        .update({ kolejnosc: u.kolejnosc })
        .eq('kierowca_id', u.kierowca_id)
        .eq('sklep_id', u.sklep_id)
    }
  }
}

  if (!zaladowane) return <p className="p-4">Ładowanie tras...</p>

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Trasa na: {dzienMap[dzien] || dzien}</h1>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sklepy.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
            {sklepy.map((sklep) => (
              <SortableSklep
                key={sklep.id}
                sklep={sklep}
                obsłużony={obsłużoneSklepy.includes(sklep.id)}
                onClick={() => setWybranySklep(sklep)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {wybranySklep && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-sm">
            <h2 className="text-lg font-bold mb-2">{wybranySklep.nazwa}</h2>
            <p className="text-sm text-gray-600 mb-4">{wybranySklep.adres}</p>

            <div className="flex flex-col gap-2">
              <Link
                href={`/wz?sklep_id=${wybranySklep.id}`}
                className="bg-green-600 text-white py-2 rounded text-center hover:bg-green-700"
              >
                Wystaw WZ
              </Link>

              <Link
                href={`/kp/nowy?sklep_id=${wybranySklep.id}`}
                className="bg-yellow-500 text-white py-2 rounded text-center hover:bg-yellow-600"
              >
                Wystaw KP
              </Link>

              <button
                onClick={() => handleZakonczWizyte(wybranySklep.id)}
                className="bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
              >
                Zakończ wizytę
              </button>

              <button
                onClick={() => setWybranySklep(null)}
                className="text-gray-500 text-sm mt-2 underline"
              >
                Anuluj
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
