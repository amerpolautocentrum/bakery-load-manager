import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/types/supabase'

export async function POST(req: Request) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })
    const body = await req.json()

    console.log('Odebrany body:', body)

    const { nazwa, typ } = body

    if (!nazwa?.trim() || !typ?.trim()) {
      return NextResponse.json({ error: 'Wymagana nazwa i typ produktu.' }, { status: 400 })
    }

    if (!['ciasto', 'drobnica'].includes(typ)) {
      return NextResponse.json({ error: 'Nieprawidłowy typ produktu (dozwolone: ciasto, drobnica).' }, { status: 400 })
    }

    const { error } = await supabase
      .from('produkty')
      .insert([{ nazwa: nazwa.trim(), typ }])

    if (error) {
      console.error('Błąd dodawania produktu:', error.message)
      return NextResponse.json({ error: `Nie udało się dodać produktu: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({ message: 'Produkt dodany pomyślnie.' })
  } catch (err) {
    console.error('Błąd ogólny:', err)
    return NextResponse.json({ error: 'Wystąpił błąd serwera.' }, { status: 500 })
  }
}
