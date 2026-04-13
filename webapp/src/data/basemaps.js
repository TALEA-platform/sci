// Basemap catalog for the Talea shadow webapp.
// Each entry is a plain MapLibre raster-source definition; MapView installs
// the active one as the bottom layer in the map style.
//
// Notes:
//  - Bologna ortophoto comes from the official municipal tile server.
//    Source: https://opendata.comune.bologna.it/explore/dataset/tile-server-ortofoto-comune-di-bologna/
//    The docs publish the tile template under http://; https works in the
//    browser in practice. If mixed-content is ever an issue in production,
//    switch to http:// on that line.
//  - CartoDB light/dark tiles are free to use without a token under the
//    CartoDB basemaps program (ODbL attribution).

export const BASEMAPS = [
  {
    id: 'osm',
    labelKey: 'basemaps.osm',
    tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
    tileSize: 256,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxzoom: 19,
  },
  {
    id: 'cartodb-dark',
    labelKey: 'basemaps.dark',
    tiles: [
      'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
      'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
      'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
    ],
    tileSize: 256,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxzoom: 20,
  },
  {
    id: 'cartodb-light',
    labelKey: 'basemaps.light',
    tiles: [
      'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
      'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
      'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
    ],
    tileSize: 256,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxzoom: 20,
  },
  {
    id: 'bologna-ortho',
    labelKey: 'basemaps.ortho',
    tiles: [
      'https://sitmappe.comune.bologna.it/tms/tileserver/Ortofoto2025/{z}/{x}/{y}.png',
    ],
    tileSize: 256,
    attribution:
      '&copy; Comune di Bologna &mdash; Ortofoto 2025 (<a href="https://opendata.comune.bologna.it/">Open Data</a>)',
    maxzoom: 21,
  },
];

// Look up a basemap by id; falls back to the first entry (OSM).
export function getBasemap(id) {
  return BASEMAPS.find((b) => b.id === id) || BASEMAPS[0];
}

// Per-view default basemap picks.
export const BASEMAP_DEFAULTS = {
  day: 'osm',
  aggregations: 'osm',
  polygons: 'cartodb-dark',
};
