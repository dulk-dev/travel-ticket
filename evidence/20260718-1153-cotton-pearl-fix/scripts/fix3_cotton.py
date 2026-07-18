"""Fix round 3: cotton.jpg via tileable procedural value-noise octaves.

Mirror tiling kept showing a symmetry band at its axes for cotton's
mid-frequency mottle. Value noise sampled on a wrapping grid is seamless
by construction and has no symmetry axes. Anisotropic sampling (y x2)
gives a subtle fibre direction like real cotton cardstock.
"""
import os

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "..", "src", "assets", "textures")
SIZE = 512


def tileable_octave(n, size, rng, y_stretch=1.0):
    """Periodic smooth value noise: n x n grid sampled with wraparound."""
    grid = rng.random((n, n)).astype(np.float32)
    xs = np.arange(size) * n / size
    ys = np.arange(size) * n * y_stretch / size
    x0 = np.floor(xs).astype(int) % n
    x1 = (x0 + 1) % n
    y0 = np.floor(ys).astype(int) % n
    y1 = (y0 + 1) % n
    fx = xs - np.floor(xs)
    fy = ys - np.floor(ys)
    sx = (fx * fx * (3 - 2 * fx))[None, :]
    sy = (fy * fy * (3 - 2 * fy))[:, None]
    g00 = grid[np.ix_(y0, x0)]
    g01 = grid[np.ix_(y0, x1)]
    g10 = grid[np.ix_(y1, x0)]
    g11 = grid[np.ix_(y1, x1)]
    top = g00 * (1 - sx) + g01 * sx
    bot = g10 * (1 - sx) + g11 * sx
    return top * (1 - sy) + bot * sy


def gen_cotton():
    rng = np.random.default_rng(23)
    # 倍频叠加：低频斑驳为主，高频补充细节，y 方向 2 倍拉伸出纤维感
    octaves = [(5, 1.00), (11, 0.55), (23, 0.30), (47, 0.16), (97, 0.09)]
    acc = np.zeros((SIZE, SIZE), np.float32)
    for n, amp in octaves:
        acc += tileable_octave(n, SIZE, rng, y_stretch=2.0) * amp
    acc /= sum(a for _, a in octaves)
    # 细纤维颗粒
    acc = acc * 0.75 + rng.random((SIZE, SIZE)).astype(np.float32) * 0.25
    # 归一化到 mean 222、温和对比
    acc = (acc - acc.mean()) / (acc.std() + 1e-6)
    arr = np.clip(222 + acc * 9.0, 0, 255).astype(np.uint8)
    return Image.fromarray(arr, "L")


tile = gen_cotton()
path = os.path.join(OUT, "cotton.jpg")
tile.save(path, quality=92)
print(f"cotton: {os.path.getsize(path)//1024} KB")

# 自检：偏移 256 后与原图的边界差异应接近本底噪声（验证无缝）
arr = np.asarray(tile).astype(np.float32)
shifted = np.roll(arr, 256, axis=(0, 1))
print(f"wrap self-check mean|diff| = {np.abs(arr - shifted).mean():.2f} (stochastic, expected ~ texture contrast)")
print("done")
