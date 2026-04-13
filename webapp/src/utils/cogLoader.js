import { fromUrl, Pool } from 'geotiff';

// ---- Colormaps (used to build flat LUTs once at module load) ----
// Alpha is always 255 (fully opaque). The opacity slider
// controls transparency via MapLibre's raster-opacity property.
// `multi` uses the "urban warm" palette: no green, more elegant
// for an urban data-storytelling context.
const COLORMAPS = {
  satellite: {
    0: [255, 253, 231, 255],
    1: [55, 71, 79, 255],
    4: [255, 253, 231, 255],
    5: [255, 253, 231, 255],
    6: [55, 71, 79, 255],
    7: [55, 71, 79, 255],
  },
  gray: {
    0: [220, 220, 220, 255],
    1: [60, 60, 60, 255],
    4: [150, 150, 150, 255], // elevated surface in sun (merged 4+5)
    5: [150, 150, 150, 255],
    6: [28, 28, 28, 255],    // elevated surface in shadow (merged 6+7)
    7: [28, 28, 28, 255],
  },
  multi: {
    0: [248, 242, 226, 255], // open sun
    1: [76, 110, 144, 255],  // ground shadow
    4: [196, 164, 124, 255], // elevated surface in sun (merged 4+5)
    5: [196, 164, 124, 255],
    6: [80, 70, 112, 255],   // elevated surface in shadow (merged 6+7)
    7: [80, 70, 112, 255],
  },
};

const TRANSPARENT = [0, 0, 0, 0];

// ---- Build flat LUTs once (256 * 4 bytes per mode) ----
// Indexed access into a Uint8ClampedArray is much faster
// than per-pixel object lookups + array dereferencing.
function buildLUT(colormap) {
  const lut = new Uint8ClampedArray(256 * 4);
  for (let v = 0; v < 256; v++) {
    const c = colormap[v] || TRANSPARENT;
    const j = v * 4;
    lut[j]     = c[0];
    lut[j + 1] = c[1];
    lut[j + 2] = c[2];
    lut[j + 3] = c[3];
  }
  return lut;
}

const LUTS = {};
for (const mode of Object.keys(COLORMAPS)) {
  LUTS[mode] = buildLUT(COLORMAPS[mode]);
}

// ---- Continuous (gradient) LUTs for aggregation data ----
// Float input in [0, 1] is mapped to 256 steps via interpolation
// across a list of (t, [r,g,b,a]) stops. NaN is rendered transparent.
// The aggregation palette is the "urban warm" gradient: cream
// (always sun) → cool slate / deep navy (always shadow).
const CONTINUOUS_GRADIENTS = {
  aggregation: [
    [0.00, [248, 242, 226, 255]], // cream — always sun
    [0.17, [232, 218, 188, 255]], // warm cream
    [0.33, [212, 188, 152, 255]], // soft tan
    [0.50, [180, 158, 158, 255]], // muted rose-grey
    [0.67, [124, 110, 154, 255]], // dusky violet
    [0.83, [76,  84,  124, 255]], // cool slate
    [1.00, [36,  46,  68,  255]], // deep navy — always shadow
  ],
  // Grayscale variant for the aggregation view: white (always sun) → near-black (always shadow).
  aggregationGray: [
    [0.00, [248, 248, 248, 255]],
    [0.25, [200, 200, 200, 255]],
    [0.50, [150, 150, 150, 255]],
    [0.75, [88,  88,  88,  255]],
    [1.00, [28,  28,  28,  255]],
  ],
  // ColorBrewer RdYlBu (11-class divergent): red = always sun, yellow = mixed, blue = always shadow.
  aggregationDiverging: [
    [0.00, [165,   0,  38, 255]],
    [0.10, [215,  48,  39, 255]],
    [0.20, [244, 109,  67, 255]],
    [0.30, [253, 174,  97, 255]],
    [0.40, [254, 224, 144, 255]],
    [0.50, [255, 255, 191, 255]],
    [0.60, [224, 243, 248, 255]],
    [0.70, [171, 217, 233, 255]],
    [0.80, [116, 173, 209, 255]],
    [0.90, [ 69, 117, 180, 255]],
    [1.00, [ 49,  54, 149, 255]],
  ],
};

