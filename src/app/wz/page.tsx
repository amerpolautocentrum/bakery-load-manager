'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/supabaseClient'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// Stałe z ID produktów
const ID_SZARLOTKI = '093dba12-6f6a-4eea-8154-49b9b78a0d4f'
const ID_EKLERKI = 'f1c4cad1-3e12-4dea-841a-c1b4629166a9'

interface Zwrot {
  id: string
  typ: 'ciasto' | 'drobnica'
  waga: number
  cena_netto: number
  vat: number
  wartosc_netto: number
  wartosc_brutto: number
}

export default function WZFormularz() {
  const router = useRouter()
  const [produkty, setProdukty] = useState<any[]>([])
  const [magazyn, setMagazyn] = useState<any[]>([])
  const [ceny, setCeny] = useState<any[]>([])
  const [produktyGrupowane, setProduktyGrupowane] = useState<any>({})
  const [wybrane, setWybrane] = useState<any[]>([])
  const [wybranyProdukt, setWybranyProdukt] = useState('')
  const [sklepy, setSklepy] = useState<any[]>([])
  const [dzisSklepy, setDzisiejszeSklepy] = useState<any[]>([])
  const [sklep, setSklep] = useState('')
  const [kierowcaId, setKierowcaId] = useState<string>('')
  const [formaPlatnosci, setFormaPlatnosci] = useState('przelew')
  const [zwrotyCiasta, setZwrotyCiasta] = useState<Zwrot[]>([])
  const [zwrotyDrobnica, setZwrotyDrobnica] = useState<Zwrot[]>([])
  const [nowyZwrot, setNowyZwrot] = useState({
    typ: 'ciasto' as 'ciasto' | 'drobnica',
    waga: 0,
    cena_netto: 0,
    vat: 0.05,
    wartosc_netto: 0,
    wartosc_brutto: 0
  })

  
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const sklepIdFromUrl = urlParams.get('sklep_id')
    if (sklepIdFromUrl) {
      setSklep(sklepIdFromUrl || '')

    }
  }, [])

