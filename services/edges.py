"""
Task 3 - Edge detection: Sobel, Roberts, Prewitt (from scratch) and Canny (OpenCV).
"""

import cv2
import numpy as np

from .image_io import validate_image, rgb_to_gray, convolve_image


# method name -> (kernel_x, kernel_y)
# Kernel x responds to left->right changes (vertical edges),
# kernel y responds to top->bottom changes (horizontal edges).
# Every kernel sums to 0, so flat regions give 0 (no edge).
EDGE_KERNELS = {
    "sobel": (
        np.array([[-1, 0, 1],
                  [-2, 0, 2],
                  [-1, 0, 1]], dtype=np.float32),
        np.array([[-1, -2, -1],
                  [ 0,  0,  0],
                  [ 1,  2,  1]], dtype=np.float32),
    ),
    "prewitt": (
        np.array([[-1, 0, 1],
                  [-1, 0, 1],
                  [-1, 0, 1]], dtype=np.float32),
        np.array([[-1, -1, -1],
                  [ 0,  0,  0],
                  [ 1,  1,  1]], dtype=np.float32),
    ),
    # Roberts is 2x2 (diagonal differences). convolve_image only accepts odd
    # sizes, so the 2x2 is placed in the top-left of a 3x3 and padded with
    # zeros. This shifts the response by half a pixel, which is not visible.
    "roberts": (
        np.array([[1,  0, 0],
                  [0, -1, 0],
                  [0,  0, 0]], dtype=np.float32),
        np.array([[ 0, 1, 0],
                  [-1, 0, 0],
                  [ 0, 0, 0]], dtype=np.float32),
    ),
}


def compute_edge_magnitude(image, method, canny_low=100, canny_high=200):
    """
    Detect edges in an image.

    image : RGB or grayscale uint8 image.
    method: "sobel", "prewitt", "roberts" (from scratch) or "canny" (OpenCV).
    canny_low, canny_high: Canny hysteresis thresholds (gradient strength,
        can exceed 255; must satisfy 0 <= canny_low < canny_high).
        Ignored for the other methods.

    Returns (grad_x, grad_y, result), each (H, W):
        sobel / prewitt / roberts -> float64 gradients and magnitude, NOT
            normalized (grad_x / grad_y can be negative, magnitude can
            exceed 255). Use normalize_image to display them.
        canny -> (None, None, edges), edges is uint8 with 255 = edge, 0 = not.
    """
    if method != "canny" and method not in EDGE_KERNELS:
        raise ValueError(f"Unknown edge detection method '{method}'. "
                         f"Choose from {list(EDGE_KERNELS) + ['canny']}.")

    image = validate_image(image)
    gray_img = rgb_to_gray(image)
    if method == "canny":
        if not 0 <= canny_low < canny_high:
            raise ValueError("Canny thresholds must satisfy 0 <= canny_low < canny_high.")
        return None, None, cv2.Canny(gray_img, canny_low, canny_high)

    kernel_x, kernel_y = EDGE_KERNELS[method]
    grad_x = convolve_image(gray_img, kernel_x, clip=False)
    grad_y = convolve_image(gray_img, kernel_y, clip=False)
    magnitude = np.hypot(grad_x, grad_y)  # sqrt(grad_x^2 + grad_y^2)
    return grad_x, grad_y, magnitude