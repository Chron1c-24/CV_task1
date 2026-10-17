"""
REST API for the services (one endpoint group per task).

Run from CV_task1/:
    uvicorn api.main:app --reload
Docs (try every endpoint in the browser): http://127.0.0.1:8000/docs

Input : multipart form. Images are uploaded as files, options are form fields
        with the same names and defaults as the service function.
Output: JSON. Every image is a base64-encoded PNG string, ready for <img src="data:image/png;base64,...">.
        Histograms and curves are plain lists of numbers.
Errors: invalid option or image -> 400 {"detail": "..."}.
"""

import base64
from enum import Enum

import cv2
import numpy as np
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.responses import JSONResponse

from services.image_io import decode_image, rgb_to_gray, to_uint8
from services.noise import add_uniform_noise, add_gaussian_noise, add_salt_pepper_noise
from services.filters import apply_average_filter, apply_gaussian_filter, apply_median_filter
from services.edges import compute_edge_magnitude
from services.histograms import compute_distribution, compute_rgb_distributions
from services.equalization import equalize_gray, equalize_color
from services.normalization import normalize_image
from services.frequency import frequency_filters, make_hybrid, gaussian_pyramid_view


app = FastAPI(title="CV_task1 API", version="1.0.0")


class EdgeMethod(str, Enum):
    sobel = "sobel"
    prewitt = "prewitt"
    roberts = "roberts"
    canny = "canny"


@app.exception_handler(ValueError)
def value_error_handler(request, exc):
    """Every ValueError raised by a service (bad option or bad image) becomes HTTP 400."""
    return JSONResponse(status_code=400, content={"detail": str(exc)})


# ---------- helpers (shared by all endpoints) ----------

def read_image(upload: UploadFile):
    """Uploaded file -> RGB uint8 (or gray) array, the input type of every service."""
    return decode_image(upload.file.read(), upload.filename or "uploaded file")


def encode_png(image):
    """uint8 array -> base64 PNG string. OpenCV writes BGR, so RGB is converted first."""
    if image.ndim == 3:
        image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
    _, buffer = cv2.imencode(".png", image)
    return base64.b64encode(buffer.tobytes()).decode("ascii")


def to_display(image):
    """uint8 is already displayable. Float results (gradients, masks, high-pass) are min-max normalized."""
    if image.dtype == np.uint8:
        return image
    return normalize_image(image)


def display_png(image):
    """Any service result -> base64 PNG that can be shown directly."""
    return encode_png(to_display(image))


def distribution_json(hist, pdf, cdf):
    """One histogram + PDF + CDF -> JSON lists (hist: pixels, pdf: 0-1, cdf: 0-1)."""
    return {"hist": hist.tolist(), "pdf": pdf.tolist(), "cdf": cdf.tolist()}


# ---------- Task 1: additive noise ----------

@app.post("/api/noise/uniform")
def noise_uniform(
    image: UploadFile = File(...),
    amount: int = Form(25),
    seed: int | None = Form(None),
):
    """amount: noise range -amount..+amount (gray levels, 0-255). seed: same seed -> same output."""
    result = add_uniform_noise(read_image(image), amount=amount, seed=seed)
    return {"image": display_png(result)}


@app.post("/api/noise/gaussian")
def noise_gaussian(
    image: UploadFile = File(...),
    mean: float = Form(0.0),
    sigma: float = Form(20.0),
    seed: int | None = Form(None),
):
    """mean and sigma are in gray levels (0-255). seed: same seed -> same output."""
    result = add_gaussian_noise(read_image(image), mean=mean, sigma=sigma, seed=seed)
    return {"image": display_png(result)}


@app.post("/api/noise/salt-pepper")
def noise_salt_pepper(
    image: UploadFile = File(...),
    amount: float = Form(0.04),
    salt_vs_pepper: float = Form(0.5),
    seed: int | None = Form(None),
):
    """amount: fraction of pixels changed (0-1). salt_vs_pepper: fraction of those set to white (0-1)."""
    result = add_salt_pepper_noise(
        read_image(image), amount=amount, salt_vs_pepper=salt_vs_pepper, seed=seed
    )
    return {"image": display_png(result)}


# ---------- Task 2: low-pass spatial filters ----------

@app.post("/api/filters/average")
def filter_average(image: UploadFile = File(...), kernel_size: int = Form(3)):
    """kernel_size: odd window side in pixels (3, 5, 7, ...)."""
    result = apply_average_filter(read_image(image), kernel_size=kernel_size)
    return {"image": display_png(result)}


@app.post("/api/filters/gaussian")
def filter_gaussian(
    image: UploadFile = File(...),
    kernel_size: int = Form(3),
    sigma: float = Form(0.0),
):
    """kernel_size: odd window side in pixels. sigma: spread in pixels (0 = automatic from kernel_size)."""
    result = apply_gaussian_filter(read_image(image), kernel_size=kernel_size, sigma=sigma)
    return {"image": display_png(result)}


@app.post("/api/filters/median")
def filter_median(image: UploadFile = File(...), kernel_size: int = Form(3)):
    """kernel_size: odd window side in pixels."""
    result = apply_median_filter(read_image(image), kernel_size=kernel_size)
    return {"image": display_png(result)}


