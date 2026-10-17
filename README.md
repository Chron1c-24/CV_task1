# CV_task1

Computer Vision — Task 1. Image processing operations implemented mostly from scratch
(NumPy), with OpenCV used only where the task allows it.

---

## 1. Team and ownership

| Person | Tasks | Files in `services/` |
|---|---|---|
| Person 1 | Task 1 noise, Task 2 spatial filters, Task 6 normalization | `noise.py`, `filters.py`, `normalization.py` |
| Person 2 | Task 3 edges, Task 4 histogram + distribution, Task 8 RGB → gray + R/G/B histograms | `edges.py`, `histograms.py` |
| Person 3 | Task 5 equalization, Task 9 frequency filters, Task 10 hybrid images | `equalization.py`, `frequency.py` |
| Shared | Loader, validation, gray conversion, padding, convolution | `image_io.py` |

The original files `CV task1 p1.py` (Person 1) and `cv task1 p2.py` (Person 3) are kept for
reference only. Everything now lives in `services/`.

---

## 2. Project structure

```
CV_task1/
├── services/
│   ├── __init__.py
│   ├── image_io.py        shared helpers + the ONLY image loader
│   ├── noise.py           Task 1
│   ├── filters.py         Task 2
│   ├── normalization.py   Task 6
│   ├── edges.py           Task 3
│   ├── histograms.py      Task 4 + Task 8 (in progress)
│   ├── equalization.py    Task 5
│   └── frequency.py       Task 9 + Task 10
├── CV task1 p1.py         old (reference)
├── cv task1 p2.py         old (reference)
└── venv/                  Python environment (opencv-python, numpy)
```

**Dependency rule:** every service imports only from `image_io.py`. The single exception is
`equalization.py`, which imports `compute_histogram` from `histograms.py` so the histogram is
written once.

---

## 3. Setup and usage

```bash
# from CV_task1/
venv\Scripts\activate            # Windows
pip install opencv-python numpy  # only if venv is missing them
```

```python
from services.image_io import load_image
from services.edges import compute_edge_magnitude
from services.normalization import normalize_image

image = load_image("photo.jpg")                       # RGB uint8
grad_x, grad_y, magnitude = compute_edge_magnitude(image, "sobel")
display = normalize_image(magnitude)                  # uint8 0-255, show with cmap="gray"

_, _, edges = compute_edge_magnitude(image, "canny", canny_low=50, canny_high=150)
# edges is already uint8 0/255, show directly
```

---

## 4. Conventions (all services follow these)

| Rule | Detail |
|---|---|
| Color order | **RGB**. `load_image` converts OpenCV's BGR/BGRA to RGB once. |
| Input type | **uint8** (0–255), grayscale `(H, W)` or color `(H, W, 3)`. |
| Final images | Returned as **uint8**. |
| Signed / intermediate results | Returned as **float64** (edge gradients, high-pass output). Use `normalize_image` or `to_uint8` before displaying. |
| No plotting in services | Services return arrays only. Plotting belongs to the UI. |
| Gray conversion | `rgb_to_gray` always returns uint8 `(H, W)`. |

---

## 5. Services API (input → output)

