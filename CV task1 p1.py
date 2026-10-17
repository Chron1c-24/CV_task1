"""
Image-processing functions.

Task 1:
  - Uniform noise: OpenCV (cv2.randu)
  - Gaussian noise: OpenCV (cv2.randn)
  - Salt-and-pepper noise: implemented from scratch

Task 2:
  - Average, Gaussian, and median filters: all implemented from scratch
    (no cv2.blur, cv2.GaussianBlur, or cv2.medianBlur)

Task 6:
  - Min-max normalization

Dependencies:
    pip install opencv-python numpy
"""

import cv2
import numpy as np


def load_image(file_path):
    """Load an 8-bit image from disk using OpenCV and validate its format.

    OpenCV loads color images as BGR. Four-channel BGRA images are converted
    to BGR so that all processing functions receive supported 1- or 3-channel
    images. Raises ValueError if the file cannot be read or is unsupported.
    """
    if not file_path:
        raise ValueError("Please provide an image file path.")

    image = cv2.imread(str(file_path), cv2.IMREAD_UNCHANGED)
    if image is None:
        raise ValueError(f"Could not load image: {file_path}")

    if image.ndim == 3 and image.shape[2] == 4:
        image = cv2.cvtColor(image, cv2.COLOR_BGRA2BGR)

    return _validate_image(image)


def _validate_image(image):
    if image is None or not isinstance(image, np.ndarray) or image.size == 0:
        raise ValueError("Please provide a valid, non-empty image.")
    if image.ndim not in (2, 3):
        raise ValueError("Expected a grayscale or color image.")
    if image.ndim == 3 and image.shape[2] not in (3, 4):
        raise ValueError("Expected a grayscale, BGR, or BGRA image.")
    if image.dtype != np.uint8:
        raise ValueError("Expected an 8-bit image (uint8), as loaded by cv2.imread.")
    return image


def _validate_kernel_size(kernel_size):
    if not isinstance(kernel_size, (int, np.integer)) or kernel_size < 1 or kernel_size % 2 == 0:
        raise ValueError("kernel_size must be a positive odd integer (e.g. 3, 5, 7).")


def _make_noise(shape, kind, a, b):
    """Generate float32 noise with independent values in every channel.

    kind='uniform': a=low, b=high
    kind='gaussian': a=mean, b=sigma
    """
    noise = np.empty(shape, dtype=np.float32)
    channels = [noise] if len(shape) == 2 else [noise[:, :, c] for c in range(shape[2])]
    for ch in channels:
        buf = np.empty(shape[:2], dtype=np.float32)
        if kind == "uniform":
            cv2.randu(buf, float(a), float(b))
        else:
            cv2.randn(buf, float(a), float(b))
        ch[...] = buf
    return noise


def add_uniform_noise(image, amount=25, seed=None):
    image = _validate_image(image)
    if not 0 <= amount <= 255:
        raise ValueError("amount must be between 0 and 255.")
    if seed is not None:
        cv2.setRNGSeed(int(seed))
    noise = _make_noise(image.shape, "uniform", -amount, amount)
    return np.clip(image.astype(np.float32) + noise, 0, 255).astype(np.uint8)


def add_gaussian_noise(image, mean=0.0, sigma=20.0, seed=None):
    image = _validate_image(image)
    if sigma < 0:
        raise ValueError("sigma must be non-negative.")
    if seed is not None:
        cv2.setRNGSeed(int(seed))
    noise = _make_noise(image.shape, "gaussian", mean, sigma)
    return np.clip(image.astype(np.float32) + noise, 0, 255).astype(np.uint8)


def add_salt_pepper_noise(image, amount=0.04, salt_vs_pepper=0.5, seed=None):
    """
    Add salt-and-pepper noise from scratch using NumPy random positions.

    amount: fraction of image pixels affected, from 0 to 1.
    salt_vs_pepper: fraction of affected pixels set to white; remaining
                    affected pixels are set to black.
    For color images, all channels of a selected pixel are changed together.
    """
    image = _validate_image(image)
    if not 0 <= amount <= 1:
        raise ValueError("amount must be between 0 and 1.")
    if not 0 <= salt_vs_pepper <= 1:
        raise ValueError("salt_vs_pepper must be between 0 and 1.")

    result = image.copy()
    height, width = image.shape[:2]
    total_pixels = height * width
    affected_count = int(round(amount * total_pixels))
    rng = np.random.default_rng(seed)

    if affected_count == 0:
        return result

    # Choose unique pixel positions without using an image-processing filter.
    positions = rng.choice(total_pixels, size=min(affected_count, total_pixels), replace=False)
    salt_count = int(round(len(positions) * salt_vs_pepper))
    salt_positions = positions[:salt_count]
    pepper_positions = positions[salt_count:]

    flat = result.reshape((total_pixels,) + result.shape[2:]) if result.ndim == 3 else result.reshape(total_pixels)
    flat[salt_positions] = 255
    flat[pepper_positions] = 0
    return result


