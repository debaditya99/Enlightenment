'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '../utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const supabase = createClient()
  const router = useRouter()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) setMessage(`Error: ${error.message}`)
    else setMessage('Check your email for the confirmation link!')
    setLoading(false)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setMessage(`Error: ${error.message}`)
    } else {
      setMessage('Logged in successfully!')
      // 🚀 Send them to the dashboard!
      router.push('/home')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4 text-white">
      <Card className="w-full max-w-md bg-zinc-900 border-zinc-800 text-zinc-100">
        <CardHeader>
          <CardTitle className="text-2xl">Project Enlightenment</CardTitle>
          <CardDescription className="text-zinc-400">Sign in or create an account to begin.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Email Address</label>
              <Input 
                type="email" 
                placeholder="you@example.com" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Password</label>
              <Input 
                type="password" 
                placeholder="••••••••" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div className="flex gap-4 pt-2">
              <Button type="button" onClick={handleLogin} disabled={loading} className="w-full">
                Log In
              </Button>
              <Button type="button" onClick={handleSignUp} disabled={loading} variant="outline" className="w-full border-zinc-700 hover:bg-zinc-800 hover:text-white">
                Sign Up
              </Button>
            </div>
            {message && <p className="text-center text-sm mt-4 text-emerald-400">{message}</p>}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}