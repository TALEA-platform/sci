/**
 * 3-bit shadow encoding model.
 * Each pixel value encodes three physical states:
 *   Bit 0 (value 1): G_h — ground/pedestrian shadow
 *   Bit 1 (value 2): S_h — elevated surface shadow
 *   Bit 2 (value 4): M_h — object-above-height mask
 *
 * Display modes:
 *   satellite — top-down binary: shadow on ground (1) + shadow on structures (6,7)
 *   gray      — grayscale intensity per category
 *   multi     — distinct colour per 3-bit category
 */

export const SHADOW_PIXEL_VALUES = [
  {
    value: 0,
    G: false, S: false, M: false,
    colorMulti: '#F8F2E2', // open sun
    colorGray: '#DCDCDC',
    satelliteShadow: false,
    labelKey: 'legend.shadow.pixel0',
    descKey: 'legend.shadow.pixel0Desc',
  },
  {
    value: 1,
    G: true, S: false, M: false,
    colorMulti: '#4C6E90', // ground shadow
    colorGray: '#3C3C3C',
    satelliteShadow: true,
    labelKey: 'legend.shadow.pixel1',
    descKey: 'legend.shadow.pixel1Desc',
  },
  // Values 2 and 3 are physically impossible
  {
    value: 4,
    G: false, S: false, M: true,
    colorMulti: '#C4A47C', // elevated surface in sun (merged 4+5)
    colorGray: '#969696',
    satelliteShadow: false,
    labelKey: 'legend.shadow.pixelElevatedSun',
    descKey: 'legend.shadow.pixelElevatedSunDesc',
    mergedGroup: 'elevatedSun',
  },
  {
    value: 5,
    G: true, S: false, M: true,
    colorMulti: '#C4A47C', // same as 4
    colorGray: '#969696',
    satelliteShadow: false,
    labelKey: 'legend.shadow.pixelElevatedSun',
    descKey: 'legend.shadow.pixelElevatedSunDesc',
    mergedGroup: 'elevatedSun',
  },
  {
    value: 6,
    G: false, S: true, M: true,
    colorMulti: '#504670', // elevated surface in shadow (merged 6+7)
    colorGray: '#1C1C1C',
    satelliteShadow: true,
    labelKey: 'legend.shadow.pixelElevatedShadow',
    descKey: 'legend.shadow.pixelElevatedShadowDesc',
    mergedGroup: 'elevatedShadow',
  },
  {
    value: 7,
    G: true, S: true, M: true,
    colorMulti: '#504670', // same as 6
    colorGray: '#1C1C1C',
    satelliteShadow: true,
    labelKey: 'legend.shadow.pixelElevatedShadow',
    descKey: 'legend.shadow.pixelElevatedShadowDesc',
    mergedGroup: 'elevatedShadow',
  },
];

/**
 * Build legend items for the day view based on display mode.
 * @param {'satellite' | 'gray' | 'multi'} mode
 * @param {Function} t - translation function
 */
export function buildShadowLegendItems(mode, t) {
  if (mode === 'satellite') {
    return [
      { color: '#FFFDE7', label: t('legend.shadow.satelliteSun') },
      { color: '#37474F', label: t('legend.shadow.satelliteShadow') },
    ];
  }

  // Deduplicate merged groups (4+5 and 6+7)
  const seen = new Set();
  const items = [];
  for (const pv of SHADOW_PIXEL_VALUES) {
    const key = pv.mergedGroup || pv.value;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({
      color: mode === 'gray' ? pv.colorGray : pv.colorMulti,
      label: t(pv.labelKey),
    });
  }
  return items;
}
