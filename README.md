# CV Task 1 — Image Processing from Scratch

A small web app that applies classic image-processing operations to an uploaded image and shows
the result next to the original.

Most of the operations are **written from scratch with NumPy**. OpenCV is used only where the
task allows it (random noise generation, Canny, DFT) and for reading image files.

| Part | Technology | Job |
|---|---|---|
| `services/` | Python, NumPy, OpenCV | The image-processing math (one file per topic) |
| `api/` | FastAPI | One REST endpoint per operation; receives an image, returns the result |
| `frontend/` | React + Vite | The user interface: upload, set options, see before / after, compare |

---

## 1. What the app does

| Task | Operation | Written from scratch? |
|---|---|---|
| 1 | Add noise: uniform, Gaussian, salt & pepper | Salt & pepper: yes · uniform / Gaussian: OpenCV random generator, adding it to the image is ours |
| 2 | Low-pass filters: average, Gaussian, median | Yes (own convolution, no `cv2.blur` / `GaussianBlur` / `medianBlur`) |
| 3 | Edge detection: Sobel, Prewitt, Roberts, Canny | Sobel / Prewitt / Roberts: yes · Canny: OpenCV |
| 4 | Gray histogram + distribution curve (PDF and CDF) | Yes |
| 5 | Histogram equalization (gray and color) | Yes |
| 6 | Min-max normalization | Yes |
| 8 | RGB → gray, and R / G / B histograms with CDF | Yes |
| 9 | Frequency-domain low-pass and high-pass filters | Masks: yes · DFT / inverse DFT: OpenCV |
| 10 | Hybrid images (one image seen from far, another from near) | Yes (uses the Task 9 DFT) |

### Team

| Person | Tasks | Files in `services/` |
|---|---|---|
| Person 1 | 1 noise, 2 filters, 6 normalization | `noise.py`, `filters.py`, `normalization.py` |
| Person 2 | 3 edges, 4 histogram, 8 RGB | `edges.py`, `histograms.py` |
| Person 3 | 5 equalization, 9 frequency, 10 hybrid | `equalization.py`, `frequency.py` |
| Shared | Image loading, validation, gray conversion, padding, convolution | `image_io.py` |

---

## 2. How to run

**Backend** (from `CV_task1/`):
```bash
venv\Scripts\activate             # Windows
pip install -r requirements.txt   # pinned versions, so the setup is reproducible
uvicorn api.main:app --reload     # API on http://127.0.0.1:8000 (interactive docs at /docs)
```

**Frontend** (from `CV_task1/frontend/`, in a second terminal):
```bash
npm install
npm run dev                       # open the URL Vite prints (usually http://localhost:5173)
```

The Vite dev server forwards every `/api/...` call to the backend on port 8000, so the browser
sees one origin and the backend needs no CORS setup.

---

## 3. How it works (the flow)

```
 Browser (React)                    FastAPI (api/main.py)                services/*.py
 ───────────────                    ─────────────────────                ─────────────
 1. pick task + upload image
 2. set options, press Apply  ──►   3. read upload → RGB uint8 array
    (multipart form)                4. call the service function   ──►   5. NumPy math
                                    6. result → PNG → base64        ◄──     returns array(s)
 7. show before / after,      ◄──      JSON response
    charts, extra images
```

1. The user picks a task from the dropdown and uploads an image (two images for the hybrid task).
2. The options form is built from `frontend/src/tasks.js`, which lists every endpoint with its
   options, defaults and units. **Adding a task to the UI means adding one entry there.**
3. The backend decodes the upload into an **RGB uint8** array (`image_io.decode_image`).
4. It calls the service function. Option names and defaults are the same in the UI, the API and the
   service, so one name means one thing everywhere.
5. The service does the math and returns NumPy arrays. **Services never plot or touch HTTP.**
6. The API turns each image into a base64 PNG, and histograms into lists of numbers.
7. The UI shows the result.

### UI features

