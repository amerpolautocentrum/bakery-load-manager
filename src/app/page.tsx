// app/page.tsx
import { redirect } from 'next/navigation'

export default function HomePage() {
  redirect('/dashboard') // Automatyczne przekierowanie na dashboard
}