/*
 * One entry per backend endpoint (api/main.py). The UI is built from this list only.
 *
 * Option  : name = form field name in the API, default = API default, unit shown to the user.
 *           type "int" | "float" | "select". default "" = optional field, not sent.
 * result  : {key, label} of the response image shown in Before/After (null = no single result).
 * outputs : extra things in the response:
 *           {type: "image", key, label} · {type: "imageList", key, label}
 *           {type: "chart", label, unit, mode: "bar" | "line", series: [{path, label, color}]}
 *           path may be nested, e.g. "R.hist".
 * compare : key in COMPARE, enables the Compare tab.
 */

const SEED = { name: "seed", label: "Seed", type: "int", default: "", unit: "empty = random" };
const KERNEL_SIZE = { name: "kernel_size", label: "Kernel size", type: "int", default: 3, min: 1, step: 2, unit: "odd, pixels" };

const GRAY = "var(--ink)";
const RGB_COLORS = { R: "#d64545", G: "#2f9e44", B: "#3b6fd6" };
const rgbSeries = (field) =>
  Object.entries(RGB_COLORS).map(([name, color]) => ({ path: `${name}.${field}`, label: name, color }));

const RAW_TASKS = [
  // ---------- Task 1: additive noise ----------
  {
    id: "noise-uniform", group: "Noise", label: "Uniform noise",
    endpoint: "/api/noise/uniform", compare: "noise",
    description: "Adds a random value in -amount..+amount to every pixel.",
    options: [
      { name: "amount", label: "Amount", type: "int", default: 25, min: 0, max: 255, unit: "gray levels, 0-255" },
      SEED,
    ],
    result: { key: "image", label: "Noisy" },
  },
  {
    id: "noise-gaussian", group: "Noise", label: "Gaussian noise",
    endpoint: "/api/noise/gaussian", compare: "noise",
    description: "Adds normally distributed noise with the given mean and sigma.",
    options: [
      { name: "mean", label: "Mean", type: "float", default: 0.0, step: 1, unit: "gray levels" },
      { name: "sigma", label: "Sigma", type: "float", default: 20.0, min: 0, step: 1, unit: "gray levels" },
      SEED,
    ],
    result: { key: "image", label: "Noisy" },
  },
  {
    id: "noise-salt-pepper", group: "Noise", label: "Salt & pepper noise",
    endpoint: "/api/noise/salt-pepper", compare: "noise",
    description: "Sets a fraction of the pixels to white (salt) or black (pepper).",
    options: [
      { name: "amount", label: "Amount", type: "float", default: 0.04, min: 0, max: 1, step: 0.01, unit: "fraction of pixels, 0-1" },
      { name: "salt_vs_pepper", label: "Salt vs pepper", type: "float", default: 0.5, min: 0, max: 1, step: 0.05, unit: "fraction white, 0-1" },
      SEED,
    ],
    result: { key: "image", label: "Noisy" },
  },

  // ---------- Task 2: low-pass spatial filters ----------
  {
    id: "filter-average", group: "Low-pass filters", label: "Average filter",
    endpoint: "/api/filters/average", compare: "filters",
    description: "Replaces every pixel with the mean of its window.",
    options: [KERNEL_SIZE],
    result: { key: "image", label: "Filtered" },
  },
  {
    id: "filter-gaussian", group: "Low-pass filters", label: "Gaussian filter",
    endpoint: "/api/filters/gaussian", compare: "filters",
    description: "Weighted mean of the window; closer pixels count more.",
    options: [
      KERNEL_SIZE,
      { name: "sigma", label: "Sigma", type: "float", default: 0.0, min: 0, step: 0.1, unit: "pixels, 0 = automatic" },
    ],
    result: { key: "image", label: "Filtered" },
  },
  {
    id: "filter-median", group: "Low-pass filters", label: "Median filter",
    endpoint: "/api/filters/median", compare: "filters",
    description: "Replaces every pixel with the median of its window (best for salt & pepper).",
    options: [KERNEL_SIZE],
    result: { key: "image", label: "Filtered" },
  },

  // ---------- Task 3: edge detection ----------
  {
    id: "edges", group: "Edge detection", label: "Edge detection",
    endpoint: "/api/edges", compare: "edges",
    description: "Sobel, Prewitt, Roberts (from scratch) or Canny (OpenCV).",
    options: [
      { name: "method", label: "Method", type: "select", default: "sobel", choices: ["sobel", "prewitt", "roberts", "canny"] },
      { name: "canny_low", label: "Canny low", type: "float", default: 100, min: 0, step: 10, unit: "gradient strength", showIf: (v) => v.method === "canny" },
      { name: "canny_high", label: "Canny high", type: "float", default: 200, min: 0, step: 10, unit: "gradient strength", showIf: (v) => v.method === "canny" },
    ],
    result: { key: "result", label: "Edges" },
    outputs: [
      { type: "image", key: "grad_x", label: "Gradient X" },
      { type: "image", key: "grad_y", label: "Gradient Y" },
    ],
  },


  // ---------- Task 5: histogram equalization ----------
  {
    id: "equalization-gray", group: "Equalization", label: "Equalization (gray)",
    endpoint: "/api/equalization/gray", compare: "equalization",
    description: "Equalizes the gray image. Charts show the histogram and CDF BEFORE equalization.",
    options: [],
    result: { key: "image", label: "Equalized" },
    outputs: [
      { type: "chart", label: "Histogram (before)", unit: "pixels", mode: "bar", series: [{ path: "hist", color: GRAY }] },
      { type: "chart", label: "CDF (before)", unit: "0-1", mode: "line", series: [{ path: "cdf", color: GRAY }] },
    ],
  },
  {
    id: "equalization-color", group: "Equalization", label: "Equalization (color)",
    endpoint: "/api/equalization/color", compare: "equalization",
    description: "Equalizes only the Y (luminance) channel so colours stay natural.",
    options: [],
    result: { key: "image", label: "Equalized" },
  },

  // ---------- Task 6: min-max normalization ----------
  {
    id: "normalization", group: "Normalization", label: "Min-max normalization",
    endpoint: "/api/normalization",
    description: "Stretches the image values into [new_min, new_max].",
    options: [
      { name: "new_min", label: "New min", type: "int", default: 0, min: 0, max: 255, unit: "gray levels, 0-255" },
      { name: "new_max", label: "New max", type: "int", default: 255, min: 0, max: 255, unit: "gray levels, 0-255" },
    ],
    result: { key: "image", label: "Normalized" },
  },

  // ---------- Task 8: RGB -> gray and R, G, B histograms ----------
  {
    id: "rgb-gray", group: "RGB", label: "RGB → gray",
    endpoint: "/api/rgb/gray",
    description: "Gray = 0.299R + 0.587G + 0.114B.",
    options: [],
    result: { key: "image", label: "Gray" },
  },
  {
    id: "rgb-histograms", group: "RGB", label: "R, G, B histograms + CDF",
    endpoint: "/api/rgb/histograms",
    description: "Histogram and CDF of each colour channel. Needs an RGB image.",
    options: [],
    result: null,
    outputs: [
      { type: "chart", label: "Histogram R, G, B", unit: "pixels", mode: "line", series: rgbSeries("hist") },
      { type: "chart", label: "CDF R, G, B", unit: "0-1", mode: "line", series: rgbSeries("cdf") },
    ],
  },

  // ---------- Task 9: frequency-domain filters ----------
  {
    id: "frequency-lowpass", group: "Frequency filters", label: "Ideal low-pass",
    endpoint: "/api/frequency/filters", compare: "frequency",
    description: "Ideal low-pass filter in the DFT domain. Keeps frequencies inside the cutoff radius.",
    options: [
      { name: "cutoff", label: "Cutoff", type: "float", default: 30, min: 0, step: 1, unit: "frequency samples" },
    ],
    result: { key: "lp", label: "Low-pass" },
    outputs: [
      { type: "image", key: "spectrum", label: "Spectrum (log magnitude)" },
      { type: "image", key: "lp_mask", label: "Low-pass mask" },
    ],
  },
  {
    id: "frequency-highpass", group: "Frequency filters", label: "Ideal high-pass",
    endpoint: "/api/frequency/filters", compare: "frequency",
    description: "Ideal high-pass filter in the DFT domain. Keeps frequencies outside the cutoff radius.",
    options: [
      { name: "cutoff", label: "Cutoff", type: "float", default: 30, min: 0, step: 1, unit: "frequency samples" },
    ],
    result: { key: "hp", label: "High-pass" },
    outputs: [
      { type: "image", key: "spectrum", label: "Spectrum (log magnitude)" },
      { type: "image", key: "hp_mask", label: "High-pass mask" },
    ],
  },

  // ---------- Task 10: hybrid images ----------
  {
    id: "hybrid", group: "Hybrid images", label: "Hybrid image",
    endpoint: "/api/hybrid",
    inputs: ["img_far", "img_near"],
    description: "Low-pass of the far image + high-pass of the near image (near is resized to far's size).",
    options: [
      { name: "cutoff_low", label: "Cutoff low", type: "float", default: 15, min: 0, step: 1, unit: "frequency samples, far image" },
      { name: "cutoff_high", label: "Cutoff high", type: "float", default: 25, min: 0, step: 1, unit: "frequency samples, near image" },
      { name: "pyramid_levels", label: "Pyramid levels", type: "int", default: 4, min: 1, max: 8, unit: "1-8, each level half the size" },
    ],
    result: null,
    outputs: [
      { type: "image", key: "hybrid", label: "Hybrid" },
      { type: "image", key: "low", label: "Low-pass (far)" },
      { type: "image", key: "high", label: "High-pass (near)" },
      { type: "imageList", key: "pyramid", label: "Pyramid level" },
    ],
  },
];

