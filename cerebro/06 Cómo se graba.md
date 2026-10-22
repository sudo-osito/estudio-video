# Cómo se graba (formato de cada guion)

Cada párrafo (`beats[]`) dice **cómo se graba**, para que Max sepa exactamente qué grabar, qué decir y qué hacer.

| `modo` | En la página | Qué hace Max |
|---|---|---|
| `camara` | A cámara | Se graba diciéndolo, mirando al lente. `hace` = el gesto o la acción. |
| `voz` | Voz en off | Solo graba la voz (Notas de voz, a un palmo, sin eco). `ve` = lo que se ve encima: lo graba aparte. |
| `pantalla` | Voz + pantalla | Voz en off sobre una grabación de pantalla. `ve` = qué grabar en la pantalla y cómo. |
| `escena` | Sin hablar | Actúa sin decir nada. `dice` va entre paréntesis; `hace` explica la acción. |

Campos de cada párrafo: `t` (etiqueta), `modo`, `dice`, `hace`, `ve`, `plano`, `seg` (segundos fijos, opcional).
Campos del video: `recursos[{que, detalle}]` = lo que Max tiene que mandar (datos reales, capturas, archivos).

## Reglas
- **Cero trabajo extra para Max.** Solo se le pide grabar lo que ya está pasando (su día, su pantalla, su voz).
  Lo que yo puedo capturar o generar (la edición en marcha, gráficos, pantallas del sistema) lo hago yo: en `ve` se
  escribe «lo grabo yo» y no se le pide a Max.
- **El gancho es siempre el párrafo 1** y casi siempre `camara` (la cara engancha más que una pantalla).
- **Un párrafo `camara` cada 2–3 párrafos** como máximo de distancia: si no, se pierde la persona.
- **Usar `voz`/`pantalla` donde Max tendría que leer algo largo o mostrar algo:** así no se nota la lectura
  (regla de todos los videos: que no se note que lee; los textos nunca tapan la cara).
- **`ve` siempre concreto:** qué, desde dónde, cuántos segundos. «B-roll de la oficina» no sirve; «tus manos escribiendo
  en el teclado, de cerca, 5 s» sí.
- **Cada [corchete] del guion tiene un `recurso`** que le pida ese dato a Max.
- Lo que no es de un párrafo (detalles, ambiente) va en `broll`. Reacciones y 10 s de silencio los agrega la página sola.

## Lo que la página arma sola con esto
- Guion: cada párrafo con su modo, lo que dice, lo que hace y lo que se ve.
- Material: la lista de grabación por orden (1 a cámara, 2 voz en off, 3 lo que va encima, aparte, mándame).
- Teleprompter: filtro «A cámara» / «Voz en off» para grabar cada tanda de corrido.
