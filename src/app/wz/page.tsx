// app/wz/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/supabaseClient'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function WZFormularz() {
  const router = useRouter()
  const [produkty, setProdukty] = useState<any[]>([])
  const [magazyn, setMagazyn] = useState<any[]>([])
  const [produktyGrupowane, setProduktyGrupowane] = useState<any>({})
  const [wybrane, setWybrane] = useState<any[]>([])
  const [wybraneProdukty, setWybraneProdukty] = useState<any[]>([])
  const [wybranyProdukt, setWybranyProdukt] = useState('')
  const [sklepy, setSklepy] = useState<any[]>([])
  const [dzisSklepy, setDzisiejszeSklepy] = useState<any[]>([])
  const [sklep, setSklep] = useState('')
  const [kierowcaId, setKierowcaId] = useState<string>('')
  const [ceny, setCeny] = useState<any[]>([])
  const [formaPlatnosci, setFormaPlatnosci] = useState('przelew')
  const [zwrotyCiasta, setZwrotyCiasta] = useState<{id: string, produktId: string, waga: number, cena: number}[]>([])
  const [zwrotyDrobnica, setZwrotyDrobnica] = useState<{id: string, waga: number, cena: number}[]>([])
  const [nowyZwrot, setNowyZwrot] = useState({
    typ: 'ciasto',
    waga: 0,
    cena: 0,
    produktId: ''
  })

  // Pobierz wszystkie dane przy ładowaniu
  useEffect(() => {
    const fetchAll = async () => {
      const session = await supabase.auth.getSession()
      const userId = session.data.session?.user.id
      const { data: profile } = await supabase.from('profiles').select('kierowca_id').eq('id', userId!).single()
      const kierowca_id = profile?.kierowca_id
      setKierowcaId(kierowca_id)

      const dzienTyg = new Date().getDay() // 0 = niedziela, 1 = poniedziałek...

      const { data: sklepyData, error: sklepyError } = await supabase
  .from('kierowcy_sklepy')
  .select(`
    sklep_id,
    sklepy:sklep_id (
      id,
      nazwa,
      ulica,
      miejscowosc
    ),
    dni_tygodnia
  `)
  .eq('kierowca_id', kierowca_id);

if (sklepyError) {
  console.error('Błąd pobierania sklepów:', sklepyError);
  return;
}

const przetworzoneSklepy = sklepyData?.map((s: any) => ({
  id: s.sklep_id,
  nazwa: s.sklepy?.nazwa || `Sklep ${s.sklep_id}`,
  ulica: s.sklepy?.ulica,
  miejscowosc: s.sklepy?.miejscowosc
})) || [];

const dzisiejszeSklepy = przetworzoneSklepy.filter((s: any) => {
  const dzienTygodnia = new Date().getDay().toString();
  const przypisanySklep = sklepyData?.find((ss: any) => ss.sklep_id === s.id);
  return przypisanySklep?.dni_tygodnia?.includes(dzienTygodnia);
});

setSklepy(przetworzoneSklepy);
setDzisiejszeSklepy(dzisiejszeSklepy);

      const { data: produktyData } = await supabase.from('produkty').select('*')
      setProdukty(produktyData || [])

      const { data: cenyData } = await supabase.from('ceny').select('*')
      setCeny(cenyData || [])

      const today = new Date().toISOString().split('T')[0]
      const { data: magazynData } = await supabase
        .from('magazyn')
        .select('*')
        .eq('kierowca_id', kierowca_id)
        .eq('data', today)
        .eq('czy_uzyte', false)

      setMagazyn(magazynData || [])
      const grupowane: any = {}
      magazynData?.forEach((p) => {
        if (!grupowane[p.produkt_id]) grupowane[p.produkt_id] = []
        grupowane[p.produkt_id].push(p)
      })
      setProduktyGrupowane(grupowane)
    }
    fetchAll()
  }, [])

  // Generuj unikalny numer WZ
  const generujNumerWZ = async () => {
    const dzisiaj = new Date()
    const rok = dzisiaj.getFullYear()
    const miesiac = String(dzisiaj.getMonth() + 1).padStart(2, '0')
    
    const { data } = await supabase
      .from('wz_dokumenty')
      .select('numer_wz')
      .like('numer_wz', `WZ/${rok}/${miesiac}%`)
      .eq('kierowca_id', kierowcaId)
      .order('created_at', { ascending: false })
      .limit(1)

    const ostatniNumer = data?.[0]?.numer_wz
    const kolejnyNr = ostatniNumer 
      ? parseInt(ostatniNumer.split('/')[3]) + 1 
      : 1

    return `WZ/${rok}/${miesiac}/${String(kolejnyNr).padStart(3, '0')}`
  }

  // Dodaj produkt do WZ
  const dodajPozycje = (pozycja: any) => {
    setWybrane([...wybrane, pozycja])
    setProduktyGrupowane((prev: any) => {
      const kopia = { ...prev }
      kopia[pozycja.produkt_id] = kopia[pozycja.produkt_id].filter((p: any) => p.id !== pozycja.id)
      return kopia
    })
  }

  // Dodaj zwrot (ciasto/drobnica)
  const dodajZwrot = () => {
    const zwrot = {
      id: crypto.randomUUID(),
      waga: nowyZwrot.waga,
      cena: nowyZwrot.cena,
      produktId: nowyZwrot.produktId
    }

    if (nowyZwrot.typ === 'ciasto') {
      setZwrotyCiasta([...zwrotyCiasta, zwrot])
    } else {
      setZwrotyDrobnica([...zwrotyDrobnica, zwrot])
    }

    setNowyZwrot({ typ: 'ciasto', waga: 0, cena: 0, produktId: '' })
  }

  // Zapisz cały dokument WZ
  const zapiszWZ = async () => {
    if (!sklep || wybrane.length === 0) {
      alert('Wybierz sklep i dodaj produkty!')
      return
    }

    try {
      const numerWZ = await generujNumerWZ()

      // Oblicz kwoty
      const pozycje = wybrane.map(p => {
        const cena = ceny.find(c => c.produkt === p.produkt_id)?.cena_netto || 0
        const netto = p.waga * cena
        const vat = netto * 0.05
        const brutto = netto + vat
        return {
          id: p.id,
          produkt_id: p.produkt_id,
          nazwa: produkty.find(prod => prod.id === p.produkt_id)?.nazwa,
          waga: p.waga,
          cena_netto: cena,
          vat,
          brutto
        }
      })

      const sumaNetto = pozycje.reduce((sum, p) => sum + (p.waga * p.cena_netto), 0)
      const sumaVat = pozycje.reduce((sum, p) => sum + p.vat, 0)
      const sumaBrutto = pozycje.reduce((sum, p) => sum + p.brutto, 0)
      const zwrotyCiastaSuma = zwrotyCiasta.reduce((sum, z) => sum + (z.waga * z.cena), 0)
      const zwrotyDrobnicaSuma = zwrotyDrobnica.reduce((sum, z) => sum + (z.waga * z.cena), 0)
      const sumaZwrotow = zwrotyCiastaSuma + zwrotyDrobnicaSuma

      // Zapisz do Supabase
      const { data, error } = await supabase.from('wz_dokumenty').insert([{
        kierowca_id: kierowcaId,
        sklep_id: sklep,
        numer_wz: numerWZ,
        data: new Date().toISOString(),
        forma_platnosci: formaPlatnosci,
        pozycje: pozycje,
        produkty: wybrane.map(p => ({ id: p.id, produkt_id: p.produkt_id, waga: p.waga })),
        uzyte_ids: wybrane.map(p => p.id),
        wartosc_netto: sumaNetto,
        wartosc_vat: sumaVat,
        wartosc_brutto: sumaBrutto,
        zwroty_ciasta: -zwrotyCiastaSuma,
        zwroty_drobnica: -zwrotyDrobnicaSuma,
        do_zaplaty: sumaBrutto - sumaZwrotow,
        status: 'zapisany'
      }]).select()

      if (error) throw error

      // Oznacz produkty jako użyte
      await supabase
        .from('magazyn')
        .update({ czy_uzyte: true })
        .in('id', wybrane.map(p => p.id))

      // Przekieruj do podglądu
      router.push(`/wz/podglad/${data[0].id}`)
    } catch (error) {
      console.error('Błąd zapisu WZ:', error)
      alert('Wystąpił błąd!')
    }
  }

  // Pomocnicza funkcja do nazwy produktu
  const nazwaProduktu = (id: string) => {
    return produkty.find((p) => p.id === id)?.nazwa || id
  }

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-6">
      <h1 className="text-xl font-bold">Wystaw dokument WZ</h1>
      
      {/* Wybór sklepu */}
      <div>
        <label className="block text-sm font-medium">Sklep:</label>
        <select
          className="w-full border rounded p-2"
          value={sklep}
          onChange={(e) => setSklep(e.target.value)}
        >
          <option value="">-- wybierz --</option>
          {dzisSklepy.map((s) => (
            <option key={s.id} value={s.sklep_id}>
              {s.nazwa || s.sklep_id} (dzisiaj)
            </option>
          ))}
          {sklepy
            .filter((s) => !dzisSklepy.some((ds) => ds.sklep_id === s.sklep_id))
            .map((s) => (
              <option key={s.id} value={s.sklep_id}>
                {s.nazwa || s.sklep_id}
              </option>
            ))}
        </select>
      </div>

      {/* Wybór produktów */}
      <div>
        <label className="block text-sm font-medium">Produkty:</label>
        <select
          className="w-full border rounded p-2"
          value={wybranyProdukt}
          onChange={(e) => setWybranyProdukt(e.target.value)}
        >
          <option value="">-- wybierz --</option>
          {Object.keys(produktyGrupowane).map((id) => (
            <option key={id} value={id}>
              {nazwaProduktu(id)}
            </option>
          ))}
        </select>
      </div>

      {/* Lista dostępnych sztuk */}
      {wybranyProdukt && produktyGrupowane[wybranyProdukt]?.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {produktyGrupowane[wybranyProdukt].map((c: any) => (
            <button
              key={c.id}
              className="border rounded p-2 text-center text-sm hover:bg-blue-100"
              onClick={() => dodajPozycje(c)}
            >
              {parseFloat(c.waga).toFixed(3)} kg
            </button>
          ))}
        </div>
      )}

      {/* Wybrane pozycje */}
      {wybrane.length > 0 && (
        <div className="border p-4 rounded">
          <h2 className="font-semibold mb-2">Wybrane produkty:</h2>
          <ul className="space-y-2">
            {wybrane.map((c, i) => (
              <li key={i} className="flex justify-between">
                <span>
                  {nazwaProduktu(c.produkt_id)} – {parseFloat(c.waga).toFixed(3)} kg
                </span>
                <span className="font-medium">
                  {(c.waga * (ceny.find(cena => cena.produkt === c.produkt_id)?.cena_netto || 0)).toFixed(2)} zł
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Sekcja zwrotów */}
      <div className="border p-4 rounded space-y-4">
        <h2 className="font-semibold">Zwroty</h2>
        
        <div className="grid grid-cols-4 gap-2 items-end">
          <select
            value={nowyZwrot.typ}
            onChange={(e) => setNowyZwrot({...nowyZwrot, typ: e.target.value})}
            className="col-span-1 p-2 border rounded"
          >
            <option value="ciasto">Ciasto</option>
            <option value="drobnica">Drobnica</option>
          </select>

          {nowyZwrot.typ === 'ciasto' && (
            <select
              value={nowyZwrot.produktId}
              onChange={(e) => setNowyZwrot({...nowyZwrot, produktId: e.target.value})}
              className="col-span-1 p-2 border rounded"
            >
              <option value="">Produkt</option>
              {produkty.map(p => (
                <option key={p.id} value={p.id}>{p.nazwa}</option>
              ))}
            </select>
          )}

          <input
            type="number"
            step="0.001"
            placeholder="Waga (kg)"
            value={nowyZwrot.waga || ''}
            onChange={(e) => setNowyZwrot({...nowyZwrot, waga: parseFloat(e.target.value) || 0})}
            className="col-span-1 p-2 border rounded"
          />

          <input
            type="number"
            step="0.01"
            placeholder="Cena"
            value={nowyZwrot.cena || ''}
            onChange={(e) => setNowyZwrot({...nowyZwrot, cena: parseFloat(e.target.value) || 0})}
            className="col-span-1 p-2 border rounded"
          />
        </div>

        <button 
          onClick={dodajZwrot}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          disabled={!nowyZwrot.waga || (nowyZwrot.typ === 'ciasto' && !nowyZwrot.produktId)}
        >
          Dodaj zwrot
        </button>

        {/* Lista zwrotów ciast */}
        {zwrotyCiasta.length > 0 && (
          <div className="mt-4">
            <h3 className="font-medium">Zwroty ciast:</h3>
            <ul className="space-y-1">
              {zwrotyCiasta.map((z, i) => (
                <li key={i} className="flex justify-between">
                  <span>
                    {produkty.find(p => p.id === z.produktId)?.nazwa}: {z.waga.toFixed(3)} kg × {z.cena.toFixed(2)} zł
                  </span>
                  <span className="text-red-600">
                    -{(z.waga * z.cena).toFixed(2)} zł
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Lista zwrotów drobnicy */}
        {zwrotyDrobnica.length > 0 && (
          <div className="mt-4">
            <h3 className="font-medium">Zwroty drobnicy:</h3>
            <ul className="space-y-1">
              {zwrotyDrobnica.map((z, i) => (
                <li key={i} className="flex justify-between">
                  <span>
                    {z.waga.toFixed(3)} kg × {z.cena.toFixed(2)} zł
                  </span>
                  <span className="text-red-600">
                    -{(z.waga * z.cena).toFixed(2)} zł
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Forma płatności */}
      <div>
        <label className="block text-sm font-medium">Forma płatności:</label>
        <select
          className="w-full border rounded p-2"
          value={formaPlatnosci}
          onChange={(e) => setFormaPlatnosci(e.target.value)}
        >
          <option value="przelew">Przelew</option>
          <option value="gotówka">Gotówka</option>
        </select>
      </div>

      {/* Podsumowanie */}
      <div className="border p-4 rounded bg-gray-50">
        <h2 className="font-semibold mb-2">Podsumowanie</h2>
        <div className="space-y-1">
          <div className="flex justify-between">
            <span>Sprzedaż netto:</span>
            <span>
              {wybrane.reduce((sum, p) => {
                const cena = ceny.find(c => c.produkt === p.produkt_id)?.cena_netto || 0
                return sum + (p.waga * cena)
              }, 0).toFixed(2)} zł
            </span>
          </div>
          <div className="flex justify-between">
            <span>VAT (5%):</span>
            <span>
              {wybrane.reduce((sum, p) => {
                const cena = ceny.find(c => c.produkt === p.produkt_id)?.cena_netto || 0
                return sum + (p.waga * cena * 0.05)
              }, 0).toFixed(2)} zł
            </span>
          </div>
          <div className="flex justify-between font-medium">
            <span>Sprzedaż brutto:</span>
            <span>
              {wybrane.reduce((sum, p) => {
                const cena = ceny.find(c => c.produkt === p.produkt_id)?.cena_netto || 0
                return sum + (p.waga * cena * 1.05)
              }, 0).toFixed(2)} zł
            </span>
          </div>
          <div className="flex justify-between text-red-600">
            <span>Zwroty łącznie:</span>
            <span>
              -{[
                ...zwrotyCiasta.map(z => z.waga * z.cena),
                ...zwrotyDrobnica.map(z => z.waga * z.cena)
              ].reduce((sum, val) => sum + val, 0).toFixed(2)} zł
            </span>
          </div>
          <div className="flex justify-between border-t pt-2 font-bold">
            <span>Do zapłaty:</span>
            <span>
              {(
                wybrane.reduce((sum, p) => {
                  const cena = ceny.find(c => c.produkt === p.produkt_id)?.cena_netto || 0
                  return sum + (p.waga * cena * 1.05)
                }, 0) -
                [
                  ...zwrotyCiasta.map(z => z.waga * z.cena),
                  ...zwrotyDrobnica.map(z => z.waga * z.cena)
                ].reduce((sum, val) => sum + val, 0)
              ).toFixed(2)} zł
            </span>
          </div>
        </div>
      </div>

      {/* Przyciski akcji */}
      <div className="flex justify-end space-x-4">
        <Link href="/" className="px-4 py-2 border rounded hover:bg-gray-100">
          Anuluj
        </Link>
        <button
          onClick={zapiszWZ}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
          disabled={!sklep || wybrane.length === 0}
        >
          Zapisz WZ
        </button>
      </div>
    </div>
  )
}