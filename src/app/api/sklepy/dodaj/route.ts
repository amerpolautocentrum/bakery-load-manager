import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/types/supabase'

export async function POST(req: Request) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })
    const {
      nazwa,
      ulica,
      miejscowosc,
      kod_pocztowy,
      kontakt,
      osoba_decyzyjna,
      siec,
      platnosc,
      kierowca_id,
      dni_tygodnia
    } = await req.json()

    // Walidacja wymaganych pól
    if (
      !nazwa?.trim() ||
      !ulica?.trim() ||
      !miejscowosc?.trim() ||
      !kod_pocztowy?.trim()
    ) {
      return NextResponse.json(
        { error: 'Wymagana nazwa sklepu i pełny adres.' },
        { status: 400 }
      )
    }

    // Wstawienie nowego sklepu
    const { data: insertData, error } = await supabase.from('sklepy').insert([
      {
        nazwa: nazwa.trim(),
        ulica: ulica.trim(),
        miejscowosc: miejscowosc.trim(),
        kod_pocztowy: kod_pocztowy.trim(),
        kontakt: kontakt?.trim() || null,
        osoba_decyzyjna: osoba_decyzyjna?.trim() || null,
        siec: siec?.trim() || null,
        platnosc: platnosc || null,
        kierowca_id: kierowca_id || null,
        dni_tygodnia: dni_tygodnia || null
      }
    ]).select('id') // zwróć id dodanego sklepu

    if (error) {
      console.error('Błąd dodawania sklepu:', error.message)
      return NextResponse.json(
        { error: `Nie udało się dodać sklepu: ${error.message}` },
        { status: 500 }
      )
    }

    // Automatyczne przypisanie do kierowcy (jeśli dane są dostępne)
    if (kierowca_id && dni_tygodnia && insertData && insertData[0]?.id) {
      const przypisanie = await supabase
        .from('kierowcy_sklepy')
        .insert([
          {
            kierowca_id,
            sklep_id: insertData[0].id,
            dni_tygodnia
          }
        ])

      if (przypisanie.error) {
        console.error('Błąd przypisania sklepu do kierowcy:', przypisanie.error.message)
        // ale nie przerywamy operacji – sam sklep już został dodany
      }
    }

    return NextResponse.json({ message: 'Sklep dodany i przypisany pomyślnie.' })
  } catch (err) {
    console.error('Błąd ogólny:', err)
    return NextResponse.json(
      { error: 'Wystąpił błąd serwera.' },
      { status: 500 }
    )
  }
}