| Function | Input | Output |
|---|---|---|
| `image_io.load_image(file_path)` | path | RGB or gray uint8 |
| `image_io.validate_image(image, allow_float=False)` | array | same array, or `ValueError` |
| `image_io.validate_kernel_size(kernel_size)` | int | `ValueError` if not positive odd |
| `image_io.to_uint8(img)` | any array | uint8, rounded and clipped to 0–255 |
| `image_io.rgb_to_gray(img)` | RGB or gray | gray uint8 `(H, W)` |
| `image_io.resize_nearest(img, new_h, new_w)` | image + size (pixels) | resized image |
| `image_io.pad_image(image, pad, mode="edge")` | image + pad (pixels) | padded image |
| `image_io.convolve_image(image, kernel, clip=True)` | uint8 image + odd square kernel | `clip=True`: uint8 · `clip=False`: float64 signed |
| `noise.add_uniform_noise(image, amount, seed)` | uint8 + amount (gray levels, 0–255) | uint8 |
| `noise.add_gaussian_noise(image, mean, sigma, seed)` | uint8 + mean/sigma (gray levels) | uint8 |
| `noise.add_salt_pepper_noise(image, amount, salt_vs_pepper, seed)` | uint8 + fractions (0–1) | uint8 |
| `filters.apply_average_filter(image, kernel_size)` | uint8 + size (pixels, odd) | uint8 |
| `filters.apply_gaussian_filter(image, kernel_size, sigma)` | uint8 + size (pixels, odd) + sigma (pixels) | uint8 |
| `filters.apply_median_filter(image, kernel_size)` | uint8 + size (pixels, odd) | uint8 |
| `normalization.normalize_image(image, new_min, new_max)` | uint8 **or float** | uint8 in `[new_min, new_max]` |
| `edges.EDGE_KERNELS` | — | `{method: (kernel_x, kernel_y)}`, 3×3 float32 |
| `edges.compute_edge_magnitude(image, method, canny_low=100, canny_high=200)` | RGB/gray uint8 + `"sobel"`/`"prewitt"`/`"roberts"`/`"canny"` + Canny thresholds (gradient strength) | Sobel/Prewitt/Roberts: `(grad_x, grad_y, magnitude)` float64 · Canny: `(None, None, edges)` uint8 0/255 · all `(H, W)` |
| `histograms.compute_histogram(gray_u8, levels)` | gray uint8 | counts per level (pixels), int64 |
| `histograms.compute_distribution(gray_u8, levels=256)` | single-channel uint8 (gray or one R/G/B channel) | `(hist, pdf, cdf)`, each length `levels`: hist in pixels, pdf 0–1 (sums to 1), cdf 0–1 (ends at 1) |
| `equalization.equalize_gray(gray, levels)` | gray image | `(equalized uint8, hist, cdf 0–1, mapping)` |
| `equalization.equalize_color(img)` | RGB uint8 | RGB uint8 (Y channel equalized) |
| `frequency.frequency_filters(img, cutoff)` | image + cutoff (frequency samples) | `(spectrum, lp_mask, hp_mask, lp, hp)` float64 |
| `frequency.make_hybrid(img_far, img_near, cutoff_low, cutoff_high)` | 2 images + cutoffs | `(low, high, hybrid, img_near)` float64 |
| `frequency.gaussian_pyramid_view(img, levels)` | image + levels | list of images, each half the size |

---

## 6. Task status

| Task | Owner | Status |
|---|---|---|
| 1 Noise | Person 1 | ✅ Done (moved to `services/`) |
| 2 Spatial filters | Person 1 | ✅ Done (moved) |
| 3 Edge detection | Person 2 | ✅ Done (Sobel, Prewitt, Roberts, Canny) |
| 4 Histogram + distribution curve | Person 2 | ✅ Done (`compute_distribution`) |
| 5 Equalization | Person 3 | ✅ Done (moved) |
| 6 Normalization | Person 1 | ✅ Done (now also accepts float) |
| 8 RGB → gray + R/G/B histograms + CDF | Person 2 | ⚪ Not started |
| 9 Frequency filters | Person 3 | ✅ Done (moved, plotting removed) |
| 10 Hybrid images | Person 3 | ✅ Done (moved, plotting removed) |
| UI + report | All | ⚪ Not started |

---

## 7. Task 3 — Edge detection (ticket)

**Status:** ✅ Done. Sobel, Prewitt, Roberts (from scratch) and Canny (OpenCV), all tested.

### How it is implemented
1. `EDGE_KERNELS` is one dictionary: method name → `(kernel_x, kernel_y)`. Adding a kernel method means adding one entry. Canny is **not** in it, because it has no kernels.
2. `compute_edge_magnitude(image, method, canny_low=100, canny_high=200)` is the **single entry point** for all four methods:
   - check method → validate → `rgb_to_gray` (uint8)
   - **Canny:** check `0 ≤ canny_low < canny_high` → `cv2.Canny` → return `(None, None, edges)`
   - **Others:** `convolve_image(..., clip=False)` with kernel x and kernel y → `magnitude = √(grad_x² + grad_y²)` (`np.hypot`) → return `(grad_x, grad_y, magnitude)`