| Feature | What it does | Why |
|---|---|---|
| **Before / After** | Side by side, or one image with a drag slider, with histograms under both and Δ-mean / Δ-std badges | Small changes (light noise, mild blur) are easier to see with the slider |
| **Compare tab** | Independent comparison windows on the same image (noise types, filters, edge detectors, gray vs color equalization). Each window has its own type dropdown and its own options, and can be added or removed; run all windows at once or one at a time | To answer "which one is better for this image?" in one click |
| **Use result as input** | Sends the result back as the new input | To chain steps, e.g. add salt & pepper noise → then compare filters to see the median filter remove it |
| **Charts** | Histogram (bars), PDF and CDF (lines), R/G/B in their own colors | Tasks 4, 5 and 8 output curves, not images |
| **Histogram under every image** | Each shown image gets a histogram computed in the browser (canvas): gray or R/G/B, optional PDF/CDF, mean / std / median / range, wheel zoom and a hover tooltip | Seeing how an operation changed the distribution is often the point of the task |
| **Clear errors** | Shows the backend message (e.g. "kernel_size must be a positive odd integer") | The user knows what to fix |

---

## 4. Project structure

```
CV_task1/
├── services/              the image-processing math
│   ├── image_io.py        shared: load / decode, validate, to_uint8, rgb_to_gray, padding, convolution
│   ├── noise.py           Task 1
│   ├── filters.py         Task 2
│   ├── edges.py           Task 3
│   ├── histograms.py      Task 4 + Task 8
│   ├── equalization.py    Task 5
│   ├── normalization.py   Task 6
│   └── frequency.py       Task 9 + Task 10
├── api/main.py            FastAPI app, 15 endpoints
├── frontend/
│   ├── src/
│   │   ├── tasks.js       the list of tasks (endpoint, options, outputs) — the UI is built from it
│   │   ├── api.js         the only file that calls the backend
│   │   ├── App.jsx        task picker, image inputs, tabs
│   │   ├── views/         TaskView (Preview tab), CompareView (Compare tab)
│   │   ├── components/    Sidebar, ImageInputs, OptionsForm, BeforeAfter, Outputs,
│   │   │                  Chart, ImageCard, ImageHistogram
│   │   └── utils/         histogram.js (in-browser histograms), useXZoom.js (chart zoom / pan)
│   └── vite.config.js     dev proxy: /api/* -> http://127.0.0.1:8000
└── requirements.txt       pinned Python versions
```

**Dependency rule:** every service imports only from `image_io.py`, so shared code (gray
conversion, convolution) is written once. The one exception: `equalization.py` reuses the PDF/CDF
from `histograms.py` instead of computing it again.

---

## 5. Design choices and why

### Image conventions (all services)

| Rule | Why |
|---|---|
| Images are **RGB uint8** (0–255) | OpenCV loads BGR. Converting once, at load time, means no service has to think about color order |
| Final images are uint8 | Ready to show or save |
| Intermediate results (edge gradients, high-pass, spectrum) are **float64** | They can be negative or above 255. Cutting them to uint8 too early loses information |
| Gray = `0.299R + 0.587G + 0.114B` (own function) | The eye is most sensitive to green, so it gets the biggest weight. Weights sum to 1, so white stays 255. Every task uses this one function |
| Border padding copies the edge pixel | Output stays the same size as the input, and no fake edges appear at the border (see 6.5) |

### How float results are shown

Gradients can be negative and bigger than 255. Example magnitudes `[0, 100, 400, 760]`:

| Method | Result | Problem |
|---|---|---|
| Clip to 0–255 | `[0, 100, 255, 255]` | 400 and 760 look the same, strong edges lose detail |
| `astype(np.uint8)` | 760 → **248** | Wraps around, a strong edge turns dark (a bug) |
| **Min-max normalize (used)** | `[0, 33, 134, 255]` | Keeps the order and the differences ✅ |

So the API normalizes float results with `normalize_image` (Task 6) before encoding them. The
hybrid image is clipped instead, because it is already a real image.

