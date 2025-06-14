import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/types/supabase'

export async function DELETE(req: Request) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })
    const { id } = await req.json()

    if (!id) {
      return NextResponse.json({ error: 'Brak ID produktu.' }, { status: 400 })
    }

    const { error } = await supabase
      .from('produkty')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Błąd usuwania:', error.message)
      return NextResponse.json({ error: `Nie udało się usunąć produktu: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({ message: 'Produkt usunięty pomyślnie.' })
  } catch (err) {
    console.error('Błąd ogólny:', err)
    return NextResponse.json({ error: 'Błąd serwera podczas usuwania.' }, { status: 500 })
  }
}