function buildContinuousLUT(stops) {
  const lut = new Uint8ClampedArray(256 * 4);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let lo = stops[0];
    let hi = stops[stops.length - 1];
    for (let s = 0; s < stops.length - 1; s++) {
      if (t >= stops[s][0] && t <= stops[s + 1][0]) {
        lo = stops[s];
        hi = stops[s + 1];
        break;
      }
    }
    const range = hi[0] - lo[0];
    const u = range > 0 ? (t - lo[0]) / range : 0;
    const j = i * 4;
    lut[j]     = lo[1][0] + u * (hi[1][0] - lo[1][0]);
    lut[j + 1] = lo[1][1] + u * (hi[1][1] - lo[1][1]);
    lut[j + 2] = lo[1][2] + u * (hi[1][2] - lo[1][2]);
    lut[j + 3] = lo[1][3] + u * (hi[1][3] - lo[1][3]);
  }
  return lut;
}

const CONTINUOUS_LUTS = {};
for (const mode of Object.keys(CONTINUOUS_GRADIENTS)) {
  CONTINUOUS_LUTS[mode] = buildContinuousLUT(CONTINUOUS_GRADIENTS[mode]);
}

/**
 * Export continuous gradient stops for rendering legends.
 */
export function getContinuousGradient(mode) {
  return CONTINUOUS_GRADIENTS[mode];
}

// ---- Web Worker (off-thread colorize + PNG encode) ----
let worker = null;
let workerOk = true; // false if worker failed to start
let msgId = 0;
const pending = new Map();

function rejectAllPending(err) {
  for (const { reject } of pending.values()) {
    try { reject(err); } catch { /* ignore */ }
  }
  pending.clear();
}

