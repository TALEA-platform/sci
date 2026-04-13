// Color ramp + MapLibre paint expression for the third (spatial aggregation) view.
// Uses the ColorBrewer RdYlBu (Red → Yellow → Blue) divergent palette.
// 0% shadow → red (hot/sun), 100% shadow → blue (cool/shade).
//
// Domain is FIXED at [0, 1]: shadow frequency, NOT a relative ranking. Each polygon
// is computed independently from its own pixels — see the per-polygon disclaimer.

export const POLYGON_COLOR_STOPS = [
  { value: 0.0, color: 'rgb(165, 0, 38)',    labelKey: 'legend.polygon.p0' },
  { value: 0.1, color: 'rgb(215, 48, 39)',   labelKey: 'legend.polygon.p10' },
  { value: 0.2, color: 'rgb(244, 109, 67)',  labelKey: 'legend.polygon.p20' },
  { value: 0.3, color: 'rgb(253, 174, 97)',  labelKey: 'legend.polygon.p30' },
  { value: 0.4, color: 'rgb(254, 224, 144)', labelKey: 'legend.polygon.p40' },
  { value: 0.5, color: 'rgb(255, 255, 191)', labelKey: 'legend.polygon.p50' },
  { value: 0.6, color: 'rgb(224, 243, 248)', labelKey: 'legend.polygon.p60' },
  { value: 0.7, color: 'rgb(171, 217, 233)', labelKey: 'legend.polygon.p70' },
  { value: 0.8, color: 'rgb(116, 173, 209)', labelKey: 'legend.polygon.p80' },
  { value: 0.9, color: 'rgb(69, 117, 180)',  labelKey: 'legend.polygon.p90' },
  { value: 1.0, color: 'rgb(49, 54, 149)',   labelKey: 'legend.polygon.p100' },
];

/**
 * Build a MapLibre `interpolate` paint expression for a fill-color, reading
 * the given metric property from each feature on the fixed [0, 1] domain.
 */
export function buildPolygonFillExpression(metric) {
  const stops = [];
  for (const s of POLYGON_COLOR_STOPS) {
    stops.push(s.value, s.color);
  }
  return [
    'interpolate',
    ['linear'],
    ['coalesce', ['to-number', ['get', metric]], 0],
    ...stops,
  ];
}

/**
 * Resolve a polygon's color client-side (used by DataTable swatches and HoverCard).
 * Mirrors the linear interpolation MapLibre does.
 */
export function getPolygonColorForValue(value) {
  if (value == null || isNaN(value)) return 'rgb(220, 220, 220)';
  const v = Math.max(0, Math.min(1, value));
  const idx = Math.floor(v * (POLYGON_COLOR_STOPS.length - 1));
  const next = Math.min(idx + 1, POLYGON_COLOR_STOPS.length - 1);
  const lo = POLYGON_COLOR_STOPS[idx];
  const hi = POLYGON_COLOR_STOPS[next];
  const span = hi.value - lo.value || 1;
  const t = (v - lo.value) / span;
  const lc = parseRgb(lo.color);
  const hc = parseRgb(hi.color);
  return `rgb(${Math.round(lc[0] + (hc[0] - lc[0]) * t)}, ${Math.round(lc[1] + (hc[1] - lc[1]) * t)}, ${Math.round(lc[2] + (hc[2] - lc[2]) * t)})`;
}

function parseRgb(str) {
  const m = str.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : [200, 200, 200];
}

/**
 * Build the legend items for the polygon view (same 11 swatches as the
 * aggregation legend, so users immediately recognize the scale).
 */
export function buildPolygonLegendItemsAbsolute(t) {
  return POLYGON_COLOR_STOPS.map((s) => ({
    color: s.color,
    label: t(s.labelKey),
  }));
}
