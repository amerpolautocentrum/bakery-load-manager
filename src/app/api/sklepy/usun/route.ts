import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/types/supabase'

export async function DELETE(req: Request) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookies() })
    const { id } = await req.json()

    if (!id) {
      return NextResponse.json({ error: 'Brak ID sklepu.' }, { status: 400 })
    }

    const { error } = await supabase
      .from('sklepy')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Błąd usuwania sklepu:', error.message)
      return NextResponse.json({ error: `Nie udało się usunąć sklepu: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({ message: 'Sklep usunięty pomyślnie.' })
  } catch (err) {
    console.error('Błąd ogólny:', err)
    return NextResponse.json({ error: 'Błąd serwera podczas usuwania.' }, { status: 500 })
  }
}
