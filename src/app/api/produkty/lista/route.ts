// app/api/produkty/lista/route.ts
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/types/supabase'

export async function GET() {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })
    const { data, error } = await supabase
      .from('produkty')
      .select('id, nazwa, typ')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Błąd pobierania produktów:', error.message)
      return NextResponse.json({ error: 'Nie udało się pobrać produktów.' }, { status: 500 })
    }

    return NextResponse.json({ produkty: data })
  } catch (err) {
    console.error('Błąd serwera:', err)
    return NextResponse.json({ error: 'Wystąpił błąd serwera.' }, { status: 500 })
  }
}
