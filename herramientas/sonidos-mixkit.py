#!/usr/bin/env python3
"""uso: python3 herramientas/sonidos-mixkit.py categoria [categoria…]   (ej. whoosh transition cinematic ambience)
Baja los efectos de las páginas de categoría de Mixkit (licencia Mixkit: gratis, comercial, sin atribución) a
biblioteca/sonidos/mixkit/<categoria>/ con su título como nombre ("Titulo - 1234.mp3"), para que el catálogo los
encuentre por palabras. Pausa entre descargas: Mixkit responde 429 si se va rápido. Renombra los que ya estaban
bajados solo con número."""
import pathlib, re, sys, time, urllib.request

BASE = pathlib.Path(__file__).resolve().parent.parent / "biblioteca/sonidos/mixkit"
UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36"}
patron = re.compile(r'preview-url-value="(https://assets\.mixkit\.co/active_storage/sfx/(\d+)/\d+-preview\.mp3)".*?item-grid-card__title">\s*(.*?)\s*</h2>', re.S)

def bajar(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
        return r.read()

for cat in sys.argv[1:]:
    carpeta = BASE / cat
    carpeta.mkdir(parents=True, exist_ok=True)
    vistos = 0
    for pag in ("", "?page=2", "?page=3"):
        try:
            html = bajar(f"https://mixkit.co/free-sound-effects/{cat}/{pag}").decode("utf8", "ignore")
        except Exception as e:
            print(cat, pag, "error", e); break
        items = patron.findall(html)
        if not items: break
        for url, num, titulo in items:
            limpio = re.sub(r"[^\w áéíóúñÁÉÍÓÚÑ()-]+", "", titulo).strip()[:80] or "sin titulo"
            destino = carpeta / f"{limpio} - {num}.mp3"
            viejo = carpeta / f"mixkit-{num}.mp3"
            vistos += 1
            if destino.exists(): continue
            if viejo.exists(): viejo.rename(destino); continue
            try:
                destino.write_bytes(bajar(url)); time.sleep(1)
            except Exception as e:
                print("falló", titulo, e); time.sleep(5)
        time.sleep(3)
    print(f"{cat}: {len(list(carpeta.glob('*.mp3')))} archivos ({vistos} en las páginas)")
