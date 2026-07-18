"""Round 2: slow, polite search for linen and parchment textures on Commons."""
import io
import json
import os
import time
import urllib.parse
import urllib.request

from PIL import Image

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "candidates")
os.makedirs(OUT, exist_ok=True)
UA = {"User-Agent": "travel-ticket-texture-fetch/1.0 (contact: localdev)"}
ALLOWED = ("cc0", "public domain", "no restrictions", "pd")

SEARCHES = {
    "linen": ["linen fabric texture white", "linen texture beige", "leinen stoff textur"],
    "parchment": ["parchment texture", "vellum texture", "pergament textur"],
}


def api(params, retries=3):
    params = dict(params, format="json")
    url = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(params)
    for i in range(retries):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=40) as resp:
                return json.load(resp)
        except Exception as e:
            print(f"  api retry {i+1}: {e}")
            time.sleep(6 * (i + 1))
    return {}


def search(query, limit=15):
    d = api({"action": "query", "generator": "search", "gsrsearch": query,
             "gsrnamespace": "6", "gsrlimit": str(limit),
             "prop": "imageinfo", "iiprop": "url|size|extmetadata"})
    time.sleep(3)
    out = []
    for p in d.get("query", {}).get("pages", {}).values():
        info = (p.get("imageinfo") or [{}])[0]
        meta = info.get("extmetadata", {})
        out.append({
            "title": p.get("title", ""),
            "url": info.get("url", ""),
            "width": info.get("width", 0),
            "height": info.get("height", 0),
            "license": meta.get("LicenseShortName", {}).get("value", ""),
        })
    return out


def download(info, name, retries=3):
    for i in range(retries):
        try:
            req = urllib.request.Request(info["url"], headers=UA)
            with urllib.request.urlopen(req, timeout=120) as resp:
                blob = resp.read()
            img = Image.open(io.BytesIO(blob))
            img.load()
            path = os.path.join(OUT, f"{name}.jpg")
            img.convert("RGB").save(path, quality=88)
            print(f"saved {name}: {info['title']} | {info['license']} | {info['width']}x{info['height']}")
            return True
        except Exception as e:
            print(f"  dl retry {i+1} for {name}: {e}")
            time.sleep(8 * (i + 1))
    return False


for kind, queries in SEARCHES.items():
    n = 0
    for q in queries:
        if n >= 3:
            break
        print(f"[{kind}] search: {q}")
        for r in search(q):
            if n >= 3:
                break
            lic = r["license"].lower()
            if not any(a in lic for a in ALLOWED):
                continue
            if min(r["width"], r["height"]) < 700:
                continue
            if not r["url"].lower().endswith((".jpg", ".jpeg", ".png")):
                continue
            if download(r, f"{kind}-{n}"):
                n += 1
            time.sleep(4)
print("done")
