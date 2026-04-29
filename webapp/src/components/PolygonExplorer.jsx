import { useState, useMemo, useRef, useEffect } from 'react';
import { useI18n, useT } from '../i18n/I18nContext';
import MapView from './MapView';
import Legend from './Legend';
import InfoDrawer from './InfoDrawer';
import DataTable from './DataTable';
import HoverCard from './HoverCard';
import BasemapSelector from './BasemapSelector';
import { MANIFEST, getThirdViewTopojsonUrl, BOLOGNA_MAX_BOUNDS } from '../data/config';
import { BASEMAP_DEFAULTS } from '../data/basemaps';
import { buildPolygonLegendItems } from '../utils/legends';
import { loadTopojsonAsGeoJson } from '../utils/topojsonLoader';
import { getMonthLabel, resolveLabel } from '../utils/i18nHelpers';

export default function PolygonExplorer({
  selectedMonth, setSelectedMonth,
  selectedPeriod, setSelectedPeriod,
  selectedPolygonLayer, setSelectedPolygonLayer,
  selectedMetric, setSelectedMetric,
}) {
  const { lang } = useI18n();
  const t = useT();
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [hoveredFeature, setHoveredFeature] = useState(null);
  const [geojson, setGeojson] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showLoading, setShowLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [polygonOpacity, setPolygonOpacity] = useState(100);
  const [fitBoundsTrigger, setFitBoundsTrigger] = useState(0);
  const [flyToFeature, setFlyToFeature] = useState(null);
  const [selectedFeatureKey, setSelectedFeatureKey] = useState(null);
  const [selectedFeatureIdx, setSelectedFeatureIdx] = useState(null);
  const [basemapId, setBasemapId] = useState(BASEMAP_DEFAULTS.polygons);
  const [reloadKey, setReloadKey] = useState(0);
  const infoBtnRef = useRef(null);
  const mapSectionRef = useRef(null);
  const reqIdRef = useRef(0);
  const loadingDelayRef = useRef(null);
  // Set when the layer changes; the loader bumps fitBoundsTrigger only
  // AFTER the new geojson is committed, so the camera fit always uses the
  // new bounds (not the previous layer's stale data).
  const pendingFitRef = useRef(true);

  // Debounce the loading overlay so quick swaps (cached topojson) never flash.
  useEffect(() => {
    if (loadingDelayRef.current) clearTimeout(loadingDelayRef.current);
    if (isLoading) {
      loadingDelayRef.current = setTimeout(() => setShowLoading(true), 250);
    } else {
      setShowLoading(false);
    }
    return () => {
      if (loadingDelayRef.current) clearTimeout(loadingDelayRef.current);
    };
  }, [isLoading]);

  // If the selected period isn't available in View 3 (e.g. "month"),
  // snap to the first valid one.
  useEffect(() => {
    const valid = MANIFEST.thirdViewPeriods.some((p) => p.id === selectedPeriod);
    if (!valid) {
      setSelectedPeriod(MANIFEST.thirdViewPeriods[0].id);
    }
  }, [selectedPeriod, setSelectedPeriod]);

  const layerConfig = MANIFEST.polygonLayers.find((l) => l.id === selectedPolygonLayer);
  const periodConfig = MANIFEST.thirdViewPeriods.find((p) => p.id === selectedPeriod);
  const metricConfig = MANIFEST.metrics.find((m) => m.id === selectedMetric);

  const layerLabel = resolveLabel(layerConfig, t);
  const metricLabel = resolveLabel(metricConfig, t);

  // Reset search + selection and queue a re-fit when layer changes.
  // The fit itself runs after the new geojson loads (see loader effect)
  // so the camera always lands on the NEW layer's bounds, not the old.
  useEffect(() => {
    setSearchQuery('');
    setSelectedFeatureKey(null);
    setSelectedFeatureIdx(null);
    setFlyToFeature(null);
    pendingFitRef.current = true;
  }, [selectedPolygonLayer]);

  // Load topojson when layer/month/period change. `reloadKey` lets the
  // error-overlay "Riprova" button force a fresh load.
  useEffect(() => {
    if (!layerConfig || !periodConfig) return;
    const url = getThirdViewTopojsonUrl(selectedPolygonLayer, selectedMonth, selectedPeriod);
    if (!url) return;

    const myReq = ++reqIdRef.current;
    setIsLoading(true);
    setLoadError(null);
    setHoveredFeature(null);

    loadTopojsonAsGeoJson(url)
      .then((data) => {
        if (myReq !== reqIdRef.current) return; // stale
        setGeojson(data);
        setIsLoading(false);
        // Re-fit only if a layer change is pending — month/period changes
        // should NOT move the camera.
        if (pendingFitRef.current) {
          pendingFitRef.current = false;
          setFitBoundsTrigger((n) => n + 1);
        }
      })
      .catch((err) => {
        if (myReq !== reqIdRef.current) return;
        console.error('topojson load failed:', err);
        setLoadError(err.message || 'Load failed');
        setGeojson(null);
        setIsLoading(false);
      });
  }, [selectedPolygonLayer, selectedMonth, selectedPeriod, layerConfig, periodConfig, reloadKey]);

  // Build the rows for the data table from the geojson features.
  const tableRows = useMemo(() => {
    if (!geojson || !geojson.features) return [];
    return geojson.features.map((f) => f.properties || {});
  }, [geojson]);

  // Click a row → fly to that feature on the map and outline it in black.
  const handleRowClick = (row) => {
    if (!geojson || !geojson.features || !layerConfig) return;
    const idx = row.feature_idx;
    let feature = null;
    if (idx != null) {
      feature = geojson.features.find((f) => f.properties && f.properties.feature_idx === idx) || null;
    }
    if (!feature) {
      // Fallback: match by name field.
      const nameField = layerConfig.nameField;
      const target = row[nameField];
      feature = geojson.features.find((f) => f.properties && f.properties[nameField] === target) || null;
    }
    if (!feature) return;
    setFlyToFeature(feature);
    if (mapSectionRef.current) {
      mapSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    // Use the same key shape DataTable uses for its row React keys.
    setSelectedFeatureKey(idx ?? row[layerConfig.nameField] ?? null);
    // Selected feature_idx drives the black outline layer in MapView.
    const resolvedIdx = feature.properties && feature.properties.feature_idx;
    setSelectedFeatureIdx(typeof resolvedIdx === 'number' ? resolvedIdx : null);
  };

  return (
    <div className="explorer polygon-explorer">
      <div className="explorer-header">
        <div className="explorer-text">
          <span className="explorer-view-number">{t('polygonExplorer.viewNumber')}</span>
          <div className="explorer-title-row">
            <h2>{t('polygonExplorer.title')}</h2>
            <button
              ref={infoBtnRef}
              className="info-button"
              onClick={() => setIsInfoOpen(true)}
              type="button"
              aria-label={t('common.information')}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4M12 8h.01" />
              </svg>
              <span className="info-button-label">{t('common.info')}</span>
            </button>
          </div>
          <span className="explorer-eyebrow">{t('polygonExplorer.eyebrow')}</span>
          <p>{t('polygonExplorer.description')}</p>
        </div>
      </div>

      <div className="controls-bar">
        <div className="control-group">
          <label htmlFor="poly-layer">{t('controls.layer')}</label>
          <select id="poly-layer" value={selectedPolygonLayer} onChange={(e) => setSelectedPolygonLayer(e.target.value)}>
            {MANIFEST.polygonLayers.map((l) => (
              <option key={l.id} value={l.id}>{resolveLabel(l, t)}</option>
            ))}
          </select>
        </div>
        <div className="control-group">
          <label htmlFor="poly-month">{t('controls.month')}</label>
          <select id="poly-month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
            {MANIFEST.months.map((m) => (
              <option key={m.id} value={m.id}>{getMonthLabel(m.id, lang)}</option>
            ))}
          </select>
        </div>
        <div className="control-group">
          <label htmlFor="poly-period">{t('controls.period')}</label>
          <select id="poly-period" value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)}>
            {MANIFEST.thirdViewPeriods.map((p) => (
              <option key={p.id} value={p.id}>{resolveLabel(p, t)}</option>
            ))}
          </select>
        </div>
        <div className="control-group">
          <label htmlFor="poly-metric">{t('controls.metric')}</label>
          <select id="poly-metric" value={selectedMetric} onChange={(e) => setSelectedMetric(e.target.value)}>
            {MANIFEST.metrics.map((m) => (
              <option key={m.id} value={m.id}>{resolveLabel(m, t)}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="map-section" ref={mapSectionRef}>
        <MapView
          center={[11.3426, 44.4949]}
          zoom={11.4}
          minZoom={9.5}
          maxZoom={18}
          maxBounds={BOLOGNA_MAX_BOUNDS}
          className="explorer-map"
          basemapId={basemapId}
          polygonGeoJSON={geojson}
          polygonMetric={selectedMetric}
          polygonOpacity={polygonOpacity / 100}
          polygonFitBoundsTrigger={fitBoundsTrigger}
          polygonFlyToFeature={flyToFeature}
          polygonSelectedFeatureIdx={selectedFeatureIdx}
          onPolygonHover={setHoveredFeature}
        />
        <BasemapSelector value={basemapId} onChange={setBasemapId} />
        <Legend items={buildPolygonLegendItems(t)} title={`${layerLabel} \u2014 ${metricLabel}`} />
        {hoveredFeature && (
          <HoverCard
            feature={hoveredFeature}
            layerConfig={layerConfig}
            t={t}
          />
        )}

        <div className="map-opacity-control">
          <label htmlFor="poly-opacity">{t('controls.opacity')}:</label>
          <input
            id="poly-opacity"
            type="range"
            className="map-opacity-slider"
            min={10}
            max={100}
            step={5}
            value={polygonOpacity}
            onChange={(e) => setPolygonOpacity(Number(e.target.value))}
          />
          <span className="map-opacity-value">{polygonOpacity}%</span>
        </div>

        {showLoading && (
          <div className="map-loading-overlay" aria-live="polite">
            <div className="map-loading-spinner" />
            <span>{t('polygonExplorer.loading')}</span>
          </div>
        )}
        {loadError && !isLoading && (
          <div className="map-loading-overlay map-loading-overlay--error">
            <span>{t('polygonExplorer.loadError')}</span>
            <button
              type="button"
              className="map-loading-retry-btn"
              onClick={() => {
                setLoadError(null);
                setReloadKey((n) => n + 1);
              }}
            >
              {t('common.retry')}
            </button>
          </div>
        )}
      </div>

      <DataTable
        rows={tableRows}
        metricKey={selectedMetric}
        metricLabel={metricLabel}
        layerLabel={layerLabel}
        layerConfig={layerConfig}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onRowClick={handleRowClick}
        selectedFeatureKey={selectedFeatureKey}
      />

      <InfoDrawer
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
        title={t('polygonExplorer.info.title')}
        triggerRef={infoBtnRef}
      >
        <h3>{t('polygonExplorer.info.whatYouSee')}</h3>
        <p>{t('polygonExplorer.info.whatYouSeeText')}</p>

        <h3>{t('polygonExplorer.info.sourceTitle')}</h3>
        <p>{t('polygonExplorer.info.sourceText')}</p>

        <h3>{t('polygonExplorer.info.meanOfMeansTitle')}</h3>
        <p>{t('polygonExplorer.info.meanOfMeansText')}</p>

        <h3>{t('polygonExplorer.info.independentTitle')}</h3>
        <p>{t('polygonExplorer.info.independentText')}</p>

        <h3>{t('polygonExplorer.info.layersTitle')}</h3>
        <ul>
          {MANIFEST.polygonLayers.map((l) => (
            <li key={l.id}>
              <strong>{resolveLabel(l, t)}</strong> ({l.featureCount.toLocaleString()}):{' '}
              {t(`polygonExplorer.info.layers.${l.id}`)}
            </li>
          ))}
        </ul>

        <h3>{t('polygonExplorer.info.metricsTitle')}</h3>
        <ul>
          <li><strong>{t('config.metrics.mean.label')}</strong>: {t('polygonExplorer.info.metricsList.mean')}</li>
          <li><strong>{t('config.metrics.median.label')}</strong>: {t('polygonExplorer.info.metricsList.median')}</li>
          <li><strong>{t('config.metrics.std.label')}</strong>: {t('polygonExplorer.info.metricsList.std')}</li>
        </ul>

        <h3>{t('polygonExplorer.info.colorScaleTitle')}</h3>
        <p>{t('polygonExplorer.info.colorScaleText')}</p>

        <h3>{t('polygonExplorer.info.interactionTitle')}</h3>
        <p>{t('polygonExplorer.info.interactionText')}</p>

        <div className="disclaimer-callout">
          <h4>{t('polygonExplorer.info.disclaimerTitle')}</h4>
          <p>{t('polygonExplorer.info.disclaimerText')}</p>
        </div>
      </InfoDrawer>
    </div>
  );
}
