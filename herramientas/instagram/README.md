# Referencias desde Instagram

Max guarda reels de referencia en su colección «para claude» (cuenta breiko.god). Para bajarlos y analizarlos:

```
python3 herramientas/instagram/sesion.py                       # sesión desde el perfil de Firefox dedicado
node herramientas/instagram/coleccion.mjs .perfil-instagram/estado.json /breiko.god/saved/para-claude/1144094574939694/ referencias/para-claude/lista.json
node herramientas/instagram/bajar.mjs .perfil-instagram/estado.json referencias/para-claude/lista.json referencias/para-claude
swiftc -O -o /tmp/analizar herramientas/analizar-video.swift && /tmp/analizar referencias/para-claude/<código>.mp4 referencias/para-claude/analisis/<código>
```
Las rutas de Playwright apuntan al Chromium de `medula-mac/.pruebas-tmp/pw`. Todo corre sin ventanas.
Otras colecciones de Max: «video editing», «marketing», «apps», «business», «médula?», «mishh».