# ---------- Task 3: edge detection ----------

@app.post("/api/edges")
def edges(
    image: UploadFile = File(...),
    method: EdgeMethod = Form(EdgeMethod.sobel),
    canny_low: float = Form(100),
    canny_high: float = Form(200),
):
    """
    method: sobel | prewitt | roberts (from scratch) or canny (OpenCV).
    canny_low / canny_high: Canny thresholds, used only by canny (0 <= low < high).
    Response: grad_x and grad_y are null for canny. result is always the final edge image.
    """
    grad_x, grad_y, result = compute_edge_magnitude(
        read_image(image), method.value, canny_low=canny_low, canny_high=canny_high
    )
    return {
        "grad_x": None if grad_x is None else display_png(grad_x),
        "grad_y": None if grad_y is None else display_png(grad_y),
        "result": display_png(result),
    }


# ---------- Task 4: histogram + distribution curve ----------

@app.post("/api/histogram")
def histogram(image: UploadFile = File(...)):
    """Gray histogram of the image (RGB is converted to gray first). Response: hist (pixels), pdf (0-1), cdf (0-1), 256 values each."""
    hist, pdf, cdf = compute_distribution(rgb_to_gray(read_image(image)))
    return distribution_json(hist, pdf, cdf)


# ---------- Task 8: RGB -> gray and R, G, B histograms ----------

@app.post("/api/rgb/gray")
def rgb_gray(image: UploadFile = File(...)):
    """RGB -> gray with 0.299R + 0.587G + 0.114B."""
    return {"image": display_png(rgb_to_gray(read_image(image)))}


@app.post("/api/rgb/histograms")
def rgb_histograms(image: UploadFile = File(...)):
    """Response: {"R": {hist, pdf, cdf}, "G": {...}, "B": {...}}. Needs an RGB image."""
    channels = compute_rgb_distributions(read_image(image))
    return {name: distribution_json(*channels[name]) for name in "RGB"}


# ---------- Task 5: histogram equalization ----------

@app.post("/api/equalization/gray")
def equalization_gray(image: UploadFile = File(...)):
    """
    Equalize the gray image (RGB is converted to gray first).
    Response: image = equalized, hist and cdf = BEFORE equalization (0-1 for cdf).
    """
    gray = rgb_to_gray(read_image(image))
    equalized, hist, cdf, _ = equalize_gray(gray)
    return {"image": display_png(equalized), "hist": hist.tolist(), "cdf": cdf.tolist()}


@app.post("/api/equalization/color")
def equalization_color(image: UploadFile = File(...)):
    """Equalize only the Y (luminance) channel of an RGB image so colours stay natural."""
    return {"image": display_png(equalize_color(read_image(image)))}


# ---------- Task 6: min-max normalization ----------

@app.post("/api/normalization")
def normalization(
    image: UploadFile = File(...),
    new_min: int = Form(0),
    new_max: int = Form(255),
):
    """Stretch the image values into [new_min, new_max] (0-255)."""
    result = normalize_image(read_image(image), new_min=new_min, new_max=new_max)
    return {"image": display_png(result)}


# ---------- Task 9: frequency-domain filters ----------

@app.post("/api/frequency/filters")
def frequency(image: UploadFile = File(...), cutoff: float = Form(30)):
    """
    Ideal low-pass and high-pass in the DFT domain.
    cutoff: radius in frequency samples (distance from the centre of the spectrum).
    Response: spectrum (log magnitude), lp_mask, hp_mask (0 or 1), lp and hp (filtered images).
    """
    spectrum, lp_mask, hp_mask, lp, hp = frequency_filters(read_image(image), cutoff=cutoff)
    return {
        "spectrum": display_png(spectrum),
        "lp_mask": display_png(lp_mask),
        "hp_mask": display_png(hp_mask),
        "lp": display_png(lp),
        "hp": display_png(hp),
    }


# ---------- Task 10: hybrid images ----------

@app.post("/api/hybrid")
def hybrid(
    img_far: UploadFile = File(...),
    img_near: UploadFile = File(...),
    cutoff_low: float = Form(15),
    cutoff_high: float = Form(25),
    pyramid_levels: int = Form(4, ge=1, le=8),
):
    """
    hybrid = low-pass(img_far, cutoff_low) + high-pass(img_near, cutoff_high).
    img_near is resized to img_far's size. pyramid_levels: how many images in pyramid
    (level 1 = full hybrid, each next level is half the size).
    Response: low, high (display-normalized), hybrid (clipped to 0-255), pyramid (list of PNGs).
    """
    low, high, combined, _ = make_hybrid(
        read_image(img_far),
        read_image(img_near),
        cutoff_low=cutoff_low,
        cutoff_high=cutoff_high,
    )
    levels = gaussian_pyramid_view(combined, levels=pyramid_levels)
    return {
        "low": display_png(low),
        "high": display_png(high),
        "hybrid": encode_png(to_uint8(combined)),
        "pyramid": [encode_png(to_uint8(level)) for level in levels],
    }
