"""Dessine les icônes de Lemezec (dégradé des tokens + « L » en formes simples, sans police).

usage : python -I scripts/make-icons.py      (nécessite Pillow)
Sorties : public/icons/*.png, app/icon.png (favicon), app/apple-icon.png
"""
import json, os
from PIL import Image, ImageDraw

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
tokens = json.load(open(os.path.join(root, "..", "replica", "design", "tokens.json"), encoding="utf-8"))
c1 = tokens["color"]["gradient-from"]; c2 = tokens["color"]["gradient-to"]; white = tokens["color"]["on-gradient"]
rgb = lambda h: tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))

def draw(size, safe=0.8, rounded=True):
    S = size * 4  # dessin en grand puis réduit : bords lisses
    grad = Image.new("RGB", (S, S))
    a, b = rgb(c1), rgb(c2)
    px = grad.load()  # dégradé diagonal, comme bg-app-gradient
    for y in range(S):
        for x in range(0, S, 4):
            t = (x + y) / (2 * (S - 1))
            col = tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))
            for dx in range(4):
                if x + dx < S: px[x + dx, y] = col
    mask = Image.new("L", (S, S), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, S - 1, S - 1], radius=S * 0.22 if rounded else 0, fill=255)
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    img.paste(grad, (0, 0), mask)
    d = ImageDraw.Draw(img)
    # « L » dans la zone sûre (80 % pour les icônes masquables)
    box = S * safe
    o = (S - box) / 2
    w = box * 0.17                 # épaisseur du trait
    lx, top, bottom = o + box * 0.30, o + box * 0.16, o + box * 0.80
    right = o + box * 0.72
    d.rounded_rectangle([lx, top, lx + w, bottom], radius=w * 0.35, fill=white)
    d.rounded_rectangle([lx, bottom - w, right, bottom], radius=w * 0.35, fill=white)
    # point d'interrogation discret : le mot à deviner
    r = w * 0.55
    cx, cy = right - r * 0.2, top + r * 1.2
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=white)
    return img.resize((size, size), Image.LANCZOS)

os.makedirs(os.path.join(root, "public", "icons"), exist_ok=True)
draw(192).save(os.path.join(root, "public", "icons", "icon-192.png"))
draw(512).save(os.path.join(root, "public", "icons", "icon-512.png"))
# masquable : plein cadre (le système découpe la forme), contenu dans la zone sûre
draw(512, safe=0.62, rounded=False).save(os.path.join(root, "public", "icons", "icon-512-maskable.png"))
# iOS : opaque, sans coins arrondis (iOS les arrondit lui-même)
draw(180, safe=0.8, rounded=False).convert("RGB").save(os.path.join(root, "app", "apple-icon.png"))
draw(64).save(os.path.join(root, "app", "icon.png"))

# image de partage (1200×630) : dégradé, icône, nom, accroche. Police Aileron fournie par Pillow (domaine public).
from PIL import ImageFont
W, H = 1200, 630
og = Image.new("RGB", (W, H))
p = og.load()
a, b = rgb(c1), rgb(c2)
for y in range(H):
    for x in range(W):
        t = (x / W + y / H) / 2
        p[x, y] = tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))
logo = draw(260)
og.paste(logo, (110, (H - 260) // 2), logo)
d = ImageDraw.Draw(og)
d.text((420, 190), "Lemezec", font=ImageFont.load_default(size=118), fill=white)
d.text((424, 340), "Le jeu des mots rares", font=ImageFont.load_default(size=46), fill=white)
# la police intégrée n'a pas les lettres accentuées : texte choisi sans accent
d.text((424, 404), "Devinez le sens. Un seul smartphone pour tous.", font=ImageFont.load_default(size=34), fill=rgb(tokens["color"]["on-gradient-muted"]))
og.save(os.path.join(root, "app", "opengraph-image.png"))
print("icônes et image de partage écrites")
