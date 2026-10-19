"""
Task 1 - Additive noise.
  - Uniform noise: OpenCV (cv2.randu)
  - Gaussian noise: OpenCV (cv2.randn)
  - Salt-and-pepper noise: implemented from scratch
"""

import cv2
import numpy as np

from .image_io import validate_image


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


def _is_gray_like(image):
    """True for an RGB image stored with identical R, G and B (a gray picture in a 3-channel file)."""
    return (
        image.ndim == 3
        and np.array_equal(image[:, :, 0], image[:, :, 1])
        and np.array_equal(image[:, :, 0], image[:, :, 2])
    )


def _noise_for(image, kind, a, b):
    """Noise matching the image.

    Gray-looking images get ONE noise map copied to every channel, so they stay gray.
    Real color images get independent noise per channel.
    """
    if _is_gray_like(image):
        single = _make_noise(image.shape[:2], kind, a, b)
        return np.repeat(single[:, :, None], image.shape[2], axis=2)
    return _make_noise(image.shape, kind, a, b)


def add_uniform_noise(image, amount=25, seed=None):
    image = validate_image(image)
    if not 0 <= amount <= 255:
        raise ValueError("amount must be between 0 and 255.")
    if seed is not None:
        cv2.setRNGSeed(int(seed))
    noise = _noise_for(image, "uniform", -amount, amount)
    return np.clip(image.astype(np.float32) + noise, 0, 255).astype(np.uint8)


def add_gaussian_noise(image, mean=0.0, sigma=20.0, seed=None):
    image = validate_image(image)
    if sigma < 0:
        raise ValueError("sigma must be non-negative.")
    if seed is not None:
        cv2.setRNGSeed(int(seed))
    noise = _noise_for(image, "gaussian", mean, sigma)
    return np.clip(image.astype(np.float32) + noise, 0, 255).astype(np.uint8)


def add_salt_pepper_noise(image, amount=0.04, salt_vs_pepper=0.5, seed=None):
    """
    Add salt-and-pepper noise from scratch using NumPy random positions.

    amount: fraction of image pixels affected, from 0 to 1.
    salt_vs_pepper: fraction of affected pixels set to white; remaining
                    affected pixels are set to black.
    For color images, all channels of a selected pixel are changed together.
    """
    image = validate_image(image)
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