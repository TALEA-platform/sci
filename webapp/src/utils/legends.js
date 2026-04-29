import { buildShadowLegendItems } from './shadowEncoding';
import { buildPolygonLegendItemsAbsolute, POLYGON_COLOR_STOPS } from './polygonColors';

// Re-export shadow legend builder
export { buildShadowLegendItems };

// Static fallback for components that don't yet use the dynamic builder
export const SHADOW_LEGEND_ITEMS = [
  { color: '#F8F2E2', label: 'Suolo soleggiato' },
  { color: '#4C6E90', label: 'Suolo in ombra' },
  { color: '#C4A47C', label: 'Superficie rialzata al sole (Edifici, Alberi)' },
  { color: '#504670', label: 'Superficie rialzata in ombra (Edifici, Alberi)' },
];

// Aggregation legend colors with translation keys.
// Sampled at every 10% from the same "urban warm" continuous gradient used by
// the raster colormap in cogLoader.js (cream → deep navy).
const AGGREGATION_COLORS = [
  { color: 'rgb(248, 242, 226)', labelKey: 'legend.aggregation.p0' },
  { color: 'rgb(239, 228, 204)', labelKey: 'legend.aggregation.p10' },
  { color: 'rgb(228, 212, 181)', labelKey: 'legend.aggregation.p20' },
  { color: 'rgb(216, 194, 159)', labelKey: 'legend.aggregation.p30' },
  { color: 'rgb(199, 176, 154)', labelKey: 'legend.aggregation.p40' },
  { color: 'rgb(180, 158, 158)', labelKey: 'legend.aggregation.p50' },
  { color: 'rgb(147, 130, 156)', labelKey: 'legend.aggregation.p60' },
  { color: 'rgb(115, 105, 148)', labelKey: 'legend.aggregation.p70' },
  { color: 'rgb(85,  89,  130)', labelKey: 'legend.aggregation.p80' },
  { color: 'rgb(60,  68,  101)', labelKey: 'legend.aggregation.p90' },
  { color: 'rgb(36,  46,  68)',  labelKey: 'legend.aggregation.p100' },
];

// Grayscale variant — sampled from the aggregationGray gradient in cogLoader.js.
const AGGREGATION_COLORS_GRAY = [
  { color: 'rgb(248, 248, 248)', labelKey: 'legend.aggregation.p0' },
  { color: 'rgb(229, 229, 229)', labelKey: 'legend.aggregation.p10' },
  { color: 'rgb(210, 210, 210)', labelKey: 'legend.aggregation.p20' },
  { color: 'rgb(190, 190, 190)', labelKey: 'legend.aggregation.p30' },
  { color: 'rgb(170, 170, 170)', labelKey: 'legend.aggregation.p40' },
  { color: 'rgb(150, 150, 150)', labelKey: 'legend.aggregation.p50' },
  { color: 'rgb(125, 125, 125)', labelKey: 'legend.aggregation.p60' },
  { color: 'rgb(100, 100, 100)', labelKey: 'legend.aggregation.p70' },
  { color: 'rgb(76,  76,  76)',  labelKey: 'legend.aggregation.p80' },
  { color: 'rgb(52,  52,  52)',  labelKey: 'legend.aggregation.p90' },
  { color: 'rgb(28,  28,  28)',  labelKey: 'legend.aggregation.p100' },
];

// ColorBrewer RdYlBu (11-class divergent) — same stops as the aggregationDiverging
// gradient in cogLoader.js. Red = always sun, yellow = mixed, blue = always shadow.
const AGGREGATION_COLORS_DIVERGING = [
  { color: 'rgb(165,   0,  38)', labelKey: 'legend.aggregation.p0' },
  { color: 'rgb(215,  48,  39)', labelKey: 'legend.aggregation.p10' },
  { color: 'rgb(244, 109,  67)', labelKey: 'legend.aggregation.p20' },
  { color: 'rgb(253, 174,  97)', labelKey: 'legend.aggregation.p30' },
  { color: 'rgb(254, 224, 144)', labelKey: 'legend.aggregation.p40' },
  { color: 'rgb(255, 255, 191)', labelKey: 'legend.aggregation.p50' },
  { color: 'rgb(224, 243, 248)', labelKey: 'legend.aggregation.p60' },
  { color: 'rgb(171, 217, 233)', labelKey: 'legend.aggregation.p70' },
  { color: 'rgb(116, 173, 209)', labelKey: 'legend.aggregation.p80' },
  { color: 'rgb( 69, 117, 180)', labelKey: 'legend.aggregation.p90' },
  { color: 'rgb( 49,  54, 149)', labelKey: 'legend.aggregation.p100' },
];

export function buildAggregationLegendItems(t, mode = 'aggregation') {
  let palette;
  if (mode === 'aggregationGray') palette = AGGREGATION_COLORS_GRAY;
  else if (mode === 'aggregationDiverging') palette = AGGREGATION_COLORS_DIVERGING;
  else palette = AGGREGATION_COLORS;
  return palette.map((item) => ({
    color: item.color,
    label: t(item.labelKey),
  }));
}

// Polygon legend (View 3) — uses the same fixed 0–1 absolute ramp as the
// aggregation legend so the two views feel coherent.
export function buildPolygonLegendItems(t) {
  return buildPolygonLegendItemsAbsolute(t);
}

// Static fallbacks (used before i18n hooks are available)
export const AGGREGATION_LEGEND_ITEMS = AGGREGATION_COLORS.map((item) => ({
  color: item.color,
  label: item.labelKey,
}));

export const POLYGON_LEGEND_ITEMS = POLYGON_COLOR_STOPS.map((item) => ({
  color: item.color,
  label: item.labelKey,
}));
