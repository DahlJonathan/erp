import { useState } from 'react'
import { supabase } from '../supabaseClient'

export function AuthView() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setIsLoading(true)

    if (mode === 'register') {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
        },
      })

      if (signUpError) {
        setError(signUpError.message)
      } else {
        setInfo('Rekisteröityminen onnistui! Tarkista sähköpostisi vahvistaaksesi tilin.')
      }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError('Virheellinen sähköpostiosoite tai salasana.')
      }
    }

    setIsLoading(false)
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.14),_transparent_30%),linear-gradient(180deg,_#f8fafc_0%,_#e2e8f0_100%)] px-4 py-10 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-md flex-col gap-8">
        <header className="rounded-[2rem] border-2 border-slate-400 bg-white/90 px-6 py-8 shadow-sm shadow-slate-300/70 backdrop-blur sm:px-8">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
            Laskutus ja projektinhallinta
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {mode === 'login' ? 'Kirjaudu sisään jatkaaksesi.' : 'Luo uusi tili.'}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            {mode === 'register' && (
              <div className="flex flex-col gap-1">
                <label htmlFor="name" className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                  Nimi
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                  className="rounded-2xl border-2 border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-slate-950"
                />
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label htmlFor="email" className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                Sähköposti
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="rounded-2xl border-2 border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-slate-950"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="password" className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                Salasana
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className="rounded-2xl border-2 border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-slate-950"
              />
            </div>

            {error && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            )}

            {info && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {info}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 rounded-2xl border-2 border-slate-950 bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              {isLoading ? 'Ladataan...' : mode === 'login' ? 'Kirjaudu sisään' : 'Rekisteröidy'}
            </button>
          </form>

          <div className="mt-6 border-t-2 border-slate-200 pt-5 text-center text-sm text-slate-600">
            {mode === 'login' ? (
              <>
                Ei vielä tiliä?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('register'); setError(null); setInfo(null) }}
                  className="font-semibold text-slate-950 underline underline-offset-2"
                >
                  Rekisteröidy
                </button>
              </>
            ) : (
              <>
                Onko sinulla jo tili?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(null); setInfo(null) }}
                  className="font-semibold text-slate-950 underline underline-offset-2"
                >
                  Kirjaudu sisään
                </button>
              </>
            )}
          </div>
        </header>
      </div>
    </main>
  )
}