function initWorker() {
  if (worker || !workerOk) return;
  try {
    // Serialize all LUTs as plain arrays so the worker can rebuild
    // its own Uint8ClampedArrays without sharing memory.
    const discreteLutsForWorker = {};
    for (const mode of Object.keys(LUTS)) {
      discreteLutsForWorker[mode] = Array.from(LUTS[mode]);
    }
    const continuousLutsForWorker = {};
    for (const mode of Object.keys(CONTINUOUS_LUTS)) {
      continuousLutsForWorker[mode] = Array.from(CONTINUOUS_LUTS[mode]);
    }

    const workerBlob = new Blob([`
      const DISCRETE_DATA = ${JSON.stringify(discreteLutsForWorker)};
      const CONTINUOUS_DATA = ${JSON.stringify(continuousLutsForWorker)};
      const DISCRETE_LUTS = {};
      for (const mode of Object.keys(DISCRETE_DATA)) {
        DISCRETE_LUTS[mode] = new Uint8ClampedArray(DISCRETE_DATA[mode]);
      }
      const CONTINUOUS_LUTS = {};
      for (const mode of Object.keys(CONTINUOUS_DATA)) {
        CONTINUOUS_LUTS[mode] = new Uint8ClampedArray(CONTINUOUS_DATA[mode]);
      }

      self.onmessage = async (e) => {
        const { id, pixelBuffer, width, height, mode, kind, dtype } = e.data;
        try {
          const len = width * height;
          const rgba = new Uint8ClampedArray(len * 4);

          if (kind === 'continuous') {
            // Float data in [0, 1], NaN = nodata (transparent).
            const pixelData = dtype === 'f64'
              ? new Float64Array(pixelBuffer)
              : new Float32Array(pixelBuffer);
            const lut = CONTINUOUS_LUTS[mode] || CONTINUOUS_LUTS.aggregation;
            for (let i = 0, j = 0; i < len; i++, j += 4) {
              const v = pixelData[i];
              if (v !== v) {
                // NaN
                rgba[j] = 0; rgba[j + 1] = 0; rgba[j + 2] = 0; rgba[j + 3] = 0;
                continue;
              }
              let idx = (v * 255) | 0;
              if (idx < 0) idx = 0;
              else if (idx > 255) idx = 255;
              const k = idx * 4;
              rgba[j]     = lut[k];
              rgba[j + 1] = lut[k + 1];
              rgba[j + 2] = lut[k + 2];
              rgba[j + 3] = lut[k + 3];
            }
          } else {
            // Discrete uint8 path
            const pixelData = new Uint8Array(pixelBuffer);
            const lut = DISCRETE_LUTS[mode] || DISCRETE_LUTS.satellite;
            for (let i = 0, j = 0; i < len; i++, j += 4) {
              const k = pixelData[i] * 4;
              rgba[j]     = lut[k];
              rgba[j + 1] = lut[k + 1];
              rgba[j + 2] = lut[k + 2];
              rgba[j + 3] = lut[k + 3];
            }
          }

          const imageData = new ImageData(rgba, width, height);
          const canvas = new OffscreenCanvas(width, height);
          const ctx = canvas.getContext('2d');
          ctx.putImageData(imageData, 0, 0);
          const blob = await canvas.convertToBlob({ type: 'image/png' });
          self.postMessage({ id, blob });
        } catch (err) {
          self.postMessage({ id, error: err && err.message || 'colorize failed' });
        }
      };
    `], { type: 'application/javascript' });

    const workerUrl = URL.createObjectURL(workerBlob);
    worker = new Worker(workerUrl);
    // The Worker constructor synchronously initiates loading; the URL
    // can be released as soon as the Worker has been created.
    URL.revokeObjectURL(workerUrl);
    worker.onmessage = (e) => {
      const { id, blob, error } = e.data;
      const p = pending.get(id);
      if (!p) return;
      pending.delete(id);
      if (error) p.reject(new Error(error));
      else p.resolve(blob);
    };
    worker.onerror = (err) => {
      workerOk = false;
      try { worker.terminate(); } catch { /* ignore */ }
      worker = null;
      rejectAllPending(err);
    };
  } catch {
    workerOk = false;
  }
}

// Main-thread fallback canvas (reused to avoid GC)
let fallbackCanvas = null;

function colorizeFallback(pixelData, width, height, mode, kind) {
  const len = width * height;
  const rgba = new Uint8ClampedArray(len * 4);

  if (kind === 'continuous') {
    const lut = CONTINUOUS_LUTS[mode] || CONTINUOUS_LUTS.aggregation;
    for (let i = 0, j = 0; i < len; i++, j += 4) {
      const v = pixelData[i];
      if (Number.isNaN(v)) {
        rgba[j] = 0; rgba[j + 1] = 0; rgba[j + 2] = 0; rgba[j + 3] = 0;
        continue;
      }
      let idx = (v * 255) | 0;
      if (idx < 0) idx = 0;
      else if (idx > 255) idx = 255;
      const k = idx * 4;
      rgba[j]     = lut[k];
      rgba[j + 1] = lut[k + 1];
      rgba[j + 2] = lut[k + 2];
      rgba[j + 3] = lut[k + 3];
    }
  } else {
    const lut = LUTS[mode] || LUTS.satellite;
    for (let i = 0, j = 0; i < len; i++, j += 4) {
      const k = pixelData[i] * 4;
      rgba[j]     = lut[k];
      rgba[j + 1] = lut[k + 1];
      rgba[j + 2] = lut[k + 2];
      rgba[j + 3] = lut[k + 3];
    }
  }

  if (!fallbackCanvas) fallbackCanvas = document.createElement('canvas');
  fallbackCanvas.width = width;
  fallbackCanvas.height = height;
  const ctx = fallbackCanvas.getContext('2d');
  ctx.putImageData(new ImageData(rgba, width, height), 0, 0);
  return new Promise((resolve, reject) => {
    fallbackCanvas.toBlob((blob) => {
      if (!blob) reject(new Error('PNG encoding failed'));
      else resolve(blob);
    }, 'image/png');
  });
}

