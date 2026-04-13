import { useT } from '../i18n/I18nContext';

const TAB_IDS = ['day', 'aggregations', 'polygons'];

const TAB_ICONS = {
  day: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="12" r="5" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  ),
  aggregations: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M18 20V10M12 20V4M6 20v-6" />
    </svg>
  ),
  polygons: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
      <line x1="8" y1="2" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="22" />
    </svg>
  ),
};

export default function SectionTabs({ activeView, onChange, onOpenMethodology, onOpenAbout }) {
  const t = useT();

  return (
    <nav className="section-tabs" aria-label={t('tabs.ariaLabel')}>
      <div className="section-tabs-inner" role="tablist">
        {TAB_IDS.map((id) => (
          <button
            key={id}
            role="tab"
            aria-selected={activeView === id}
            aria-controls={`panel-${id}`}
            id={`tab-${id}`}
            className={`tab-button${activeView === id ? ' active' : ''}`}
            onClick={() => onChange(id)}
            type="button"
          >
            <span className="tab-icon" aria-hidden="true">{TAB_ICONS[id]}</span>
            <span className="tab-text">
              <span className="tab-label">{t(`tabs.${id}.label`)}</span>
              <span className="tab-desc">{t(`tabs.${id}.desc`)}</span>
            </span>
          </button>
        ))}

        <div className="section-tabs-info-group">
          {onOpenAbout && (
            <button
              type="button"
              className="section-tabs-info-btn section-tabs-about-btn"
              onClick={onOpenAbout}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
              <span>{t('about.buttonLabel')}</span>
            </button>
          )}

          {onOpenMethodology && (
            <button
              type="button"
              className="section-tabs-info-btn section-tabs-methodology-btn"
              onClick={onOpenMethodology}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
                <path d="M12 17h.01" />
              </svg>
              <span>{t('methodology.sectionTitle')}</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
