import { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import { translations } from './index';

const I18nContext = createContext();

function resolve(obj, path) {
  return path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : null), obj);
}

export function I18nProvider({ children }) {
  const [lang, setLang] = useState('it');

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const t = useCallback(
    (key, params) => {
      const dict = translations[lang] || translations.it;
      let value = resolve(dict, key);
      if (value === null || value === undefined) {
        // Fallback to Italian
        value = resolve(translations.it, key);
      }
      if (value === null || value === undefined) return key;
      if (typeof value !== 'string') return value;
      if (params) {
        return value.replace(/\{(\w+)\}/g, (_, k) => (params[k] !== undefined ? params[k] : `{${k}}`));
      }
      return value;
    },
    [lang]
  );

  const ctx = useMemo(() => ({ lang, setLang, t }), [lang, t]);

  return <I18nContext.Provider value={ctx}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}

export function useT() {
  const { t } = useContext(I18nContext);
  return t;
}
