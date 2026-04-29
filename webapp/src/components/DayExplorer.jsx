import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useI18n, useT } from '../i18n/I18nContext';
import MapView from './MapView';
import Legend from './Legend';
import InfoDrawer from './InfoDrawer';
import DisplayModeToggle from './DisplayModeToggle';
import BasemapSelector from './BasemapSelector';
import { FIRST_VIEW, getTimeRange, getShadowTileUrl } from '../data/config';
import { BASEMAP_DEFAULTS } from '../data/basemaps';
import { generateTimeSlots } from '../utils/time';
import { buildShadowLegendItems } from '../utils/shadowEncoding';
import { getDateLabel, resolveLabel } from '../utils/i18nHelpers';
import { prefetchCogs } from '../utils/cogLoader';

const HOUR_TICKS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

const STEP_OPTIONS = [
  { slots: 1, label: '15m' },
  { slots: 2, label: '30m' },
  { slots: 4, label: '1h' },
];

function getSunPhase(time) {
  const h = parseInt(time.split(':')[0], 10);
  if (h < 8) return 'dawn';
  if (h < 11) return 'morning';
  if (h < 15) return 'noon';
  if (h < 18) return 'afternoon';
  return 'dusk';
}

export default function DayExplorer({
  selectedArea,
  setSelectedArea,
  selectedDate,
  setSelectedDate,
  selectedTime,
  setSelectedTime,
  displayMode,
  setDisplayMode,
}) {
  const { lang } = useI18n();
  const t = useT();
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [stepSize, setStepSize] = useState(1); // in slots (1=15m, 2=30m, 4=1h)
  const [opacity, setOpacity] = useState(100); // 0-100
  const [previewIndex, setPreviewIndex] = useState(null); // instant visual feedback while dragging
  const [isMapLoading, setIsMapLoading] = useState(false);
  const [showMapLoading, setShowMapLoading] = useState(false);
  const [mapLoadError, setMapLoadError] = useState(null);
  const [basemapId, setBasemapId] = useState(BASEMAP_DEFAULTS.day);
  const [reloadNonce, setReloadNonce] = useState(0);
  const debounceRef = useRef(null);
  const loadingDelayRef = useRef(null);
  const infoBtnRef = useRef(null);

  // Derive time range for current area+date
  const timeRange = useMemo(
    () => getTimeRange(selectedArea, selectedDate),
    [selectedArea, selectedDate]
  );

  // Generate time slots for current range
  const timeSlots = useMemo(
    () => generateTimeSlots(timeRange.start, timeRange.end, FIRST_VIEW.step),
    [timeRange]
  );

  // Debounced slider handler — updates visual preview instantly,
  // but only triggers expensive COG load after 150ms of no movement.
  const handleSliderChange = useCallback((e) => {
    const idx = Number(e.target.value);
    setPreviewIndex(idx);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSelectedTime(timeSlots[idx]);
      setPreviewIndex(null);
    }, 150);
  }, [timeSlots, setSelectedTime]);

  // Cleanup debounce on unmount
  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  useEffect(() => {
    if (loadingDelayRef.current) clearTimeout(loadingDelayRef.current);
    if (isMapLoading) {
      // Long enough that fast scrubs (slider, step buttons, prefetched tiles)
      // never flash a spinner — only true cold loads cross the threshold.
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

  // Clamp selected time to available range when area/date changes
  const clampedTime = useMemo(() => {
    if (timeSlots.includes(selectedTime)) return selectedTime;
    const noon = timeSlots.indexOf('12:00');
    return noon >= 0 ? timeSlots[noon] : timeSlots[Math.floor(timeSlots.length / 2)];
  }, [timeSlots, selectedTime]);

  const timeIndex = useMemo(() => {
    const idx = timeSlots.indexOf(clampedTime);
    return idx >= 0 ? idx : 0;
  }, [clampedTime, timeSlots]);

  // When dragging, use previewIndex for instant visual feedback
  const activeIndex = previewIndex !== null ? previewIndex : timeIndex;
  const activeTime = previewIndex !== null ? timeSlots[previewIndex] : clampedTime;

  const progress = timeSlots.length > 1 ? activeIndex / (timeSlots.length - 1) : 0;
  const sunPhase = getSunPhase(activeTime);

  const areaConfig = FIRST_VIEW.areas.find((a) => a.id === selectedArea);
  const areaLabel = resolveLabel(areaConfig, t);
  const dateLabel = getDateLabel(selectedDate, lang);

  // COG URL for current selection
  const cogUrl = useMemo(
    () => getShadowTileUrl(selectedArea, selectedDate, clampedTime),
    [selectedArea, selectedDate, clampedTime]
  );

  // WGS84 bounds for the current area's image overlay
  const imageBounds = areaConfig?.bounds;

  // Prefetch adjacent timestamps whenever selection changes
  useEffect(() => {
    const nearby = [];
    for (let d = -3; d <= 3; d++) {
      if (d === 0) continue;
      const idx = timeIndex + d;
      if (idx >= 0 && idx < timeSlots.length) {
        nearby.push(getShadowTileUrl(selectedArea, selectedDate, timeSlots[idx]));
      }
    }
    prefetchCogs(nearby);
  }, [timeIndex, timeSlots, selectedArea, selectedDate]);

  // Step buttons
  const canStepBack = timeIndex - stepSize >= 0;
  const canStepForward = timeIndex + stepSize < timeSlots.length;

  const handleStep = useCallback((direction) => {
    const newIdx = timeIndex + direction * stepSize;
    const clamped = Math.max(0, Math.min(timeSlots.length - 1, newIdx));
    setSelectedTime(timeSlots[clamped]);
  }, [timeIndex, stepSize, timeSlots, setSelectedTime]);

  // When date/area changes, auto-clamp time
  const handleDateChange = useCallback((newDate) => {
    setSelectedDate(newDate);
    const range = getTimeRange(selectedArea, newDate);
    const slots = generateTimeSlots(range.start, range.end, FIRST_VIEW.step);
    if (!slots.includes(selectedTime)) {
      const noon = slots.indexOf('12:00');
      setSelectedTime(noon >= 0 ? slots[noon] : slots[Math.floor(slots.length / 2)]);
    }
  }, [selectedArea, selectedTime, setSelectedDate, setSelectedTime]);

  const handleAreaChange = useCallback((newArea) => {
    setSelectedArea(newArea);
    const range = getTimeRange(newArea, selectedDate);
    const slots = generateTimeSlots(range.start, range.end, FIRST_VIEW.step);
    if (!slots.includes(selectedTime)) {
      const noon = slots.indexOf('12:00');
      setSelectedTime(noon >= 0 ? slots[noon] : slots[Math.floor(slots.length / 2)]);
    }
  }, [selectedDate, selectedTime, setSelectedArea, setSelectedTime]);

  // Visible hour ticks filtered to available range
  const visibleTicks = useMemo(() => {
    return HOUR_TICKS.filter((h) => {
      const tickTime = `${String(h).padStart(2, '0')}:00`;
      return timeSlots.includes(tickTime);
    });
  }, [timeSlots]);

  return (
    <div className="explorer day-explorer">
      <div className="explorer-header">
        <div className="explorer-text">
          <span className="explorer-view-number">{t('dayExplorer.viewNumber')}</span>
          <div className="explorer-title-row">
            <h2>{t('dayExplorer.title')}</h2>
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
          <p>{t('dayExplorer.description')}</p>
        </div>
      </div>

      <div className="controls-bar">
        <div className="control-group">
          <label htmlFor="day-area">{t('controls.area')}</label>
          <select id="day-area" value={selectedArea} onChange={(e) => handleAreaChange(e.target.value)}>
            {FIRST_VIEW.areas.map((a) => (
              <option key={a.id} value={a.id}>{resolveLabel(a, t)}</option>
            ))}
          </select>
        </div>
        <div className="control-group">
          <label htmlFor="day-date">{t('controls.date')}</label>
          <select id="day-date" value={selectedDate} onChange={(e) => handleDateChange(e.target.value)}>
            {FIRST_VIEW.dates.map((d) => (
              <option key={d.id} value={d.id}>{getDateLabel(d.id, lang)}</option>
            ))}
          </select>
        </div>
        <DisplayModeToggle mode={displayMode} onModeChange={setDisplayMode} />
      </div>

      <div className="time-range-note">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4l3 3" />
        </svg>
        <span>{t('dayExplorer.timeRangeNote', { start: timeRange.start, end: timeRange.end })}</span>
      </div>

      <div className="map-section">
        <MapView
          center={areaConfig?.center}
          zoom={areaConfig?.zoom}
          minZoom={areaConfig?.minZoom}
          maxBounds={areaConfig?.maxBounds}
          className="explorer-map"
          cogUrl={cogUrl}
          imageBounds={imageBounds}
          displayMode={displayMode}
          opacity={opacity / 100}
          basemapId={basemapId}
          reloadNonce={reloadNonce}
          onLoadingChange={setIsMapLoading}
          onLoadError={setMapLoadError}
        />
        <BasemapSelector value={basemapId} onChange={setBasemapId} />
        <Legend items={buildShadowLegendItems(displayMode, t)} title={t('dayExplorer.legendTitle')} />

        {/* Opacity slider — overlaid on map bottom-left */}
        <div className="map-opacity-control">
          <label className="map-opacity-label">{t('controls.opacity')}</label>
          <input
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

        {displayMode === 'satellite' && (
          <p className="display-mode-note">{t('legend.shadow.satelliteNote')}</p>
        )}

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

      <div className={`time-slider-section time-phase--${sunPhase}`}>
        <div className="time-header-row">
          <div className="time-display">
            <span className="time-label">{t('controls.time')}</span>
            <span className="time-value">{activeTime}</span>
          </div>
          <div className="time-step-selector">
            <span className="time-step-label">{t('controls.step')}:</span>
            {STEP_OPTIONS.map((opt) => (
              <button
                key={opt.slots}
                type="button"
                className={`time-step-btn${stepSize === opt.slots ? ' active' : ''}`}
                onClick={() => setStepSize(opt.slots)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="time-sun-indicator">
            <svg viewBox="0 0 24 24" width="18" height="18" className="time-sun-icon" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" opacity="0.85" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
            </svg>
            <span className="time-phase-label">{t(`dayExplorer.sunPhases.${sunPhase}`)}</span>
          </div>
        </div>

        <div className="time-slider-row">
          {/* Step back button */}
          <button
            type="button"
            className="time-step-arrow"
            disabled={!canStepBack}
            onClick={() => handleStep(-1)}
            aria-label={t('controls.stepBack')}
          >
            <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 4l-6 6 6 6" />
            </svg>
          </button>

          <div className="time-slider-container">
            <div
              className="time-slider-fill"
              style={{ width: `${progress * 100}%` }}
            />
            <input
              type="range"
              className="time-slider"
              min={0}
              max={timeSlots.length - 1}
              step={1}
              value={activeIndex}
              onChange={handleSliderChange}
            />
            <div className="time-ticks">
              {visibleTicks.map((hour) => {
                const tickTime = `${String(hour).padStart(2, '0')}:00`;
                const tickIdx = timeSlots.indexOf(tickTime);
                if (tickIdx < 0) return null;
                const pct = (tickIdx / (timeSlots.length - 1)) * 100;
                const isActive = activeIndex >= tickIdx;
                return (
                  <div
                    key={hour}
                    className={`time-tick${isActive ? ' active' : ''}`}
                    style={{ left: `${pct}%` }}
                  >
                    <span className="time-tick-mark" />
                    <span className="time-tick-label">{hour}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step forward button */}
          <button
            type="button"
            className="time-step-arrow"
            disabled={!canStepForward}
            onClick={() => handleStep(1)}
            aria-label={t('controls.stepForward')}
          >
            <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 4l6 6-6 6" />
            </svg>
          </button>
        </div>

        <p className="time-context">
          {t('dayExplorer.timeContext', {
            time: clampedTime,
            date: dateLabel,
            area: areaLabel,
          })}
        </p>
      </div>

      <InfoDrawer
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
        title={t('dayExplorer.info.title')}
        triggerRef={infoBtnRef}
      >
        <h3>{t('dayExplorer.info.whatYouSee')}</h3>
        <p>{t('dayExplorer.info.whatYouSeeText')}</p>

        <h3>{t('dayExplorer.info.howToRead')}</h3>
        <p>{t('dayExplorer.info.howToReadMulti')}</p>
        <ul>
          {t('dayExplorer.info.howToReadMultiList').map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
        <p>{t('dayExplorer.info.howToReadSatellite')}</p>
        <p>{t('dayExplorer.info.howToReadGray')}</p>

        <h3>{t('dayExplorer.info.heightTitle')}</h3>
        <p>{t('dayExplorer.info.heightText')}</p>

        <h3>{t('dayExplorer.info.timezoneTitle')}</h3>
        <p>{t('dayExplorer.info.timezoneText')}</p>

        <h3>{t('dayExplorer.info.solarTitle')}</h3>
        <p>{t('dayExplorer.info.solarText')}</p>

        <h3>{t('dayExplorer.info.datesTitle')}</h3>
        <p>{t('dayExplorer.info.datesText')}</p>

        <div className="disclaimer-callout">
          <h4>{t('dayExplorer.info.disclaimerTitle')}</h4>
          <p>{t('dayExplorer.info.disclaimerText')}</p>
        </div>
      </InfoDrawer>
    </div>
  );
}
