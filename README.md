# Estudio de video

Calendario de orgánicos de Max (TikTok + Instagram), subida del material y cerebro de edición.

- `web/` — la página (GitHub Pages): calendario, guion con teleprompter, subida por trozos, «Listo para editar», entrega.
- `worker/` — API en Cloudflare (D1 = calendario, R2 = material) + MCP en `/mcp` para Claude. Misma llave `es_…`.
- `cerebro/` — **leer antes de escribir guiones**: quién es Max hoy, narrativa, audiencia, pilares, voz, cómo se graba, reglas, datos reales (se abre como vault de Obsidian).
- `semillas/` — tandas de ideas: `sembrar.mjs` carga las nuevas, `actualizar.mjs` reescribe las que ya existen. `guiones-v2.py` genera la tanda 1 con modo por párrafo.
- `herramientas/subir.mjs` — sube la entrega editada al video.
- `PLAN.md` — el plan del cerebro de video (biblioteca de sonido, música, kit visual, tubería).

## Flujo
1. Max abre la página, ve qué toca grabar, graba (teleprompter en la página) y sube las tomas.
2. Aprieta «Listo para editar» (con nota opcional).
3. Claude: `pendientes` → `enlace_descarga` → edita → `subir.mjs <id> video.mp4 entrega` → `editar_video` con el post → estado `entregado`.
4. Max descarga, agrega el sonido en la app, publica y marca «Ya lo publiqué».

## Local
```
cd worker && npm i && npm run migrar:local && npm run dev   # API en :8787
cd web && python3 -m http.server 8790                       # página en :8790
```
