#!/usr/bin/env python3
"""Copia la sesión de Instagram del perfil de Firefox dedicado (.perfil-instagram, fuera de git) a estado.json para
Playwright. Max inicia sesión UNA vez en ese perfil (firefox -profile .perfil-instagram -no-remote); la sesión dura meses."""
import json, pathlib, shutil, sqlite3, tempfile
P = pathlib.Path(__file__).resolve().parents[2] / ".perfil-instagram"
tmp = pathlib.Path(tempfile.mkdtemp())
for f in P.glob("cookies.sqlite*"): shutil.copy(f, tmp / f.name)
filas = sqlite3.connect(tmp / "cookies.sqlite").execute("SELECT name,value,host,path,expiry,isSecure,isHttpOnly,sameSite FROM moz_cookies WHERE host LIKE '%instagram.com'").fetchall()
ss = {0: "None", 1: "Lax", 2: "Strict"}
cookies = [{"name": n, "value": v, "domain": h, "path": p, "expires": (e / 1000 if e > 1e11 else e) or -1, "secure": bool(s), "httpOnly": bool(ho), "sameSite": ss.get(sa, "Lax")} for n, v, h, p, e, s, ho, sa in filas]
(P / "estado.json").write_text(json.dumps({"cookies": cookies, "origins": []}))
print("sesión:", "OK" if any(c["name"] == "sessionid" for c in cookies) else "SIN SESIÓN (Max debe iniciar sesión en el perfil)")
