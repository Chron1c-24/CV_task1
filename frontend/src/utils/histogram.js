/*
 * Fast client-side histogram and distribution computation from image source.
 * Extracts pixel data via canvas, computing:
 * - Luminance / Gray histogram (0.299 R + 0.587 G + 0.114 B, matching services/image_io.py)
 * - R, G, B channel histograms
 * - CDF (Cumulative Distribution Function 0-1)
 * - Descriptive statistics: Mean, Standard Deviation, Min, Max, Median, Total Pixels
 * - Grayscale vs Color detection
 * - Difference metrics between two histograms
 */

const cache = new Map();

function analyzeImageData(imgData, w, h) {
  const data = imgData.data;
  const totalPixels = w * h;

  const r = new Uint32Array(256);
  const g = new Uint32Array(256);
  const b = new Uint32Array(256);
  const gray = new Uint32Array(256);

  let sumGray = 0;
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let colorDiffSum = 0;

  for (let i = 0; i < data.length; i += 4) {
    const red = data[i];
    const green = data[i + 1];
    const blue = data[i + 2];

    r[red]++;
    g[green]++;
    b[blue]++;

    // Match services/image_io.py: 0.299 * R + 0.587 * G + 0.114 * B
    const y = Math.min(255, Math.max(0, Math.round(0.299 * red + 0.587 * green + 0.114 * blue)));
    gray[y]++;

    sumGray += y;
    sumR += red;
    sumG += green;
    sumB += blue;

    colorDiffSum += Math.abs(red - green) + Math.abs(green - blue) + Math.abs(blue - red);
  }

  // True grayscale has diff = 0. An average difference < 1.0 accounts for JPEG chroma sub-sampling artifacts
  const isGrayscale = totalPixels > 0 && colorDiffSum / totalPixels < 1.0;

  let minGray = 255;
  let maxGray = 0;
  for (let i = 0; i < 256; i++) {
    if (gray[i] > 0) {
      if (i < minGray) minGray = i;
      if (i > maxGray) maxGray = i;
    }
  }
  if (minGray > maxGray) {
    minGray = 0;
    maxGray = 0;
  }

  const meanGray = totalPixels > 0 ? sumGray / totalPixels : 0;
  let varianceSum = 0;
  let median = 0;
  let runningCount = 0;
  let medianFound = false;

  const cdf = new Float64Array(256);
  const pdf = new Float64Array(256);
  let cumSum = 0;

  for (let i = 0; i < 256; i++) {
    const count = gray[i];
    if (count > 0) {
      varianceSum += count * (i - meanGray) * (i - meanGray);
    }
    runningCount += count;
    if (!medianFound && runningCount >= totalPixels / 2) {
      median = i;
      medianFound = true;
    }
    cumSum += count;
    cdf[i] = totalPixels > 0 ? cumSum / totalPixels : 0;
    pdf[i] = totalPixels > 0 ? count / totalPixels : 0;
  }

  const stdGray = totalPixels > 0 ? Math.sqrt(varianceSum / totalPixels) : 0;

  return {
    totalPixels,
    isGrayscale,
    channels: {
      r: Array.from(r),
      g: Array.from(g),
      b: Array.from(b),
      gray: Array.from(gray),
    },
    cdf: Array.from(cdf),
    pdf: Array.from(pdf),
    stats: {
      mean: meanGray,
      std: stdGray,
      min: minGray,
      max: maxGray,
      median,
    },
  };
}

function renderAndAnalyze(source, width, height) {
  if (!width || !height) return null;

  // Downscale to max dimension 640 for instant (<5ms) computation
  const maxDim = 640;
  let scale = 1;
  if (Math.max(width, height) > maxDim) {
    scale = maxDim / Math.max(width, height);
  }
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  ctx.drawImage(source, 0, 0, w, h);
  const imgData = ctx.getImageData(0, 0, w, h);
  return analyzeImageData(imgData, w, h);
}

export async function computeHistogramFromSrc(src) {
  if (!src) return null;
  if (cache.has(src)) return cache.get(src);

  // Strategy 1: Try fetch -> blob -> createImageBitmap (fastest, most robust in modern browsers)
  if (typeof window !== "undefined" && typeof fetch === "function" && typeof createImageBitmap === "function") {
    try {
      const resp = await fetch(src);
      if (resp.ok) {
        const blob = await resp.blob();
        const bitmap = await createImageBitmap(blob);
        const result = renderAndAnalyze(bitmap, bitmap.width, bitmap.height);
        bitmap.close?.();
        if (result) {
          saveToCache(src, result);
          return result;
        }
      }
    } catch {
      // Fall through to Strategy 2 (new Image)
    }
  }

  // Strategy 2: Standard new Image()
  return new Promise((resolve) => {
    const img = new Image();

    // CRITICAL: NEVER set crossOrigin for blob: or data: URLs!
    // In Chrome, crossOrigin='anonymous' on a blob: URL causes a CORS failure.
    // Only set crossOrigin if loading from an external http/https URL.
    if (src.startsWith("http://") || src.startsWith("https://")) {
      img.crossOrigin = "anonymous";
    }

    const handleLoaded = () => {
      try {
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;
        const result = renderAndAnalyze(img, width, height);
        if (result) {
          saveToCache(src, result);
          resolve(result);
        } else {
          resolve(null);
        }
      } catch (err) {
        console.error("Histogram error:", err);
        resolve(null);
      }
    };

    img.onload = handleLoaded;
    img.onerror = (err) => {
      console.error("Image failed to load for histogram:", err);
      resolve(null);
    };

    img.src = src;

    // If image is already cached/complete, trigger immediately
    if (img.complete && (img.naturalWidth || img.width)) {
      handleLoaded();
    }
  });
}

function saveToCache(key, value) {
  if (cache.size > 50) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
  cache.set(key, value);
}

/* Compute numerical difference metrics between two histogram stat objects */
export function computeStatDelta(currentStats, baselineStats) {
  if (!currentStats || !baselineStats) return null;
  return {
    mean: currentStats.mean - baselineStats.mean,
    std: currentStats.std - baselineStats.std,
    min: currentStats.min - baselineStats.min,
    max: currentStats.max - baselineStats.max,
    median: currentStats.median - baselineStats.median,
  };
}
