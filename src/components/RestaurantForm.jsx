import { useEffect, useState } from 'react'
import { Check, Loader2, Save, Send, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { CATS } from '../lib/scoring'

const emptyRating = {
  burger: '',
  fries: '',
  price_quality: '',
  time: '',
  venue: '',
  packaging: '',
  notes: '',
}

const emptyForm = {
  name: '',
  description: '',
  image_url: '',
  website_url: '',
  instagram_url: '',
  address: '',
  notes: '',
}

export default function RestaurantForm({ restaurant, session, profile, onSaved, onClose }) {
  const [form, setForm] = useState(emptyForm)
  const [rating, setRating] = useState(emptyRating)
  const [file, setFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const isAdmin = profile?.role === 'admin'
  const isEditor = profile?.role === 'editor'
  const isRequest = isEditor && !isAdmin

  useEffect(() => {
    if (restaurant) {
      setForm({
        name: restaurant.name || '',
        description: restaurant.description || '',
        image_url: restaurant.image_url || '',
        website_url: restaurant.website_url || '',
        instagram_url: restaurant.instagram_url || '',
        address: restaurant.address || '',
        notes: restaurant.notes || '',
      })
    } else {
      setForm(emptyForm)
      setRating(emptyRating)
    }

    setFile(null)
    setError('')
  }, [restaurant])

  async function uploadImage(pathPrefix) {
    if (!file) return form.image_url || null

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `${pathPrefix}/${crypto.randomUUID()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('restaurant-images')
      .upload(path, file, {
        upsert: false,
        contentType: file.type,
      })

    if (uploadError) throw uploadError

    return supabase.storage.from('restaurant-images').getPublicUrl(path).data.publicUrl
  }

  function getRestaurantData(imageUrl) {
    return {
      name: form.name.trim(),
      description: form.description.trim() || null,
      image_url: imageUrl || null,
      website_url: form.website_url.trim() || null,
      instagram_url: form.instagram_url.trim() || null,
      address: form.address.trim() || null,
      notes: form.notes.trim() || null,
    }
  }

  function getInitialRating() {
    const hasRating = Object.entries(rating).some(([key, value]) => key !== 'notes' && value !== '')
    const hasComment = rating.notes.trim() !== ''

    if (!hasRating && !hasComment) {
      return { has_rating: false }
    }

    if (!hasRating && hasComment) {
      throw new Error('Si cargás un comentario, también tenés que completar al menos un puntaje.')
    }

    if (!hasComment) {
      throw new Error('Si cargás una primera evaluación, el comentario es obligatorio.')
    }

    return {
      has_rating: true,
      burger: rating.burger,
      fries: rating.fries,
      price_quality: rating.price_quality,
      time: rating.time,
      venue: rating.venue,
      packaging: rating.packaging,
      notes: rating.notes.trim(),
    }
  }

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      if (!form.name.trim()) throw new Error('El nombre es obligatorio.')

      if (isRequest) {
        const prefix = restaurant
          ? `requests/update/${restaurant.id}`
          : 'requests/create'

        const imageUrl = await uploadImage(prefix)
        const initialRating = restaurant ? { has_rating: false } : getInitialRating()

        const { error: requestError } = await supabase
          .from('restaurant_requests')
          .insert({
            restaurant_id: restaurant?.id || null,
            request_type: restaurant ? 'update' : 'create',
            proposed_data: {
              restaurant: getRestaurantData(imageUrl),
              initial_rating: initialRating,
            },
            requested_by: session.user.id,
          })

        if (requestError) throw requestError

        onSaved({ pending: true })
        return
      }

      let id = restaurant?.id

      if (!id) {
        const { data, error: insertError } = await supabase
          .from('restaurants')
          .insert({ ...getRestaurantData(form.image_url), created_by: session.user.id })
          .select()
          .single()

        if (insertError) throw insertError
        id = data.id
      }

      const imageUrl = await uploadImage(`restaurants/${id}`)

      const restaurantData = getRestaurantData(imageUrl)

      const { error: restaurantError } = await supabase
        .from('restaurants')
        .update(restaurantData)
        .eq('id', id)

      if (restaurantError) throw restaurantError

      if (!restaurant && Object.values(rating).some(v => v !== '')) {
        if (!rating.notes.trim()) {
          throw new Error('Si cargás una primera evaluación, el comentario es obligatorio.')
        }

        const values = Object.fromEntries(
          CATS.map(([key]) => [key, rating[key] === '' ? null : Number(rating[key])])
        )

        const { error: ratingError } = await supabase
          .from('ratings')
          .insert({
            restaurant_id: id,
            user_id: session.user.id,
            ...values,
            notes: rating.notes.trim(),
          })

        if (ratingError) throw ratingError
      }

      onSaved({ id, pending: false })
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const title = restaurant ? restaurant.name : 'Hamburguesería'
  const eyebrow = restaurant
    ? isRequest
      ? 'SOLICITAR CAMBIOS'
      : 'EDITAR'
    : isRequest
      ? 'SOLICITAR CREACIÓN'
      : 'NUEVA'

  return (
    <div className="modalBg" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <form className="modal wideModal" onSubmit={save}>
        <div className="modalHead">
          <div>
            <span className="eyebrow">{eyebrow}</span>
            <h2>{title}</h2>
          </div>

          <button type="button" className="modalClose" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {isRequest && (
          <div className="approvalInfo">
            <ShieldIcon />
            <div>
              <strong>
                {restaurant ? 'Los cambios necesitan aprobación' : 'La creación necesita aprobación'}
              </strong>
              <span>
                {restaurant
                  ? 'La versión publicada no cambiará hasta que un administrador apruebe esta solicitud.'
                  : 'La hamburguesería no aparecerá en el ranking hasta que un administrador la apruebe.'}
              </span>
            </div>
          </div>
        )}

        <label>
          Nombre
          <input
            required
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
          />
        </label>

        <label>
          Descripción
          <textarea
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
          />
        </label>

        <div className="formGrid">
          <label>
            Web
            <input
              type="url"
              value={form.website_url}
              onChange={e => setForm({ ...form, website_url: e.target.value })}
              placeholder="https://..."
            />
          </label>

          <label>
            Instagram
            <input
              value={form.instagram_url}
              onChange={e => setForm({ ...form, instagram_url: e.target.value })}
              placeholder="https://instagram.com/..."
            />
          </label>
        </div>

        <label>
          Dirección
          <input
            value={form.address}
            onChange={e => setForm({ ...form, address: e.target.value })}
          />
        </label>

        <label>
          Imagen
          <input
            type="file"
            accept="image/*"
            onChange={e => setFile(e.target.files?.[0] || null)}
          />
        </label>

        {form.image_url && !file && (
          <img className="preview" src={form.image_url} alt="Imagen actual" />
        )}

        {file && (
          <div className="selectedFile">
            <Check size={15} /> {file.name}
          </div>
        )}

        <label>
          Notas generales
          <textarea
            value={form.notes}
            onChange={e => setForm({ ...form, notes: e.target.value })}
          />
        </label>

        {!restaurant && (
          <>
            <div className="sectionTitle">
              Primera evaluación <span>opcional</span>
            </div>
            <p className="formDescription">
              Si cargás puntajes, el comentario de la evaluación es obligatorio.
            </p>

            <div className="scoreGrid">
              {CATS.map(([key, icon, label]) => (
                <label key={key}>
                  <span>
                    {icon} {label}
                  </span>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    step=".1"
                    value={rating[key]}
                    onChange={e => setRating({ ...rating, [key]: e.target.value })}
                    placeholder="0–10"
                  />
                </label>
              ))}
            </div>

            <label>
              Comentario de la evaluación
              <textarea
                required={Object.values(rating).some(v => v !== '')}
                value={rating.notes}
                onChange={e => setRating({ ...rating, notes: e.target.value })}
              />
              <span className="fieldHint">Si cargás una evaluación, este comentario no puede quedar vacío.</span>
            </label>
          </>
        )}

        {error && <div className="error">{error}</div>}

        <button className="primary wide" disabled={saving}>
          {saving ? <Loader2 size={18} className="spin" /> : isRequest ? <Send size={18} /> : <Save size={18} />}
          {saving
            ? 'Enviando...'
            : isRequest
              ? 'Enviar solicitud'
              : restaurant
                ? 'Guardar cambios'
                : 'Crear hamburguesería'}
        </button>
      </form>
    </div>
  )
}

function ShieldIcon() {
  return <span className="approvalIcon">✓</span>
}
