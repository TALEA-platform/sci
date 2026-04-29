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

function ShadowDiagram({ t }) {
  return (
    <div className="methodology-diagram" aria-label={t('methodology.whatWeModel.title')}>
      <svg viewBox="0 0 600 200" width="100%" height="auto" className="methodology-diagram-svg">
        {/* Sky gradient */}
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#87CEEB" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#87CEEB" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="sunGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFE604" />
            <stop offset="100%" stopColor="#FFA000" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width="600" height="200" fill="url(#sky)" rx="8" />

        {/* Ground line */}
        <rect x="0" y="170" width="600" height="30" fill="#8D6E63" opacity="0.15" rx="0" />
        <line x1="0" y1="170" x2="600" y2="170" stroke="#8D6E63" strokeWidth="1.5" opacity="0.4" />

        {/* Sun */}
        <circle cx="520" cy="35" r="22" fill="url(#sunGrad)" />
        {/* Sun rays */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
          const rad = (angle * Math.PI) / 180;
          const x1 = 520 + Math.cos(rad) * 26;
          const y1 = 35 + Math.sin(rad) * 26;
          const x2 = 520 + Math.cos(rad) * 34;
          const y2 = 35 + Math.sin(rad) * 34;
          return <line key={angle} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#FFE604" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />;
        })}

        {/* Building 1 */}
        <rect x="80" y="80" width="60" height="90" fill="#004d19" opacity="0.7" rx="2" />
        <text x="110" y="130" textAnchor="middle" fill="white" fontSize="9" fontWeight="600">DSM</text>

        {/* Tree */}
        <rect x="220" y="130" width="8" height="40" fill="#6D4C41" opacity="0.6" />
        <ellipse cx="224" cy="115" rx="28" ry="22" fill="#2E7D32" opacity="0.5" />

        {/* Building 2 */}
        <rect x="330" y="110" width="50" height="60" fill="#004d19" opacity="0.5" rx="2" />

        {/* Shadow on ground (from building 1) */}
        <polygon points="140,170 80,170 20,170 80,80" fill="#1A237E" opacity="0.15" />

        {/* Shadow from tree */}
        <ellipse cx="180" cy="170" rx="35" ry="6" fill="#1A237E" opacity="0.12" />

        {/* Pedestrian (1.5m figure) */}
        <line x1="180" y1="155" x2="180" y2="170" stroke="#004d19" strokeWidth="2" strokeLinecap="round" />
        <circle cx="180" cy="152" r="3.5" fill="none" stroke="#004d19" strokeWidth="1.5" />
        {/* 1.5m label */}
        <text x="192" y="164" fill="#004d19" fontSize="8" fontWeight="600">1.5m</text>

        {/* Ray lines from sun to pedestrian (dashed to show analysis) */}
        <line x1="520" y1="35" x2="180" y2="155" stroke="#FFE604" strokeWidth="1" strokeDasharray="6 4" opacity="0.4" />

        {/* DTM label at ground */}
        <text x="450" y="185" fill="#8D6E63" fontSize="9" fontWeight="600" opacity="0.7">DTM</text>

        {/* G_h label */}
        <text x="165" y="195" textAnchor="middle" fill="#5C6BC0" fontSize="8" fontWeight="600">G_h</text>

        {/* S_h label on building roof */}
        <text x="110" y="75" textAnchor="middle" fill="#AB47BC" fontSize="8" fontWeight="600">S_h</text>

        {/* M_h label */}
        <text x="355" y="105" textAnchor="middle" fill="#A1887F" fontSize="8" fontWeight="600">M_h</text>
      </svg>
    </div>
  );
}

export default function MethodologySection({ isOpen, onClose }) {
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
        className="methodology-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="methodology-modal-title"
      >
        <div className="methodology-modal-header">
          <div className="methodology-modal-header-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </div>
          <div className="methodology-modal-header-text">
            <h2 id="methodology-modal-title">{t('methodology.sectionTitle')}</h2>
            <p>{t('methodology.sectionSubtitle')}</p>
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
          <p className="methodology-intro">{t('methodology.intro')}</p>

          <ShadowDiagram t={t} />

          <Accordion title={t('methodology.whatWeModel.title')} defaultOpen>
            <p>{t('methodology.whatWeModel.text')}</p>
          </Accordion>

          <Accordion title={t('methodology.threeQuestions.title')} defaultOpen>
            <p>{t('methodology.threeQuestions.text')}</p>
            <div className="three-questions-grid">
              <div className="question-card question-card--gh">
                <div className="question-card-label">G_h</div>
                <strong>{t('methodology.threeQuestions.q1')}</strong>
                <p>{t('methodology.threeQuestions.q1detail')}</p>
              </div>
              <div className="question-card question-card--sh">
                <div className="question-card-label">S_h</div>
                <strong>{t('methodology.threeQuestions.q2')}</strong>
                <p>{t('methodology.threeQuestions.q2detail')}</p>
              </div>
              <div className="question-card question-card--mh">
                <div className="question-card-label">M_h</div>
                <strong>{t('methodology.threeQuestions.q3')}</strong>
                <p>{t('methodology.threeQuestions.q3detail')}</p>
              </div>
            </div>
          </Accordion>

          <Accordion title={t('methodology.pedestrianHeight.title')}>
            <p>{t('methodology.pedestrianHeight.text')}</p>
          </Accordion>

          <Accordion title={t('methodology.timezone.title')}>
            <p>{t('methodology.timezone.text')}</p>
          </Accordion>

          <Accordion title={t('methodology.solarThreshold.title')}>
            <p>{t('methodology.solarThreshold.text')}</p>
          </Accordion>

          <Accordion title={t('methodology.gpuNote.title')}>
            <p>{t('methodology.gpuNote.text')}</p>
          </Accordion>

          {/* Limitations sub-section */}
          <div className="limitations-section">
            <h3>{t('limitations.sectionTitle')}</h3>
            <p>{t('limitations.intro')}</p>

            <div className="disclaimer-callout disclaimer-callout--prominent">
              <h4>{t('limitations.solarDisclaimer.title')}</h4>
              <p>{t('limitations.solarDisclaimer.text')}</p>
            </div>

            <div className="limitations-grid">
              {['shadowNotCooler', 'opaqueCanopy', 'transientObjects', 'waterBodies', 'multiLevel', 'nearHorizon'].map((key) => (
                <div className="limitation-item" key={key}>
                  <h4>{t(`limitations.${key}.title`)}</h4>
                  <p>{t(`limitations.${key}.text`)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
