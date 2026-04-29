import { useState, useEffect } from 'react';
import { useT } from '../i18n/I18nContext';

function Accordion({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`methodology-accordion${open ? ' open' : ''}`}>
      <button
        className="methodology-accordion-trigger"
        onClick={() => setOpen(!open)}
        type="button"
        aria-expanded={open}
      >
        <span>{title}</span>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="accordion-chevron">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && <div className="methodology-accordion-content">{children}</div>}
    </div>
  );
}

const INDICATOR_KEYS = ['sampleDay', 'aggregations', 'polygons'];
const KEY_FACT_KEYS = ['model', 'timestep', 'period', 'scale'];

const INDICATOR_ICONS = {
  sampleDay: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
    </svg>
  ),
  aggregations: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 20V10M12 20V4M6 20v-6" />
    </svg>
  ),
  polygons: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
      <line x1="8" y1="2" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="22" />
    </svg>
  ),
};

export default function AboutSection({ isOpen, onClose }) {
  const t = useT();

  // Lock body scroll + ESC to close while the modal is open.
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    document.body.style.overflow = 'hidden';

    function handleKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
      document.removeEventListener('keydown', handleKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="methodology-modal-backdrop"
        onClick={onClose}
        role="presentation"
      />
      <div
        className="methodology-modal about-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-modal-title"
      >
        <div className="methodology-modal-header">
          <div className="methodology-modal-header-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
          </div>
          <div className="methodology-modal-header-text">
            <h2 id="about-modal-title">{t('about.sectionTitle')}</h2>
            <p>{t('about.sectionSubtitle')}</p>
          </div>
          <button
            type="button"
            className="methodology-modal-close"
            onClick={onClose}
            aria-label={t('common.close')}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="methodology-modal-body">
          <p className="methodology-intro">{t('about.lead')}</p>

          <Accordion title={t('about.whyMatters.title')} defaultOpen>
            <p>{t('about.whyMatters.text')}</p>
            <ul className="list-disc space-y-1" style={{ paddingLeft: '40px', listStylePosition: 'inside' }}>
              {t('about.whyMatters.bullets').map((bullet, i) => (
                <li key={i}>{bullet}</li>
              ))}
            </ul>
          </Accordion>

          <Accordion title={t('about.howWeMeasure.title')}>
            <p>{t('about.howWeMeasure.text')}</p>
          </Accordion>

          <Accordion title={t('about.keyFacts.title')}>
            <div className="about-keyfacts-grid">
              {KEY_FACT_KEYS.map((key) => (
                <div key={key} className="limitation-item">
                  <h4>{t(`about.keyFacts.items.${key}.title`)}</h4>
                  <p>{t(`about.keyFacts.items.${key}.text`)}</p>
                </div>
              ))}
            </div>
          </Accordion>

          <Accordion title={t('about.indicatorsTitle')} defaultOpen>
            <p>{t('about.indicatorsIntro')}</p>
            <div className="about-indicators-list">
              {INDICATOR_KEYS.map((key) => (
                <div key={key} className="about-indicator-card">
                  <div className="about-indicator-card-icon" aria-hidden="true">
                    {INDICATOR_ICONS[key]}
                  </div>
                  <div className="about-indicator-card-body">
                    <span className="about-indicator-card-label">{t(`about.indicators.${key}.label`)}</span>
                    <strong>{t(`about.indicators.${key}.title`)}</strong>
                    <p>{t(`about.indicators.${key}.description`)}</p>
                  </div>
                </div>
              ))}
            </div>
          </Accordion>
        </div>
      </div>
    </>
  );
}
