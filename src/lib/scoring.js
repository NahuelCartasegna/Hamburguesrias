export const CATS = [
  ['burger', '🍔', 'Hamburguesa', 0.35],
  ['fries', '🍟', 'Papas', 0.25],
  ['price_quality', '💰', 'Calidad/Precio', 0.20],
  ['time', '⏱️', 'Tiempo', 0.10],
  ['venue', '🏪', 'Local', 0.05],
  ['packaging', '📦', 'Packaging', 0.05],
]

export function avg(values) {
  const xs = values.filter(v => v !== null && v !== undefined && v !== '')
  return xs.length ? xs.reduce((a, b) => a + Number(b), 0) / xs.length : null
}

export function ratingScore(rating) {
  const available = CATS.filter(([key]) => rating[key] !== null && rating[key] !== undefined && rating[key] !== '')
  if (!available.length) return null
  const weight = available.reduce((sum, [key, , , w]) => sum + w, 0)
  return available.reduce((sum, [key, , , w]) => sum + Number(rating[key]) * (w / weight), 0)
}

export function restaurantScore(ratings) {
  if (!ratings.length) return null
  const categoryAverages = Object.fromEntries(CATS.map(([key]) => [key, avg(ratings.map(r => r[key]))]))
  const available = CATS.filter(([key]) => categoryAverages[key] !== null)
  if (!available.length) return null
  const weight = available.reduce((sum, [key, , , w]) => sum + w, 0)
  return available.reduce((sum, [key, , , w]) => sum + categoryAverages[key] * (w / weight), 0)
}
