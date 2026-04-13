import { useT } from '../i18n/I18nContext';
import { BASEMAPS } from '../data/basemaps';

/**
 * Compact pill selector to swap the basemap layer of a MapView.
 * Renders as a floating control over the map (bottom-right by default).
 */
export default function BasemapSelector({ value, onChange, className }) {
  const t = useT();
  return (
    <div
      className={`basemap-selector${className ? ` ${className}` : ''}`}
      role="radiogroup"
      aria-label={t('basemaps.label')}
    >
      <span className="basemap-selector-label">{t('basemaps.label')}</span>
      <div className="basemap-selector-options">
        {BASEMAPS.map((b) => (
          <button
            key={b.id}
            type="button"
            role="radio"
            aria-checked={value === b.id}
            className={`basemap-selector-btn${value === b.id ? ' active' : ''}`}
            onClick={() => onChange(b.id)}
            title={t(b.labelKey)}
          >
            {t(b.labelKey)}
          </button>
        ))}
      </div>
    </div>
  );
}
