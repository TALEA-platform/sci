import { useT } from '../i18n/I18nContext';

export default function Hero() {
  const t = useT();

  return (
    <section className="hero" aria-label={t('hero.ariaLabel')}>
      <div className="hero-arcs" aria-hidden="true">
        <svg viewBox="0 0 1400 220" preserveAspectRatio="none" className="hero-arcs-svg">
          <circle cx="200" cy="-30" r="200" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="40" />
          <circle cx="1200" cy="40" r="150" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="30" />
        </svg>
      </div>

      <div className="hero-inner">
        <div className="hero-content">
          <h2 className="hero-title">{t('hero.title')}</h2>
          <p className="hero-subtitle">{t('hero.subtitle')}</p>
        </div>
      </div>

      <div className="hero-gradient-bar" aria-hidden="true" />
    </section>
  );
}
