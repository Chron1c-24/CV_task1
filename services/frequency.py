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


def _apply_mask_to_fft(F_shifted, mask):
    """Apply a frequency mask to an already-shifted FFT and return the spatial result."""
    G = F_shifted * mask[..., None].astype(np.float32)
    G = np.fft.ifftshift(G, axes=(0, 1))
    out = cv2.idft(G, flags=cv2.DFT_SCALE | cv2.DFT_REAL_OUTPUT)
    return out.astype(np.float64)


def frequency_filters(img, cutoff=30, cached_data=None):
    """Task 9: ideal low-pass and ideal high-pass using DFT / IDFT.

    Returns (spectrum, lp_mask, hp_mask, lp, hp, cache_data), all float64.
    spectrum is log(1 + |FFT|); hp is zero-mean (has negative values).

    cached_data: if provided, a tuple (channel_ffts, gray_fft) from a previous
                 call to skip the DFT step entirely.
    """
    gray = rgb_to_gray(img)

    # Compute per-channel FFTs once (or reuse cached ones)
    if cached_data is not None:
        channel_ffts, F_gray = cached_data
    else:
        n_channels = img.shape[2] if img.ndim == 3 else 1
        if n_channels == 1:
            channel_ffts = [fft_centered(gray)]
        else:
            channel_ffts = [fft_centered(np.float32(img[..., c])) for c in range(n_channels)]
        F_gray = fft_centered(gray)

    # Spectrum from the (cached) gray FFT
    spectrum = np.log1p(cv2.magnitude(F_gray[..., 0], F_gray[..., 1]))

    lp_mask = lowpass_mask(gray.shape, cutoff, "ideal")
    hp_mask = highpass_mask(gray.shape, cutoff, "ideal")

    # Apply both masks to the same cached FFTs
    lp = np.dstack([_apply_mask_to_fft(F, lp_mask) for F in channel_ffts])
    hp = np.dstack([_apply_mask_to_fft(F, hp_mask) for F in channel_ffts])
    return spectrum, lp_mask, hp_mask, lp, hp, (channel_ffts, F_gray)


def _channel_ffts(img):
    """Centred FFT of every channel of an image (one entry for a grayscale image)."""
    if img.ndim == 2:
        return [fft_centered(np.float32(img))]
    return [fft_centered(np.float32(img[..., c])) for c in range(img.shape[2])]


def _filtered_stack(ffts, mask):
    """Apply one mask to cached channel FFTs and stack the results back into an image."""
    out = [_apply_mask_to_fft(F, mask) for F in ffts]
    return out[0] if len(out) == 1 else np.dstack(out)


def make_hybrid(img_far, img_near, cutoff_low=15, cutoff_high=25, cached_data=None):
    """
    hybrid = LowPass(img_far, cutoff_low) + HighPass(img_near, cutoff_high)
      - img_far : seen from far away   -> its LOW frequencies are kept
      - img_near: seen from up close   -> its HIGH frequencies are kept
    Works per channel for colour images.

    cached_data: optional (channel_ffts_far, channel_ffts_near) from a previous call
                 with the same two images (near's are always computed after resizing
                 to img_far's size); None entries are computed here. Providing them
                 skips the DFT step.
    Returns (low, high, hybrid, img_near, (channel_ffts_far, channel_ffts_near)).
    """
    h, w = img_far.shape[:2]
    img_near = resize_nearest(img_near, h, w)       # make sizes identical

    ffts_far, ffts_near = cached_data if cached_data is not None else (None, None)
    if ffts_far is None:
        ffts_far = _channel_ffts(img_far)
    if ffts_near is None:
        ffts_near = _channel_ffts(img_near)

    lp_mask = lowpass_mask((h, w), cutoff_low, "gaussian")
    hp_mask = highpass_mask((h, w), cutoff_high, "gaussian")

    low = _filtered_stack(ffts_far, lp_mask)
    high = _filtered_stack(ffts_near, hp_mask)
    hybrid = low + high
    return low, high, hybrid, img_near, (ffts_far, ffts_near)

