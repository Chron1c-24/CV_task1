"""
Task 4 - Histogram and distribution curve.
Task 8 - RGB to gray and R, G, B histograms with their CDFs.
"""

import numpy as np


def compute_histogram(gray_u8, levels=256):
    hist = np.zeros(levels, dtype=np.int64)
    # count how many pixels have each intensity
    for v in gray_u8.ravel():
        hist[v] += 1
    return hist