3. The **3rd value is always the final edge image**, so the UI can show `result[2]` for any method, and `result[0]`, `result[1]` (x / y previews) when they are not `None`.
4. Canny thresholds are ignored by the other methods.
5. No blur inside. If wanted, the UI chains `apply_gaussian_filter` before edge detection (works for every method).
6. For display of Sobel/Prewitt/Roberts, the UI calls `normalize_image` (Canny is already 0/255):
   - `normalize_image(magnitude)` → edge strength
   - `normalize_image(grad_x)` → signed (gray = no edge, black/white = direction)
   - `normalize_image(np.abs(grad_x))` → strength only

### Kernels

| Method | Kernel X | Kernel Y |
|---|---|---|
| Sobel | `[[-1,0,1],[-2,0,2],[-1,0,1]]` | `[[-1,-2,-1],[0,0,0],[1,2,1]]` |
| Prewitt | `[[-1,0,1],[-1,0,1],[-1,0,1]]` | `[[-1,-1,-1],[0,0,0],[1,1,1]]` |
| Roberts | `[[1,0],[0,-1]]` padded to 3×3 | `[[0,1],[-1,0]]` padded to 3×3 |

Roberts is 2×2, but `convolve_image` accepts only odd sizes, so the 2×2 is placed in the
top-left of a 3×3 and the rest is filled with zeros. This shifts the response by half a pixel,
which is not visible.

### Canny — how `cv2.Canny(gray, threshold1, threshold2)` works

| Stage | What it does |
|---|---|
| 1. Gradient | Sobel 3×3 → grad_x, grad_y → gradient strength `G` per pixel |
| 2. Non-maximum suppression | Keeps only the pixel with the highest `G` across the edge, so edges come out **1 pixel wide** |
| 3. Hysteresis thresholding | Uses the two thresholds (below) |

**Hysteresis thresholding** compares each pixel's gradient strength `G` against the two thresholds:

| Condition | Type | Result |
|---|---|---|
| `G > threshold2` (high) | Strong edge | Kept: a sharp brightness change is accepted as a true edge |
| `threshold1 < G ≤ threshold2` | Weak edge | Kept **only if connected to a strong edge** through 8-connected neighbors (the 8 surrounding pixels); otherwise discarded as noise |
| `G ≤ threshold1` (low) | Non-edge / noise | Discarded (0) |

**Why two thresholds:** one high threshold would break real edges into dashes (their weak parts are
lost). One low threshold would keep noise. Hysteresis keeps weak pixels only when they continue a
strong edge.

**OpenCV details (verified by running `cv2.Canny`, OpenCV 5.0.0):**

| Fact | Test | Result | What it means |
|---|---|---|---|
| **No Gaussian blur inside** | Noisy circle, (50, 150), with vs without a 5×5 Gaussian blur first | 1011 vs **216** edge pixels | OpenCV does not blur. To follow classic Canny, blur first (e.g. `apply_gaussian_filter`) |
| **`G` is L1 by default** | `L2gradient=False` (default) vs `True`, (50, 150) | 1011 vs **713** edge pixels | Default `G = \|grad_x\| + \|grad_y\|` (bigger than `√(grad_x² + grad_y²)`, so more pixels pass) |
| **Thresholds are not limited to 0–255** | 0 → 255 step edge, thresholds (300, 600) | edge still found | With Sobel, `G` reaches 2040 (L1), so thresholds can be above 255 |
| **Swapped thresholds are silently fixed** | (150, 50) vs (50, 150) | identical output | OpenCV uses the smaller one as low. Our function raises `ValueError` instead, so mistakes are visible |
| **Defaults** | — | `canny_low=100`, `canny_high=200` | Ratio 1:2 |
| Output | — | values `{0, 255}`, uint8 `(H, W)` | Binary edge map |
| Edge width | Clean step edge | 1 pixel per row | Confirms non-maximum suppression |

### Files changed

| File | Change |
|---|---|
| `services/edges.py` | New: `EDGE_KERNELS`, `compute_edge_magnitude` (all 4 methods) |
| `services/image_io.py` | `convolve_image` gets a `clip` parameter · `rgb_to_gray` returns uint8 · `validate_image` gets `allow_float` |
| `services/normalization.py` | `normalize_image` accepts float input |

