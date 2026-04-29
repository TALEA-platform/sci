import { useT } from '../i18n/I18nContext';

const MODES = [
  {
    id: 'satellite',
    labelKey: 'controls.satellite',
    icon: (
      <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
        <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10 2a8 8 0 010 16z" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: 'gray',
    labelKey: 'controls.gray',
    icon: (
      <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
        <rect x="2" y="2" width="16" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <rect x="2" y="2" width="8" height="16" rx="1" fill="currentColor" opacity="0.25" />
        <rect x="6" y="2" width="5" height="16" fill="currentColor" opacity="0.45" />
        <rect x="10" y="2" width="8" height="16" rx="1" fill="currentColor" opacity="0.7" />
      </svg>
    ),
  },
  {
    id: 'multi',
    labelKey: 'controls.multi',
    icon: (
      <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
        <rect x="2" y="2" width="7" height="7" rx="1" fill="#FFFDE7" stroke="currentColor" strokeWidth="0.5" />
        <rect x="11" y="2" width="7" height="7" rx="1" fill="#5C6BC0" stroke="currentColor" strokeWidth="0.5" />
        <rect x="2" y="11" width="7" height="7" rx="1" fill="#66BB6A" stroke="currentColor" strokeWidth="0.5" />
        <rect x="11" y="11" width="7" height="7" rx="1" fill="#1A237E" stroke="currentColor" strokeWidth="0.5" />
      </svg>
    ),
  },
];

export default function DisplayModeToggle({ mode, onModeChange }) {
  const t = useT();

  return (
    <div className="display-mode-toggle" role="radiogroup" aria-label={t('controls.displayMode')}>
      {MODES.map((m) => (
        <button
          key={m.id}
          className={`display-mode-btn${mode === m.id ? ' active' : ''}`}
          onClick={() => onModeChange(m.id)}
          type="button"
          role="radio"
          aria-checked={mode === m.id}
        >
          {m.icon}
          <span>{t(m.labelKey)}</span>
        </button>
      ))}
    </div>
  );
}
