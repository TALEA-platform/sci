import { useMemo, useState, useEffect } from 'react';
import { useT } from '../i18n/I18nContext';
import { getPolygonColorForValue } from '../utils/polygonColors';

const DEFAULT_NAME_FIELD = 'feature_name';
const PAGE_SIZE = 10;

function formatNumber(value) {
  if (typeof value !== 'number' || isNaN(value)) return '\u2014';
  return Math.round(value).toLocaleString();
}

function formatPercent(value) {
  if (typeof value !== 'number' || isNaN(value)) return '\u2014';
  return `${(value * 100).toFixed(0)}%`;
}

export default function DataTable({
  rows,
  metricKey,
  metricLabel,
  layerLabel,
  layerConfig,
  searchQuery = '',
  onSearchChange,
  onRowClick,
  selectedFeatureKey,
}) {
  const t = useT();
  const [sortField, setSortField] = useState(metricKey);
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(0);

  const nameField =
    layerConfig?.id === 'streets'
      ? 'display_name'
      : layerConfig?.nameField || DEFAULT_NAME_FIELD;
  const subtitleField = layerConfig?.subtitleField || null;

  // Filter then sort. Filter first is cheaper for the streets layer (10k+ rows).
  const visibleRows = useMemo(() => {
    if (!rows || rows.length === 0) return [];
    const q = (searchQuery || '').trim().toLowerCase();
    let filtered = rows;
    if (q) {
      filtered = rows.filter((r) => {
        const name = String(r[nameField] ?? '').toLowerCase();
        if (name.includes(q)) return true;
        if (subtitleField) {
          const sub = String(r[subtitleField] ?? '').toLowerCase();
          if (sub.includes(q)) return true;
        }
        return false;
      });
    }
    const sorted = [...filtered].sort((a, b) => {
      const va = a[sortField];
      const vb = b[sortField];
      if (typeof va === 'number' && typeof vb === 'number') {
        return sortAsc ? va - vb : vb - va;
      }
      return sortAsc
        ? String(va ?? '').localeCompare(String(vb ?? ''))
        : String(vb ?? '').localeCompare(String(va ?? ''));
    });
    return sorted;
  }, [rows, searchQuery, sortField, sortAsc, nameField, subtitleField]);

  function handleSort(field) {
    if (sortField === field) {
      setSortAsc((prev) => !prev);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  }

  // Reset pagination whenever the filtered set or sort changes.
  useEffect(() => {
    setPage(0);
  }, [searchQuery, sortField, sortAsc, rows]);

  const totalCount = rows?.length || 0;
  const shownCount = visibleRows.length;
  const hasSearchableLayer = !!onSearchChange;
  const totalPages = Math.max(1, Math.ceil(shownCount / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const startIdx = safePage * PAGE_SIZE;
  const endIdx = Math.min(startIdx + PAGE_SIZE, shownCount);
  const pagedRows = visibleRows.slice(startIdx, endIdx);
  const rangeFrom = shownCount === 0 ? 0 : startIdx + 1;
  const rangeTo = endIdx;
  const isFirstPage = safePage === 0;
  const isLastPage = safePage >= totalPages - 1;

  if (!rows || rows.length === 0) {
    return (
      <div className="data-table-empty">
        <svg
          viewBox="0 0 48 48"
          width="40"
          height="40"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          opacity="0.35"
        >
          <rect x="6" y="10" width="36" height="28" rx="3" />
          <path d="M6 18h36M18 18v20M30 18v20" />
        </svg>
        <p>
          {t('dataTable.emptyText')}
          <br />
          {t('dataTable.emptyHint')}
        </p>
      </div>
    );
  }

  return (
    <div className="data-table-section">
      <h3 className="data-table-title">{t('dataTable.title', { layer: layerLabel || 'Layer' })}</h3>

      {hasSearchableLayer && (
        <div className="data-table-toolbar">
          <div className="data-table-search">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="search"
              className="data-table-search-input"
              placeholder={t('dataTable.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              aria-label={t('dataTable.searchPlaceholder')}
            />
            {searchQuery && (
              <button
                type="button"
                className="data-table-search-clear"
                onClick={() => onSearchChange('')}
                aria-label={t('common.close')}
              >
                ×
              </button>
            )}
          </div>
          <div className="data-table-count">
            {shownCount === 0
              ? t('dataTable.showingCount', {
                  shown: '0',
                  total: totalCount.toLocaleString(),
                })
              : t('dataTable.showingRange', {
                  from: rangeFrom.toLocaleString(),
                  to: rangeTo.toLocaleString(),
                  total: shownCount.toLocaleString(),
                })}
          </div>
        </div>
      )}

      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th onClick={() => handleSort(nameField)} className="data-table-th-sortable">
                {t('dataTable.name')}
                {sortField === nameField && <span className="sort-icon active">{sortAsc ? ' \u2191' : ' \u2193'}</span>}
              </th>
              {subtitleField && (
                <th>{t('dataTable.category')}</th>
              )}
              <th onClick={() => handleSort('geometry_area_m2')} className="data-table-th-sortable">
                {t('dataTable.area')}
                {sortField === 'geometry_area_m2' && <span className="sort-icon active">{sortAsc ? ' \u2191' : ' \u2193'}</span>}
              </th>
              <th onClick={() => handleSort(metricKey)} className="data-table-th-sortable">
                {metricLabel || metricKey}
                {sortField === metricKey && <span className="sort-icon active">{sortAsc ? ' \u2191' : ' \u2193'}</span>}
              </th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.length === 0 && (
              <tr>
                <td colSpan={subtitleField ? 4 : 3} className="data-table-no-results">
                  {t('dataTable.noResults', { query: searchQuery })}
                </td>
              </tr>
            )}
            {pagedRows.map((row, i) => {
              const value = row[metricKey];
              const swatchColor = getPolygonColorForValue(typeof value === 'number' ? value : NaN);
              const rowKey = row.feature_idx ?? row[nameField] ?? `${startIdx + i}`;
              const isSelected = selectedFeatureKey != null && rowKey === selectedFeatureKey;
              const isClickable = !!onRowClick;
              return (
                <tr
                  key={rowKey}
                  className={
                    (isClickable ? 'data-table-row--clickable' : '') +
                    (isSelected ? ' data-table-row--selected' : '')
                  }
                  onClick={isClickable ? () => onRowClick(row, startIdx + i) : undefined}
                >
                  <td>{row[nameField] ?? '\u2014'}</td>
                  {subtitleField && (
                    <td className="data-table-label">{row[subtitleField] ?? '\u2014'}</td>
                  )}
                  <td className="data-table-value">{formatNumber(row.geometry_area_m2)}</td>
                  <td className="data-table-value">
                    <span className="data-table-swatch" style={{ background: swatchColor }} aria-hidden="true" />
                    {formatPercent(value)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="data-table-pagination">
          <button
            type="button"
            className="data-table-pagination-btn"
            disabled={isFirstPage}
            onClick={() => setPage(0)}
            aria-label={t('dataTable.first')}
          >
            &laquo;
          </button>
          <button
            type="button"
            className="data-table-pagination-btn"
            disabled={isFirstPage}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            aria-label={t('dataTable.prev')}
          >
            &lsaquo;
          </button>
          <span className="data-table-pagination-info">
            {t('dataTable.pageOf', {
              page: (safePage + 1).toLocaleString(),
              total: totalPages.toLocaleString(),
            })}
          </span>
          <button
            type="button"
            className="data-table-pagination-btn"
            disabled={isLastPage}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            aria-label={t('dataTable.next')}
          >
            &rsaquo;
          </button>
          <button
            type="button"
            className="data-table-pagination-btn"
            disabled={isLastPage}
            onClick={() => setPage(totalPages - 1)}
            aria-label={t('dataTable.last')}
          >
            &raquo;
          </button>
        </div>
      )}
    </div>
  );
}