### Tests done (run with `venv` Python, OpenCV 5.0.0, NumPy 2.5.4)

| Test | Expected | Result |
|---|---|---|
| Output shape for RGB `(64, 80, 3)` input | `(64, 80)` × 3, float64 | ✅ |
| Sobel vs `cv2.Sobel`, interior pixels | identical | ✅ max difference **0.0** |
| Sobel vs `cv2.Sobel`, border pixels | differ (different padding) | ✅ differ by up to 522 gray levels, as expected |
| Vertical step edge (0 → 200 gray levels) | strong grad_x, grad_y = 0 | ✅ Sobel 800 / 0, Prewitt 600 / 0 |
| Same edge rotated 90° | grad_x = 0, strong grad_y | ✅ Sobel 0 / 800, Prewitt 0 / 600 |
| Unknown method `"abc"` | `ValueError` listing all 4 methods | ✅ |
| Float image input | `ValueError` | ✅ |
| `normalize_image(magnitude)` | uint8, 0–255 | ✅ |
| Loop over `EDGE_KERNELS` | 3 kernel pairs, no crash | ✅ |
| Canny output (noisy circle, defaults) | `(None, None, edges)`, edges `(H, W)` uint8 `{0, 255}` | ✅ 449 edge pixels |
| Canny on RGB input | `(H, W)` | ✅ |
| Canny (50, 150) vs (100, 200) | fewer pixels with higher thresholds | ✅ 1011 vs 449 |
| Canny thresholds above 255 (300, 600) | accepted | ✅ |
| Canny (200, 100), (−5, 100), (100, 100), (−5, −10) | `ValueError` | ✅ all four |

### Still open (optional, not required by the task)
- L1 vs L2 gradient for Canny (`L2gradient`), currently OpenCV default (L1).
- `compute_edge_magnitude` name: it now returns gradients, magnitude, or Canny edges.

---

## 7b. Task 4 — Histogram and distribution curve (ticket)

**Status:** ✅ Done. The service returns the data; drawing (bars + curves) belongs to the UI.

### How it is implemented
1. `compute_histogram(gray_u8, levels=256)` counts pixels per gray level with
   `np.bincount(gray_u8.ravel(), minlength=levels)[:levels]` (see 9.9). From scratch, no `cv2.calcHist`.
2. `compute_distribution(gray_u8, levels=256)`:
   validate (uint8, **single channel**) → `hist = compute_histogram(...)` → `pdf = hist / N` → `cdf = cumsum(pdf)` → return `(hist, pdf, cdf)`.
3. The "distribution curve" is returned in **both** forms: PDF (probability per level) and CDF (cumulative).
4. It takes **one channel**, so Task 8 can reuse it for R, G and B, and `equalize_gray` (Task 5) reuses it too. The PDF/CDF math exists once.

**Usage:**
```python
from services.image_io import load_image, rgb_to_gray
from services.histograms import compute_distribution

hist, pdf, cdf = compute_distribution(rgb_to_gray(load_image("photo.jpg")))
# UI: bar(range(256), hist) · plot(pdf) · plot(cdf)
```

| Output | Meaning | Unit / range |
|---|---|---|
| `hist[k]` | Number of pixels with gray level k | pixels (count), int64 |
| `pdf[k]` | Probability of gray level k | 0–1, sums to 1 |
| `cdf[k]` | Probability of a gray level ≤ k | 0–1, never decreases, ends at 1 |

### Files changed

| File | Change |
|---|---|
| `services/histograms.py` | `compute_histogram` uses `np.bincount` (was a per-pixel loop) · new `compute_distribution` |
| `services/equalization.py` | `equalize_gray` calls `compute_distribution` instead of computing pdf/cdf itself (same output) |

### Tests done (venv Python)

