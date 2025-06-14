import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, password, imie, nazwisko, telefon } = body

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // 🔐 Utworzenie konta użytkownika
    const { data: userResult, error: userError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'kierowca' }
    })

    if (userError || !userResult?.user?.id) {
      return NextResponse.json(
        { error: 'Nie udało się utworzyć konta: ' + userError?.message },
        { status: 400 }
      )
    }

    const userId = userResult.user.id

    // 🧾 Sprawdzenie czy profil już istnieje
    const profileCheck = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single()

    if (profileCheck.data !== null) {
      console.warn('Profil już istniał, ale kontynuuję.')
    } else {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: userId,
        login: email,
        role: 'kierowca_id',
        imie,
        nazwisko
      })

      if (profileError) {
        return NextResponse.json(
          { error: 'Błąd przy zapisie do profiles: ' + profileError.message },
          { status: 400 }
        )
      }
    }

    // 🚚 Dodanie kierowcy do tabeli kierowcy
    const { data: kierowcaData, error: kierowcaError } = await supabase
      .from('kierowcy')
      .insert({
        id: userId,
        imie,
        nazwisko,
        telefon
      })
      .select()
      .single()

    if (kierowcaError || !kierowcaData) {
      return NextResponse.json(
        { error: 'Błąd przy zapisie do kierowcy: ' + kierowcaError?.message },
        { status: 400 }
      )
    }

    // ✅ Uzupełnienie kierowca_id w profiles
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ kierowca_id: kierowcaData.id })
      .eq('id', userId)

    if (updateError) {
      return NextResponse.json(
        { error: 'Błąd przy aktualizacji profiles: ' + updateError.message },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Błąd serwera:', err)
    return NextResponse.json(
      { error: 'Błąd serwera: ' + err.message },
      { status: 500 }
    )
  }
}
