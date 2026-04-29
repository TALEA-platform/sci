import { useState, useRef, useMemo, useEffect } from 'react';
import { useI18n, useT } from '../i18n/I18nContext';
import MapView from './MapView';
import Legend from './Legend';
import InfoDrawer from './InfoDrawer';
import BasemapSelector from './BasemapSelector';
import {
  MANIFEST,
  SECOND_VIEW,
  FIRST_VIEW,
  getAggregationCogUrls,
} from '../data/config';
import { BASEMAP_DEFAULTS } from '../data/basemaps';
import { buildAggregationLegendItems } from '../utils/legends';
import { getMonthLabel, resolveLabel } from '../utils/i18nHelpers';

export default function AggregationExplorer({
  selectedArea,
  setSelectedArea,
  selectedMonth,
  setSelectedMonth,
  selectedPeriod,
  setSelectedPeriod,
  selectedSurfaceType,
  setSelectedSurfaceType,
}) {
  const { lang } = useI18n();
  const t = useT();
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [opacity, setOpacity] = useState(100);
  // 'aggregation' = warm color gradient, 'aggregationGray' = grayscale,
  // 'aggregationDiverging' = RdYlBu divergent palette.
  const [aggDisplayMode, setAggDisplayMode] = useState('aggregation');
  const [isMapLoading, setIsMapLoading] = useState(false);
  const [showMapLoading, setShowMapLoading] = useState(false);
  const [mapLoadError, setMapLoadError] = useState(null);
  const [basemapId, setBasemapId] = useState(BASEMAP_DEFAULTS.aggregations);
  const [reloadNonce, setReloadNonce] = useState(0);
  const loadingDelayRef = useRef(null);
  const infoBtnRef = useRef(null);

  useEffect(() => {
    if (loadingDelayRef.current) clearTimeout(loadingDelayRef.current);
    if (isMapLoading) {
      loadingDelayRef.current = setTimeout(() => {
        setShowMapLoading(true);
      }, 250);
    } else {
      setShowMapLoading(false);
    }
    return () => {
      if (loadingDelayRef.current) clearTimeout(loadingDelayRef.current);
    };
  }, [isMapLoading]);

  // Resolve area config from FIRST_VIEW (same crops, with bounds)
  const areaConfig = FIRST_VIEW.areas.find((a) => a.id === selectedArea)
    || MANIFEST.areas.find((a) => a.id === selectedArea);
  const periodConfig = SECOND_VIEW.periods.find((p) => p.id === selectedPeriod)
    || MANIFEST.periods.find((p) => p.id === selectedPeriod);
  const surfaceConfig = SECOND_VIEW.surfaceTypes.find((s) => s.id === selectedSurfaceType);

  // Build COG URLs (1 entry for GROUND/ROOF_SURFACE/TOTAL, 2 for BOTH)
  const cogUrls = useMemo(
    () => getAggregationCogUrls(selectedArea, selectedMonth, selectedPeriod, selectedSurfaceType),
    [selectedArea, selectedMonth, selectedPeriod, selectedSurfaceType]
  );

  const monthLabel = getMonthLabel(selectedMonth, lang);
  const areaLabel = resolveLabel(areaConfig, t);
  const periodLabel = resolveLabel(periodConfig, t);
  const surfaceLabel = resolveLabel(surfaceConfig, t);

  return (
    <div className="explorer aggregation-explorer">
      <div className="explorer-header">
        <div className="explorer-text">
          <span className="explorer-view-number">{t('aggregationExplorer.viewNumber')}</span>
          <div className="explorer-title-row">
            <h2>{t('aggregationExplorer.title')}</h2>
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
          <p>{t('aggregationExplorer.description')}</p>
        </div>
      </div>

      <div className="controls-bar">
        <div className="control-group">
          <label htmlFor="agg-area">{t('controls.area')}</label>
          <select id="agg-area" value={selectedArea} onChange={(e) => setSelectedArea(e.target.value)}>
            {FIRST_VIEW.areas.map((a) => (
              <option key={a.id} value={a.id}>{resolveLabel(a, t)}</option>
            ))}
          </select>
        </div>
        <div className="control-group">
          <label htmlFor="agg-month">{t('controls.month')}</label>
          <select id="agg-month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
            {SECOND_VIEW.months.map((m) => (
              <option key={m.id} value={m.id}>{getMonthLabel(m.id, lang)}</option>
            ))}
          </select>
        </div>
        <div className="control-group">
          <label htmlFor="agg-period">{t('controls.period')}</label>
          <select id="agg-period" value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)}>
            {SECOND_VIEW.periods.map((p) => (
              <option key={p.id} value={p.id}>{resolveLabel(p, t)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Surface type selector + color/grayscale display mode (same row) */}
      <div className="surface-type-toggle" role="tablist" aria-label={t('controls.surfaceType')}>
        <span className="surface-type-label">{t('controls.surfaceType')}:</span>
        {SECOND_VIEW.surfaceTypes.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={selectedSurfaceType === s.id}
            className={`surface-type-btn${selectedSurfaceType === s.id ? ' active' : ''}`}
            onClick={() => setSelectedSurfaceType(s.id)}
            title={t(`controls.surfaceTypeDesc.${s.id.toLowerCase()}`)}
          >
            {resolveLabel(s, t)}
          </button>
        ))}

        <div className="display-mode-toggle agg-display-toggle" role="radiogroup" aria-label={t('controls.displayMode')}>
          <button
            type="button"
            role="radio"
            aria-checked={aggDisplayMode === 'aggregation'}
            className={`display-mode-btn${aggDisplayMode === 'aggregation' ? ' active' : ''}`}
            onClick={() => setAggDisplayMode('aggregation')}
          >
            <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
              <rect x="2" y="2" width="7" height="7" rx="1" fill="#F8F2E2" stroke="currentColor" strokeWidth="0.5" />
              <rect x="11" y="2" width="7" height="7" rx="1" fill="#B49E9E" stroke="currentColor" strokeWidth="0.5" />
              <rect x="2" y="11" width="7" height="7" rx="1" fill="#7C6E9A" stroke="currentColor" strokeWidth="0.5" />
              <rect x="11" y="11" width="7" height="7" rx="1" fill="#242E44" stroke="currentColor" strokeWidth="0.5" />
            </svg>
            <span>{t('controls.colorMode')}</span>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={aggDisplayMode === 'aggregationGray'}
            className={`display-mode-btn${aggDisplayMode === 'aggregationGray' ? ' active' : ''}`}
            onClick={() => setAggDisplayMode('aggregationGray')}
          >
            <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
              <rect x="2" y="2" width="16" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <rect x="2" y="2" width="8" height="16" rx="1" fill="currentColor" opacity="0.25" />
              <rect x="6" y="2" width="5" height="16" fill="currentColor" opacity="0.45" />
              <rect x="10" y="2" width="8" height="16" rx="1" fill="currentColor" opacity="0.7" />
            </svg>
            <span>{t('controls.gray')}</span>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={aggDisplayMode === 'aggregationDiverging'}
            className={`display-mode-btn${aggDisplayMode === 'aggregationDiverging' ? ' active' : ''}`}
            onClick={() => setAggDisplayMode('aggregationDiverging')}
          >
            <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
              <rect x="2" y="2" width="4" height="16" rx="1" fill="#A50026" />
              <rect x="6" y="2" width="4" height="16" fill="#FDAE61" />
              <rect x="10" y="2" width="4" height="16" fill="#FFFFBF" stroke="currentColor" strokeWidth="0.4" />
              <rect x="14" y="2" width="4" height="16" rx="1" fill="#313695" />
            </svg>
            <span>{t('controls.diverging')}</span>
          </button>
        </div>
      </div>

      <div className="map-section">
        <MapView
          center={areaConfig?.center}
          zoom={areaConfig?.zoom}
          minZoom={areaConfig?.minZoom}
          maxBounds={areaConfig?.maxBounds}
          className="explorer-map"
          cogUrls={cogUrls}
          imageBounds={areaConfig?.bounds}
          displayMode={aggDisplayMode}
          opacity={opacity / 100}
          basemapId={basemapId}
          reloadNonce={reloadNonce}
          onLoadingChange={setIsMapLoading}
          onLoadError={setMapLoadError}
        />
        <BasemapSelector value={basemapId} onChange={setBasemapId} />
        <Legend
          items={buildAggregationLegendItems(t, aggDisplayMode)}
          title={`${surfaceLabel} \u2014 ${periodLabel}`}
        />

        <div className="map-opacity-control">
          <label htmlFor="agg-opacity">{t('controls.opacity')}:</label>
          <input
            id="agg-opacity"
            type="range"
            className="map-opacity-slider"
            min={10}
            max={100}
            step={5}
            value={opacity}
            onChange={(e) => setOpacity(Number(e.target.value))}
          />
          <span className="map-opacity-value">{opacity}%</span>
        </div>

        {showMapLoading && (
          <div className="map-loading-overlay" aria-live="polite">
            <div className="map-loading-spinner" />
            <span>{t('common.loading')}</span>
          </div>
        )}
        {mapLoadError && !isMapLoading && (
          <div className="map-loading-overlay map-loading-overlay--error">
            <span>{t('common.loadError')}</span>
            <button
              type="button"
              className="map-loading-retry-btn"
              onClick={() => {
                setMapLoadError(null);
                setReloadNonce((n) => n + 1);
              }}
            >
              {t('common.retry')}
            </button>
          </div>
        )}
      </div>

      <div className="context-box">
        <div className="context-box-icon">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4l3 3" />
          </svg>
        </div>
        <p>
          {t('aggregationExplorer.contextBox', {
            month: monthLabel,
            period: periodLabel,
            area: areaLabel,
            surface: surfaceLabel,
          })}
        </p>
      </div>

      <InfoDrawer
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
        title={t('aggregationExplorer.info.title')}
        triggerRef={infoBtnRef}
      >
        <h3>{t('aggregationExplorer.info.whatYouSee')}</h3>
        <p>{t('aggregationExplorer.info.whatYouSeeText')}</p>

        <h3>{t('aggregationExplorer.info.freqExplainTitle')}</h3>
        <p>{t('aggregationExplorer.info.freqExplainText')}</p>

        <h3>{t('aggregationExplorer.info.surfaceTypesTitle')}</h3>
        <p>{t('aggregationExplorer.info.surfaceTypesText')}</p>
        <ul>
          {SECOND_VIEW.surfaceTypes.map((s) => (
            <li key={s.id}>
              <strong>{resolveLabel(s, t)}</strong>: {t(`controls.surfaceTypeDesc.${s.id.toLowerCase()}`)}
            </li>
          ))}
        </ul>

        <h3>{t('aggregationExplorer.info.timeBandsTitle')}</h3>
        <p>{t('aggregationExplorer.info.timeBandsText')}</p>
        <ul>
          {SECOND_VIEW.periods.map((p) => (
            <li key={p.id}>{t(`aggregationExplorer.info.timeBandsList.${p.id}`)}</li>
          ))}
        </ul>

        <h3>{t('aggregationExplorer.info.partialHoursTitle')}</h3>
        <p>{t('aggregationExplorer.info.partialHoursText')}</p>

        <h3>{t('aggregationExplorer.info.diffTitle')}</h3>
        <p>{t('aggregationExplorer.info.diffText')}</p>

        <div className="disclaimer-callout">
          <h4>{t('aggregationExplorer.info.disclaimerTitle')}</h4>
          <p>{t('aggregationExplorer.info.disclaimerText')}</p>
        </div>
      </InfoDrawer>
    </div>
  );
}
