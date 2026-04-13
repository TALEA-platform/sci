/**
 * Derive a localized month label from a YYYYMM id string.
 * e.g. getMonthLabel('202506', 'it') => 'Giugno'
 */
export function getMonthLabel(monthId, lang = 'it') {
  const year = parseInt(monthId.slice(0, 4), 10);
  const month = parseInt(monthId.slice(4, 6), 10) - 1;
  const locale = lang === 'it' ? 'it-IT' : 'en-GB';
  const label = new Intl.DateTimeFormat(locale, { month: 'long' }).format(new Date(year, month));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/**
 * Format a date id (YYYYMMDD) or ISO string (YYYY-MM-DD) into a localized date.
 * e.g. getDateLabel('20250615', 'it') => '15 Giugno 2025'
 *      getDateLabel('20250615', 'en') => '15 June 2025'
 */
export function getDateLabel(dateId, lang = 'it') {
  const str = dateId.length === 8
    ? `${dateId.slice(0, 4)}-${dateId.slice(4, 6)}-${dateId.slice(6, 8)}`
    : dateId;
  const d = new Date(str + 'T12:00:00');
  const locale = lang === 'it' ? 'it-IT' : 'en-GB';
  const label = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/**
 * Resolve a label from a MANIFEST item using the translation function.
 * Items with `labelKey` use t(), otherwise fall back to `label`.
 */
export function resolveLabel(item, t) {
  if (!item) return '';
  if (item.labelKey) return t(item.labelKey);
  return item.label || item.id || '';
}

/**
 * Resolve a description from a MANIFEST item using the translation function.
 */
export function resolveDescription(item, t) {
  if (!item) return '';
  if (item.descriptionKey) return t(item.descriptionKey);
  return item.description || '';
}
