"""Fix round: regenerate linen.jpg and cotton.jpg only.

- linen: woven (plain weave) simulation via numpy — fine 2px threads,
  per-thread shade jitter, no dominant grid lines (removes v1 plaid look).
- cotton: same CC0 source, stronger flat-field to kill low-frequency blobs,
  then mirror tiling (removes v1 seam lines).
"""
import os

import numpy as np
from PIL import Image, ImageChops, ImageFilter, ImageOps

HERE = os.path.dirname(os.path.abspath(__file__))
CAND = os.path.join(HERE, "candidates")
OUT = os.path.join(HERE, "..", "..", "src", "assets", "textures")
SIZE = 512


def adjust(tile, target_mean, contrast):
    if contrast != 1.0:
        tile = tile.point(lambda i: max(0, min(255, int(128 + (i - 128) * contrast))))
    hist = tile.histogram()
    mean = sum(i * c for i, c in enumerate(hist)) / sum(hist)
    delta = int(target_mean - mean)
    return tile.point(lambda i: max(0, min(255, i + delta)))


def flat_field(patch, blur_ratio=0.15, target_mean=216):
    radius = max(8, int(min(patch.size) * blur_ratio))
    bg = patch.filter(ImageFilter.GaussianBlur(radius))
    return ImageChops.subtract(patch, bg, scale=1.0, offset=target_mean)


def save(tile, name, quality=88):
    path = os.path.join(OUT, f"{name}.jpg")
    tile.save(path, quality=quality)
    print(f"{name}: {os.path.getsize(path)//1024} KB")


# ---- linen: plain-weave simulation ----
def gen_linen():
    rng = np.random.default_rng(11)
    base = 220.0
    threads = SIZE // 2  # 2px per thread
    warp_shade = rng.integers(-9, 10, threads).astype(np.float32)   # 纵向线
    weft_shade = rng.integers(-9, 10, threads).astype(np.float32)   # 横向线
    yy, xx = np.mgrid[0:SIZE, 0:SIZE].astype(np.int32)
    tx, ty = xx // 2, yy // 2
    weft_top = ((tx + ty) % 2 == 0)  # 平纹：奇偶格交替上下
    shade = np.where(weft_top, weft_shade[ty], warp_shade[tx])
    # 线径中心的亮度弧度，让每根线有圆柱感
    prof_y = np.cos(((yy % 2) - 0.5) * np.pi) * 4.0
    prof_x = np.cos(((xx % 2) - 0.5) * np.pi) * 4.0
    profile = np.where(weft_top, prof_y, prof_x)
    fiber = rng.normal(0, 3.0, (SIZE, SIZE))
    arr = np.clip(base + shade + profile + fiber, 0, 255).astype(np.uint8)
    tile = Image.fromarray(arr, "L").filter(ImageFilter.GaussianBlur(0.3))
    return adjust(tile, 214, 1.15)


save(gen_linen(), "linen")

# ---- cotton: stronger flat-field + mirror tile (same as watercolor) ----
def mirror_tile(patch):
    half = patch.resize((SIZE // 2, SIZE // 2), Image.LANCZOS)
    tile = Image.new("L", (SIZE, SIZE))
    tile.paste(half, (0, 0))
    tile.paste(ImageOps.mirror(half), (SIZE // 2, 0))
    tile.paste(half.rotate(180), (0, SIZE // 2))
    tile.paste(ImageOps.mirror(half.rotate(180)), (SIZE // 2, SIZE // 2))
    return tile


src_b = Image.open(os.path.join(CAND, "watercolor-b.jpg")).convert("L")
patch = src_b.crop((300, 500, 300 + 1100, 500 + 1100))
patch = patch.filter(ImageFilter.GaussianBlur(0.6))
patch = flat_field(patch, blur_ratio=0.3, target_mean=222)
patch = mirror_tile(patch)
save(adjust(patch, 222, 0.8), "cotton", quality=92)

print("done")
