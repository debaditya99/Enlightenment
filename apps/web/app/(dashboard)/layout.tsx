import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } 
          catch {}
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // 🔐 If not authenticated, kick them back to the login page!
  if (!user) {
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <nav className="border-b border-zinc-800 p-4 flex justify-between items-center">
        <h1 className="font-bold text-xl text-emerald-400">Enlightenment Dashboard</h1>
        <span className="text-sm text-zinc-400">{user.email}</span>
      </nav>
      <main className="p-8">{children}</main>
    </div>
  )
}