import { useEffect, useRef } from 'react';
import { useT } from '../i18n/I18nContext';
import LanguageToggle from './LanguageToggle';

export default function Header() {
  const t = useT();
  const headerRef = useRef(null);

  // Keep `--header-height` in sync with the header's actual rendered height.
  // The variable is consumed by `.section-tabs { top: var(--header-height) }`,
  // so any drift (font metrics, responsive padding, language switch) would
  // otherwise cause the sticky tabs to be clipped by the header on scroll.
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const apply = () => {
      const h = Math.round(el.getBoundingClientRect().height);
      if (h > 0) document.documentElement.style.setProperty('--header-height', `${h}px`);
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <header ref={headerRef} className="header" role="banner">
      <a href="#explorer" className="skip-link">{t('header.skipLink')}</a>
      <div className="header-accent" aria-hidden="true" />
      <div className="header-inner">
        <div className="header-brand">
          <div className="header-logo-wrap">
            <img src="./talea-logo.png" alt="Talea" className="header-logo" />
          </div>
          <div className="header-text">
            <h1>Talea</h1>
            <span className="header-subtitle">{t('header.subtitle')}</span>
          </div>
        </div>
        <nav className="header-nav">
          <LanguageToggle />
          <a
            href="https://talea.comune.bologna.it"
            target="_blank"
            rel="noopener noreferrer"
            className="header-link"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
            </svg>
            {t('header.projectLink')}
          </a>
        </nav>
      </div>
    </header>
  );
}
