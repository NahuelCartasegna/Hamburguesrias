import { useEffect, useState } from 'react'
import { ImagePlus, Save } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { CATS } from '../lib/scoring'

const emptyRating = { burger:'', fries:'', price_quality:'', time:'', venue:'', packaging:'', notes:'' }

export default function RestaurantForm({ restaurant, session, onSaved, onClose }) {
  const [form, setForm] = useState({ name:'', description:'', image_url:'', website_url:'', instagram_url:'', address:'', notes:'' })
  const [rating, setRating] = useState(emptyRating)
  const [file, setFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (restaurant) setForm({ name:restaurant.name || '', description:restaurant.description || '', image_url:restaurant.image_url || '', website_url:restaurant.website_url || '', instagram_url:restaurant.instagram_url || '', address:restaurant.address || '', notes:restaurant.notes || '' })
  }, [restaurant])

  async function uploadImage(id) {
    if (!file) return form.image_url || null
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `${id}/${crypto.randomUUID()}.${ext}`
    const { error } = await supabase.storage.from('restaurant-images').upload(path, file, { upsert:false, contentType:file.type })
    if (error) throw error
    return supabase.storage.from('restaurant-images').getPublicUrl(path).data.publicUrl
  }

  async function save(e) {
    e.preventDefault(); setSaving(true); setError('')
    try {
      let id = restaurant?.id
      if (!id) {
        const { data, error } = await supabase.from('restaurants').insert({ ...form, created_by:session.user.id }).select().single()
        if (error) throw error
        id = data.id
      } else {
        const { error } = await supabase.from('restaurants').update(form).eq('id', id)
        if (error) throw error
      }
      const imageUrl = await uploadImage(id)
      if (imageUrl && imageUrl !== form.image_url) {
        const { error } = await supabase.from('restaurants').update({ image_url:imageUrl }).eq('id', id)
        if (error) throw error
      }
      if (!restaurant && Object.values(rating).some(v => v !== '')) {
        const values = Object.fromEntries(CATS.map(([key]) => [key, rating[key] === '' ? null : Number(rating[key])]))
        const { error } = await supabase.from('ratings').insert({ restaurant_id:id, user_id:session.user.id, ...values, notes:rating.notes || null })
        if (error) throw error
      }
      onSaved(id)
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  return <div className="modalBg" onMouseDown={e => e.target === e.currentTarget && onClose()}>
    <form className="modal wideModal" onSubmit={save}>
      <div className="modalHead"><div><span className="eyebrow">{restaurant ? 'EDITAR' : 'NUEVA'}</span><h2>{restaurant ? restaurant.name : 'Hamburguesería'}</h2></div><button type="button" className="ghost" onClick={onClose}>×</button></div>
      <label>Nombre<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
      <label>Descripción<textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label>
      <div className="formGrid">
        <label>Web<input type="url" value={form.website_url} onChange={e=>setForm({...form,website_url:e.target.value})} placeholder="https://..."/></label>
        <label>Instagram<input value={form.instagram_url} onChange={e=>setForm({...form,instagram_url:e.target.value})} placeholder="https://instagram.com/..."/></label>
      </div>
      <label>Dirección<input value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/></label>
      <label>Imagen <input type="file" accept="image/*" onChange={e=>setFile(e.target.files?.[0] || null)}/></label>
      {form.image_url && !file && <img className="preview" src={form.image_url} alt="Imagen actual"/>}
      <label>Notas generales<textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label>
      {!restaurant && <>
        <div className="sectionTitle">Primera evaluación <span>opcional</span></div>
        <div className="scoreGrid">{CATS.map(([key,icon,label])=><label key={key}><span>{icon} {label}</span><input type="number" min="0" max="10" step=".1" value={rating[key]} onChange={e=>setRating({...rating,[key]:e.target.value})} placeholder="0–10"/></label>)}</div>
        <label>Comentario<textarea value={rating.notes} onChange={e=>setRating({...rating,notes:e.target.value})}/></label>
      </>}
      {error && <div className="error">{error}</div>}
      <button className="primary wide" disabled={saving}><Save size={18}/> {saving ? 'Guardando...' : 'Guardar'}</button>
    </form>
  </div>
}
