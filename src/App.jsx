import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  ExternalLink,
  LayoutGrid,
  List,
  MapPin,
  MessageSquare,
  Moon,
  Pencil,
  Plus,
  Search,
  Star,
  Sun,
  Trash2,
  X
} from 'lucide-react'

import { supabase } from './lib/supabase'
import { CATS, avg, ratingScore, restaurantScore } from './lib/scoring'
import AuthPanel from './components/AuthPanel'
import RestaurantForm from './components/RestaurantForm'

export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)

  const [restaurants, setRestaurants] = useState([])
  const [ratings, setRatings] = useState([])
  const [profiles, setProfiles] = useState({})

  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)

  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('hamburguesitas-theme') === 'dark'
  })

  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('hamburguesitas-view') || 'grid'
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)

    localStorage.setItem(
      'hamburguesitas-theme',
      darkMode ? 'dark' : 'light'
    )
  }, [darkMode])

  useEffect(() => {
    localStorage.setItem('hamburguesitas-view', viewMode)
  }, [viewMode])

  async function loadAuth() {
    if (!supabase) return

    const {
      data: { session }
    } = await supabase.auth.getSession()

    setSession(session)

    if (session) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      setProfile(data)
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

    const [r, ra, p] = await Promise.all([
      supabase
        .from('restaurants')
        .select('*')
        .order('name'),

      supabase
        .from('ratings')
        .select('*')
        .order('created_at'),

      supabase
        .from('public_profiles')
        .select('id, display_name, avatar_url')
    ])

    if (r.error || ra.error || p.error) {
      setError(
        r.error?.message ||
        ra.error?.message ||
        p.error?.message
      )
    } else {
      setRestaurants(r.data || [])
      setRatings(ra.data || [])

      const profilesMap = Object.fromEntries(
        (p.data || []).map(profile => [
          profile.id,
          profile
        ])
      )

      setProfiles(profilesMap)
    }

    setLoading(false)
  }

  useEffect(() => {
    loadAuth()
    load()

    if (!supabase) return

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(() => {
      loadAuth()
    })

    return () => subscription.unsubscribe()
  }, [])

  const rows = useMemo(
    () =>
      restaurants
        .map(r => {
          const rs = ratings.filter(
            x => x.restaurant_id === r.id
          )

          return {
            ...r,
            ratings: rs,
            score: restaurantScore(rs)
          }
        })
        .filter(r =>
          r.name
            .toLowerCase()
            .includes(search.toLowerCase())
        )
        .sort(
          (a, b) =>
            (b.score ?? -1) -
            (a.score ?? -1)
        ),
    [restaurants, ratings, search]
  )

  const current = restaurants.find(
    r => r.id === selected
  )

  const currentData = current
    ? {
        ...current,
        ratings: ratings.filter(
          x => x.restaurant_id === current.id
        ),
        score: restaurantScore(
          ratings.filter(
            x => x.restaurant_id === current.id
          )
        )
      }
    : null

  const canEdit = ['editor', 'admin'].includes(
    profile?.role
  )

  async function afterSaved(id) {
    setShowForm(false)
    setEditing(null)

    await load()

    setSelected(id)
  }

  async function deleteRestaurant() {
    if (
      !current ||
      profile?.role !== 'admin'
    ) {
      return
    }

    if (
      !confirm(`¿Eliminar ${current.name}?`)
    ) {
      return
    }

    const { error } = await supabase
      .from('restaurants')
      .delete()
      .eq('id', current.id)

    if (error) {
      setError(error.message)
    } else {
      setSelected(null)
      await load()
    }
  }

  if (!supabase) {
    return (
      <div className="app">
        <div className="error">
          Configurá VITE_SUPABASE_URL y
          VITE_SUPABASE_ANON_KEY.
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
            onClick={() =>
              setDarkMode(current => !current)
            }
            title={
              darkMode
                ? 'Cambiar a modo claro'
                : 'Cambiar a modo oscuro'
            }
          >
            {darkMode ? (
              <Sun size={18} />
            ) : (
              <Moon size={18} />
            )}
          </button>

          <div className="authWrapper">
            <AuthPanel
              session={session}
              profile={profile}
              onAuthChange={loadAuth}
            />
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

      {error && (
        <div className="error">
          {error}
        </div>
      )}

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
              <span className="eyebrow">
                RANKING
              </span>

              <h2>¿Cuál es la mejor?</h2>

              <p>
                Evaluaciones ponderadas por
                categoría y Calidad/Precio.
              </p>
            </div>

            <div className="heroIcon">
              🍔
            </div>
          </section>

          <div className="toolbar">
            <div className="search">
              <Search size={18} />

              <input
                value={search}
                onChange={e =>
                  setSearch(e.target.value)
                }
                placeholder="Buscar hamburguesería..."
              />
            </div>

            <div className="toolbarRight">
              <div className="count">
                {rows.length} lugares
              </div>

              <div className="viewToggle">
                <button
                  className={
                    viewMode === 'grid'
                      ? 'active'
                      : ''
                  }
                  onClick={() =>
                    setViewMode('grid')
                  }
                  title="Vista en cuadrícula"
                  aria-label="Vista en cuadrícula"
                >
                  <LayoutGrid size={17} />
                </button>

                <button
                  className={
                    viewMode === 'list'
                      ? 'active'
                      : ''
                  }
                  onClick={() =>
                    setViewMode('list')
                  }
                  title="Vista en lista"
                  aria-label="Vista en lista"
                >
                  <List size={18} />
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="empty">
              Cargando...
            </div>
          ) : rows.length === 0 ? (
            <div className="empty">
              <h3>
                Todavía no hay hamburgueserías
              </h3>

              <p>
                {canEdit
                  ? 'Creá la primera con el botón “Nueva”.'
                  : 'Un editor todavía tiene que cargar la primera hamburguesería.'}
              </p>
            </div>
          ) : (
            <div
              className={
                viewMode === 'list'
                  ? 'grid listView'
                  : 'grid'
              }
            >
              {rows.map((r, i) => (
                <Card
                  key={r.id}
                  r={r}
                  rank={i + 1}
                  viewMode={viewMode}
                  onClick={() =>
                    setSelected(r.id)
                  }
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
          onSaved={afterSaved}
          onClose={() => {
            setShowForm(false)
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}

function Card({
  r,
  rank,
  viewMode,
  onClick
}) {
  return (
    <button
      className={`card ${
        viewMode === 'list'
          ? 'cardList'
          : ''
      }`}
      onClick={onClick}
    >
      {r.image_url ? (
        <img
          className="cardImage"
          src={r.image_url}
          alt=""
        />
      ) : (
        <div className="cardImage placeholder">
          🍔
        </div>
      )}

      <div className="rank">
        {rank <= 3
          ? ['🥇', '🥈', '🥉'][rank - 1]
          : `#${rank}`}
      </div>

      <div className="cardMain">
        <h3>{r.name}</h3>

        <div className="meta">
          {r.ratings.length} evaluación
          {r.ratings.length === 1
            ? ''
            : 'es'}
        </div>

        <div className="chips">
          {CATS.map(
            ([k, icon]) => (
              <span key={k}>
                {icon}{' '}
                {avg(
                  r.ratings.map(
                    x => x[k]
                  )
                )?.toFixed(1) ?? '—'}
              </span>
            )
          )}
        </div>
      </div>

      <div className="bigScore">
        {r.score == null
          ? '—'
          : r.score.toFixed(2)}

        <small>/10</small>
      </div>
    </button>
  )
}

function formatDate(date) {
  if (!date) return ''

  return new Intl.DateTimeFormat(
    'es-AR',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }
  ).format(new Date(date))
}

function Detail({
  r,
  session,
  profile,
  profiles,
  canEdit,
  onBack,
  onEdit,
  onDelete,
  onReload
}) {
  const [showRating, setShowRating] =
    useState(false)

  const [editingRating, setEditingRating] =
    useState(null)

  const [form, setForm] = useState({
    burger: '',
    fries: '',
    price_quality: '',
    time: '',
    venue: '',
    packaging: '',
    notes: ''
  })

  const [saving, setSaving] =
    useState(false)

  const [error, setError] =
    useState('')

  function openNewRating() {
    setEditingRating(null)

    setForm({
      burger: '',
      fries: '',
      price_quality: '',
      time: '',
      venue: '',
      packaging: '',
      notes: ''
    })

    setError('')
    setShowRating(true)
  }

  function openEditRating(rating) {
    setEditingRating(rating)

    setForm({
      burger: rating.burger ?? '',
      fries: rating.fries ?? '',
      price_quality:
        rating.price_quality ?? '',
      time: rating.time ?? '',
      venue: rating.venue ?? '',
      packaging: rating.packaging ?? '',
      notes: rating.notes ?? ''
    })

    setError('')
    setShowRating(true)
  }

  async function saveRating(e) {
    e.preventDefault()

    if (!session) return

    const comment = form.notes.trim()

    if (!comment) {
      setError(
        'El comentario es obligatorio.'
      )
      return
    }

    setSaving(true)
    setError('')

    const values =
      Object.fromEntries(
        CATS.map(([key]) => [
          key,
          form[key] === ''
            ? null
            : Number(form[key])
        ])
      )

    let result

    if (editingRating) {
      result = await supabase
        .from('ratings')
        .update({
          ...values,
          notes: comment
        })
        .eq('id', editingRating.id)
    } else {
      result = await supabase
        .from('ratings')
        .insert({
          restaurant_id: r.id,
          user_id: session.user.id,
          ...values,
          notes: comment
        })
    }

    if (result.error) {
      setError(result.error.message)
      setSaving(false)
      return
    }

    setShowRating(false)
    setEditingRating(null)

    setForm({
      burger: '',
      fries: '',
      price_quality: '',
      time: '',
      venue: '',
      packaging: '',
      notes: ''
    })

    await onReload()

    setSaving(false)
  }

  async function deleteRating(rating) {
    if (!profile) return

    const isAdmin =
      profile.role === 'admin'

    const isOwner =
      rating.user_id ===
      session?.user?.id

    if (!isAdmin && !isOwner) {
      return
    }

    const username =
      profiles[rating.user_id]
        ?.display_name ||
      'este usuario'

    if (
      !confirm(
        `¿Eliminar la evaluación de ${username}?`
      )
    ) {
      return
    }

    const { error } =
      await supabase
        .from('ratings')
        .delete()
        .eq('id', rating.id)

    if (error) {
      setError(error.message)
      return
    }

    await onReload()
  }

  return (
    <main className="detail">
      <button
        className="back"
        onClick={onBack}
      >
        <ArrowLeft size={17} />
        Volver al ranking
      </button>

      <div className="detailTop">
        <div className="detailInfo">
          {r.image_url ? (
            <img
              className="detailImage"
              src={r.image_url}
              alt={r.name}
            />
          ) : (
            <div className="detailImage placeholder">
              🍔
            </div>
          )}

          <div>
            <span className="eyebrow">
              HAMBURGUESERÍA
            </span>

            <h2>{r.name}</h2>

            {r.description && (
              <p>{r.description}</p>
            )}

            <div className="links">
              {r.website_url && (
                <a
                  href={r.website_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink size={15} />
                  Web
                </a>
              )}

              {r.instagram_url && (
                <a
                  href={r.instagram_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Instagram
                </a>
              )}

              {r.address && (
                <span>
                  <MapPin size={15} />
                  {r.address}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="scoreCircle">
          <b>
            {r.score == null
              ? '—'
              : r.score.toFixed(2)}
          </b>

          <span>/10</span>
        </div>
      </div>

      <div className="metricGrid">
        {CATS.map(
          ([k, icon, label, w]) => {
            const v = avg(
              r.ratings.map(
                x => x[k]
              )
            )

            return (
              <div
                className="metric"
                key={k}
              >
                <span>{icon}</span>

                <div>
                  <small>
                    {label} ·{' '}
                    {Math.round(
                      w * 100
                    )}
                    %
                  </small>

                  <strong>
                    {v == null
                      ? '—'
                      : v.toFixed(1)}
                  </strong>
                </div>
              </div>
            )
          }
        )}
      </div>

      <div className="detailActions">
        {session && (
          <button
            className="primary"
            onClick={openNewRating}
          >
            <Star size={17} />
            Evaluar
          </button>
        )}

        {canEdit && (
          <button
            className="editAction"
            onClick={onEdit}
          >
            <Pencil size={16} />
            Editar hamburguesería
          </button>
        )}

        {profile?.role ===
          'admin' && (
          <button
            className="deleteAction"
            onClick={onDelete}
          >
            <Trash2 size={16} />
            Eliminar hamburguesería
          </button>
        )}
      </div>

      {r.notes && (
        <section className="panel">
          <h3>
            <MessageSquare
              size={18}
            />
            Notas generales
          </h3>

          <div className="notes">
            {r.notes}
          </div>
        </section>
      )}

      <section className="panel">
        <h3>
          Evaluaciones (
          {r.ratings.length})
        </h3>

        {error && (
          <div className="error">
            {error}
          </div>
        )}

        {r.ratings.length ===
        0 ? (
          <div className="muted">
            Todavía no hay
            evaluaciones.
          </div>
        ) : (
          r.ratings.map(x => {
            const isOwner =
              x.user_id ===
              session?.user?.id

            const isAdmin =
              profile?.role ===
              'admin'

            return (
              <div
                className="review"
                key={x.id}
              >
                <div className="reviewHeader">
                  <div className="reviewAuthor">
                    <b>
                      {profiles[
                        x.user_id
                      ]?.display_name ||
                        'Usuario'}
                    </b>

                    <span>
                      {ratingScore(
                        x
                      )?.toFixed(2) ??
                        'Sin puntaje'}
                      /10
                    </span>
                  </div>

                  <div className="reviewActions">
                    {isOwner && (
                      <button
                        className="reviewButton editReviewButton"
                        onClick={() =>
                          openEditRating(
                            x
                          )
                        }
                        title="Editar evaluación"
                      >
                        <Pencil
                          size={14}
                        />
                        Editar
                      </button>
                    )}

                    {isAdmin && (
                      <button
                        className="reviewButton deleteReviewButton"
                        onClick={() =>
                          deleteRating(
                            x
                          )
                        }
                        title="Eliminar evaluación"
                      >
                        <Trash2
                          size={14}
                        />
                        Eliminar
                      </button>
                    )}
                  </div>
                </div>

                {x.notes && (
                  <p>{x.notes}</p>
                )}

                <small className="reviewDate">
                  {x.updated_at &&
                  x.updated_at !==
                    x.created_at
                    ? `Actualizada: ${formatDate(
                        x.updated_at
                      )}`
                    : `Creada: ${formatDate(
                        x.created_at
                      )}`}
                </small>
              </div>
            )
          })
        )}
      </section>

      {showRating && (
        <div className="modalBg">
          <form
            className="modal"
            onSubmit={saveRating}
          >
            <div className="modalHead">
              <div>
                <span className="eyebrow">
                  {editingRating
                    ? 'EDITAR EVALUACIÓN'
                    : 'EVALUACIÓN'}
                </span>

                <h2>{r.name}</h2>
              </div>

              <button
                type="button"
                className="modalClose"
                onClick={() =>
                  setShowRating(
                    false
                  )
                }
                title="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="scoreGrid">
              {CATS.map(
                ([k, icon, label]) => (
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
                      value={
                        form[k]
                      }
                      onChange={e =>
                        setForm({
                          ...form,
                          [k]:
                            e.target
                              .value
                        })
                      }
                    />
                  </label>
                )
              )}
            </div>

            <label>
              Comentario *

              <textarea
                required
                value={form.notes}
                onChange={e =>
                  setForm({
                    ...form,
                    notes:
                      e.target.value
                  })
                }
                placeholder="Contanos qué te pareció..."
              />

              <small className="fieldHint">
                El comentario es
                obligatorio.
              </small>
            </label>

            {error && (
              <div className="error">
                {error}
              </div>
            )}

            <button
              className="primary wide"
              disabled={saving}
            >
              {saving
                ? 'Guardando...'
                : editingRating
                  ? 'Guardar cambios'
                  : 'Guardar evaluación'}
            </button>
          </form>
        </div>
      )}
    </main>
  )
}