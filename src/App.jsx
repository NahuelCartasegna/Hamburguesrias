import { useEffect, useMemo, useState } from 'react'
import { Plus, Search, Star, ArrowLeft, Save, MessageSquare, SlidersHorizontal } from 'lucide-react'
import { supabase } from './supabase'

const WEIGHTS = { burger: .40, fries: .30, time: .15, venue: .10, packaging: .05 }
const CATS = [
  ['burger', '🍔', 'Hamburguesa', .40],
  ['fries', '🍟', 'Papas', .30],
  ['time', '⏱️', 'Tiempo', .15],
  ['venue', '🏪', 'Local', .10],
  ['packaging', '📦', 'Packaging', .05],
]

function avg(values) {
  const xs = values.filter(v => v !== null && v !== undefined && v !== '')
  return xs.length ? xs.reduce((a,b)=>a+Number(b),0)/xs.length : null
}
function score(ratings) {
  const a = {}
  for (const [k] of CATS) a[k] = avg(ratings.map(r => r[k]))
  const available = CATS.filter(([k]) => a[k] !== null)
  if (!available.length) return null
  const weight = available.reduce((s,[k,, ,w]) => s+w, 0)
  return available.reduce((s,[k,, ,w]) => s + a[k] * (w/weight), 0)
}
function money(v) {
  if (v == null || v === '') return 'Sin precio'
  return new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0}).format(v)
}

export default function App() {
  const [restaurants,setRestaurants] = useState([])
  const [ratings,setRatings] = useState([])
  const [loading,setLoading] = useState(true)
  const [error,setError] = useState('')
  const [search,setSearch] = useState('')
  const [selected,setSelected] = useState(null)
  const [showNew,setShowNew] = useState(false)
  const [newName,setNewName] = useState('')
  const [newPrice,setNewPrice] = useState('')
  const [newNotes,setNewNotes] = useState('')
  const [newRating,setNewRating] = useState({reviewer:'Nahuel',burger:'',fries:'',time:'',venue:'',packaging:'',notes:''})
  const [note,setNote] = useState('')

  async function load() {
    if (!supabase) { setLoading(false); setError('Faltan las variables de Supabase. Copiá .env.example como .env y completalas.'); return }
    setLoading(true); setError('')
    const [a,b] = await Promise.all([
      supabase.from('restaurants').select('*').order('name'),
      supabase.from('ratings').select('*').order('created_at')
    ])
    if (a.error || b.error) setError(a.error?.message || b.error?.message)
    else { setRestaurants(a.data||[]); setRatings(b.data||[]) }
    setLoading(false)
  }
  useEffect(()=>{load()},[])

  const rows = useMemo(() => restaurants.map(r => {
    const rs=ratings.filter(x=>x.restaurant_id===r.id)
    return {...r, ratings:rs, score:score(rs)}
  }).filter(r => r.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a,b)=>(b.score??-1)-(a.score??-1)), [restaurants,ratings,search])

  async function addRestaurant(e) {
    e.preventDefault()
    if (!newName.trim()) return
    const {data,error:e1}=await supabase.from('restaurants').insert({
      name:newName.trim(), price:newPrice ? Number(newPrice) : null, notes:newNotes.trim()||null
    }).select().single()
    if(e1){setError(e1.message);return}
    const vals={}
    for(const [k] of CATS) vals[k]=newRating[k]!==''?Number(newRating[k]):null
    if(newRating.reviewer.trim() && Object.values(vals).some(v=>v!==null) || newRating.notes.trim()){
      const {error:e2}=await supabase.from('ratings').insert({
        restaurant_id:data.id, reviewer:newRating.reviewer.trim()||'Anónimo', ...vals, notes:newRating.notes.trim()||null
      })
      if(e2){setError(e2.message);return}
    }
    setShowNew(false); setNewName('');setNewPrice('');setNewNotes('')
    setNewRating({reviewer:'Nahuel',burger:'',fries:'',time:'',venue:'',packaging:'',notes:''})
    await load()
    setSelected(data.id)
  }

  async function addNote() {
    if(!selected || !note.trim()) return
    const current=restaurants.find(r=>r.id===selected)
    const merged=(current?.notes ? current.notes+'\n\n' : '') + note.trim()
    const {error:e}=await supabase.from('restaurants').update({notes:merged}).eq('id',selected)
    if(e) setError(e.message); else {setNote(''); await load()}
  }

  const current=rows.find(r=>r.id===selected) || restaurants.map(r=>({...r,ratings:ratings.filter(x=>x.restaurant_id===r.id),score:score(ratings.filter(x=>x.restaurant_id===r.id))})).find(r=>r.id===selected)

  return <div className="app">
    <header>
      <div className="brand"><span>🍔</span><div><h1>Hamburguesitas</h1><p>El ranking definitivo</p></div></div>
      <button className="primary" onClick={()=>setShowNew(true)}><Plus size={18}/> Nueva</button>
    </header>

    {error && <div className="error">{error}</div>}

    {current ? <Detail r={current} note={note} setNote={setNote} addNote={addNote} back={()=>setSelected(null)} /> :
    <>
      <section className="hero">
        <div><span className="eyebrow">RANKING</span><h2>¿Cuál es la mejor?</h2><p>Compará hamburgueserías según sus evaluaciones.</p></div>
        <div className="heroIcon">🍔</div>
      </section>
      <div className="toolbar">
        <div className="search"><Search size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar hamburguesería..." /></div>
        <div className="count"><SlidersHorizontal size={16}/> {rows.length} lugares</div>
      </div>
      {loading ? <div className="empty">Cargando...</div> :
      <div className="grid">{rows.map((r,i)=><Card key={r.id} r={r} rank={i+1} onClick={()=>setSelected(r.id)}/>)}</div>}
    </>}

    {showNew && <div className="modalBg" onMouseDown={e=>e.target===e.currentTarget&&setShowNew(false)}>
      <form className="modal" onSubmit={addRestaurant}>
        <div className="modalHead"><div><span className="eyebrow">NUEVO</span><h2>Agregar hamburguesería</h2></div><button type="button" className="ghost" onClick={()=>setShowNew(false)}>×</button></div>
        <label>Nombre<input required value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Ej. Burger House"/></label>
        <label>Precio<input type="number" min="0" value={newPrice} onChange={e=>setNewPrice(e.target.value)} placeholder="15000"/></label>
        <div className="sectionTitle">Primera evaluación <span>opcional</span></div>
        <label>Evaluó<input value={newRating.reviewer} onChange={e=>setNewRating({...newRating,reviewer:e.target.value})}/></label>
        <div className="scoreGrid">{CATS.map(([k,icon,label])=><label key={k}><span>{icon} {label}</span><input type="number" min="0" max="10" step=".1" value={newRating[k]} onChange={e=>setNewRating({...newRating,[k]:e.target.value})} placeholder="0–10"/></label>)}</div>
        <label>Nota / comentario<textarea value={newRating.notes} onChange={e=>setNewRating({...newRating,notes:e.target.value})} placeholder="¿Qué te pareció?"/></label>
        <button className="primary wide" type="submit"><Save size={18}/> Guardar</button>
      </form>
    </div>}
  </div>
}