def _pad_image(image, pad, mode="edge"):
    """Pad image borders manually through NumPy, supporting grayscale/color."""
    if image.ndim == 2:
        return np.pad(image, ((pad, pad), (pad, pad)), mode=mode)
    return np.pad(image, ((pad, pad), (pad, pad), (0, 0)), mode=mode)


def _convolve_image(image, kernel):
    """
    Apply a 2-D kernel using explicit sliding windows and NumPy arithmetic.
    This is a from-scratch convolution/correlation implementation; no OpenCV
    filtering function is called.
    """
    image = _validate_image(image)
    kernel = np.asarray(kernel, dtype=np.float32)
    if kernel.ndim != 2 or kernel.shape[0] != kernel.shape[1] or kernel.shape[0] % 2 == 0:
        raise ValueError("Kernel must be a square 2-D array with an odd side length.")

    k = kernel.shape[0]
    pad = k // 2
    padded = _pad_image(image.astype(np.float32), pad)
    output = np.zeros(image.shape, dtype=np.float32)

    # Explicitly slide the kernel across the image.
    for row in range(k):
        for col in range(k):
            weight = kernel[row, col]
            if image.ndim == 2:
                output += padded[row:row + image.shape[0], col:col + image.shape[1]] * weight
            else:
                output += padded[row:row + image.shape[0], col:col + image.shape[1], :] * weight

    return np.clip(output, 0, 255).astype(np.uint8)


def apply_average_filter(image, kernel_size=3):
    """Average/mean filter implemented from scratch with a normalized kernel."""
    image = _validate_image(image)
    _validate_kernel_size(kernel_size)
    kernel = np.ones((kernel_size, kernel_size), dtype=np.float32) / (kernel_size * kernel_size)
    return _convolve_image(image, kernel)


def apply_gaussian_filter(image, kernel_size=3, sigma=0):
    """Gaussian low-pass filter implemented from scratch."""
    image = _validate_image(image)
    _validate_kernel_size(kernel_size)
    if sigma < 0:
        raise ValueError("sigma must be non-negative.")
    if sigma == 0:
        # Common approximation used when sigma is not specified.
        sigma = 0.3 * ((kernel_size - 1) * 0.5 - 1) + 0.8

    coords = np.arange(kernel_size, dtype=np.float32) - (kernel_size - 1) / 2
    xx, yy = np.meshgrid(coords, coords)
    kernel = np.exp(-(xx ** 2 + yy ** 2) / (2 * sigma ** 2))
    kernel /= kernel.sum()
    return _convolve_image(image, kernel)


def apply_median_filter(image, kernel_size=3):
    """
    Median filter implemented from scratch by collecting each neighborhood
    and taking its median. 
    """
    image = _validate_image(image)
    _validate_kernel_size(kernel_size)
    pad = kernel_size // 2
    padded = _pad_image(image, pad)

    if image.ndim == 2:
        windows = np.lib.stride_tricks.sliding_window_view(
            padded, (kernel_size, kernel_size)
        )
        result = np.median(windows, axis=(-2, -1))
    else:
        # Window axes are (height, width, kernel_y, kernel_x, channels).
        windows = np.lib.stride_tricks.sliding_window_view(
            padded, (kernel_size, kernel_size), axis=(0, 1)
        )
        result = np.median(windows, axis=(-2, -1))

    return np.clip(result, 0, 255).astype(np.uint8)


def normalize_image(image, new_min=0, new_max=255):
    """Min-max normalize pixel values into [new_min, new_max]."""
    image = _validate_image(image)
    if not (0 <= new_min <= 255 and 0 <= new_max <= 255):
        raise ValueError("new_min and new_max must be between 0 and 255.")
    if new_min > new_max:
        raise ValueError("new_min cannot be greater than new_max.")

    work = image.astype(np.float32)
    old_min = float(work.min())
    old_max = float(work.max())
    if old_max == old_min:
        return np.full(image.shape, new_min, dtype=np.uint8)

    normalized = (work - old_min) * ((new_max - new_min) / (old_max - old_min)) + new_min
    return np.clip(normalized, new_min, new_max).astype(np.uint8)
