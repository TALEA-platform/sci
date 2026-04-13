import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useT } from '../i18n/I18nContext';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  getColorizedUrl,
  boundsToCoordinates,
} from '../utils/cogLoader';
import { buildPolygonFillExpression } from '../utils/polygonColors';
import { getBasemap } from '../data/basemaps';

// One source/layer per slot. Up to 2 stacked rasters.
const SHADOW_SLOTS = [
  { sourceId: 'shadow-cog-0', layerId: 'shadow-cog-layer-0' },
  { sourceId: 'shadow-cog-1', layerId: 'shadow-cog-layer-1' },
];

// Polygon (View 3) source/layer ids — single set, additive to the COG slots.
const POLY_SOURCE_ID = 'spatial-agg-source';
const POLY_FILL_LAYER = 'spatial-agg-fill';
const POLY_OUTLINE_LAYER = 'spatial-agg-outline';
const POLY_SELECTED_OUTLINE_LAYER = 'spatial-agg-selected-outline';

// Basemap source/layer ids — swapped wholesale when basemapId changes.
const BASEMAP_SOURCE_ID = 'basemap-source';
const BASEMAP_LAYER_ID = 'basemap-layer';

export default function MapView({
  center,
  zoom,
  minZoom,
  maxZoom,
  maxBounds,
  className,
  cogUrl,            // legacy single-URL prop (still supported)
  cogUrls,           // new array prop (1 or 2 entries)
  imageBounds,
  displayMode,
  opacity = 0.85,
  basemapId = 'osm', // basemap catalog id — swapped via effect
  reloadNonce = 0,   // bump to force re-render of the current slot(s)
  onMapReady,
  onLoadingChange,   // (boolean) — true while any COG slot is rendering
  onLoadError,       // (string|null) — error message from the latest failed slot render
  // --- Polygon (View 3) props ---
  polygonGeoJSON,    // GeoJSON FeatureCollection or null
  polygonMetric,     // metric key to read from feature properties
  polygonOpacity = 1,
  polygonFitBoundsTrigger, // bumped by parent to request a one-shot re-fit
  polygonFlyToFeature,     // GeoJSON Feature object — fitBounds to it on change
  polygonSelectedFeatureIdx, // feature_idx of the currently-selected polygon (or null)
  onPolygonHover,    // called with the hovered feature props (or null)
  enableScrollZoom = true,
  children,
}) {
  const t = useT();
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  // One blob URL slot per stacked layer
  const blobUrlsRef = useRef([null, null]);
  // Render-id counters per slot — discard stale renders
  const renderIdsRef = useRef([0, 0]);
  // Loading flags per slot, used to drive `onLoadingChange`.
  const loadingSlotsRef = useRef([false, false]);
  // Per-slot error state for the CURRENT batch.
  //  null  = not yet finished OR succeeded
  //  str   = failed with that message
  const slotErrorsRef = useRef([null, null]);
  // Which slots are part of the current batch (true = expected to render).
  const activeSlotsRef = useRef([false, false]);
  const onLoadingChangeRef = useRef(onLoadingChange);
  const onLoadErrorRef = useRef(onLoadError);
  useEffect(() => { onLoadingChangeRef.current = onLoadingChange; }, [onLoadingChange]);
  useEffect(() => { onLoadErrorRef.current = onLoadError; }, [onLoadError]);

  const notifyLoading = useCallback(() => {
    const any = loadingSlotsRef.current.some(Boolean);
    if (onLoadingChangeRef.current) onLoadingChangeRef.current(any);
  }, []);

  // Aggregate per-slot errors for the current batch and decide what to
  // report to the parent. Rules:
  //  - Wait until every ACTIVE slot has finished (loading flag cleared).
  //  - If at least one active slot succeeded, clear the error — the user
  //    can still see meaningful data, so no banner.
  //  - If all active slots failed, report the first error message.
  // This fixes the BOTH-mode bug where a transient failure in one slot
  // would flash "impossibile caricare" on top of the other slot's
  // successful render.
  const reportErrors = useCallback(() => {
    // Still loading? Defer.
    for (let s = 0; s < SHADOW_SLOTS.length; s++) {
      if (activeSlotsRef.current[s] && loadingSlotsRef.current[s]) return;
    }
    let anySuccess = false;
    let firstError = null;
    for (let s = 0; s < SHADOW_SLOTS.length; s++) {
      if (!activeSlotsRef.current[s]) continue;
      const e = slotErrorsRef.current[s];
      if (e) {
        if (!firstError) firstError = e;
      } else {
        anySuccess = true;
      }
    }
    if (!onLoadErrorRef.current) return;
    if (anySuccess || !firstError) {
      onLoadErrorRef.current(null);
    } else {
      onLoadErrorRef.current(firstError);
    }
  }, []);

  // Normalize incoming URLs to an array (1 or 2 entries)
  const urls = useMemo(() => {
    if (cogUrls && cogUrls.length > 0) return cogUrls.slice(0, SHADOW_SLOTS.length);
    if (cogUrl) return [cogUrl];
    return [];
  }, [cogUrl, cogUrls]);

  // ---- helpers ----

  const revokeSlot = useCallback((slot) => {
    const u = blobUrlsRef.current[slot];
    if (u) {
      URL.revokeObjectURL(u);
      blobUrlsRef.current[slot] = null;
    }
  }, []);

  const removeSlotFromMap = useCallback((slot) => {
    const map = mapRef.current;
    if (!map) return;
    // Bump the render id so any in-flight render for this slot becomes
    // stale and bails on resolve — otherwise a slow ROOF_SURFACE from a
    // previous BOTH batch could re-add itself after switching to GROUND.
    renderIdsRef.current[slot]++;
    loadingSlotsRef.current[slot] = false;
    slotErrorsRef.current[slot] = null;
    const { sourceId, layerId } = SHADOW_SLOTS[slot];
    if (map.getLayer(layerId)) map.removeLayer(layerId);
    if (map.getSource(sourceId)) map.removeSource(sourceId);
    revokeSlot(slot);
  }, [revokeSlot]);

  // Read the live opacity through a ref so `applyBlobToSlot` (and the
  // chain renderSlot → main render effect) does NOT re-create when only
  // opacity changes. The dedicated effect below still pushes opacity
  // updates onto existing layers via `setPaintProperty`.
  const opacityRef = useRef(opacity);
  useEffect(() => { opacityRef.current = opacity; }, [opacity]);

  /** Apply a blob-URL image to a specific stack slot. */
  const applyBlobToSlot = useCallback((slot, blobUrl, bounds) => {
    const map = mapRef.current;
    if (!map) return;

    revokeSlot(slot);
    blobUrlsRef.current[slot] = blobUrl;

    const { sourceId, layerId } = SHADOW_SLOTS[slot];
    const coords = boundsToCoordinates(bounds);
    const source = map.getSource(sourceId);

    if (source) {
      source.updateImage({ url: blobUrl, coordinates: coords });
    } else {
      map.addSource(sourceId, {
        type: 'image',
        url: blobUrl,
        coordinates: coords,
      });
      map.addLayer({
        id: layerId,
        type: 'raster',
        source: sourceId,
        paint: {
          'raster-fade-duration': 0,
          'raster-opacity': opacityRef.current,
        },
      });
    }
  }, [revokeSlot]);

  /**
   * Render pipeline for one slot.
   * Stale renders are discarded if a newer one was started.
   * Errors are recorded per-slot and aggregated via `reportErrors`
   * so a partial BOTH-mode failure does not mask the successful slot.
   */
  const renderSlot = useCallback(async (slot, url, mode, fallbackBounds) => {
    const thisId = ++renderIdsRef.current[slot];
    loadingSlotsRef.current[slot] = true;
    slotErrorsRef.current[slot] = null;
    notifyLoading();
    try {
      const { url: blobUrl, bounds } = await getColorizedUrl(url, mode);
      if (thisId !== renderIdsRef.current[slot]) {
        // A newer render is in flight for this slot — it will manage the flag.
        URL.revokeObjectURL(blobUrl);
        return;
      }
      applyBlobToSlot(slot, blobUrl, bounds || fallbackBounds);
      loadingSlotsRef.current[slot] = false;
      slotErrorsRef.current[slot] = null;
      notifyLoading();
      reportErrors();
    } catch (err) {
      console.error('COG render failed:', err);
      if (thisId === renderIdsRef.current[slot]) {
        loadingSlotsRef.current[slot] = false;
        slotErrorsRef.current[slot] = (err && err.message) || 'Load failed';
        notifyLoading();
        reportErrors();
      }
    }
  }, [applyBlobToSlot, notifyLoading, reportErrors]);

  // ---- initialise map ----

  useEffect(() => {
    if (mapRef.current) return;

    // Start with an empty style — the basemap is installed via a dedicated
    // effect so it can be swapped without disturbing the COG/polygon layers.
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {},
        layers: [],
      },
      center: center || [11.3416, 44.5022],
      zoom: zoom || 16,
      minZoom: typeof minZoom === 'number' ? minZoom : undefined,
      maxZoom: typeof maxZoom === 'number' ? maxZoom : undefined,
      maxBounds: maxBounds || undefined,
      scrollZoom: enableScrollZoom,
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.addControl(new maplibregl.ScaleControl(), 'bottom-left');

    map.on('load', () => {
      mapRef.current = map;
      setMapReady(true);
      if (onMapReady) onMapReady(map);
    });

    return () => {
      for (let s = 0; s < SHADOW_SLOTS.length; s++) revokeSlot(s);
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (enableScrollZoom) {
      map.scrollZoom.enable();
      map.touchZoomRotate.enable();
    } else {
      map.scrollZoom.disable();
      map.touchZoomRotate.disable();
    }
  }, [mapReady, enableScrollZoom]);

  // ---- keep zoom limits in sync when the prop changes (area switch) ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (typeof minZoom === 'number') map.setMinZoom(minZoom);
    else map.setMinZoom(null);
  }, [minZoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (typeof maxZoom === 'number') map.setMaxZoom(maxZoom);
    else map.setMaxZoom(null);
  }, [maxZoom]);

  // ---- area-switch orchestration: fly to new center, THEN re-clamp bounds ----
  // The previous version installed the new `maxBounds` at the same time as
  // (or before) the flyTo. Because the new bounds don't contain the old
  // camera position, MapLibre would snap the camera mid-animation, causing
  // a visible flicker on centro↔fossolo. The fix is to:
  //   1. Lift any existing pan-clamp
  //   2. Start the flyTo
  //   3. Re-install the new pan-clamp once `moveend` fires
  // The `prevCenterRef` tracks whether this is a real area switch (so we
  // don't redundantly orchestrate on first mount or when only the bounds
  // reference changes).
  const prevCenterRef = useRef(null);
  useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current;
    if (!map || !center) return;

    const prev = prevCenterRef.current;
    prevCenterRef.current = [center[0], center[1]];

    // First valid run after the map loads — the constructor already
    // placed the camera and bounds correctly, so just defensively
    // install the bounds and exit.
    if (!prev) {
      if (maxBounds) map.setMaxBounds(maxBounds);
      else map.setMaxBounds(null);
      return;
    }

    // Same center as last run — bounds-only update with no camera move.
    if (prev[0] === center[0] && prev[1] === center[1]) {
      if (maxBounds) map.setMaxBounds(maxBounds);
      else map.setMaxBounds(null);
      return;
    }

    // Real area switch: clear bounds, fly, re-install on moveend.
    map.setMaxBounds(null);
    map.flyTo({
      center,
      zoom: zoom || map.getZoom(),
      duration: 800,
    });
    const onMoveEnd = () => {
      map.off('moveend', onMoveEnd);
      if (maxBounds) map.setMaxBounds(maxBounds);
    };
    map.on('moveend', onMoveEnd);
    return () => {
      map.off('moveend', onMoveEnd);
    };
  }, [mapReady, center?.[0], center?.[1], zoom, maxBounds]);

  // ---- basemap: install / swap the bottom raster layer ----
  useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current;
    if (!map) return;
    const basemap = getBasemap(basemapId);

    // Tear down any existing basemap.
    if (map.getLayer(BASEMAP_LAYER_ID)) map.removeLayer(BASEMAP_LAYER_ID);
    if (map.getSource(BASEMAP_SOURCE_ID)) map.removeSource(BASEMAP_SOURCE_ID);

    map.addSource(BASEMAP_SOURCE_ID, {
      type: 'raster',
      tiles: basemap.tiles,
      tileSize: basemap.tileSize || 256,
      attribution: basemap.attribution || '',
      maxzoom: basemap.maxzoom || 19,
    });

    // Insert the basemap at the bottom of the layer stack so COG/polygon
    // layers stay on top — pick the first existing layer as `beforeId`.
    const layers = map.getStyle().layers || [];
    const beforeId = layers.length > 0 ? layers[0].id : undefined;
    map.addLayer(
      {
        id: BASEMAP_LAYER_ID,
        type: 'raster',
        source: BASEMAP_SOURCE_ID,
        minzoom: 0,
        maxzoom: basemap.maxzoom || 19,
      },
      beforeId,
    );
  }, [mapReady, basemapId]);

  // ---- (re)render slots whenever URLs or display mode change ----
  useEffect(() => {
    if (!mapReady) return;
    const mode = displayMode || 'satellite';
    // Reset the batch error state and mark which slots participate in this
    // batch. Any pending error from a previous batch is cleared immediately
    // so the overlay doesn't linger across selection changes.
    for (let s = 0; s < SHADOW_SLOTS.length; s++) {
      activeSlotsRef.current[s] = !!urls[s];
      slotErrorsRef.current[s] = null;
    }
    if (onLoadErrorRef.current) onLoadErrorRef.current(null);
    // For each slot, either render the new URL or remove the layer.
    for (let s = 0; s < SHADOW_SLOTS.length; s++) {
      const url = urls[s];
      if (url) {
        renderSlot(s, url, mode, imageBounds);
      } else {
        removeSlotFromMap(s);
      }
    }
    // `reloadNonce` is intentionally a dep — bumping it forces a re-render
    // (used by the error overlay's "Riprova" button).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, urls, displayMode, renderSlot, removeSlotFromMap, reloadNonce]);

  // ---- update layer opacity ----

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    for (const { layerId } of SHADOW_SLOTS) {
      if (map.getLayer(layerId)) {
        map.setPaintProperty(layerId, 'raster-opacity', opacity);
      }
    }
  }, [opacity]);

  // ---- polygon (View 3) source/layer management ----
  const polyHoverHandlerRef = useRef(null);
  const polyLeaveHandlerRef = useRef(null);

  // Create / update / remove the polygon source + layers when geojson changes.
  useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current;
    if (!map) return;

    // Tear down if no data.
    if (!polygonGeoJSON) {
      if (polyHoverHandlerRef.current) {
        map.off('mousemove', POLY_FILL_LAYER, polyHoverHandlerRef.current);
        polyHoverHandlerRef.current = null;
      }
      if (polyLeaveHandlerRef.current) {
        map.off('mouseleave', POLY_FILL_LAYER, polyLeaveHandlerRef.current);
        polyLeaveHandlerRef.current = null;
      }
      if (map.getLayer(POLY_SELECTED_OUTLINE_LAYER)) map.removeLayer(POLY_SELECTED_OUTLINE_LAYER);
      if (map.getLayer(POLY_OUTLINE_LAYER)) map.removeLayer(POLY_OUTLINE_LAYER);
      if (map.getLayer(POLY_FILL_LAYER)) map.removeLayer(POLY_FILL_LAYER);
      if (map.getSource(POLY_SOURCE_ID)) map.removeSource(POLY_SOURCE_ID);
      return;
    }

    // Create or update source.
    const existing = map.getSource(POLY_SOURCE_ID);
    if (existing) {
      existing.setData(polygonGeoJSON);
    } else {
      map.addSource(POLY_SOURCE_ID, { type: 'geojson', data: polygonGeoJSON });
    }

    const fillExpr = buildPolygonFillExpression(polygonMetric || 'mean');

    // Fill layer.
    if (!map.getLayer(POLY_FILL_LAYER)) {
      map.addLayer({
        id: POLY_FILL_LAYER,
        type: 'fill',
        source: POLY_SOURCE_ID,
        paint: {
          'fill-color': fillExpr,
          'fill-opacity': polygonOpacity,
        },
      });
    } else {
      map.setPaintProperty(POLY_FILL_LAYER, 'fill-color', fillExpr);
    }

    // Outline layer.
    if (!map.getLayer(POLY_OUTLINE_LAYER)) {
      map.addLayer({
        id: POLY_OUTLINE_LAYER,
        type: 'line',
        source: POLY_SOURCE_ID,
        paint: {
          'line-color': 'rgba(0, 0, 0, 0.35)',
          'line-width': 0.6,
        },
      });
    }

    // Selected-feature outline (drawn on top, filtered to a single feature_idx).
    if (!map.getLayer(POLY_SELECTED_OUTLINE_LAYER)) {
      map.addLayer({
        id: POLY_SELECTED_OUTLINE_LAYER,
        type: 'line',
        source: POLY_SOURCE_ID,
        // Hidden until a row is clicked.
        filter: ['==', ['get', 'feature_idx'], -1],
        paint: {
          'line-color': '#000000',
          'line-width': 2.6,
        },
      });
    }

    // Hover handlers — re-attach so we always pass the latest callback.
    if (polyHoverHandlerRef.current) {
      map.off('mousemove', POLY_FILL_LAYER, polyHoverHandlerRef.current);
    }
    if (polyLeaveHandlerRef.current) {
      map.off('mouseleave', POLY_FILL_LAYER, polyLeaveHandlerRef.current);
    }

    const onMove = (e) => {
      const f = e.features && e.features[0];
      if (onPolygonHover) onPolygonHover(f ? f.properties : null);
      map.getCanvas().style.cursor = 'pointer';
    };
    const onLeave = () => {
      if (onPolygonHover) onPolygonHover(null);
      map.getCanvas().style.cursor = '';
    };
    map.on('mousemove', POLY_FILL_LAYER, onMove);
    map.on('mouseleave', POLY_FILL_LAYER, onLeave);
    polyHoverHandlerRef.current = onMove;
    polyLeaveHandlerRef.current = onLeave;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, polygonGeoJSON, polygonMetric, onPolygonHover]);

  // Live polygon opacity updates (no layer rebuild).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer(POLY_FILL_LAYER)) return;
    map.setPaintProperty(POLY_FILL_LAYER, 'fill-opacity', polygonOpacity);
  }, [polygonOpacity, polygonGeoJSON]);

  // Highlight the currently-selected polygon by feature_idx.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer(POLY_SELECTED_OUTLINE_LAYER)) return;
    if (polygonSelectedFeatureIdx == null) {
      map.setFilter(POLY_SELECTED_OUTLINE_LAYER, ['==', ['get', 'feature_idx'], -1]);
    } else {
      map.setFilter(POLY_SELECTED_OUTLINE_LAYER, [
        '==',
        ['get', 'feature_idx'],
        polygonSelectedFeatureIdx,
      ]);
    }
  }, [polygonSelectedFeatureIdx, polygonGeoJSON]);

  // Walk a GeoJSON coordinate tree and accumulate into a LngLatBounds.
  const walkCoordsIntoBounds = useCallback((coords, bounds) => {
    if (typeof coords[0] === 'number') {
      bounds.extend(coords);
    } else {
      for (const c of coords) walkCoordsIntoBounds(c, bounds);
    }
  }, []);

  // Fit bounds to the polygon layer ONCE per trigger bump (set by parent on layer change).
  useEffect(() => {
    if (!mapReady || !polygonGeoJSON || polygonFitBoundsTrigger == null) return;
    const map = mapRef.current;
    if (!map) return;
    try {
      const bounds = new maplibregl.LngLatBounds();
      for (const f of polygonGeoJSON.features) {
        if (f.geometry && f.geometry.coordinates) walkCoordsIntoBounds(f.geometry.coordinates, bounds);
      }
      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 40, duration: 600, maxZoom: 15 });
      }
    } catch (err) {
      console.warn('polygon fitBounds failed', err);
    }
    // Important: depend on the trigger value, NOT polygonGeoJSON, so changing
    // month/period does not refit the camera on every reload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, polygonFitBoundsTrigger]);

  // Fly to a single polygon feature when one is clicked in the table.
  useEffect(() => {
    if (!mapReady || !polygonFlyToFeature) return;
    const map = mapRef.current;
    if (!map) return;
    try {
      const bounds = new maplibregl.LngLatBounds();
      const geom = polygonFlyToFeature.geometry;
      if (geom && geom.coordinates) walkCoordsIntoBounds(geom.coordinates, bounds);
      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 80, duration: 700, maxZoom: 17 });
      }
    } catch (err) {
      console.warn('polygon flyTo failed', err);
    }
  }, [mapReady, polygonFlyToFeature, walkCoordsIntoBounds]);

  const hasData = urls.length > 0 || !!polygonGeoJSON;

  return (
    <div className={`map-wrapper ${className || ''}`}>
      <div className="map-accent-bar" aria-hidden="true" />
      <div ref={containerRef} className="map-container" />
      <div className="map-vignette" aria-hidden="true" />
      {!hasData && (
        <div className="map-data-placeholder">
          <div className="map-data-placeholder-inner">
            <div className="map-placeholder-icon">
              <svg viewBox="0 0 48 48" width="36" height="36" fill="none" strokeWidth="1.2">
                <rect x="4" y="4" width="40" height="40" rx="6" stroke="currentColor" opacity="0.25" strokeDasharray="4 3" />
                <path d="M12 32l8-10 6 6 8-12 6 8" stroke="currentColor" opacity="0.2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p>{t('mapPlaceholder')}</p>
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
