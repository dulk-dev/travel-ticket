"""Download candidate textures from Wikimedia Commons for manual inspection."""
import io
import json
import os
import urllib.parse
import urllib.request

from PIL import Image

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "candidates")
os.makedirs(OUT, exist_ok=True)
UA = {"User-Agent": "travel-ticket-texture-fetch/1.0 (contact: localdev)"}

# direct known-good files + searches to explore
DIRECT = {
    "watercolor-a": "File:Papier aquarelle 100% coton, grain fin.png",
    "watercolor-b": "File:Papier aquarelle en cellulose.png",
}
SEARCHES = {
    "linen": ['incategory:"Linen"', 'incategory:"Fabric textures"', "linen fabric texture", "laid lines paper"],
    "parchment": ["vellum parchment texture", "parchment paper background", 'incategory:"Parchments"'],
    "cotton": ["handmade cotton paper texture", "white cardboard texture"],
}

ALLOWED = ("cc0", "public domain", "no restrictions", "pd")


def api(params):
    params = dict(params, format="json")
    url = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=40) as resp:
        return json.load(resp)


def resolve_title(title):
    d = api({"action": "query", "titles": title, "prop": "imageinfo",
             "iiprop": "url|size|extmetadata"})
    for p in d.get("query", {}).get("pages", {}).values():
        info = (p.get("imageinfo") or [{}])[0]
        meta = info.get("extmetadata", {})
        return {
            "title": p.get("title", title),
            "url": info.get("url", ""),
            "width": info.get("width", 0),
            "height": info.get("height", 0),
            "license": meta.get("LicenseShortName", {}).get("value", ""),
        }
    return None


def search(query, limit=12):
    d = api({"action": "query", "generator": "search", "gsrsearch": query,
             "gsrnamespace": "6", "gsrlimit": str(limit),
             "prop": "imageinfo", "iiprop": "url|size|extmetadata"})
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


def download(info, name):
    try:
        req = urllib.request.Request(info["url"], headers=UA)
        with urllib.request.urlopen(req, timeout=90) as resp:
            blob = resp.read()
        img = Image.open(io.BytesIO(blob))
        img.load()
        path = os.path.join(OUT, f"{name}.jpg")
        img.convert("RGB").save(path, quality=88)
        print(f"saved {name}: {info['title']} | {info['license']} | {info['width']}x{info['height']}")
        return True
    except Exception as e:
        print(f"FAIL {name} {info['title']}: {e}")
        return False


for name, title in DIRECT.items():
    info = resolve_title(title)
    if info:
        download(info, name)

seen = set()
for kind, queries in SEARCHES.items():
    n = 0
    for q in queries:
        if n >= 4:
            break
        try:
            results = search(q)
        except Exception as e:
            print(f"search fail {q}: {e}")
            continue
        for r in results:
            if n >= 4:
                break
            lic = r["license"].lower()
            if not any(a in lic for a in ALLOWED):
                continue
            if min(r["width"], r["height"]) < 700:
                continue
            if not r["url"].lower().endswith((".jpg", ".jpeg", ".png")):
                continue
            if r["url"] in seen:
                continue
            seen.add(r["url"])
            if download(r, f"{kind}-{n}"):
                n += 1
print("done")
