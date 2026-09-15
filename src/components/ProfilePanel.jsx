import { useState } from 'react'
import { User, X, Save } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function ProfilePanel({ profile, onSaved, onClose }) {
  const [username, setUsername] = useState(profile?.username || '')
  const [isPublic, setIsPublic] = useState(profile?.is_public ?? true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')

    const { data, error: saveError } = await supabase.rpc('update_my_profile', {
      p_username: username,
      p_is_public: isPublic,
    })

    if (saveError) {
      setError(saveError.message)
    } else {
      setNotice('Perfil actualizado.')
      onSaved?.(data)
    }
    setSaving(false)
  }

  return (
    <div className="modalBg" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <form className="modal profileModal" onSubmit={save}>
        <div className="modalHead">
          <div>
            <span className="eyebrow">MI PERFIL</span>
            <h2>Perfil de usuario</h2>
          </div>
          <button type="button" className="modalClose" onClick={onClose} title="Cerrar">
            <X size={18} />
          </button>
        </div>

        <div className="profileIdentity">
          <div className="profileIcon"><User size={22} /></div>
          <div>
            <strong>{profile?.role || 'user'}</strong>
            <span>Tu identidad dentro de la aplicación</span>
          </div>
        </div>

        <label>
          Nombre de usuario
          <input
            required
            minLength={3}
            maxLength={30}
            pattern="[A-Za-z0-9_]+"
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoComplete="username"
          />
          <span className="fieldHint">3 a 30 caracteres. Solo letras, números y _.</span>
        </label>

        <div className="profileVisibility">
          <div className="profileSectionLabel">Identidad en evaluaciones</div>
          <button
            type="button"
            className={`visibilityOption ${isPublic ? 'active' : ''}`}
            onClick={() => setIsPublic(true)}
          >
            <span className="visibilityRadio" />
            <span><strong>Pública</strong><small>Se muestra tu nombre de usuario.</small></span>
          </button>
          <button
            type="button"
            className={`visibilityOption ${!isPublic ? 'active' : ''}`}
            onClick={() => setIsPublic(false)}
          >
            <span className="visibilityRadio" />
            <span><strong>Privada</strong><small>Tus evaluaciones aparecerán como “Usuario”.</small></span>
          </button>
        </div>

        {error && <div className="error">{error}</div>}
        {notice && <div className="notice">{notice}</div>}

        <button className="primary wide" type="submit" disabled={saving}>
          <Save size={17} /> {saving ? 'Guardando...' : 'Guardar perfil'}
        </button>
      </form>
    </div>
  )
}
