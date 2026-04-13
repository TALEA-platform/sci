// ============================================
// DATA INVENTORY — derived from actual COG files
// ============================================

/**
 * First View (Day Explorer) data manifest.
 * Each area+date combination has its own time range,
 * determined by the 5-degree solar altitude threshold.
 */
export const FIRST_VIEW = {
  basePath: './shadow_first_view/cog_reprojected',
  areas: [
    {
      id: 'centro',
      labelKey: 'config.areas.centro',
      center: [11.3416, 44.5022],
      zoom: 15,
      minZoom: 13.0,
      bounds: [11.3340808, 44.4983247, 11.3491187, 44.5061379], // [west, south, east, north]
      // ~1 km of slack around the data bounds on every side so the user can
      // zoom/pan out comfortably at the new lower minZoom.
      maxBounds: [[11.32144, 44.48934], [11.36176, 44.51513]],
    },
    {
      id: 'fossolo',
      labelKey: 'config.areas.fossolo',
      center: [11.3834, 44.4880],
      zoom: 14.5,
      minZoom: 13.0,
      bounds: [11.3769238, 44.4822883, 11.3899635, 44.4937273],
      // ~1 km of slack around the data bounds on every side.
      maxBounds: [[11.36428, 44.47330], [11.40260, 44.50272]],
    },
  ],
  dates: [
    { id: '20250615', date: '2025-06-15' },
    { id: '20250713', date: '2025-07-13' },
    { id: '20250810', date: '2025-08-10' },
  ],
  /**
   * Available time range per area+date.
   * Times differ because the solar altitude threshold (>5 deg)
   * varies across the year — earlier sunrise in June, later in August.
   */
  timeRanges: {
    'centro_20250615':  { start: '06:15', end: '20:15' },
    'centro_20250713':  { start: '06:30', end: '20:15' },
    'centro_20250810':  { start: '07:00', end: '19:45' },
    'fossolo_20250615': { start: '06:15', end: '20:15' },
    'fossolo_20250713': { start: '06:30', end: '20:15' },
    'fossolo_20250810': { start: '07:00', end: '19:45' },
  },
  step: 15, // minutes between timestamps
};

/**
 * Build the COG file URL for a given selection.
 * Pattern: shadow_YYYYMMDD_HHMM_h1p5m_{area}_cog_3857.tif
 * (reprojected to EPSG:3857 / Web Mercator for native MapLibre rendering)
 */
export function getShadowTileUrl(area, dateId, time) {
  const timeStr = time.replace(':', '');
  return `${FIRST_VIEW.basePath}/${area}/shadow_${dateId}_${timeStr}_h1p5m_${area}_cog_3857.tif`;
}

/**
 * Get the time range for a specific area+date combination.
 */
export function getTimeRange(area, dateId) {
  const key = `${area}_${dateId}`;
  return FIRST_VIEW.timeRanges[key] || { start: '06:00', end: '20:00' };
}

// ============================================
// SECOND VIEW (Aggregations) — temporal averages
// ============================================
//
// Each pixel encodes the *frequency of shadow* during a period:
//   value 0 → always sun, value 1 → always shadow, NaN = nodata.
// Three surface layers per area+month+period:
//   GROUND        — shadow on the ground (NaN where buildings exist above)
//   ROOF_SURFACE  — shadow on building tops (NaN where no building)
//   TOTAL         — pre-computed combined view of both surfaces
//
// File pattern:
//   ombra_{YYYYMM}_{period}_{TYPE}_cog_3857.tif
// stored in:
//   shadow_second_view/{monthFolder}/{area}/
export const SECOND_VIEW = {
  basePath: './shadow_second_view',
  // Areas reuse FIRST_VIEW.areas centers/zooms (same crops).
  monthFolders: {
    '202506': 'giugno',
    '202507': 'luglio',
    '202508': 'agosto',
  },
  months: [
    { id: '202506' },
    { id: '202507' },
    { id: '202508' },
  ],
  periods: [
    { id: 'earlymorning', labelKey: 'config.periods.earlymorning' },
    { id: 'morning',      labelKey: 'config.periods.morning' },
    { id: 'peakthermal',  labelKey: 'config.periods.peakthermal' },
    { id: 'afternoon',    labelKey: 'config.periods.afternoon' },
    { id: 'evening',      labelKey: 'config.periods.evening' },
  ],
  surfaceTypes: [
    { id: 'GROUND',       labelKey: 'config.surfaceTypes.ground' },
    { id: 'ROOF_SURFACE', labelKey: 'config.surfaceTypes.roof' },
    { id: 'BOTH',         labelKey: 'config.surfaceTypes.both' },
    { id: 'TOTAL',        labelKey: 'config.surfaceTypes.total' },
  ],
};

/**
 * Build the COG URL for a single aggregation file.
 * `surfaceType` must be one of: 'GROUND', 'ROOF_SURFACE', 'TOTAL'.
 * For 'BOTH', use getAggregationCogUrls() instead.
 */
export function getAggregationCogUrl(area, monthId, period, surfaceType) {
  const folder = SECOND_VIEW.monthFolders[monthId];
  if (!folder) return null;
  return `${SECOND_VIEW.basePath}/${folder}/${area}/ombra_${monthId}_${period}_${surfaceType}_cog_3857.tif`;
}

