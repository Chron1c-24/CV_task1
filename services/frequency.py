"""
Task 9  - Frequency-domain low-pass and high-pass filters (DFT / IDFT).
Task 10 - Hybrid images.
"""

import cv2
import numpy as np

from .image_io import rgb_to_gray, resize_nearest


def distance_grid(h, w):
    """D(u,v): distance of each frequency sample from the (centred) origin."""
    u = np.arange(h) - h // 2
    v = np.arange(w) - w // 2
    V, U = np.meshgrid(v, u)
    return np.sqrt(U ** 2 + V ** 2)


def lowpass_mask(shape, cutoff, kind="gaussian"):
    D = distance_grid(*shape)
    if kind == "ideal":
        return (D <= cutoff).astype(np.float64)
    return np.exp(-(D ** 2) / (2.0 * cutoff ** 2))      # gaussian


def highpass_mask(shape, cutoff, kind="gaussian"):
    return 1.0 - lowpass_mask(shape, cutoff, kind)


def fft_centered(gray):
    """cv2.dft -> (H, W, 2) complex array with the zero frequency in the centre."""
    F = cv2.dft(np.float32(gray), flags=cv2.DFT_COMPLEX_OUTPUT)
    return np.fft.fftshift(F, axes=(0, 1))


def apply_freq_filter(gray, mask):
    """DFT -> shift -> multiply by mask -> inverse shift -> IDFT."""
    F = fft_centered(gray)
    G = F * mask[..., None].astype(np.float32)          # same mask on real & imag
    G = np.fft.ifftshift(G, axes=(0, 1))
    out = cv2.idft(G, flags=cv2.DFT_SCALE | cv2.DFT_REAL_OUTPUT)
    return out.astype(np.float64)


def frequency_filters(img, cutoff=30):
    """Task 9: ideal low-pass and ideal high-pass using DFT / IDFT.

    Returns (spectrum, lp_mask, hp_mask, lp, hp), all float64.
    spectrum is log(1 + |FFT|); hp is zero-mean (has negative values).
    """
    gray = rgb_to_gray(img)
    F = fft_centered(gray)
    spectrum = np.log1p(cv2.magnitude(F[..., 0], F[..., 1]))

    lp_mask = lowpass_mask(gray.shape, cutoff, "ideal")
    hp_mask = highpass_mask(gray.shape, cutoff, "ideal")
    lp = apply_freq_filter(gray, lp_mask)
    hp = apply_freq_filter(gray, hp_mask)
    return spectrum, lp_mask, hp_mask, lp, hp


def make_hybrid(img_far, img_near, cutoff_low=15, cutoff_high=25):
    """
    hybrid = LowPass(img_far, cutoff_low) + HighPass(img_near, cutoff_high)
      - img_far : seen from far away   -> its LOW frequencies are kept
      - img_near: seen from up close   -> its HIGH frequencies are kept
    Works per channel for colour images.
    """
    h, w = img_far.shape[:2]
    img_near = resize_nearest(img_near, h, w)       # make sizes identical

    lp_mask = lowpass_mask((h, w), cutoff_low, "gaussian")
    hp_mask = highpass_mask((h, w), cutoff_high, "gaussian")

    def per_channel(img, mask):
        if img.ndim == 2:
            return apply_freq_filter(img, mask)
        return np.stack([apply_freq_filter(img[..., c], mask)
                         for c in range(img.shape[2])], axis=-1)

    low = per_channel(img_far, lp_mask)
    high = per_channel(img_near, hp_mask)
    hybrid = low + high
    return low, high, hybrid, img_near


def gaussian_pyramid_view(img, levels=4):
    """Shrinks the hybrid by half each step (simulates viewing distance)."""
    out = [img]
    cur = img.astype(np.float64)                    # avoid uint8 overflow in the sum below
    for _ in range(levels - 1):
        # blur with a simple 2x2 box average then downsample (from scratch)
        h, w = (cur.shape[0] // 2) * 2, (cur.shape[1] // 2) * 2
        c = cur[:h, :w]
        cur = (c[0::2, 0::2] + c[1::2, 0::2] + c[0::2, 1::2] + c[1::2, 1::2]) / 4.0
        out.append(cur)
    return out
