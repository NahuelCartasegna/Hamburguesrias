import { useState } from 'react'
import { LogIn, LogOut } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function AuthPanel({ session, profile, onAuthChange }) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  async function submit(e) {
    e.preventDefault(); setMessage('')
    const result = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password })
    if (result.error) setMessage(result.error.message)
    else {
      setMessage(mode === 'login' ? '' : 'Cuenta creada. Revisá tu email si Supabase pide confirmación.')
      if (mode === 'login') { setOpen(false); onAuthChange() }
    }
  }

  async function logout() {
    await supabase.auth.signOut(); onAuthChange()
  }

  if (session) return <div className="authBox"><span>{profile?.display_name || session.user.email} · {profile?.role || 'user'}</span><button className="ghost" onClick={logout}><LogOut size={16}/> Salir</button></div>
  return <>
    <button className="ghost" onClick={() => setOpen(true)}><LogIn size={16}/> Ingresar</button>
    {open && <div className="modalBg" onMouseDown={e => e.target === e.currentTarget && setOpen(false)}>
      <form className="modal" onSubmit={submit}>
        <div className="modalHead"><div><span className="eyebrow">CUENTA</span><h2>{mode === 'login' ? 'Ingresar' : 'Crear cuenta'}</h2></div><button type="button" className="ghost" onClick={() => setOpen(false)}>×</button></div>
        <label>Email<input type="email" required value={email} onChange={e => setEmail(e.target.value)} /></label>
        <label>Contraseña<input type="password" required value={password} onChange={e => setPassword(e.target.value)} /></label>
        {message && <div className={mode === 'login' ? 'error' : 'notice'}>{message}</div>}
        <button className="primary wide"><LogIn size={17}/> {mode === 'login' ? 'Ingresar' : 'Crear cuenta'}</button>
        <button type="button" className="ghost wide" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage('') }}>{mode === 'login' ? 'Crear una cuenta' : 'Ya tengo una cuenta'}</button>
      </form>
    </div>}
  </>
}