| Test | Expected | Result |
|---|---|---|
| Paper example `[[0,0],[1,3]]`, 4 levels | hist `[2,1,0,1]`, pdf `[.5,.25,0,.25]`, cdf `[.5,.75,.75,1]` | ✅ |
| 64×80 random image | hist sums to 5120 pixels, pdf sums to 1, cdf ends at 1 and never decreases | ✅ |
| vs `np.histogram` and `cv2.calcHist` | identical counts | ✅ both |
| Dark image (only levels 0 and 5) | still 256 bins | ✅ |
| RGB (3-channel) input | `ValueError` (pass one channel) | ✅ |
| Float input | `ValueError` | ✅ |
| `equalize_gray` / `equalize_color` after the change | still work, hist sums to N, cdf ends at 1 | ✅ |
| Speed, 1000×1000 image | faster than the loop | ✅ 4.2 ms vs 411.9 ms |

### Still open
- None for the service. The plotting is part of the UI work.

---

## 8. Changes made while combining (teammates, please read)

| Change | Why | Affects |
|---|---|---|
| One `load_image` in `image_io.py`, returns **RGB** | There were two loaders (BGR uint8 vs RGB float64) | Everyone |
| `_validate_image`, `_validate_kernel_size`, `_pad_image`, `_convolve_image` renamed **without `_`** | They are imported by other files, so they are no longer private | Person 1: update any calls that use the old names |
| `convolve_image(..., clip=True)` | Edges need signed values, not clipped | Filters unchanged (they use the default) |
| `rgb_to_gray` always returns **uint8** | One output type; ready for convolution | `frequency.py` (less than 1 gray-level difference) |
| `validate_image(..., allow_float=False)` and `normalize_image` accepts float | Reuse normalization to display edge gradients | Person 1: uint8 behavior unchanged |
| Removed the plotting functions `img_equalization_histogram`, `task10_hybrid` and the Colab demo code | Services return arrays only, and the demo crashed (`hybrid_photo` was not defined) | Person 3: the math is kept in `equalize_gray`, `equalize_color`, `frequency_filters`, `make_hybrid` |
| `frequency_filters` returns arrays instead of plotting | Same reason | Person 3 |
| `equalize_gray` calls `compute_distribution` (histograms.py) instead of computing pdf/cdf inline, and `compute_histogram` now uses `np.bincount` | PDF/CDF math exists once; counting is ~99× faster | Person 3: same outputs |
| **Bug fix:** `gaussian_pyramid_view` converts to float first | With uint8 input, adding 4 pixels went past 255 and wrapped around | Person 3 |
| Comment fix in `apply_median_filter`: window axes are `(h, w, channels, ky, kx)` | The old comment had the wrong order (the code was correct) | Person 1 |

---

## 9. Insights for the report

### 9.1 Clip vs normalize for display
Gradients can be negative and larger than 255. Example magnitudes `[0, 100, 400, 760]`:

| Method | Result | Meaning |
|---|---|---|
| Clip to 0–255 | `[0, 100, 255, 255]` | 400 and 760 look the same, so strong edges lose their detail |
| `astype(np.uint8)` | 760 → **248** | It **wraps around**, so strong edges can turn dark. This is a bug, not a display choice. |
| Min-max normalize | `[0, 33, 134, 255]` | Keeps the order and the differences ✅ (used) |

### 9.2 Gradient range depends on the kernel
For a full step edge (0 → 255 gray levels), the largest |grad_x| is:

| Method | Max \|grad_x\| (gray levels) | Why |
|---|---|---|
| Sobel | 1020 | 255 × (1 + 2 + 1) |
| Prewitt | 765 | 255 × (1 + 1 + 1) |
| Roberts | 255 | 255 × 1 |

**Conclusion:** after per-image normalization, all three methods reach 255, so **brightness
cannot be compared across methods**. A Sobel edge is not "stronger" than a Prewitt edge just
because its raw numbers are bigger.

### 9.3 Roberts measures diagonals
For a vertical edge, Sobel and Prewitt respond only in x (grad_y = 0). Roberts responds in
**both** directions (200 / 200), because its two kernels measure the two diagonals, not x and y.
Its "x / y" previews are really "diagonal 1 / diagonal 2".

### 9.4 Noise sensitivity (measured)
A flat gray image (level 128) with Gaussian noise (sigma = 20 gray levels) should have no
edges. The mean magnitude measures how much noise is detected as edges. "Edge response" is
the magnitude for a real 0 → 200 step edge.