/** Detect colorize kind + worker dtype tag from a typed array. */
function detectKind(pixelData) {
  if (pixelData instanceof Float32Array) return { kind: 'continuous', dtype: 'f32' };
  if (pixelData instanceof Float64Array) return { kind: 'continuous', dtype: 'f64' };
  return { kind: 'discrete', dtype: 'u8' };
}

/**
 * Colorize raw pixel data and return a Blob (PNG).
 * Uses a Web Worker when available; falls back to main thread.
 *
 * The pixel buffer is copied (so the cached raw stays intact) and
 * the copy is then transferred to the worker — zero-copy across the
 * thread boundary.
 */
function colorizeToBlob(pixelData, width, height, mode) {
  initWorker();
  const { kind, dtype } = detectKind(pixelData);

  if (worker && workerOk) {
    return new Promise((resolve, reject) => {
      const id = ++msgId;
      pending.set(id, { resolve, reject });
      try {
        // Copy with the matching typed array constructor so the
        // worker can wrap the buffer directly.
        let copy;
        if (dtype === 'f64') {
          copy = new Float64Array(pixelData.length);
          copy.set(pixelData);
        } else if (dtype === 'f32') {
          copy = new Float32Array(pixelData.length);
          copy.set(pixelData);
        } else {
          copy = new Uint8Array(pixelData.length);
          copy.set(pixelData);
        }
        worker.postMessage(
          {
            id,
            pixelBuffer: copy.buffer,
            width,
            height,
            mode,
            kind,
            dtype,
          },
          [copy.buffer]
        );
      } catch (err) {
        pending.delete(id);
        reject(err);
      }
    });
  }

  // Fallback: main thread
  return colorizeFallback(pixelData, width, height, mode, kind);
}

// ---- Render cache (colorized PNG Blob keyed by url + mode) ----
// We cache the Blob (not the URL). Each apply creates a fresh
// object URL from the Blob; MapView revokes its previous URL on swap.
// When the entry is evicted, the Blob is dropped and GC'd.
const renderCache = new Map();
const MAX_RENDER_CACHE = 24;

function renderCacheGet(key) {
  const blob = renderCache.get(key);
  if (!blob) return null;
  // touch (LRU): move to end
  renderCache.delete(key);
  renderCache.set(key, blob);
  return blob;
}

function renderCacheSet(key, blob) {
  if (renderCache.has(key)) renderCache.delete(key);
  renderCache.set(key, blob);
  while (renderCache.size > MAX_RENDER_CACHE) {
    const oldest = renderCache.keys().next().value;
    renderCache.delete(oldest);
  }
}

/**
 * Get a colorized blob URL plus WGS84 bounds for (url, mode).
 * Uses the render cache when possible. Always returns a fresh URL —
 * the caller is responsible for calling URL.revokeObjectURL when done.
 */
export async function getColorizedUrl(url, mode) {
  const key = `${url}::${mode}`;
  // bounds always come from loadCog (cogCache makes this cheap on hit)
  const { bounds } = await loadCog(url);

  let blob = renderCacheGet(key);
  if (!blob) {
    const { data, width, height } = await loadCog(url);
    blob = await colorizeToBlob(data, width, height, mode);
    renderCacheSet(key, blob);
  }
  return { url: URL.createObjectURL(blob), bounds };
}

/**
 * Legacy/raw colorize entry point — returns a fresh blob URL
 * directly from raw pixel data (no render cache). Kept for callers
 * that already hold raw data and just need a one-shot render.
 */
export async function colorizeOffThread(pixelData, width, height, mode) {
  const blob = await colorizeToBlob(pixelData, width, height, mode);
  return URL.createObjectURL(blob);
}

// ---- COG cache + geotiff Pool for parallel decode ----
const cogCache = new Map();
const MAX_CACHE = 12;