### Backend choices

| Choice | Why |
|---|---|
| **FastAPI** | Typed options, automatic interactive docs at `/docs`, small. Django would be too much for this |
| **One endpoint per operation** | Each endpoint shows its own options in the docs and in the UI |
| **Upload as multipart form, reply as JSON with base64 PNG** | The browser shows it directly with `<img src="data:image/png;base64,...">`; histograms need JSON anyway |
| **No database** | Every request is one image in, one result out. The only state is a small in-memory FFT cache (below), not a data store |
| **In-memory FFT cache** | `/api/frequency/filters` and `/api/hybrid` hash the uploaded bytes (SHA-256) and keep the FFTs of the last 4 results (LRU). Re-running with only a different cutoff skips the decode and the DFT. Cleared on restart |
| **Plain `def` endpoints, not `async def`** | The work is CPU-heavy NumPy. FastAPI runs plain `def` in a worker thread, so one slow filter does not block other requests |
| **Errors** | A bad option or bad image (`ValueError` in a service) → HTTP **400** with a clear message. A wrong type or out-of-range value checked by FastAPI → HTTP **422** |
| **`seed` option for noise** | Same seed → same noise, so results can be reproduced |

### Edge detection (Task 3)

All kernels are in one dictionary `EDGE_KERNELS`, and one function handles all four methods. It
returns `(grad_x, grad_y, result)`; the third value is always the final edge image.

| Method | Kernel X | Kernel Y |
|---|---|---|
| Sobel | `[[-1,0,1],[-2,0,2],[-1,0,1]]` | `[[-1,-2,-1],[0,0,0],[1,2,1]]` |
| Prewitt | `[[-1,0,1],[-1,0,1],[-1,0,1]]` | `[[-1,-1,-1],[0,0,0],[1,1,1]]` |
| Roberts | `[[1,0],[0,-1]]` | `[[0,1],[-1,0]]` |

Roberts is 2×2, but the convolution needs an odd size, so it is placed in the corner of a 3×3 filled
with zeros. This shifts the result by half a pixel, which is not visible.

**Canny** (OpenCV) works in 3 stages: Sobel gradient → keep only the strongest pixel across each
edge (edges become 1 pixel wide) → **hysteresis** with two thresholds:

| Gradient strength `G` | Result |
|---|---|
| `G > high` | Strong edge, kept |
| `low < G ≤ high` | Kept **only if connected** to a strong edge |
| `G ≤ low` | Noise, removed |

Why two thresholds: one high threshold breaks real edges into dashes; one low threshold keeps
noise. Our function rejects `low ≥ high` with an error (OpenCV silently swaps them, which hides
mistakes). Thresholds can be above 255, because the Sobel strength can reach 2040.

### Histogram, equalization, RGB (Tasks 4, 5, 8)

| Output | Meaning | Unit |
|---|---|---|
| `hist[k]` | Number of pixels with gray level k | pixels (count) |
| `pdf[k]` = `hist[k] / N` | Probability of gray level k | 0–1, sums to 1 |
| `cdf[k]` = `pdf[0] + … + pdf[k]` | Probability of a level ≤ k | 0–1, ends at 1 |

- One function, `compute_distribution`, takes **one channel**. Task 8 calls it for R, G and B, and
  equalization (Task 5) uses its CDF. The math exists once.
- **Equalization** maps each level through its CDF, so the levels spread over 0–255 and contrast
  increases.
- **Color equalization** equalizes only the brightness (the Y channel of YCbCr). Equalizing R, G
  and B separately would change the colors.

### Frequency filters and hybrid images (Tasks 9, 10)

- Task 9: image → DFT → multiply by a mask → inverse DFT. The **ideal** low-pass mask keeps
  frequencies inside a circle of radius `cutoff` (frequency samples from the center); the high-pass
  mask is `1 − low-pass`.
