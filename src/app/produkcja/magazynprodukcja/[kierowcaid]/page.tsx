import { redirect } from 'next/navigation'

export default function Page({ params }: { params: { kierowcaid: string } }) {
  redirect(`/magazyn/nowy?kierowca=${params.kierowcaid}`)
}
