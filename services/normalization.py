"""
Task 6 - Min-max normalization.
"""

import numpy as np

from .image_io import validate_image


def normalize_image(image, new_min=0, new_max=255):
    """Min-max normalize pixel values into [new_min, new_max].

    Accepts uint8 images and float arrays (e.g. edge gradients that are
    negative or above 255); always returns uint8.
    """
    image = validate_image(image, allow_float=True)
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