function Card({r,rank,onClick}) {
  return <button className="card" onClick={onClick}>
    <div className="rank">{rank<=3 ? ['🥇','🥈','🥉'][rank-1] : `#${rank}`}</div>
    <div className="cardMain"><h3>{r.name}</h3><div className="meta">{money(r.price)} · {r.ratings.length} evaluación{r.ratings.length===1?'':'es'}</div>
      <div className="chips">{CATS.map(([k,icon,label])=>r.ratings.length>0 && <span key={k}>{icon} {r[k]=avg(r.ratings.map(x=>x[k]))!=null?avg(r.ratings.map(x=>x[k])).toFixed(1):'—'}</span>)}</div>
    </div>
    <div className="bigScore">{r.score==null?'—':r.score.toFixed(2)}<small>/10</small></div>
  </button>
}

function Detail({r,back,note,setNote,addNote}) {
  return <main className="detail">
    <button className="back" onClick={back}><ArrowLeft size={17}/> Volver al ranking</button>
    <div className="detailTop"><div><span className="eyebrow">HAMBURGUESERÍA</span><h2>{r.name}</h2><div className="price">{money(r.price)}</div></div>
      <div className="scoreCircle"><b>{r.score==null?'—':r.score.toFixed(2)}</b><span>/10</span></div>
    </div>
    <div className="metricGrid">{CATS.map(([k,icon,label,w])=>{const v=avg(r.ratings.map(x=>x[k]));return <div className="metric" key={k}><span>{icon}</span><div><small>{label} · {Math.round(w*100)}%</small><strong>{v==null?'—':v.toFixed(1)}</strong></div></div>})}</div>
    <div className="columns"><section className="panel"><h3><MessageSquare size={18}/> Notas</h3>
      {r.notes ? <div className="notes">{r.notes}</div> : <div className="muted">Todavía no hay notas generales.</div>}
      <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Agregar una nota..." />
      <button className="primary" onClick={addNote}><Plus size={17}/> Agregar nota</button>
    </section>
    <section className="panel"><h3>Evaluaciones</h3>{r.ratings.length===0?<div className="muted">Todavía no hay evaluaciones.</div>:r.ratings.map(x=><div className="review" key={x.id}><b>{x.reviewer}</b><span>{[x.burger,x.fries,x.time,x.venue,x.packaging].filter(v=>v!=null).length ? score([x]).toFixed(2)+'/10' : 'Sin puntaje'}</span>{x.notes&&<p>{x.notes}</p>}</div>)}</section></div>
  </main>
}
