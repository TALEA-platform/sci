import { useI18n } from '../i18n/I18nContext';

export default function LanguageToggle() {
  const { lang, setLang } = useI18n();

  return (
    <div className="lang-toggle" role="radiogroup" aria-label="Language">
      <button
        className={`lang-toggle-btn${lang === 'it' ? ' active' : ''}`}
        onClick={() => setLang('it')}
        type="button"
        role="radio"
        aria-checked={lang === 'it'}
        aria-label="Italiano"
      >
        IT
      </button>
      <button
        className={`lang-toggle-btn${lang === 'en' ? ' active' : ''}`}
        onClick={() => setLang('en')}
        type="button"
        role="radio"
        aria-checked={lang === 'en'}
        aria-label="English"
      >
        EN
      </button>
    </div>
  );
}