export const TASKS = RAW_TASKS.map((task) => ({ inputs: ["image"], outputs: [], ...task }));

export const TASK_BY_ID = Object.fromEntries(TASKS.map((task) => [task.id, task]));

/* Compare tab: same input image, every variant side by side. fixed = option values the variant locks. */
export const COMPARE = {
  noise: {
    title: "Compare noise types",
    variants: [
      { label: "Uniform", taskId: "noise-uniform" },
      { label: "Gaussian", taskId: "noise-gaussian" },
      { label: "Salt & pepper", taskId: "noise-salt-pepper" },
    ],
  },
  filters: {
    title: "Compare low-pass filters (tip: add noise first, then 'Use result as input')",
    variants: [
      { label: "Average", taskId: "filter-average" },
      { label: "Gaussian", taskId: "filter-gaussian" },
      { label: "Median", taskId: "filter-median" },
    ],
  },
  edges: {
    title: "Compare edge detectors",
    variants: ["sobel", "prewitt", "roberts", "canny"].map((method) => ({
      label: method[0].toUpperCase() + method.slice(1),
      taskId: "edges",
      fixed: { method },
    })),
  },
  equalization: {
    title: "Compare gray vs color equalization",
    variants: [
      { label: "Gray", taskId: "equalization-gray" },
      { label: "Color", taskId: "equalization-color" },
    ],
  },
  frequency: {
    title: "Compare frequency-domain filters",
    variants: [
      { label: "Low-pass", taskId: "frequency-lowpass" },
      { label: "High-pass", taskId: "frequency-highpass" },
    ],
  },
};

export function defaultValues(task, fixed = {}) {
  return { ...Object.fromEntries(task.options.map((option) => [option.name, option.default])), ...fixed };
}
export function resultFor(task, values) {
  return typeof task.result === "function" ? task.result(values) : task.result;
}