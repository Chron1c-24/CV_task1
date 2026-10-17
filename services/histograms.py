"""
Task 4 - Histogram and distribution curve.
Task 8 - RGB to gray and R, G, B histograms with their CDFs.
"""

import numpy as np

from .image_io import validate_image


def compute_histogram(gray_u8, levels=256):
    # count how many pixels have each intensity
    hist = np.bincount(gray_u8.ravel(), minlength=levels)[:levels]
    return hist


def compute_distribution(gray_u8, levels=256):
    """
    Histogram, PDF and CDF of one single-channel uint8 image
    (a gray image, or one R / G / B channel).

        hist[k] = number of pixels with value k          (pixels)
        pdf[k]  = hist[k] / N                            (0-1, sums to 1)
        cdf[k]  = pdf[0] + ... + pdf[k]                  (0-1, ends at 1)

    Returns (hist, pdf, cdf), each of length `levels`.
    """
    gray_u8 = validate_image(gray_u8)
    if gray_u8.ndim != 2:
        raise ValueError("Expected a single-channel image (gray or one color channel).")

    hist = compute_histogram(gray_u8, levels)
    pdf = hist / gray_u8.size
    cdf = np.cumsum(pdf)
    return hist, pdf, cdf
