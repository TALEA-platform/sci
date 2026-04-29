// TopoJSON loader for the third (spatial aggregation) view.
// Fetches a topojson file, converts it to GeoJSON, and caches the result
// in a small LRU so that toggling layer/month/period back and forth is instant.

import { feature } from 'topojson-client';

const CACHE_LIMIT = 8;
const cache = new Map(); // url -> GeoJSON FeatureCollection

function lruGet(url) {
  if (!cache.has(url)) return null;
  const value = cache.get(url);
  // bump to most-recent
  cache.delete(url);
  cache.set(url, value);
  return value;
}

function lruSet(url, value) {
  if (cache.has(url)) cache.delete(url);
  cache.set(url, value);
  while (cache.size > CACHE_LIMIT) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }
}

/**
 * Load a TopoJSON file and convert it to a GeoJSON FeatureCollection.
 * The first object in `topology.objects` is used (these files have a single
 * object named "data" containing all features).
 */
export async function loadTopojsonAsGeoJson(url) {
  const cached = lruGet(url);
  if (cached) return cached;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load topojson ${url}: ${res.status}`);
  }
  const topology = await res.json();
  const objectName = Object.keys(topology.objects || {})[0];
  if (!objectName) {
    throw new Error(`TopoJSON ${url} has no objects`);
  }
  const geojson = feature(topology, topology.objects[objectName]);
  lruSet(url, geojson);
  return geojson;
}

export function clearTopojsonCache() {
  cache.clear();
}
