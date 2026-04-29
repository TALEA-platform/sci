// Basemap catalog for the Talea shadow webapp.
// Street-map styles use OpenFreeMap. The Bologna ortho option remains a
// dedicated raster style from the municipal tile service.

const BOLOGNA_ORTHO_STYLE = {
  version: 8,
  sources: {
    'bologna-ortho-source': {
      type: 'raster',
      tiles: [
        'https://sitmappe.comune.bologna.it/tms/tileserver/Ortofoto2025/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution:
        '&copy; Comune di Bologna &mdash; Ortofoto 2025 (<a href="https://opendata.comune.bologna.it/">Open Data</a>)',
      maxzoom: 21,
    },
  },
  layers: [
    {
      id: 'bologna-ortho-layer',
      type: 'raster',
      source: 'bologna-ortho-source',
      minzoom: 0,
      maxzoom: 21,
    },
  ],
};

export const BASEMAPS = [
  {
    id: 'osm',
    labelKey: 'basemaps.osm',
    styleUrl: 'https://tiles.openfreemap.org/styles/liberty',
  },
  {
    id: 'cartodb-dark',
    labelKey: 'basemaps.dark',
    styleUrl: 'https://tiles.openfreemap.org/styles/dark',
  },
  {
    id: 'cartodb-light',
    labelKey: 'basemaps.light',
    styleUrl: 'https://tiles.openfreemap.org/styles/positron',
  },
  {
    id: 'bologna-ortho',
    labelKey: 'basemaps.ortho',
    style: BOLOGNA_ORTHO_STYLE,
  },
];

// Look up a basemap by id; falls back to the first entry.
export function getBasemap(id) {
  return BASEMAPS.find((b) => b.id === id) || BASEMAPS[0];
}

export function resolveBasemapStyle(basemap) {
  return basemap.style || basemap.styleUrl;
}

// Per-view default basemap picks.
export const BASEMAP_DEFAULTS = {
  day: 'osm',
  aggregations: 'osm',
  polygons: 'cartodb-dark',
};
