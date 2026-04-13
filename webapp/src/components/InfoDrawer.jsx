import { useEffect, useRef } from 'react';
import { useT } from '../i18n/I18nContext';

export default function InfoDrawer({ isOpen, onClose, title, triggerRef, children }) {
  const t = useT();
  const drawerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;

    // Scroll the explorer's map section into view so the
    // fixed info drawer overlay sits nicely over the content
    const explorer = triggerRef?.current?.closest('.explorer');
    const mapSection = explorer?.querySelector('.map-section');
    if (mapSection) {
      mapSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Lock body scroll while compensating for the disappearing
    // scrollbar so the layout doesn't shift left/right.
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    const scrollTimer = setTimeout(() => {
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }
      document.body.style.overflow = 'hidden';
    }, 350);

    function handleKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);

    const closeBtn = drawerRef.current?.querySelector('.info-drawer-close');
    closeBtn?.focus();

    return () => {
      clearTimeout(scrollTimer);
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
      document.removeEventListener('keydown', handleKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="info-drawer-backdrop"
        onClick={onClose}
        role="presentation"
      />
      <aside
        className="info-drawer"
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="info-drawer-accent" aria-hidden="true" />

        <div className="info-drawer-header">
          <div className="info-drawer-header-icon">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
          </div>
          <h3>{title}</h3>
          <button
            className="info-drawer-close"
            onClick={onClose}
            type="button"
            aria-label={t('common.close')}
          >
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="info-drawer-body">{children}</div>

        <div className="info-drawer-footer">
          <button
            className="info-drawer-footer-btn"
            onClick={onClose}
            type="button"
          >
            {t('common.understood')}
          </button>
        </div>
      </aside>
    </>
  );
}
