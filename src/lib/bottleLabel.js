export function bottleLabel(b) {
  return b.qualifier ? `${b.bottle} · ${b.qualifier}` : b.bottle
}
