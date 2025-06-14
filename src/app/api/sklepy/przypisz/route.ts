import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/types/supabase'

export async function POST(req: Request) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookies() })
    const body = await req.json()

    const { kierowca_id, sklep_id, dni_tygodnia } = body

    if (!kierowca_id || !sklep_id || !Array.isArray(dni_tygodnia)) {
      return NextResponse.json({ error: 'Wymagane ID kierowcy, ID sklepu i lista dni tygodnia.' }, { status: 400 })
    }

    const { error } = await supabase
      .from('kierowcy_sklepy')
      .insert([{ kierowca_id, sklep_id, dni_tygodnia }])

    if (error) {
      console.error('Błąd przypisywania sklepu:', error.message)
      return NextResponse.json({ error: `Nie udało się przypisać sklepu: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({ message: 'Sklep przypisany do kierowcy.' })
  } catch (err) {
    console.error('Błąd serwera:', err)
    return NextResponse.json({ error: 'Błąd serwera podczas przypisywania.' }, { status: 500 })
  }
}
