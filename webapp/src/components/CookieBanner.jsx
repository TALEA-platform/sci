import { useEffect, useState } from 'react';
import { useT } from '../i18n/I18nContext';

const STORAGE_KEY = 'talea_sci_cookie_consent';

export default function CookieBanner() {
  const t = useT();
  // Start hidden so we never flash the banner before reading localStorage.
  const [accepted, setAccepted] = useState(true);

  useEffect(() => {
    try {
      setAccepted(localStorage.getItem(STORAGE_KEY) === 'true');
    } catch {
      // localStorage blocked (private mode, strict cookie settings) — stay silent.
      setAccepted(true);
    }
  }, []);

  if (accepted) return null;

  const accept = () => {
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      /* ignore */
    }
    setAccepted(true);
  };

  return (
    <div className="cookie-banner" role="region" aria-label={t('cookie.ariaLabel')}>
      <div className="cookie-banner-content">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4" />
          <circle cx="12" cy="16" r="0.5" fill="currentColor" />
        </svg>
        <p>{t('cookie.message')}</p>
        <button type="button" className="cookie-accept-btn" onClick={accept}>
          {t('cookie.accept')}
        </button>
      </div>
    </div>
  );
}
