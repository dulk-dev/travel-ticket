"""Produce final 512x512 grayscale seamless tiles (v2).

Fixes from v1: flat-field correction (removes large-scale brightness gradient
that caused seam bands), median filter (removes specks), parchment blotches
applied after tiling.
"""
import os
import random

from PIL import Image, ImageDraw, ImageFilter, ImageOps, ImageChops

HERE = os.path.dirname(os.path.abspath(__file__))
CAND = os.path.join(HERE, "candidates")
OUT = os.path.join(HERE, "..", "..", "src", "assets", "textures")
SIZE = 512


def flat_field(patch, blur_ratio=0.15, target_mean=216):
    """Remove large-scale lighting gradient, keep only grain."""
    radius = max(8, int(min(patch.size) * blur_ratio))
    bg = patch.filter(ImageFilter.GaussianBlur(radius))
    flat = ImageChops.subtract(patch, bg, scale=1.0, offset=target_mean)
    return flat


def mirror_tile(patch):
    half = patch.resize((SIZE // 2, SIZE // 2), Image.LANCZOS)
    tile = Image.new("L", (SIZE, SIZE))
    tile.paste(half, (0, 0))
    tile.paste(ImageOps.mirror(half), (SIZE // 2, 0))
    # 下半部分用旋转 180 而非翻转，降低镜像对称感
    tile.paste(half.rotate(180), (0, SIZE // 2))
    tile.paste(ImageOps.mirror(half.rotate(180)), (SIZE // 2, SIZE // 2))
    return tile


def adjust(tile, target_mean, contrast):
    if contrast != 1.0:
        tile = tile.point(lambda i: max(0, min(255, int(128 + (i - 128) * contrast))))
    hist = tile.histogram()
    mean = sum(i * c for i, c in enumerate(hist)) / sum(hist)
    delta = int(target_mean - mean)
    return tile.point(lambda i: max(0, min(255, i + delta)))


def save(tile, name):
    path = os.path.join(OUT, f"{name}.jpg")
    tile.save(path, quality=88)
    print(f"{name}: {os.path.getsize(path)//1024} KB")


# ---- watercolor: CC0 cotton watercolor paper scan ----
src_a = Image.open(os.path.join(CAND, "watercolor-a.jpg")).convert("L")
patch = src_a.crop((60, 60, 60 + 1000, 60 + 1000))
patch = patch.filter(ImageFilter.MedianFilter(5))  # 去黑点杂质
patch = flat_field(patch, target_mean=205)
save(adjust(mirror_tile(patch), 205, 1.15), "watercolor")

# ---- cotton: CC0 cellulose watercolor paper scan (fine fibre) ----
src_b = Image.open(os.path.join(CAND, "watercolor-b.jpg")).convert("L")
patch = src_b.crop((300, 500, 300 + 1100, 500 + 1100)).filter(ImageFilter.GaussianBlur(0.6))
patch = flat_field(patch, target_mean=222)
save(adjust(mirror_tile(patch), 222, 0.85), "cotton")

# ---- parchment: 同一块洁净纸面旋转 90°，叠加更强的低频斑驳 ----
random.seed(42)
patch = src_a.crop((60, 60, 60 + 1000, 60 + 1000)).rotate(90)
patch = patch.filter(ImageFilter.MedianFilter(5))
patch = flat_field(patch, target_mean=210)
base = mirror_tile(patch)
blotch = Image.effect_noise((48, 48), 70).resize((SIZE, SIZE), Image.BICUBIC)
blotch = blotch.filter(ImageFilter.GaussianBlur(8))
parchment = Image.blend(base, blotch, 0.40)
save(adjust(parchment, 200, 1.05), "parchment")

# ---- linen: procedural laid crosshatch ----
random.seed(11)
linen = Image.new("L", (SIZE, SIZE), 228)
draw = ImageDraw.Draw(linen)
for y in range(0, SIZE, 3):
    shade = random.randint(196, 210)
    draw.line([(0, y), (SIZE, y)], fill=shade, width=1)
for x in range(0, SIZE, 24):
    draw.line([(x, 0), (x, SIZE)], fill=200, width=1)
noise = Image.effect_noise((SIZE, SIZE), 14)
linen = Image.blend(linen, noise, 0.08)
linen = linen.filter(ImageFilter.GaussianBlur(0.4))
save(adjust(linen, 214, 1.0), "linen")

print("done")