| Method | Noise response (mean magnitude, gray levels) | Edge response (gray levels) | Edge ÷ noise (higher = better) |
|---|---|---|---|
| Sobel | 86.3 | 800 | 9.3 |
| Prewitt | 60.8 | 600 | 9.9 |
| Roberts | 35.0 | 200 | **5.7** |
| Sobel after 5×5 Gaussian filter | 26.0 | — (not measured) | — |

**Conclusions:**
- **Roberts is the most noise-sensitive** relative to edge strength. Its kernel uses only 2 pixels, so there is no averaging.
- Sobel and Prewitt are close. Both average across 3 rows/columns.
- A Gaussian filter before Sobel cuts the noise response by about **70%** (86.3 → 26.0). It also weakens real edges, which was not measured yet.
- Raw noise numbers alone are misleading. Sobel looks noisiest, but only because its weights are larger. Compare edge ÷ noise instead.

### 9.5 Padding matters for edges
`convolve_image` pads the border by copying edge pixels (`mode="edge"`), so the output stays
the same size as the input.

| Padding | At the image border | Effect |
|---|---|---|
| Zeros | Bright pixel next to 0 → big jump | Fake edges (a bright frame) |
| Edge (used) | Pixel next to a copy of itself | No fake edges ✅ |
| Reflect (`cv2.Sobel` default) | Mirrored pixels | Also no fake frame. Explains why the border differs from OpenCV. |

### 9.6 Correlation vs convolution
`convolve_image` does not flip the kernel (strictly, that is correlation, which is also what
`cv2.Sobel` does). Flipping only changes the **sign** of grad_x/grad_y, so the magnitude is
the same either way. With these kernels, a dark → bright change (left → right) gives a
**positive** grad_x.

### 9.7 Edges are computed on gray
Color images are converted to gray first, so the output is always single-channel `(H, W)`.
An edge between two colors of the **same brightness** (for example red next to green with
equal luminance) will not be detected.

### 9.8 Canny thresholds (measured with `cv2.Canny`)
Test image: a filled circle (gray level 180) on black, plus Gaussian noise (sigma 15), 100×100 pixels.

| low, high (gradient strength) | Edge pixels (count) |
|---|---|
| 50, 150 | 1011 |
| 100, 200 | 449 |

**Conclusion:** higher thresholds keep fewer pixels. They remove noise edges, but can break
weak real edges.

Same image, other settings (thresholds 50, 150):

| Setting | Edge pixels (count) | Conclusion |
|---|---|---|
| Default (no blur, L1) | 1011 | Many noise edges |
| `L2gradient=True` | 713 | L2 strength is smaller, so fewer pixels pass the same thresholds |
| 5×5 Gaussian blur first | 216 | Blurring removes most noise edges; this was the biggest effect of the three |

### 9.9 Fast histogram counting (`np.bincount`)
`compute_histogram` used to count with a Python loop (`for v in gray_u8.ravel(): hist[v] += 1`),
which runs Python code once per pixel. It now does the same count in one NumPy call:

```python
hist = np.bincount(gray_u8.ravel(), minlength=levels)
```

| Part | Meaning |
|---|---|
| `gray_u8.ravel()` | Flattens the image into one long list of pixel values |
| `np.bincount(...)` | Counts how many times each value appears: `hist[v]` = count of v |
| `minlength=levels` | Makes sure the result has all 256 bins, even if the brightest values never appear |

Measured on a 1000×1000 gray image:

| Method | Time (milliseconds) |
|---|---|
| Python loop | 411.9 |
| `np.bincount` | 4.2 |

**Conclusion:** about **99× faster**, with an **identical** result. It is still from scratch (counting
values, no `cv2.calcHist`). The input must be uint8 (0–255): a larger value would make the result
longer than 256 bins. `rgb_to_gray` always returns uint8, so this is safe.

---

## 10. Open items

1. Task 3: done (optional items in section 7).
2. Task 4: done (`compute_distribution`).
3. Task 8: own gray formula `0.299R + 0.587G + 0.114B` (replacing the OpenCV call in `rgb_to_gray`), and a per-channel histogram + CDF loop.
4. ~~`compute_histogram` is slow~~ fixed with `np.bincount` (see 9.9).
5. Decide whether to delete `CV task1 p1.py` and `cv task1 p2.py`.
6. UI and final report.