useEffect(() => {
    const fetchAll = async () => {
      const session = await supabase.auth.getSession()
      const userId = session.data.session?.user.id
      const { data: profile } = await supabase.from('profiles').select('kierowca_id').eq('id', userId!).single()
      const kierowca_id = profile?.kierowca_id
      setKierowcaId(kierowca_id)

      const { data: sklepyData } = await supabase
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
        .eq('kierowca_id', kierowca_id)

      const przetworzoneSklepy = sklepyData?.map((s: any) => ({
        id: s.sklep_id,
        nazwa: s.sklepy?.nazwa || `Sklep ${s.sklep_id}`,
        ulica: s.sklepy?.ulica,
        miejscowosc: s.sklepy?.miejscowosc
      })) || []

      const dzienTygodnia = new Date().getDay().toString()
      const dzisiejszeSklepy = przetworzoneSklepy.filter((s: any) => {
        const przypisanySklep = sklepyData?.find((ss: any) => ss.sklep_id === s.id)
        return przypisanySklep?.dni_tygodnia?.includes(dzienTygodnia)
      })

      setSklepy(przetworzoneSklepy)
      setDzisiejszeSklepy(dzisiejszeSklepy)

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

  // Ustaw domyślne ceny przy ładowaniu cen i zmianie typu
  useEffect(() => {
    if (ceny.length === 0) return
    
    const produktId = nowyZwrot.typ === 'ciasto' ? ID_SZARLOTKI : ID_EKLERKI
    const domyslnaCena = ceny.find(c => c.produkt === produktId)?.cena_netto || 0
    
    setNowyZwrot(prev => ({
      ...prev,
      cena_netto: domyslnaCena,
      wartosc_netto: prev.waga * domyslnaCena,
      wartosc_brutto: prev.waga * domyslnaCena * 1.05
    }))
  }, [nowyZwrot.typ, ceny])

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

  const dodajPozycje = (pozycja: any) => {
    setWybrane([...wybrane, pozycja])
    setProduktyGrupowane(prev => {
      const kopia = { ...prev }
      kopia[pozycja.produkt_id] = kopia[pozycja.produkt_id].filter((p: any) => p.id !== pozycja.id)
      return kopia
    })
  }

  const usunProdukt = (id: string) => {
    setWybrane(wybrane.filter(p => p.id !== id))
    const produkt = wybrane.find(p => p.id === id)
    if (produkt) {
      setProduktyGrupowane(prev => {
        const kopia = { ...prev }
        if (!kopia[produkt.produkt_id]) {
          kopia[produkt.produkt_id] = []
        }
        kopia[produkt.produkt_id].push(produkt)
        return kopia
      })
    }
  }

  const handleZwrotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    const numValue = parseFloat(value) || 0
    
    setNowyZwrot(prev => {
      const updated = {
        ...prev,
        [name]: numValue
      }
      
      if (name === 'waga' || name === 'cena_netto') {
        updated.wartosc_netto = updated.waga * updated.cena_netto
        updated.wartosc_brutto = updated.wartosc_netto * 1.05
      }
      
      return updated
    })
  }

  const dodajZwrot = () => {
    const zwrot: Zwrot = {
      id: crypto.randomUUID(),
      typ: nowyZwrot.typ,
      waga: nowyZwrot.waga,
      cena_netto: nowyZwrot.cena_netto,
      vat: 0.05,
      wartosc_netto: nowyZwrot.wartosc_netto,
      wartosc_brutto: nowyZwrot.wartosc_brutto
    }

    if (nowyZwrot.typ === 'ciasto') {
      setZwrotyCiasta([...zwrotyCiasta, zwrot])
    } else {
      setZwrotyDrobnica([...zwrotyDrobnica, zwrot])
    }

    setNowyZwrot({
      ...nowyZwrot,
      waga: 0,
      wartosc_netto: 0,
      wartosc_brutto: 0
    })
  }

  const usunZwrotCiasta = (id: string) => {
    setZwrotyCiasta(zwrotyCiasta.filter(z => z.id !== id))
  }

  const usunZwrotDrobnicy = (id: string) => {
    setZwrotyDrobnica(zwrotyDrobnica.filter(z => z.id !== id))
  }

  const zapiszWZ = async () => {
    if (!sklep || wybrane.length === 0) {
      alert('Wybierz sklep i dodaj produkty!')
      return
    }

    try {
      const numerWZ = await generujNumerWZ()
      const dzisiaj = new Date().toISOString().split('T')[0]

      const pozycje = wybrane.map(p => ({
        id: p.id,
        produkt_id: p.produkt_id,
        nazwa: produkty.find(prod => prod.id === p.produkt_id)?.nazwa,
        waga: p.waga,
        cena_netto: ceny.find(c => c.produkt === p.produkt_id)?.cena_netto || 0
      }))

      const sumaNetto = pozycje.reduce((sum, p) => sum + (p.waga * p.cena_netto), 0)
      const sumaVat = sumaNetto * 0.05
      const sumaBrutto = sumaNetto + sumaVat

      const sumaZwrotow = [
        ...zwrotyCiasta.map(z => z.wartosc_brutto),
        ...zwrotyDrobnica.map(z => z.wartosc_brutto)
      ].reduce((sum, val) => sum + val, 0)

      const { data, error } = await supabase
        .from('wz_dokumenty')
        .insert([{
          kierowca_id: kierowcaId,
          sklep_id: sklep,
          numer_wz: numerWZ,
          data: dzisiaj,
          forma_platnosci: formaPlatnosci,
          produkty: pozycje,
          zwroty_ciasta: zwrotyCiasta,
          zwroty_drobnica: zwrotyDrobnica,
          wartosc_netto: sumaNetto,
          wartosc_vat: sumaVat,
          wartosc_brutto: sumaBrutto,
          do_zaplaty: sumaBrutto - sumaZwrotow,
          status: 'zapisany'
        }])
        .select()

      if (error) throw error

      for (const produkt of wybrane) {
        const { error: updateError } = await supabase
          .from('magazyn')
          .update({
            czy_uzyte: true,
            wz_id: data[0].id,
            data_uzycia: new Date().toISOString()
          })
          .eq('id', produkt.id)

        if (updateError) {
          console.error('Nie udało się zaktualizować produktu:', produkt.id, updateError)
        }
      }
      const zapiszWZ = async () => {
  if (!sklep || wybrane.length === 0) {
    alert('Wybierz sklep i dodaj produkty!')
    return
  }

  const { data: userData } = await supabase.auth.getUser()
  const kierowcaId = userData.user?.id

  if (!kierowcaId) {
    alert('Błąd autoryzacji')
    return
  }

  // 1. Sprawdź formę płatności sklepu
  const { data: sklepData } = await supabase
    .from('sklepy')
    .select('platnosc, nazwa, miejscowosc')
    .eq('id', sklep.id)
    .single()

  if (!sklepData) {
    alert('Nie można pobrać danych sklepu')
    return
  }

  const metodaPlatnosci = sklepData.platnosc === 'gotówka' ? 'gotówka' : 'przelew'
  const kwotaBrutto = wybrane.reduce((sum, produkt) => sum + (produkt.cena * produkt.ilosc), 0)
  const dzis = new Date()
  const numerWZ = `${dzis.getFullYear()}/${String(dzis.getMonth() + 1).padStart(2, '0')}/${String(numeracjaWZ + 1).padStart(3, '0')}`

  try {
    // 2. Zapisz WZ
    const { data: wzData, error: wzError } = await supabase
      .from('wz_dokumenty')
      .insert({
        numer_wz: numerWZ,
        kierowca_id: kierowcaId,
        sklep_id: sklep.id,
        data: dzis.toISOString().split('T')[0],
        kwota_brutto: kwotaBrutto,
        metoda_platnosci: metodaPlatnosci,
        pozycje: wybrane.map(p => ({
          produkt_id: p.id,
          ilosc: p.ilosc,
          cena: p.cena,
          nazwa: p.nazwa
        }))
      })
      .select()
      .single()

    if (wzError) throw wzError

    // 3. Generuj KP tylko dla gotówki
    if (sklepData.platnosc === 'gotówka') {
      const rok = dzis.getFullYear()
      const miesiac = String(dzis.getMonth() + 1).padStart(2, '0')
      
      const { count } = await supabase
        .from('kp_dokumenty')
        .select('*', { count: 'exact' })
        .like('numer_kp', `${rok}/${miesiac}%`)

      const numerKP = `${rok}/${miesiac}/${String((count || 0) + 1).padStart(3, '0')}`

      const { data: kpData, error: kpError } = await supabase
        .from('kp_dokumenty')
        .insert({
          kierowca_id: kierowcaId,
          sklep_id: sklep.id,
          data: dzis.toISOString().split('T')[0],
          kwota: kwotaBrutto,
          kwota_brutto: kwotaBrutto,
          numer_kp: numerKP,
          pozycje: [{ 
            dokument: `WZ ${numerWZ}`, 
            kwota: kwotaBrutto.toFixed(2) 
          }],
          metoda_platnosci: 'gotówka',
          waluta: 'PLN',
          powiazany_wz_id: wzData.id,
          sklep_nazwa: `${sklepData.nazwa} (${sklepData.miejscowosc})` // Dodatkowe pole dla łatwiejszego wyszukiwania
        })
        .select()
        .single()

      if (kpError) {
        console.error('Błąd generowania KP:', kpError)
        alert('WZ zapisany, ale nie udało się wygenerować KP!')
      } else {
        alert(`WZ ${numerWZ} i KP ${numerKP} zapisane pomyślnie!`)
        router.push(`/kp/podglad/${kpData.id}?from_wz=true`)
        return
      }
    }

    alert(`Dokument WZ ${numerWZ} zapisany pomyślnie!`)
    resetujFormularz()
    
  } catch (error) {
    console.error('Błąd zapisu WZ:', error)
    alert('Wystąpił błąd podczas zapisywania WZ')
  }
}
      const { data: nowyMagazyn } = await supabase
        .from('magazyn')
        .select('*')
        .eq('kierowca_id', kierowcaId)
        .eq('data', dzisiaj)
        .eq('czy_uzyte', false)

      setMagazyn(nowyMagazyn || [])
      setWybrane([])
      router.push(`/wz/podglad/${data[0].id}`)

    } catch (error) {
      console.error('Błąd zapisu WZ:', error)
      alert('Wystąpił błąd podczas zapisywania WZ!')
    }
  }

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
            <option key={s.id} value={s.id}>
              {s.nazwa} (dzisiaj)
            </option>
          ))}
          {sklepy
            .filter((s) => !dzisSklepy.some((ds) => ds.id === s.id))
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.nazwa}
              </option>
            ))}
        </select>
      </div>

      {/* Wybór produktu */}
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

      {/* Klawisze wagowe */}
      {wybranyProdukt && produktyGrupowane[wybranyProdukt]?.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {produktyGrupowane[wybranyProdukt].map((c: any, i: number) => (
            <button
              key={`${c.id}-${i}`}
              className="border rounded p-2 text-center text-sm hover:bg-blue-100"
              onClick={() => dodajPozycje(c)}
            >
              {parseFloat(c.waga).toFixed(3)} kg
            </button>
          ))}
        </div>
      )}

      {/* Tabela wybranych produktów */}
      {wybrane.length > 0 && (
        <div className="border p-4 rounded">
          <h2 className="font-semibold mb-2">Wybrane produkty:</h2>
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left pb-2">Nazwa</th>
                <th className="text-right pb-2">Waga (kg)</th>
                <th className="text-right pb-2">Cena netto</th>
                <th className="text-right pb-2">Wartość netto</th>
                <th className="text-right pb-2">VAT (5%)</th>
                <th className="text-right pb-2">Wartość brutto</th>
                <th className="text-right pb-2">Akcja</th>
              </tr>
            </thead>
            <tbody>
              {wybrane.map((p) => {
                const cenaNetto = ceny.find(c => c.produkt === p.produkt_id)?.cena_netto || 0
                const wartoscNetto = p.waga * cenaNetto
                const vat = wartoscNetto * 0.05
                const brutto = wartoscNetto + vat
                return (
                  <tr key={p.id} className="border-b">
                    <td className="py-2">{nazwaProduktu(p.produkt_id)}</td>
                    <td className="text-right">
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        name="waga"
                        value={p.waga}
                        onChange={(e) => {
                          const nowaWaga = parseFloat(e.target.value) || 0
                          setWybrane(
                            wybrane.map(wp => (wp.id === p.id ? {...wp, waga: nowaWaga} : wp))
                          )
                        }}
                        className="w-20 text-right border rounded p-1 appearance-none"
                      />
                    </td>
                    <td className="text-right">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        name="cena_netto"
                        value={cenaNetto}
                        onChange={(e) => {
                          const nowaCena = parseFloat(e.target.value) || 0
                          const noweCeny = [...ceny]
                          const i = noweCeny.findIndex(c => c.produkt === p.produkt_id)
                          if (i >= 0) {
                            noweCeny[i].cena_netto = nowaCena
                          } else {
                            noweCeny.push({
                              produkt: p.produkt_id,
                              cena_netto: nowaCena
                            })
                          }
                          setCeny(noweCeny)
                        }}
                        className="w-20 text-right border rounded p-1 appearance-none"
                      />
                    </td>
                    <td className="text-right">{wartoscNetto.toFixed(2)} zł</td>
                    <td className="text-right">{vat.toFixed(2)} zł</td>
                    <td className="text-right">{brutto.toFixed(2)} zł</td>
                    <td className="text-right">
                      <button 
                        onClick={() => usunProdukt(p.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        Usuń
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Sekcja zwrotów */}
      <div className="border p-4 rounded space-y-4">
        <h2 className="font-semibold">Zwroty</h2>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Typ:</label>
            <select
              value={nowyZwrot.typ}
              onChange={(e) => setNowyZwrot({
                ...nowyZwrot,
                typ: e.target.value as 'ciasto' | 'drobnica'
              })}
              className="w-full p-2 border rounded"
            >
              <option value="ciasto">Ciasto</option>
              <option value="drobnica">Drobnica</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Waga (kg):</label>
            <input
              type="number"
              step="0.001"
              min="0"
              name="waga"
              value={nowyZwrot.waga || ''}
              onChange={handleZwrotChange}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Cena netto (1kg):</label>
            <input
              type="number"
              step="0.01"
              min="0"
              name="cena_netto"
              value={nowyZwrot.cena_netto || ''}
              onChange={handleZwrotChange}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Wartość netto:</label>
            <div className="p-2 border rounded bg-gray-50">
              {nowyZwrot.wartosc_netto.toFixed(2)} zł
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Wartość brutto:</label>
            <div className="p-2 border rounded bg-gray-50">
              {nowyZwrot.wartosc_brutto.toFixed(2)} zł
            </div>
          </div>
        </div>

        <button 
          onClick={dodajZwrot}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          disabled={!nowyZwrot.waga || nowyZwrot.waga <= 0}
        >
          Dodaj zwrot
        </button>

        {/* Lista zwrotów ciasta */}
        {zwrotyCiasta.length > 0 && (
          <div className="mt-4">
            <h3 className="font-medium mb-2">Zwroty ciast:</h3>
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left pb-2">Waga</th>
                  <th className="text-right pb-2">Cena netto</th>
                  <th className="text-right pb-2">Wartość netto</th>
                  <th className="text-right pb-2">VAT</th>
                  <th className="text-right pb-2">Wartość brutto</th>
                  <th className="text-right pb-2">Akcja</th>
                </tr>
              </thead>
              <tbody>
                {zwrotyCiasta.map((z) => (
                  <tr key={z.id} className="border-b">
                    <td className="py-2">{z.waga.toFixed(3)} kg</td>
                    <td className="text-right">{z.cena_netto.toFixed(2)} zł</td>
                    <td className="text-right">{z.wartosc_netto.toFixed(2)} zł</td>
                    <td className="text-right">5%</td>
                    <td className="text-right">{z.wartosc_brutto.toFixed(2)} zł</td>
                    <td className="text-right">
                      <button 
                        onClick={() => usunZwrotCiasta(z.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        Usuń
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Lista zwrotów drobnicy */}
        {zwrotyDrobnica.length > 0 && (
          <div className="mt-4">
            <h3 className="font-medium mb-2">Zwroty drobnicy:</h3>
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left pb-2">Waga</th>
                  <th className="text-right pb-2">Cena netto</th>
                  <th className="text-right pb-2">Wartość netto</th>
                  <th className="text-right pb-2">VAT</th>
                  <th className="text-right pb-2">Wartość brutto</th>
                  <th className="text-right pb-2">Akcja</th>
                </tr>
              </thead>
              <tbody>
                {zwrotyDrobnica.map((z) => (
                  <tr key={z.id} className="border-b">
                    <td className="py-2">{z.waga.toFixed(3)} kg</td>
                    <td className="text-right">{z.cena_netto.toFixed(2)} zł</td>
                    <td className="text-right">{z.wartosc_netto.toFixed(2)} zł</td>
                    <td className="text-right">5%</td>
                    <td className="text-right">{z.wartosc_brutto.toFixed(2)} zł</td>
                    <td className="text-right">
                      <button 
                        onClick={() => usunZwrotDrobnicy(z.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        Usuń
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                ...zwrotyCiasta.map(z => z.wartosc_brutto),
                ...zwrotyDrobnica.map(z => z.wartosc_brutto)
              ].reduce((sum, val) => sum + val, 0).toFixed(2)} zł
            </span>
          </div>
          <div className="flex justify-between border-t pt-2 font-bold">
            <span>Do zapłaty:</span>
            <span>
              {((
                wybrane.reduce((sum, p) => {
                  const cena = ceny.find(c => c.produkt === p.produkt_id)?.cena_netto || 0
                  return sum + (p.waga * cena * 1.05)
                }, 0)
              ) - (
                [
                  ...zwrotyCiasta.map(z => z.wartosc_brutto),
                  ...zwrotyDrobnica.map(z => z.wartosc_brutto)
                ].reduce((sum, val) => sum + val, 0)
              )).toFixed(2)} zł
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