- Task 10: `hybrid = low-pass(far image) + high-pass(near image)`. Up close you see the near
  image's details; from far away (or when the image is shrunk) only the far image's smooth shape
  is left. The hybrid uses **Gaussian** masks, because ideal masks create ripples ("ringing").
- **FFT caching:** the DFT is the expensive step and it does not depend on the cutoff, so Task 9
  and Task 10 cache the per-channel FFTs, keyed by the SHA-256 of the uploaded bytes. Task 10 keys
  by the *pair* of uploads, because the near image is resized to the far image's size before its
  DFT. Changing a cutoff on the same image (or re-sending the same image) reuses the cached FFTs —
  no re-decode and no new DFT. The cache holds 4 entries (LRU, per process), since each entry keeps
  several full-size complex arrays in memory.

---

## 6. Results and insights (measured)

### 6.1 Gradient range depends on the kernel
For a full step edge (0 → 255 gray levels), the biggest |grad_x| is:

| Method | Max \|grad_x\| (gray levels) | Why |
|---|---|---|
| Sobel | 1020 | 255 × (1 + 2 + 1) |
| Prewitt | 765 | 255 × (1 + 1 + 1) |
| Roberts | 255 | 255 × 1 |

**Conclusion:** after normalization every method reaches 255, so brightness **cannot** be compared
across methods. A Sobel edge is not "stronger" just because its raw numbers are bigger.

### 6.2 Roberts measures diagonals
For a vertical edge, Sobel and Prewitt respond only in x (grad_y = 0). Roberts responds in **both**
(200 / 200), because its kernels measure the two diagonals. Its "X / Y" images are really
"diagonal 1 / diagonal 2".

### 6.3 Noise sensitivity
A flat gray image (level 128) plus Gaussian noise (sigma 20 gray levels) should have no edges. The
mean magnitude shows how much noise is wrongly seen as edges. "Edge response" is the magnitude for
a real 0 → 200 step edge.

| Method | Noise response (gray levels) | Edge response (gray levels) | Edge ÷ noise (higher = better) |
|---|---|---|---|
| Sobel | 86.3 | 800 | 9.3 |
| Prewitt | 60.8 | 600 | 9.9 |
| Roberts | 35.0 | 200 | **5.7** |
| Sobel after a 5×5 Gaussian filter | 26.0 | — | — |

**Conclusions:**
- **Roberts is the most sensitive to noise**: it uses only 2 pixels, so nothing is averaged.
- Sobel and Prewitt are close; both average over 3 rows / columns.
- A Gaussian filter before Sobel cuts the noise response by about **70%** (86.3 → 26.0).
- Compare edge ÷ noise, not raw noise: Sobel only looks noisiest because its weights are bigger.

### 6.4 Canny settings
Test image: a gray circle (level 180) on black, plus Gaussian noise (sigma 15), 100×100 pixels.

| Setting | Edge pixels (count) | Conclusion |
|---|---|---|
| Thresholds 50 / 150 | 1011 | Many noise edges |
| Thresholds 100 / 200 | 449 | Higher thresholds remove noise, but can break weak real edges |
| 50 / 150 with `L2gradient=True` | 713 | OpenCV's default strength is `|gx| + |gy|` (bigger), so more pixels pass |
| 50 / 150 after a 5×5 Gaussian blur | 216 | **Biggest effect.** OpenCV's Canny does not blur, so blurring first (Task 2) matters |

### 6.5 Padding matters for edges

| Padding | At the border | Effect |
|---|---|---|
| Zeros | Bright pixel next to 0 → big jump | Fake edges (a bright frame) |
| **Copy edge pixel (used)** | Pixel next to a copy of itself | No fake edges ✅ |
| Reflect (`cv2.Sobel` default) | Mirrored pixels | Also no frame; this is why our border pixels differ from OpenCV's |

### 6.6 Edges are computed on gray
Color images are converted to gray first. An edge between two colors of the **same brightness**
(e.g. red next to green of equal brightness) is not detected.

