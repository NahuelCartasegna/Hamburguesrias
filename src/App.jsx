import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  Check,
  Edit3,
  ExternalLink,
  LayoutGrid,
  List,
  Loader2,
  MapPin,
  MessageSquare,
  Moon,
  Plus,
  Search,
  ShieldCheck,
  Star,
  Sun,
  Trash2,
  X,
  Clock3,
  Ban,
  User,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { supabase, supabaseConfigError } from './lib/supabase'
import { CATS, avg, ratingScore, restaurantScore } from './lib/scoring'
import AuthPanel from './components/AuthPanel'
import RestaurantForm from './components/RestaurantForm'
import ProfilePanel from './components/ProfilePanel'

const emptyRating = {
  burger: '',
  fries: '',
  price_quality: '',
  time: '',
  venue: '',
  packaging: '',
  notes: '',
}

function formatDate(date) {
  if (!date) return ''
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [restaurants, setRestaurants] = useState([])
  const [ratings, setRatings] = useState([])
  const [profiles, setProfiles] = useState({})
  const [requests, setRequests] = useState([])
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [showRequests, setShowRequests] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('hamburguesitas-view-mode') || 'grid')
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('hamburguesitas-theme') === 'dark')

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    localStorage.setItem('hamburguesitas-theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  useEffect(() => {
    localStorage.setItem('hamburguesitas-view-mode', viewMode)
  }, [viewMode])

  async function loadAuth() {
    if (!supabase) return
    const { data: { session: nextSession } } = await supabase.auth.getSession()
    setSession(nextSession)

    if (nextSession) {
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', nextSession.user.id)
        .single()

      if (!profileError) setProfile(data)
      else setProfile(null)
    } else {
      setProfile(null)
    }
  }

  async function load() {
    if (!supabase) {
      setError('Faltan las variables de Supabase.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    const [restaurantsResult, ratingsResult, profilesResult] = await Promise.all([
      supabase.from('restaurants').select('*').order('name'),
      supabase.from('ratings').select('*').order('created_at'),
      supabase.from('public_profiles').select('*'),
    ])

    const firstError = restaurantsResult.error || ratingsResult.error || profilesResult.error

    if (firstError) {
      setError(firstError.message)
    } else {
      setRestaurants(restaurantsResult.data || [])
      setRatings(ratingsResult.data || [])
      setProfiles(Object.fromEntries((profilesResult.data || []).map(p => [p.id, p])))
    }

    setLoading(false)
  }

  async function loadRequests() {
    if (!supabase || !session) {
      setRequests([])
      return
    }

    let query = supabase
      .from('restaurant_requests')
      .select('*')
      .order('created_at', { ascending: false })

    if (profile?.role !== 'admin') {
      query = query.eq('requested_by', session.user.id)
    }

    const { data, error: requestError } = await query

    if (requestError) {
      if (!requestError.message.toLowerCase().includes('relation') && !requestError.message.toLowerCase().includes('does not exist')) {
        setError(requestError.message)
      }
      return
    }

    const rows = data || []
    const requesterIds = [...new Set(rows.map(r => r.requested_by).filter(Boolean))]
    const restaurantIds = [...new Set(rows.map(r => r.restaurant_id).filter(Boolean))]

    const [requestersResult, restaurantsResult] = await Promise.all([
      requesterIds.length
        ? supabase.from('public_profiles').select('*').in('id', requesterIds)
        : Promise.resolve({ data: [], error: null }),
      restaurantIds.length
        ? supabase.from('restaurants').select('id,name,image_url').in('id', restaurantIds)
        : Promise.resolve({ data: [], error: null }),
    ])

    const requesterMap = Object.fromEntries((requestersResult.data || []).map(p => [p.id, p]))
    const restaurantMap = Object.fromEntries((restaurantsResult.data || []).map(r => [r.id, r]))

    setRequests(rows.map(r => ({
      ...r,
      requester: requesterMap[r.requested_by],
      restaurant: restaurantMap[r.restaurant_id],
    })))
  }

  useEffect(() => {
    loadAuth()
    load()

    if (!supabase) return undefined

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadAuth()
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session && profile) loadRequests()
    else setRequests([])
  }, [session?.user?.id, profile?.role])

  const rows = useMemo(() => {
    return restaurants
      .map(r => {
        const rs = ratings.filter(x => x.restaurant_id === r.id)
        return {
          ...r,
          ratings: rs,
          score: restaurantScore(rs),
        }
      })
      .filter(r => r.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
  }, [restaurants, ratings, search])

  const current = restaurants.find(r => r.id === selected)
  const currentData = current
    ? {
        ...current,
        ratings: ratings.filter(x => x.restaurant_id === current.id),
        score: restaurantScore(ratings.filter(x => x.restaurant_id === current.id)),
      }
    : null

  const canEdit = ['editor', 'admin'].includes(profile?.role)
  const isAdmin = profile?.role === 'admin'
  const pendingCount = requests.filter(r => r.status === 'pending').length

  async function afterSaved(result) {
    setShowForm(false)
    setEditing(null)
    await load()
    await loadRequests()

    if (result?.id) {
      setSelected(result.id)
    }

    setNotice(
      result?.pending
        ? 'Solicitud enviada. Un administrador debe aprobarla antes de publicarla.'
        : 'Cambios guardados correctamente.'
    )

    window.setTimeout(() => setNotice(''), 5000)
  }

  async function deleteRestaurant() {
    if (!current || !isAdmin) return
    if (!confirm(`Eliminar ${current.name}?`)) return

    const { error: deleteError } = await supabase
      .from('restaurants')
      .delete()
      .eq('id', current.id)

    if (deleteError) setError(deleteError.message)
    else {
      setSelected(null)
      await load()
    }
  }

  async function reviewRequest(request, approve) {
    if (!isAdmin) return

    let reviewerNote = null

    if (!approve) {
      reviewerNote = window.prompt('Motivo del rechazo (opcional):', '')
    }

    const { data, error: reviewError } = await supabase.rpc('review_restaurant_request', {
      p_request_id: request.id,
      p_approve: approve,
      p_reviewer_note: reviewerNote || null,
    })

    if (reviewError) {
      setError(reviewError.message)
      return
    }

    setSelectedRequest(null)
    await load()
    await loadRequests()

    if (data?.restaurant_id && approve) {
      setSelected(data.restaurant_id)
    }

    setNotice(approve ? 'Solicitud aprobada.' : 'Solicitud rechazada.')
    window.setTimeout(() => setNotice(''), 5000)
  }

  if (!supabase) {
    return (
      <div className="app">
        <div className="error">
          <strong>No se pudo iniciar la aplicación.</strong>
          <br />
          {supabaseConfigError || 'Configurá VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.'}
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <header>
        <div className="brand">
          <span className="brandIcon">🍔</span>
          <div>
            <h1>Hamburguesitas</h1>
            <p>Ranking de hamburgueserías</p>
          </div>
        </div>

        <div className="headerActions">
          <button
            className="themeToggle"
            onClick={() => setDarkMode(v => !v)}
            title={darkMode ? 'Modo claro' : 'Modo oscuro'}
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {session && (
            <button
              className="requestButton"
              onClick={() => setShowRequests(true)}
              title={isAdmin ? 'Solicitudes de aprobación' : 'Mis solicitudes'}
            >
              <ShieldCheck size={17} />
              <span>{isAdmin ? 'Solicitudes' : 'Mis solicitudes'}</span>
              {pendingCount > 0 && <b>{pendingCount}</b>}
            </button>
          )}

          {session && (
            <button
              className="profileButton"
              onClick={() => setShowProfile(true)}
              title="Mi perfil"
            >
              <User size={17} />
              <span>{profile?.username || 'Perfil'}</span>
            </button>
          )}

          <div className="authWrapper">
            <AuthPanel session={session} profile={profile} onAuthChange={loadAuth} />
          </div>

          {canEdit && (
            <button
              className="primary newButton"
              onClick={() => {
                setEditing(null)
                setShowForm(true)
              }}
            >
              <Plus size={18} />
              Nueva
            </button>
          )}
        </div>
      </header>

      {error && <div className="error">{error}</div>}
      {notice && <div className="notice">{notice}</div>}

      {currentData ? (
        <Detail
          r={currentData}
          session={session}
          profile={profile}
          profiles={profiles}
          canEdit={canEdit}
          onBack={() => setSelected(null)}
          onEdit={() => {
            setEditing(currentData)
            setShowForm(true)
          }}
          onDelete={deleteRestaurant}
          onReload={load}
        />
      ) : (
        <>
          <section className="hero">
            <div>
              <span className="eyebrow">RANKING</span>
              <h2>¿Cuál es la mejor?</h2>
              <p>Evaluaciones ponderadas por categoría y Calidad/Precio.</p>
            </div>
            <div className="heroIcon">🍔</div>
          </section>

          <div className="toolbar">
            <div className="search">
              <Search size={18} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar hamburguesería..."
              />
            </div>

            <div className="toolbarRight">
              <div className="viewToggle" aria-label="Vista">
                <button
                  className={viewMode === 'grid' ? 'active' : ''}
                  onClick={() => setViewMode('grid')}
                  title="Vista de tarjetas"
                  aria-label="Vista de tarjetas"
                >
                  <LayoutGrid size={17} />
                </button>
                <button
                  className={viewMode === 'list' ? 'active' : ''}
                  onClick={() => setViewMode('list')}
                  title="Vista de lista"
                  aria-label="Vista de lista"
                >
                  <List size={17} />
                </button>
              </div>

              <div className="count">{rows.length} lugares</div>
            </div>
          </div>

          {loading ? (
            <div className="empty">Cargando...</div>
          ) : rows.length === 0 ? (
            <div className="empty">
              <h3>Todavía no hay hamburgueserías</h3>
              <p>
                {canEdit
                  ? 'Creá la primera con el botón “Nueva”.'
                  : 'Un editor todavía tiene que cargar la primera hamburguesería.'}
              </p>
            </div>
          ) : (
            <div className={viewMode === 'list' ? 'grid listView' : 'grid'}>
              {rows.map((r, i) => (
                <Card
                  key={r.id}
                  r={r}
                  rank={i + 1}
                  viewMode={viewMode}
                  onClick={() => setSelected(r.id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {showForm && session && (
        <RestaurantForm
          restaurant={editing}
          session={session}
          profile={profile}
          onSaved={afterSaved}
          onClose={() => {
            setShowForm(false)
            setEditing(null)
          }}
        />
      )}

      {showRequests && (
        <RequestsPanel
          requests={requests}
          isAdmin={isAdmin}
          selectedRequest={selectedRequest}
          setSelectedRequest={setSelectedRequest}
          onReview={reviewRequest}
          onClose={() => {
            setShowRequests(false)
            setSelectedRequest(null)
          }}
        />
      )}

      {showProfile && session && profile && (
        <ProfilePanel
          profile={profile}
          onSaved={async () => {
            await loadAuth()
            await load()
          }}
          onClose={() => setShowProfile(false)}
        />
      )}
    </div>
  )
}

function Card({ r, rank, onClick, viewMode }) {
  return (
    <button
      className={viewMode === 'list' ? 'card cardList' : 'card'}
      onClick={onClick}
    >
      {r.image_url ? (
        <img className="cardImage" src={r.image_url} alt="" />
      ) : (
        <div className="cardImage placeholder">🍔</div>
      )}

      <div className="rank">
        {rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : `#${rank}`}
      </div>

      <div className="cardMain">
        <h3>{r.name}</h3>
        <div className="meta">
          {r.ratings.length} evaluación{r.ratings.length === 1 ? '' : 'es'}
        </div>

        <div className="chips">
          {CATS.map(([k, icon, label]) => (
            <span key={k} title={label}>
              {icon} {avg(r.ratings.map(x => x[k]))?.toFixed(1) ?? '—'}
            </span>
          ))}
        </div>
      </div>

      <div className="bigScore">
        {r.score == null ? '—' : r.score.toFixed(2)}
        <small>/10</small>
      </div>
    </button>
  )
}

function Detail({ r, session, profile, profiles, canEdit, onBack, onEdit, onDelete, onReload }) {
  const [expandedReviews, setExpandedReviews] = useState({})
  const [showRating, setShowRating] = useState(false)
  const [editingRating, setEditingRating] = useState(null)
  const [form, setForm] = useState(emptyRating)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function resetRatingForm() {
    setForm(emptyRating)
    setEditingRating(null)
    setError('')
  }

  function openNewRating() {
    resetRatingForm()
    setShowRating(true)
  }

  function openEditRating(rating) {
    setEditingRating(rating)
    setForm({
      burger: rating.burger ?? '',
      fries: rating.fries ?? '',
      price_quality: rating.price_quality ?? '',
      time: rating.time ?? '',
      venue: rating.venue ?? '',
      packaging: rating.packaging ?? '',
      notes: rating.notes ?? '',
    })
    setError('')
    setShowRating(true)
  }

  async function saveRating(e) {
    e.preventDefault()
    if (!session) return

    const comment = form.notes.trim()

    if (!comment) {
      setError('El comentario es obligatorio.')
      return
    }

    setSaving(true)
    setError('')

    const values = Object.fromEntries(
      CATS.map(([key]) => [key, form[key] === '' ? null : Number(form[key])])
    )

    const payload = {
      ...values,
      notes: comment,
    }

    const result = editingRating
      ? await supabase
          .from('ratings')
          .update(payload)
          .eq('id', editingRating.id)
      : await supabase
          .from('ratings')
          .insert({
            restaurant_id: r.id,
            user_id: session.user.id,
            ...payload,
          })

    if (result.error) {
      setError(result.error.message)
    } else {
      setShowRating(false)
      resetRatingForm()
      await onReload()
    }

    setSaving(false)
  }

  async function deleteRating(rating) {
    const isOwner = rating.user_id === session?.user?.id
    const canDelete = isOwner || profile?.role === 'admin'

    if (!canDelete) return
    if (!confirm('¿Eliminar esta evaluación?')) return

    const { error: deleteError } = await supabase
      .from('ratings')
      .delete()
      .eq('id', rating.id)

    if (deleteError) setError(deleteError.message)
    else await onReload()
  }

  return (
    <main className="detail">
      <button className="back" onClick={onBack}>
        <ArrowLeft size={17} />
        Volver al ranking
      </button>

      <div className="detailTop">
        <div className="detailInfo">
          {r.image_url ? (
            <img className="detailImage" src={r.image_url} alt={r.name} />
          ) : (
            <div className="detailImage placeholder">🍔</div>
          )}

          <div>
            <span className="eyebrow">HAMBURGUESERÍA</span>
            <h2>{r.name}</h2>
            <p>{r.description}</p>

            <div className="links">
              {r.website_url && (
                <a href={r.website_url} target="_blank" rel="noreferrer">
                  <ExternalLink size={15} /> Web
                </a>
              )}
              {r.instagram_url && (
                <a href={r.instagram_url} target="_blank" rel="noreferrer">
                  Instagram
                </a>
              )}
              {r.address && (
                <span>
                  <MapPin size={15} /> {r.address}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="scoreCircle">
          <b>{r.score == null ? '—' : r.score.toFixed(2)}</b>
          <span>/10</span>
        </div>
      </div>

      <div className="metricGrid">
        {CATS.map(([k, icon, label, w]) => {
          const v = avg(r.ratings.map(x => x[k]))
          return (
            <div className="metric" key={k}>
              <span>{icon}</span>
              <div>
                <small>
                  {label} · {Math.round(w * 100)}%
                </small>
                <strong>{v == null ? '—' : v.toFixed(1)}</strong>
              </div>
            </div>
          )
        })}
      </div>

      <div className="detailActions">
        {session && (
          <button className="primary" onClick={openNewRating}>
            <Star size={17} /> Evaluar
          </button>
        )}

        {canEdit && (
          <button className="editAction" onClick={onEdit}>
            <Edit3 size={17} />
            {profile?.role === 'admin' ? 'Editar' : 'Solicitar cambios'}
          </button>
        )}

        {profile?.role === 'admin' && (
          <button className="deleteAction" onClick={onDelete}>
            <Trash2 size={17} /> Eliminar
          </button>
        )}
      </div>

      {r.notes && (
        <section className="panel">
          <h3>
            <MessageSquare size={18} /> Notas generales
          </h3>
          <div className="notes">{r.notes}</div>
        </section>
      )}

      <section className="panel">
        <h3>Evaluaciones ({r.ratings.length})</h3>

        {r.ratings.length === 0 ? (
          <div className="muted">Todavía no hay evaluaciones.</div>
        ) : (
          r.ratings.map(x => {
            const owner = x.user_id === session?.user?.id
            const admin = profile?.role === 'admin'
            const reviewer = profiles[x.user_id]?.reviewer_name || 'Usuario'
            const wasUpdated = x.updated_at && x.created_at && x.updated_at !== x.created_at
            const expanded = !!expandedReviews[x.id]
            const score = ratingScore(x)

            return (
              <div className={`review ${expanded ? 'reviewExpanded' : ''}`} key={x.id}>
                <div className="reviewHeader">
                  <div className="reviewAuthor">
                    <b>{reviewer}</b>
                    <strong className="reviewScore">{score?.toFixed(2) ?? '—'}<small>/10</small></strong>
                  </div>

                  <div className="reviewActions">
                    <button
                      className="reviewButton detailReviewButton"
                      onClick={() => setExpandedReviews(prev => ({ ...prev, [x.id]: !prev[x.id] }))}
                      title={expanded ? 'Ocultar detalle' : 'Ver detalle'}
                    >
                      {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      {expanded ? 'Ocultar detalle' : 'Ver detalle'}
                    </button>
                    {owner && (
                      <button
                        className="reviewButton editReviewButton"
                        onClick={() => openEditRating(x)}
                        title="Editar evaluación"
                      >
                        <Edit3 size={13} /> Editar
                      </button>
                    )}

                    {(owner || admin) && (
                      <button
                        className="reviewButton deleteReviewButton"
                        onClick={() => deleteRating(x)}
                        title="Eliminar evaluación"
                      >
                        <Trash2 size={13} /> Eliminar
                      </button>
                    )}
                  </div>
                </div>

                {expanded && (
                  <div className="reviewDetail">
                    <div className="reviewMetricGrid">
                      {CATS.map(([key, icon, label]) => (
                        <div className="reviewMetric" key={key}>
                          <span>{icon}</span>
                          <div><small>{label}</small><b>{x[key] == null ? '—' : Number(x[key]).toFixed(1)}</b></div>
                        </div>
                      ))}
                    </div>
                    <div className="reviewComment">
                      <small>Comentario</small>
                      <p>{x.notes}</p>
                    </div>
                    <span className="reviewDate">
                      {wasUpdated ? 'Actualizada' : 'Creada'}: {formatDate(wasUpdated ? x.updated_at : x.created_at)}
                    </span>
                  </div>
                )}
              </div>
            )
          })
        )}
      </section>

      {error && <div className="error">{error}</div>}

      {showRating && (
        <div className="modalBg">
          <form className="modal" onSubmit={saveRating}>
            <div className="modalHead">
              <div>
                <span className="eyebrow">EVALUACIÓN</span>
                <h2>{editingRating ? 'Editar evaluación' : r.name}</h2>
              </div>

              <button
                type="button"
                className="modalClose"
                onClick={() => {
                  setShowRating(false)
                  resetRatingForm()
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="scoreGrid">
              {CATS.map(([k, icon, label]) => (
                <label key={k}>
                  <span>
                    {icon} {label}
                  </span>
                  <input
                    required
                    type="number"
                    min="0"
                    max="10"
                    step=".1"
                    value={form[k]}
                    onChange={e => setForm({ ...form, [k]: e.target.value })}
                  />
                </label>
              ))}
            </div>

            <label>
              Comentario
              <textarea
                required
                minLength={1}
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
              />
              <span className="fieldHint">El comentario es obligatorio.</span>
            </label>

            {error && <div className="error">{error}</div>}

            <button className="primary wide" disabled={saving}>
              {saving ? <Loader2 size={17} className="spin" /> : <Star size={17} />}
              {saving ? 'Guardando...' : editingRating ? 'Guardar cambios' : 'Guardar evaluación'}
            </button>
          </form>
        </div>
      )}
    </main>
  )
}

function RequestsPanel({ requests, isAdmin, selectedRequest, setSelectedRequest, onReview, onClose }) {
  return (
    <div className="modalBg" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="modal requestsModal">
        <div className="modalHead">
          <div>
            <span className="eyebrow">MODERACIÓN</span>
            <h2>{isAdmin ? 'Solicitudes de aprobación' : 'Mis solicitudes'}</h2>
          </div>
          <button className="modalClose" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {requests.length === 0 ? (
          <div className="empty smallEmpty">
            <ShieldCheck size={30} />
            <h3>No hay solicitudes</h3>
            <p>{isAdmin ? 'No hay solicitudes pendientes o históricas.' : 'Todavía no enviaste ninguna solicitud.'}</p>
          </div>
        ) : (
          <div className="requestList">
            {requests.map(request => {
              const data = request.proposed_data?.restaurant || {}
              const isSelected = selectedRequest?.id === request.id

              return (
                <div className={`requestCard status-${request.status}`} key={request.id}>
                  <div className="requestMain">
                    <div className="requestIcon">
                      {request.status === 'pending' ? <Clock3 size={18} /> : request.status === 'approved' ? <Check size={18} /> : <Ban size={18} />}
                    </div>

                    <div className="requestInfo">
                      <div className="requestTitleRow">
                        <strong>{data.name || request.restaurant?.name || 'Hamburguesería'}</strong>
                        <span className={`statusBadge ${request.status}`}>
                          {request.status === 'pending' ? 'Pendiente' : request.status === 'approved' ? 'Aprobada' : 'Rechazada'}
                        </span>
                      </div>

                      <span>
                        {request.request_type === 'create' ? 'Nueva hamburguesería' : 'Solicitud de cambios'}
                        {isAdmin && request.requester?.reviewer_name ? ` · ${request.requester.reviewer_name}` : ''}
                      </span>
                      <small>{formatDate(request.created_at)}</small>
                    </div>
                  </div>

                  <div className="requestActions">
                    <button className="ghost smallButton" onClick={() => setSelectedRequest(isSelected ? null : request)}>
                      {isSelected ? 'Ocultar' : 'Ver cambios'}
                    </button>

                    {isAdmin && request.status === 'pending' && (
                      <>
                        <button className="approveButton" onClick={() => onReview(request, true)}>
                          <Check size={14} /> Aprobar
                        </button>
                        <button className="rejectButton" onClick={() => onReview(request, false)}>
                          <X size={14} /> Rechazar
                        </button>
                      </>
                    )}
                  </div>

                  {isSelected && <RequestPreview request={request} />}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function RequestPreview({ request }) {
  const data = request.proposed_data?.restaurant || {}
  const initialRating = request.proposed_data?.initial_rating

  const fields = [
    ['Nombre', data.name],
    ['Descripción', data.description],
    ['Dirección', data.address],
    ['Web', data.website_url],
    ['Instagram', data.instagram_url],
    ['Notas', data.notes],
  ]

  return (
    <div className="requestPreview">
      <div className="requestPreviewTitle">Datos propuestos</div>

      {data.image_url && (
        <img className="requestPreviewImage" src={data.image_url} alt="Vista previa" />
      )}

      <div className="requestFields">
        {fields.map(([label, value]) => (
          <div key={label}>
            <small>{label}</small>
            <span>{value || '—'}</span>
          </div>
        ))}
      </div>

      {initialRating?.has_rating && (
        <div className="requestRatingPreview">
          <strong>Primera evaluación incluida</strong>
          <div>
            {CATS.map(([key, icon, label]) => (
              <span key={key}>
                {icon} {initialRating[key] || '—'}
              </span>
            ))}
          </div>
          <p>{initialRating.notes}</p>
        </div>
      )}

      {request.reviewer_note && (
        <div className="requestReviewerNote">
          <strong>Comentario del administrador</strong>
          <p>{request.reviewer_note}</p>
        </div>
      )}
    </div>
  )
}
