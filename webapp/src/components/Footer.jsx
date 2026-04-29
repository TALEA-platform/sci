import { useT } from '../i18n/I18nContext';

export default function Footer() {
  const t = useT();

  return (
    <footer className="footer" role="contentinfo">
      <div className="footer-gradient-bar" aria-hidden="true" />

      <div className="footer-arcs" aria-hidden="true">
        <svg viewBox="0 0 1400 200" preserveAspectRatio="none" className="footer-arcs-svg">
          <circle cx="200" cy="250" r="200" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="40" />
          <circle cx="1200" cy="180" r="150" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="30" />
        </svg>
      </div>

      <div className="footer-inner">
        <div className="footer-brand">
          <img src="./talea-logo.png" alt="Talea" className="footer-logo" />
          <p className="footer-tagline">{t('footer.tagline')}</p>
        </div>
        <div className="footer-info">
          <p className="footer-info-main">{t('footer.funding')}</p>
          <p className="footer-info-sub">{t('footer.eui')}</p>
          <p className="footer-credits">{t('footer.credits')}</p>
        </div>
        <div className="footer-links">
          <a
            href="https://talea.comune.bologna.it"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
            </svg>
            talea.comune.bologna.it
          </a>
        </div>
      </div>
    </footer>
  );
}
