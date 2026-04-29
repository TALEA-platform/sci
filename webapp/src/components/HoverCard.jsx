import { getPolygonColorForValue } from '../utils/polygonColors';

function pct(value) {
  if (typeof value !== 'number' || isNaN(value)) return '\u2014';
  return `${(value * 100).toFixed(0)}%`;
}

function pct2(value) {
  // 2-decimal percentage, used for the std (which is much smaller than mean/median)
  if (typeof value !== 'number' || isNaN(value)) return '\u2014';
  return `${(value * 100).toFixed(1)}%`;
}

function area(value) {
  if (typeof value !== 'number' || isNaN(value)) return '\u2014';
  return `${Math.round(value).toLocaleString()} m\u00b2`;
}

export default function HoverCard({ feature, layerConfig, t }) {
  if (!feature) return null;

  const nameField =
    layerConfig?.id === 'streets'
      ? 'display_name'
      : layerConfig?.nameField || 'feature_name';
  const subtitleField = layerConfig?.subtitleField || null;
  const name = feature[nameField] || feature.feature_name || '\u2014';
  const subtitle = subtitleField ? feature[subtitleField] : null;

  const meanColor = getPolygonColorForValue(feature.mean);

  return (
    <div className="hover-card hover-card--rich">
      <div className="hover-card-header">
        <span className="hover-card-color" style={{ background: meanColor }} aria-hidden="true" />
        <div className="hover-card-header-text">
          <strong className="hover-card-name">{name}</strong>
          {subtitle && <div className="hover-card-subtitle">{subtitle}</div>}
        </div>
      </div>

      <div className="hover-card-stats">
        <div className="hover-card-stat-row">
          <span className="hover-card-stat-label">{t ? t('config.metrics.mean.label') : 'Mean'}</span>
          <span className="hover-card-stat-value">{pct(feature.mean)}</span>
        </div>
        <div className="hover-card-stat-row">
          <span className="hover-card-stat-label">{t ? t('config.metrics.median.label') : 'Median'}</span>
          <span className="hover-card-stat-value">{pct(feature.median)}</span>
        </div>
        <div className="hover-card-stat-row">
          <span className="hover-card-stat-label">{t ? t('config.metrics.std.label') : 'Std'}</span>
          <span className="hover-card-stat-value">{pct2(feature.std)}</span>
        </div>
        <div className="hover-card-stat-row hover-card-stat-row--area">
          <span className="hover-card-stat-label">{t ? t('dataTable.area') : 'Area'}</span>
          <span className="hover-card-stat-value">{area(feature.geometry_area_m2)}</span>
        </div>
      </div>

      <div className="hover-card-footer">
        {t ? t('hoverCard.perPolygonNote') : 'Statistics computed only on this polygon.'}
      </div>
    </div>
  );
}
