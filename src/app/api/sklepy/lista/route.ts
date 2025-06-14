import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/types/supabase'

export async function GET() {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookies() })
    const { data, error } = await supabase
      .from('sklepy')
      .select('id, nazwa')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Błąd pobierania sklepów:', error.message)
      return NextResponse.json({ error: 'Nie udało się pobrać sklepów.' }, { status: 500 })
    }

    return NextResponse.json({ sklepy: data })
  } catch (err) {
    console.error('Błąd serwera:', err)
    return NextResponse.json({ error: 'Wystąpił błąd serwera.' }, { status: 500 })
  }
}
