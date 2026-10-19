"""
Shared (non-core) helpers used by every service.

Image convention for all services:
  - Input images are RGB (or grayscale) uint8, as returned by load_image.
  - Final images are returned as uint8.
  - Signed / intermediate results (e.g. high-pass output, gradients) are
    returned as float64; use to_uint8 (or a display helper) before showing them.

Dependencies:
    pip install opencv-python numpy
"""

from pathlib import Path

import cv2
import numpy as np

def decode_image(data, source="uploaded file"):
    """Decode image bytes (e.g. an upload) into RGB uint8 (or grayscale).

    Same conversion as load_image. source is only used in the error message.
    """
    if not data:
        raise ValueError(f"Could not load image: {source} is empty.")

    image = cv2.imdecode(np.frombuffer(data, dtype=np.uint8), cv2.IMREAD_UNCHANGED)
    if image is None:
        raise ValueError(f"Could not load image: {source}")

    if image.ndim == 3 and image.shape[2] == 4:
        image = cv2.cvtColor(image, cv2.COLOR_BGRA2RGB)
    elif image.ndim == 3 and image.shape[2] == 3:
        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

    return validate_image(image)


def validate_image(image, allow_float=False):
    """allow_float=True also accepts float arrays (e.g. raw edge gradients)."""
    if image is None or not isinstance(image, np.ndarray) or image.size == 0:
        raise ValueError("Please provide a valid, non-empty image.")
    if image.ndim not in (2, 3):
        raise ValueError("Expected a grayscale or color image.")
    if image.ndim == 3 and image.shape[2] not in (3, 4):
        raise ValueError("Expected a grayscale, RGB, or RGBA image.")
    if allow_float and np.issubdtype(image.dtype, np.floating):
        return image
    if image.dtype != np.uint8:
        raise ValueError("Expected an 8-bit image (uint8), as returned by load_image.")
    return image


def validate_kernel_size(kernel_size):
    if not isinstance(kernel_size, (int, np.integer)) or kernel_size < 1 or kernel_size % 2 == 0:
        raise ValueError("kernel_size must be a positive odd integer (e.g. 3, 5, 7).")


def to_uint8(img):
    return np.clip(np.round(img), 0, 255).astype(np.uint8)


def rgb_to_gray(img):
    """Return a grayscale uint8 image (0-255)."""
    if img.ndim == 2:
        return to_uint8(img)
    gray = 0.299 * img[..., 0] + 0.587 * img[..., 1] + 0.114 * img[..., 2]
    return to_uint8(gray)


def resize_nearest(img, new_h, new_w):
    """Nearest-neighbour resize, from scratch (so both hybrid inputs match)."""
    h, w = img.shape[:2]
    rows = (np.arange(new_h) * h / new_h).astype(int)
    cols = (np.arange(new_w) * w / new_w).astype(int)
    return img[rows][:, cols]


def pad_image(image, pad, mode="edge"):
    """Pad image borders manually through NumPy, supporting grayscale/color."""
    if image.ndim == 2:
        return np.pad(image, ((pad, pad), (pad, pad)), mode=mode)
    return np.pad(image, ((pad, pad), (pad, pad), (0, 0)), mode=mode)


def convolve_image(image, kernel, clip=True):
    """
    Apply a 2-D kernel using explicit sliding windows and NumPy arithmetic.
    This is a from-scratch convolution/correlation implementation; no OpenCV
    filtering function is called.

    clip=True : result clipped to 0-255 and returned as uint8 (smoothing filters).
    clip=False: raw signed result returned as float64 (e.g. edge gradients).
    """
    image = validate_image(image)
    kernel = np.asarray(kernel, dtype=np.float32)
    if kernel.ndim != 2 or kernel.shape[0] != kernel.shape[1] or kernel.shape[0] % 2 == 0:
        raise ValueError("Kernel must be a square 2-D array with an odd side length.")

    k = kernel.shape[0]
    pad = k // 2
    padded = pad_image(image.astype(np.float32), pad)
    output = np.zeros(image.shape, dtype=np.float32)

    # Explicitly slide the kernel across the image.
    for row in range(k):
        for col in range(k):
            weight = kernel[row, col]
            if image.ndim == 2:
                output += padded[row:row + image.shape[0], col:col + image.shape[1]] * weight
            else:
                output += padded[row:row + image.shape[0], col:col + image.shape[1], :] * weight

    if not clip:
        return output.astype(np.float64)
    return np.clip(output, 0, 255).astype(np.uint8)