/**
 * Build the COG URLs for a surface selection.
 * Returns an array of one URL for GROUND/ROOF_SURFACE/TOTAL,
 * or two URLs (GROUND + ROOF_SURFACE) for BOTH.
 */
export function getAggregationCogUrls(area, monthId, period, surfaceType) {
  if (surfaceType === 'BOTH') {
    return [
      getAggregationCogUrl(area, monthId, period, 'GROUND'),
      getAggregationCogUrl(area, monthId, period, 'ROOF_SURFACE'),
    ].filter(Boolean);
  }
  const url = getAggregationCogUrl(area, monthId, period, surfaceType);
  return url ? [url] : [];
}

// ============================================
// THIRD VIEW (Spatial Aggregation) — TopoJSON polygons
// ============================================
//
// 3 layers × 3 months × 5 periods = 45 TopoJSON files in
// public/shadow_third_view/{folder}/{YYYYMM}_{period}__{filenameSuffix}.topojson
//
// Each feature carries the per-polygon stats: mean, median, std, count,
// pct_ge_25/50/75/90, geometry_area_m2 — all computed independently from the
// pixels inside that polygon (NOT normalized across polygons).

export const THIRD_VIEW_LAYERS = [
  {
    id: 'quartieri',
    labelKey: 'config.polygonLayers.quartieri',
    folder: 'quartieri',
    filenameSuffix: 'quartieri',
    featureCount: 6,
    nameField: 'quartiere',
    // No meaningful secondary identifier — the numeric `cod_quar` would
    // be noise in the table, so the subtitle column is hidden for this layer.
    subtitleField: null,
  },
  {
    id: 'stat_zones',
    labelKey: 'config.polygonLayers.stat_zones',
    folder: 'neighborhoods',
    filenameSuffix: 'stat_zones',
    featureCount: 90,
    nameField: 'area_statistica',
    subtitleField: 'quartiere',
  },
  {
    id: 'green_areas',
    labelKey: 'config.polygonLayers.green_areas',
    folder: 'green_areas',
    filenameSuffix: 'green_areas',
    featureCount: 4152,
    nameField: 'nome',
    subtitleField: 'classe_unita_gestionale',
  },
  {
    id: 'streets',
    labelKey: 'config.polygonLayers.streets',
    folder: 'street',
    filenameSuffix: 'streets',
    featureCount: 10618,
    nameField: 'descrizion',
    subtitleField: 'sede',
  },
];

const THIRD_VIEW_BASE_PATH = './shadow_third_view';

// City-wide pan/zoom clamp for view 3 (covers the Bologna municipality + a generous margin).
// [[west, south], [east, north]]
// Expanded 2.5x vs the original [[11.20, 44.40], [11.50, 44.58]] box so the user can
// zoom further out and see the surrounding territory.
export const BOLOGNA_MAX_BOUNDS = [[10.975, 44.265], [11.725, 44.715]];

/**
 * Build a TopoJSON URL for the third view.
 * Pattern: ./shadow_third_view/{folder}/{YYYYMM}_{period}__{filenameSuffix}.topojson
 */
export function getThirdViewTopojsonUrl(layerId, monthId, period) {
  const layer = THIRD_VIEW_LAYERS.find((l) => l.id === layerId);
  if (!layer) return null;
  return `${THIRD_VIEW_BASE_PATH}/${layer.folder}/${monthId}_${period}__${layer.filenameSuffix}.topojson`;
}

// ============================================
// GLOBAL MANIFEST
// ============================================

export const MANIFEST = {
  // Areas are shared across views but View 1 uses FIRST_VIEW.areas
  areas: FIRST_VIEW.areas,
  months: [
    { id: '202506' },
    { id: '202507' },
    { id: '202508' },
  ],
  periods: [
    { id: 'month', labelKey: 'config.periods.month', startHour: 6, endHour: 20 },
    { id: 'earlymorning', labelKey: 'config.periods.earlymorning', startHour: 6, endHour: 9 },
    { id: 'morning', labelKey: 'config.periods.morning', startHour: 9, endHour: 12 },
    { id: 'peakthermal', labelKey: 'config.periods.peakthermal', startHour: 12, endHour: 15 },
    { id: 'afternoon', labelKey: 'config.periods.afternoon', startHour: 15, endHour: 18 },
    { id: 'evening', labelKey: 'config.periods.evening', startHour: 18, endHour: 20 },
  ],
  // View 3 uses these — only the 5 actual periods, no full-month aggregate.
  thirdViewPeriods: [
    { id: 'earlymorning', labelKey: 'config.periods.earlymorning' },
    { id: 'morning',      labelKey: 'config.periods.morning' },
    { id: 'peakthermal',  labelKey: 'config.periods.peakthermal' },
    { id: 'afternoon',    labelKey: 'config.periods.afternoon' },
    { id: 'evening',      labelKey: 'config.periods.evening' },
  ],
  polygonLayers: THIRD_VIEW_LAYERS,
  metrics: [
    { id: 'mean', labelKey: 'config.metrics.mean.label', descriptionKey: 'config.metrics.mean.description' },
    { id: 'median', labelKey: 'config.metrics.median.label', descriptionKey: 'config.metrics.median.description' },
  ],
  defaults: {
    view: 'day',
    area: 'centro',
    date: '20250615',
    time: '12:00',
    month: '202506',
    period: 'peakthermal',
    polygonLayer: 'streets',
    metric: 'mean',
    surfaceType: 'BOTH',
  },
};
