# Estudio de video · plan (21-oct-2026)

Objetivo: un cerebro de edición único (herramientas + biblioteca de sonido + música + kit visual + reglas) que sirva
para los clientes (Neisstech, Howden, Delta Force) y para los orgánicos diarios de la marca personal de Max en
TikTok e Instagram. Max graba de 1 a 2 min con lo que se le pide; sale un video que no suelta al espectador.

Estado: **plan, esperando OK de Max y 3 respuestas** (ver al final). Nada ejecutado.

## Lo que ya existe (se parte de acá, no se rehace)
- Motor Swift de Neisstech: `neisstech-safetygate/herramientas/` (motor, png2mov, mezcla, hoja, recorte, transcribir, pausas, ritmo…).
- Motor de Howden: `howden-capsulas/herramientas/` (capsula, aislar = aislamiento de voz de Apple, audio.py, png2hevc, vista).
- Gráficos HTML/SVG → PNG → HEVC con alfa (`graficos/*.mjs`). Persona recortada con Vision y texto detrás de ella.
- Sonido: 18 efectos de Mixkit + `sonido/pixabay.mjs` (descargador) + `sonido/analizar.py` (BPM, brillo, energía).
- Reglas: `neisstech-safetygate/ESTILO-VIDEO.md`, `howden-capsulas/README.md`, notas de feedback de cada marca.

## E0 · Unificar el cerebro
- `estudio-video/herramientas/`: una sola copia de las herramientas de las dos marcas (las marcas las llaman desde acá).
- Skill `editor-video`: cómo se edita (ritmo, capas, audio, entrega), las reglas por marca y los errores acumulados.
  Las guías de cada marca siguen vivas, y la skill las enlaza.

## E1 · Biblioteca de sonido (meta: ~5.000 sonidos curados, no 200 GB crudos)
Fuentes con licencia comercial y sin atribución obligatoria:
- **Sonniss GDC 2026** (~7,5 GB, 17 estudios) + selección del archivo 2015–2024 por categoría (UI, whoosh, impactos, foley, humanos).
- **Kenney** (CC0): packs de interfaz, clics, botones, notificaciones.
- **Mixkit** y **Pixabay SFX** (ya se usan).
- **Freesound** solo CC0 (se necesita API key gratis).
- **ElevenLabs Sound Effects**: se genera lo que falte y los sonidos de marca de Max.
- **Síntesis propia** (numpy): pops, ticks, risers y bips afinados a la tonalidad y BPM de la canción del video.
- Fuera: BBC (no comercial) y Zapsplat gratis (exige créditos).

Proceso por sonido:
- Recortar el silencio.
- Marcar el **punto de golpe**, para que el sonido caiga justo en el corte o el zoom.
- Medir duración, LUFS, pico, brillo y graves.
- Etiquetar y guardar comprimido sin pérdida (ALAC).

Catálogo SQLite + `sonido buscar "whoosh corto grave"` + una página para escuchar donde Max marca ⭐ y ❌: eso enseña su gusto.

Categorías (~40):
- **Transiciones:** whoosh, swipe, riser, downlifter, reversa, cinta.
- **Impactos:** hit, boom, sub drop, braam, golpe seco.
- **Interfaz:** clic, tap, toggle, pop, burbuja, teclado, mouse, notificación, obturador, caja registradora.
- **Texto:** máquina de escribir, ding, pop por palabra.
- **Digital:** glitch, estática, data, escaneo.
- **Foley:** papel, cierre, puerta, vidrio, café, pasos.
- **Humanos:** risa, «ooh», gasp, aplausos, público.
- **Meme / comedia:** recreados con ElevenLabs, nunca los originales con derechos.
- **Ambientes:** oficina, ciudad, café, lluvia.
- **Tensión:** latido, reloj, drone, pulso.
- **Dinero, éxito y error:** monedas, «ding» de logro, buzzer.

## E2 · Música (tres carriles)
1. **Tendencia dentro de la app** (canciones populares). La canción NO se quema en el mp4: se exporta sin música
   (o con pista guía) y Max agrega el sonido dentro de TikTok/IG en el segundo que le indico. Yo edito los cortes
   al BPM de esa canción. Radar semanal de sonidos en tendencia en Chile (TikTok Creative Center).
   ⚠️ Solo sirve si la cuenta es **personal/creador**. En una cuenta de **empresa**, TikTok e IG limitan a la
   biblioteca comercial (y si se nota, silencian el audio o bajan el alcance).
2. **Banco propio libre** (Pixabay, Mixkit, YouTube Audio Library), por ánimo, BPM y energía, para cuando se quiere
   controlar la mezcla, o el video va como anuncio.
3. **Firma sonora de Max**: 3–5 sonidos propios (intro, transición, cierre) generados y fijos.

## E3 · Kit visual «marca Max» (guion visual primero, skill `guion-visual`)
- Paleta y tipografía propias. Hay 6 estilos de subtítulo animado (palabra activa, palabra clave gigante, karaoke,
  apilado, texto detrás de la persona y texto a mano).
- Zoom punch, paneo de impacto y sacudida al golpe.
- Persona recortada con fondos vivos, b-roll y capturas de pantalla.
- Flechas, contadores, barras de progreso, stickers y emojis animados.
- Viñetas de capítulo.

## E4 · Tubería «dejo el video y sale listo»
1. Carpeta de entrada.
2. Transcribir.
3. Cortar silencios (≤ 0,15 s) y muletillas.
4. **Mapa de ritmo**: un evento cada 1,5–3 s (corte, zoom, gráfico, sonido, cambio de subtítulo).
   El gancho de 0–3 s lleva movimiento + texto + sonido.
5. Render sin Resolve (como Neisstech v3).
6. Revisión con `hoja` de 64 cuadros.
7. Entrega: 9:16 + portada + texto del post + hashtags + el sonido sugerido con su segundo de inicio.
RAM con vigilante y solo los finales en disco (reglas Howden).

## E5 · Ideas diarias
Calendario de 30 días por pilares, con el guion de grabación de cada día (qué decir, gancho exacto, toma, duración).
Guía de grabación única: micrófono de solapa, luz, fondo y encuadre con aire para el texto.

## E6 · Aprender
Retención por segundo (TikTok/IG insights) cada semana → qué gancho, ritmo y sonido funcionan → al cerebro.

## Preguntas que solo Max sabe
1. ¿De qué va la marca personal y a quién quiere atraer?
2. ¿La cuenta de TikTok/IG es personal/creador o de empresa?
3. ¿Esto va en el Mac (lo cuento como trabajo de Cóndor) o en el PC?
