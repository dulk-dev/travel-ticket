"""Search Wikimedia Commons for CC0/PD paper textures, download and process
into 512x512 grayscale seamless tiles for the travel-ticket project."""
import io
import json
import math
import os
import random
import urllib.parse
import urllib.request

OUT_RAW = os.path.dirname(os.path.abspath(__file__))
OUT_TILES = os.path.join(OUT_RAW, "..", "..", "src", "assets", "textures")
os.makedirs(OUT_TILES, exist_ok=True)

from PIL import Image, ImageFilter, ImageOps

UA = {"User-Agent": "travel-ticket-texture-fetch/1.0 (local dev asset prep)"}

# paper type -> list of Commons search queries (tried in order)
QUERIES = {
    "watercolor": ["watercolor paper texture", "watercolour paper texture"],
    "linen": ["laid paper texture", "linen paper texture", "canvas texture"],
    "cotton": ["cotton paper texture", "white paper texture"],
    "pearl": ["pearl paper texture", "satin paper texture", "metallic paper texture"],
    "parchment": ["parchment texture", "parchment paper texture", "old parchment"],
}

ALLOWED_LICENSES = ("cc0", "public domain", "cc-pd-mark", "pd")


def commons_search(query, limit=20):
    params = {
        "action": "query",
        "generator": "search",
        "gsrsearch": query,
        "gsrnamespace": "6",
        "gsrlimit": str(limit),
        "prop": "imageinfo",
        "iiprop": "url|size|extmetadata",
        "format": "json",
    }
    url = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.load(resp)
    pages = data.get("query", {}).get("pages", {})
    results = []
    for page in pages.values():
        info = (page.get("imageinfo") or [{}])[0]
        meta = info.get("extmetadata", {})
        lic = meta.get("LicenseShortName", {}).get("value", "")
        results.append({
            "title": page.get("title", ""),
            "url": info.get("url", ""),
            "width": info.get("width", 0),
            "height": info.get("height", 0),
            "license": lic,
        })
    return results


def pick_and_download(name):
    for query in QUERIES[name]:
        try:
            results = commons_search(query)
        except Exception as e:
            print(f"[{name}] search failed for '{query}': {e}")
            continue
        for r in results:
            lic = r["license"].lower()
            if not any(a in lic for a in ALLOWED_LICENSES):
                continue
            if min(r["width"], r["height"]) < 600:
                continue
            if not r["url"].lower().endswith((".jpg", ".jpeg", ".png")):
                continue
            try:
                req = urllib.request.Request(r["url"], headers=UA)
                with urllib.request.urlopen(req, timeout=60) as resp:
                    blob = resp.read()
                img = Image.open(io.BytesIO(blob))
                img.load()
                print(f"[{name}] OK '{query}' -> {r['title']} ({r['license']}, {r['width']}x{r['height']})")
                raw_path = os.path.join(OUT_RAW, f"{name}-raw.jpg")
                img.convert("RGB").save(raw_path, quality=90)
                return img.convert("L")
            except Exception as e:
                print(f"[{name}] download failed {r['title']}: {e}")
                continue
        print(f"[{name}] no CC0/PD hit for '{query}'")
    return None


def seamless_tile(gray, size=512, target_mean=215, contrast=1.0):
    """Center-crop square, mirror 2x2 for seamlessness, normalize brightness."""
    w, h = gray.size
    side = min(w, h)
    left = (w - side) // 2
    top = (h - side) // 2
    patch = gray.crop((left, top, left + side, top + side)).resize((size // 2, size // 2), Image.LANCZOS)
    tile = Image.new("L", (size, size))
    tile.paste(patch, (0, 0))
    tile.paste(ImageOps.mirror(patch), (size // 2, 0))
    tile.paste(ImageOps.flip(patch), (0, size // 2))
    tile.paste(ImageOps.flip(ImageOps.mirror(patch)), (size // 2, size // 2))
    if contrast != 1.0:
        lut = [max(0, min(255, int(128 + (i - 128) * contrast))) for i in range(256)]
        tile = tile.point(lut)
    # normalize mean brightness so multiply-bake does not darken too much
    hist = tile.histogram()
    total = sum(hist)
    mean = sum(i * c for i, c in enumerate(hist)) / total
    delta = target_mean - mean
    tile = tile.point(lambda i: max(0, min(255, i + int(delta))))
    return tile


def procedural_pearl(size=512):
    """Fallback for pearl paper: ultra-smooth fine grain."""
    random.seed(7)
    noise = Image.effect_noise((size, size), 24)
    noise = noise.filter(ImageFilter.GaussianBlur(1.2))
    return noise.point(lambda i: max(0, min(255, int(235 + (i - 128) * 0.25))))


SETTINGS = {  # target_mean, contrast per paper type
    "watercolor": (208, 1.15),
    "linen": (212, 1.1),
    "cotton": (218, 0.9),
    "pearl": (224, 0.8),
    "parchment": (205, 1.1),
}

for name in QUERIES:
    gray = pick_and_download(name)
    mean, contrast = SETTINGS[name]
    if gray is None:
        if name == "pearl":
            print("[pearl] using procedural fine grain fallback")
            tile = procedural_pearl()
        else:
            print(f"[{name}] FAILED - no source found")
            continue
    else:
        tile = seamless_tile(gray, 512, mean, contrast)
    out = os.path.join(OUT_TILES, f"{name}.jpg")
    tile.save(out, quality=88)
    print(f"[{name}] saved {out} ({os.path.getsize(out)//1024} KB)")

print("done")
