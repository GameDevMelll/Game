export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const rand = (a, b) => a + Math.random() * (b - a);
export const dist2 = (x1, y1, x2, y2) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return dx * dx + dy * dy;
};
export const angleBetween = (x1, y1, x2, y2) => Math.atan2(y2 - y1, x2 - x1);
export const lerp = (a, b, t) => a + (b - a) * t;
export const lerpColor = (c1, c2, t) => {
  const r = Math.round(lerp(c1.r, c2.r, t));
  const g = Math.round(lerp(c1.g, c2.g, t));
  const b = Math.round(lerp(c1.b, c2.b, t));
  if (c1.a != null || c2.a != null) {
    const a = lerp(c1.a ?? 1, c2.a ?? 1, t);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
  return `rgb(${r}, ${g}, ${b})`;
};
