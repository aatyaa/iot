"""Composite typography (optional), then vignette + grain. Writes clean and titled masters."""
import sys
import numpy as np
from PIL import Image
OUT = sys.argv[1] if len(sys.argv) > 1 else 'out'


def srgb_to_lin(c):
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def lin_to_srgb(c):
    c = np.clip(c, 0, None)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * np.power(c, 1 / 2.4) - 0.055)

base = np.load(f'{OUT}/_lin.npy')
H, W, _ = base.shape
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
r = np.sqrt(((xx - W * 0.5) / (W * 0.5)) ** 2 + ((yy - H * 0.52) / (H * 0.5)) ** 2)
vig = 1 - 0.34 * np.clip((r - 0.55) / 0.75, 0, 1) ** 1.6
rng = np.random.default_rng(11)
grain = rng.normal(0, 1, (H, W)).astype(np.float32)
from scipy.ndimage import gaussian_filter
grain = gaussian_filter(grain, 0.55) * 1.6


def finish(lin, name):
    lin = lin * vig[..., None]
    s = lin_to_srgb(lin)
    luma = s @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
    amt = 0.022 * (1 - 0.65 * np.clip(luma, 0, 1))
    s = np.clip(s + grain[..., None] * amt[..., None], 0, 1)
    im = Image.fromarray((s * 255 + 0.5).astype(np.uint8))
    im.save(f'{OUT}/{name}@2x.png', optimize=True)
    im.resize((W // 2, H // 2), Image.LANCZOS).save(f'{OUT}/{name}.png', optimize=True)
    print('wrote', name)


finish(base, 'clean')

t = np.asarray(Image.open(f'{OUT}/text.png').convert('RGBA')).astype(np.float32) / 255.0
a = t[..., 3:4]
col = srgb_to_lin(t[..., :3])
finish(base * (1 - a) + col * a, 'titled')