### 6.7 Fast histogram counting
Counting pixels with a Python loop runs Python code once per pixel. `np.bincount` does the same
count in one NumPy call, with an identical result (still from scratch, no `cv2.calcHist`).

| Method (1000×1000 gray image) | Time (milliseconds) |
|---|---|
| Python loop | 411.9 |
| `np.bincount` | 4.2 |

**Conclusion:** about **99× faster**.

---

## 7. Verification

| Check | Result |
|---|---|
| Our Sobel vs `cv2.Sobel` (inside pixels) | Identical, max difference **0.0** gray levels |
| Our `rgb_to_gray` vs `cv2.cvtColor` | Max difference **1** gray level, on 0.12% of pixels (rounding) |
| Our histogram vs `np.histogram` and `cv2.calcHist` | Identical counts |
| Vertical step edge 0 → 200 | Sobel grad_x 800, grad_y 0 · rotated 90°: grad_x 0, grad_y 800 |
| Endpoints called through the Vite proxy, with the field names from `tasks.js` | Every endpoint returns 200 with the keys `tasks.js` reads; an even kernel size → 400; the message is shown as readable text |
| Frontend build (`npm run build`) | Build OK |

---

## 8. API reference

All endpoints are `POST`, take a multipart form (the image file + options) and return JSON. Every
image in the response is a base64 PNG. Full interactive docs: run the backend and open `/docs`.

| Task | Path | Options (default) | Response |
|---|---|---|---|
| 1 | `/api/noise/uniform` | `amount` 25 (gray levels, 0–255) · `seed` (empty = random) | `image` |
| 1 | `/api/noise/gaussian` | `mean` 0 · `sigma` 20 (gray levels) · `seed` | `image` |
| 1 | `/api/noise/salt-pepper` | `amount` 0.04 (fraction of pixels, 0–1) · `salt_vs_pepper` 0.5 (fraction white) · `seed` | `image` |
| 2 | `/api/filters/average` | `kernel_size` 3 (odd, pixels) | `image` |
| 2 | `/api/filters/gaussian` | `kernel_size` 3 · `sigma` 0 (pixels, 0 = automatic) | `image` |
| 2 | `/api/filters/median` | `kernel_size` 3 | `image` |
| 3 | `/api/edges` | `method` sobel / prewitt / roberts / canny · `canny_low` 100 · `canny_high` 200 | `grad_x`, `grad_y` (null for Canny), `result` |
| 4 | `/api/histogram` | — | `hist`, `pdf`, `cdf` (256 values each) |
| 5 | `/api/equalization/gray` | — | `image`, plus `hist` and `cdf` **before** equalization |
| 5 | `/api/equalization/color` | — | `image` |
| 6 | `/api/normalization` | `new_min` 0 · `new_max` 255 (gray levels) | `image` |
| 8 | `/api/rgb/gray` | — | `image` |
| 8 | `/api/rgb/histograms` | — | `{"R": {hist, pdf, cdf}, "G": …, "B": …}` |
| 9 | `/api/frequency/filters` | `cutoff` 30 (frequency samples) | `spectrum`, `lp_mask`, `hp_mask`, `lp`, `hp` |
| 10 | `/api/hybrid` | files `img_far`, `img_near` · `cutoff_low` 15 · `cutoff_high` 25 | `low`, `high`, `hybrid` |

**Units:** sizes in pixels · gray levels 0–255 · fractions 0–1 · histogram counts in pixels ·
`pdf` and `cdf` 0–1 · frequency cutoffs in samples from the spectrum center.

**Caching:** `/api/frequency/filters` and `/api/hybrid` remember the FFTs of the last 4 uploaded
images / image pairs, so re-sending the same image or changing only a cutoff is fast.

Example (Python):
```python
import requests

with open("photo.jpg", "rb") as f:
    r = requests.post("http://127.0.0.1:8000/api/noise/gaussian",
                      files={"image": f}, data={"sigma": 15, "seed": 1})
png_base64 = r.json()["image"]
```
