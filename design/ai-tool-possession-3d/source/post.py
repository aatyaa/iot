"""Photographic finishing pass: bloom, chromatic fringe, vignette, film grain."""
import sys
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter, map_coordinates

OUT = sys.argv[1] if len(sys.argv) > 1 else 'out'


def srgb_to_lin(c):
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def lin_to_srgb(c):
    c = np.clip(c, 0, None)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * np.power(c, 1 / 2.4) - 0.055)


art = np.asarray(Image.open(f'{OUT}/art.png').convert('RGB')).astype(np.float32) / 255.0
H, W, _ = art.shape
lin = srgb_to_lin(art)

# ---- bloom: soft-knee bright pass, three radii, warm tint
lum = lin @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
knee = np.clip((lum - 0.16) / 0.5, 0, 1) ** 2
bright = lin * knee[..., None]
bloom = np.zeros_like(lin)
for sigma, w in ((5, 0.55), (18, 0.45), (60, 0.38), (150, 0.22)):
    for ch in range(3):
        bloom[..., ch] += w * gaussian_filter(bright[..., ch], sigma, mode='constant')
bloom *= np.array([1.0, 0.82, 0.62], dtype=np.float32)
img = lin + bloom * 0.9

# ---- subtle radial chromatic fringe
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
cx, cy = W / 2, H * 0.55
dx, dy = xx - cx, yy - cy
for ch, k in ((0, 1.0016), (2, 0.9984)):
    img[..., ch] = map_coordinates(img[..., ch], [cy + dy / k, cx + dx / k], order=1, mode='nearest')

# ---- gentle filmic shoulder
img = img / (1 + 0.12 * img)
img *= 1.10

np.save(f'{OUT}/_lin.npy', img.astype(np.float32))
print('bloom done', img.max())
