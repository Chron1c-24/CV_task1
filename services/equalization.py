"""
Task 5 - Histogram equalization (grayscale, and color through the Y channel).
"""

import numpy as np

from .image_io import to_uint8
from .histograms import compute_histogram


def equalize_gray(gray, levels=256):
    """
    Classic histogram equalization:
        pdf(k) = hist(k) / N
        cdf(k) = sum_{j<=k} pdf(j)
        s_k    = round( (cdf(k) - cdf_min) / (1 - cdf_min) * (L-1) )
    """
    g = to_uint8(gray)
    hist = compute_histogram(g, levels)
    n = g.size
    pdf = hist / n
    cdf = np.cumsum(pdf)
    cdf_min = cdf[hist > 0].min()              # first non-empty bin
    mapping = np.round((cdf - cdf_min) / (1.0 - cdf_min + 1e-12) * (levels - 1))
    mapping = np.clip(mapping, 0, levels - 1).astype(np.uint8)
    return mapping[g], hist, cdf, mapping


def rgb_to_ycbcr(img):
    r, g, b = img[..., 0], img[..., 1], img[..., 2]
    y = 0.299 * r + 0.587 * g + 0.114 * b
    cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b
    cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b
    return y, cb, cr


def ycbcr_to_rgb(y, cb, cr):
    r = y + 1.402 * (cr - 128)
    g = y - 0.344136 * (cb - 128) - 0.714136 * (cr - 128)
    b = y + 1.772 * (cb - 128)
    return np.stack([r, g, b], axis=-1)


def equalize_color(img):
    """Equalize only the luminance (Y) so colours are not distorted."""
    y, cb, cr = rgb_to_ycbcr(img)
    y_eq, *_ = equalize_gray(y)
    return to_uint8(ycbcr_to_rgb(y_eq.astype(np.float64), cb, cr))
