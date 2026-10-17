"""
Task 2 - Low-pass spatial filters.
Average, Gaussian, and median filters: all implemented from scratch
(no cv2.blur, cv2.GaussianBlur, or cv2.medianBlur).
"""

import numpy as np

from .image_io import validate_image, validate_kernel_size, pad_image, convolve_image


def apply_average_filter(image, kernel_size=3):
    """Average/mean filter implemented from scratch with a normalized kernel."""
    image = validate_image(image)
    validate_kernel_size(kernel_size)
    kernel = np.ones((kernel_size, kernel_size), dtype=np.float32) / (kernel_size * kernel_size)
    return convolve_image(image, kernel)


def apply_gaussian_filter(image, kernel_size=3, sigma=0):
    """Gaussian low-pass filter implemented from scratch."""
    image = validate_image(image)
    validate_kernel_size(kernel_size)
    if sigma < 0:
        raise ValueError("sigma must be non-negative.")
    if sigma == 0:
        # Common approximation used when sigma is not specified.
        sigma = 0.3 * ((kernel_size - 1) * 0.5 - 1) + 0.8

    coords = np.arange(kernel_size, dtype=np.float32) - (kernel_size - 1) / 2
    xx, yy = np.meshgrid(coords, coords)
    kernel = np.exp(-(xx ** 2 + yy ** 2) / (2 * sigma ** 2))
    kernel /= kernel.sum()
    return convolve_image(image, kernel)


def apply_median_filter(image, kernel_size=3):
    """
    Median filter implemented from scratch by collecting each neighborhood
    and taking its median.
    """
    image = validate_image(image)
    validate_kernel_size(kernel_size)
    pad = kernel_size // 2
    padded = pad_image(image, pad)

    if image.ndim == 2:
        windows = np.lib.stride_tricks.sliding_window_view(
            padded, (kernel_size, kernel_size)
        )
        result = np.median(windows, axis=(-2, -1))
    else:
        # Window axes are (height, width, channels, kernel_y, kernel_x).
        windows = np.lib.stride_tricks.sliding_window_view(
            padded, (kernel_size, kernel_size), axis=(0, 1)
        )
        result = np.median(windows, axis=(-2, -1))

    return np.clip(result, 0, 255).astype(np.uint8)
