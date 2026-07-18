"""Fix round 2: regenerate watercolor.jpg and cotton.jpg with seam-free mirror tiling.

v1 mirror_tile duplicated the axis row/column (row 255 == row 256 etc.),
producing a straight full-width line on the ticket. v2 builds the half patch
at 257px and crops each quadrant so mirror joins read adjacent pixels and all
four outer edges wrap continuously.
"""
import io
import json
import os
import time
import urllib.parse
import urllib.request

from PIL import Image, ImageChops, ImageFilter, ImageOps

HERE = os.path.dirname(os.path.abspath(__file__))
CAND = os.path.join(HERE, "candidates")
OUT = os.path.join(HERE, "..", "..", "src", "assets", "textures")
os.makedirs(CAND, exist_ok=True)
SIZE = 512
UA = {"User-Agent": "travel-ticket-texture-fetch/1.0 (contact: localdev)"}

SOURCES = {
    "watercolor-a": "File:Papier aquarelle 100% coton, grain fin.png",
    "watercolor-b": "File:Papier aquarelle en cellulose.png",
}


def ensure_source(name, title):
    path = os.path.join(CAND, f"{name}.jpg")
    if os.path.exists(path):
        return path
    params = {"action": "query", "titles": title, "prop": "imageinfo",
              "iiprop": "url", "format": "json"}
    url = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=40) as resp:
        data = json.load(resp)
    file_url = None
    for p in data["query"]["pages"].values():
        file_url = p["imageinfo"][0]["url"]
    time.sleep(4)
    req = urllib.request.Request(file_url, headers=UA)
    with urllib.request.urlopen(req, timeout=120) as resp:
        blob = resp.read()
    img = Image.open(io.BytesIO(blob))
    img.load()
    img.convert("RGB").save(path, quality=88)
    print(f"downloaded {title}")
    time.sleep(4)
    return path


def flat_field(patch, blur_ratio, target_mean):
    radius = max(8, int(min(patch.size) * blur_ratio))
    bg = patch.filter(ImageFilter.GaussianBlur(radius))
    return ImageChops.subtract(patch, bg, scale=1.0, offset=target_mean)


def mirror_tile(patch):
    """Seam-free 2x2 mirror: half at 257px, quadrants cropped so no axis
    row/column is duplicated and every outer edge wraps to its neighbour."""
    H = SIZE // 2
    half = patch.resize((H + 1, H + 1), Image.LANCZOS)
    tl = half.crop((0, 0, H, H))
    tr = ImageOps.mirror(half).crop((0, 0, H, H))
    rot = half.rotate(180)
    bl = rot.crop((0, 0, H, H))
    br = ImageOps.mirror(rot).crop((0, 0, H, H))
    tile = Image.new("L", (SIZE, SIZE))
    tile.paste(tl, (0, 0))
    tile.paste(tr, (H, 0))
    tile.paste(bl, (0, H))
    tile.paste(br, (H, H))
    return tile


def adjust(tile, target_mean, contrast):
    if contrast != 1.0:
        tile = tile.point(lambda i: max(0, min(255, int(128 + (i - 128) * contrast))))
    hist = tile.histogram()
    mean = sum(i * c for i, c in enumerate(hist)) / sum(hist)
    delta = int(target_mean - mean)
    return tile.point(lambda i: max(0, min(255, i + delta)))


def save(tile, name, quality=90):
    path = os.path.join(OUT, f"{name}.jpg")
    tile.save(path, quality=quality)
    print(f"{name}: {os.path.getsize(path)//1024} KB")


# ---- watercolor ----
path_a = ensure_source("watercolor-a", SOURCES["watercolor-a"])
src_a = Image.open(path_a).convert("L")
patch = src_a.crop((60, 60, 60 + 1000, 60 + 1000))
patch = patch.filter(ImageFilter.MedianFilter(5))
patch = flat_field(patch, 0.15, 205)
save(adjust(mirror_tile(patch), 205, 1.15), "watercolor")

# ---- cotton ----
path_b = ensure_source("watercolor-b", SOURCES["watercolor-b"])
src_b = Image.open(path_b).convert("L")
patch = src_b.crop((300, 500, 300 + 1100, 500 + 1100))
patch = patch.filter(ImageFilter.GaussianBlur(0.6))
patch = flat_field(patch, 0.3, 222)
save(adjust(mirror_tile(patch), 222, 0.8), "cotton", quality=92)

print("done")