// In-flight load deduplication.
//   Key: COG URL.
//   Value: the Promise returned by the very first loadCog(url) call that
//          missed `cogCache`. Subsequent concurrent callers wait on the
//          same promise instead of starting their own fetch.
//
// Why this matters: geotiff issues HTTP Range requests on the URL via
// `fromUrl` + `image.readRasters`. If two TIFF readers race on the same
// URL, the Chromium HTTP cache can return partial / interleaved bytes,
// producing the trifecta of "Failed to fetch",
// "ERR_CACHE_OPERATION_NOT_SUPPORTED", and
// "RangeError: Offset is outside the bounds of the DataView".
// Deduping at the JS layer guarantees at most one in-flight fetch per URL.
const inFlightLoads = new Map();

let tiffPool = null;
function getPool() {
  if (tiffPool) return tiffPool;
  try {
    tiffPool = new Pool();
  } catch {
    tiffPool = null;
  }
  return tiffPool;
}

// Web Mercator constants
const MERC_R = 6378137;
const MERC_HALF_CIRCUM = Math.PI * MERC_R; // 20037508.342789244

/**
 * Convert EPSG:3857 (Web Mercator) meters to WGS84 [lng, lat].
 */
function mercToWgs84(x, y) {
  const lng = (x / MERC_HALF_CIRCUM) * 180;
  const lat =
    (Math.atan(Math.exp((y / MERC_HALF_CIRCUM) * Math.PI)) * 360) / Math.PI -
    90;
  return [lng, lat];
}

/**
 * Load a COG file and return raw pixel data plus WGS84 bounds.
 * The COG must be in EPSG:3857 (Web Mercator).
 *
 * Concurrent callers for the same URL are coalesced onto a single
 * in-flight promise via `inFlightLoads`. See the comment on that map
 * for the reasoning — without this, two TIFF readers racing on the
 * same URL produce "Failed to fetch" / "ERR_CACHE_OPERATION_NOT_SUPPORTED"
 * / "Offset is outside the bounds of the DataView".
 */
export async function loadCog(url) {
  if (cogCache.has(url)) {
    // LRU touch: move to end so hot entries don't get evicted
    const hit = cogCache.get(url);
    cogCache.delete(url);
    cogCache.set(url, hit);
    return hit;
  }

  // If a load for this URL is already in flight, await the same promise.
  const existing = inFlightLoads.get(url);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const absUrl = new URL(url, window.location.href).href;
      const tiff = await fromUrl(absUrl);
      const image = await tiff.getImage();

      // Read explicitly the single band we need, interleaved,
      // and use the worker pool for parallel decompression.
      const pool = getPool();
      const readOpts = { samples: [0], interleave: true };
      if (pool) readOpts.pool = pool;
      const data = await image.readRasters(readOpts);

      // Bounding box in the COG's native CRS (EPSG:3857 meters):
      // [minX, minY, maxX, maxY]
      const bbox = image.getBoundingBox();
      const [west, south] = mercToWgs84(bbox[0], bbox[1]);
      const [east, north] = mercToWgs84(bbox[2], bbox[3]);

      const result = {
        data,
        width: image.getWidth(),
        height: image.getHeight(),
        bounds: [west, south, east, north],
      };

      if (cogCache.size >= MAX_CACHE) {
        const oldest = cogCache.keys().next().value;
        cogCache.delete(oldest);
      }
      cogCache.set(url, result);
      return result;
    } finally {
      // Always clear the in-flight slot — on success the result is now
      // in cogCache, on failure callers should be free to retry.
      inFlightLoads.delete(url);
    }
  })();

  inFlightLoads.set(url, promise);
  return promise;
}

/**
 * Prefetch COG URLs in background.
 */
export function prefetchCogs(urls) {
  for (const url of urls) {
    if (!cogCache.has(url)) {
      loadCog(url).catch(() => {});
    }
  }
}

/**
 * Convert WGS84 bounds [west, south, east, north]
 * to MapLibre image-source coordinates.
 */
export function boundsToCoordinates(bounds) {
  const [west, south, east, north] = bounds;
  return [
    [west, north],
    [east, north],
    [east, south],
    [west, south],
  ];
}
