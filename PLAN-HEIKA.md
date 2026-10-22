# Heika: plan de mejoramiento (22-oct-2026)

La idea que ordena todo: **grabar tiene que costar lo menos posible.**
Max llega, abre Heika, habla y se va. Todo lo demás (qué toma es cuál, subir, avisar, ordenar) lo hace la app o Claude.

Hecho hoy: el teleprompter muestra **solo lo que se dice** (commit `80f67a6`).

---

## H1 · Heika como app del Mac
- **Cómo:** una app nativa en SwiftUI que muestra la misma página dentro (WKWebView). El diseño y la lógica siguen siendo uno solo.
  - En el celular sigue funcionando la página web.
  - Se compila con `swiftc`, que ya está en el Mac: no hace falta instalar Xcode.
- **Al abrir:** una animación nativa de ~1,2 s. La H se arma, la barra con el degradado barre la pantalla y se convierte en la línea de tiempo de la app. Un clic la salta.
- **Ventana:** vidrio real de macOS (NSVisualEffectView) en la barra lateral y barra de título transparente.
  - Ícono en el Dock y en Aplicaciones.
  - Atajos: ⌘1 Calendario, ⌘2 Agenda, ⌘R Grabar, ⌘\ plegar.
- **Lo que la web no puede hacer:**
  - La subida corre en segundo plano y sigue aunque cierres la ventana. Se acaba el «no cierres esta pestaña».
  - La llave queda guardada en el Llavero de macOS.
  - La pantalla se mantiene encendida mientras grabas.
- **Depende de:** nada. Va primero.

## H2 · Teleprompter que te sigue la voz
- **Cómo:** el texto avanza **cuando tú hablas**, palabra por palabra, y se detiene cuando paras.
  - Usa el reconocimiento de voz de Apple (SpeechAnalyzer), que funciona sin internet y en español.
  - Se acaban el ritmo lento/normal/rápido y el «se me adelantó».
- **Si te equivocas:** cuando repites una frase, lo detecta, vuelve al inicio de la frase y anota «toma 2».
- **Si improvisas** algo que no está en el guion, espera y vuelve a seguirte cuando retomas.
- **Texto pegado al lente:** una columna angosta justo bajo la cámara, para que no se note que lees. La posición del lente se calibra una vez.
- **Invisible en grabaciones de pantalla:** la ventana del teleprompter no sale en lo que grabas (`sharingType = .none`). Sirve para los párrafos «Voz + pantalla».
- **Depende de:** H1.

## H3 · Marcas de toma + importación sola
- **Mapa de tomas:** mientras grabas con el iPhone, Heika anota en el Mac cuándo empezó y terminó cada párrafo, y qué frases repetiste.
  - Claude recibe ese mapa: «el gancho bueno es el de las 19:42:10».
  - Se acaba revisar 40 minutos de tomas para encontrar la buena.
- **Importación sola:** al terminar, Heika busca en Fotos (iCloud) los videos que grabaste durante la sesión y los sube solos.
  - Se acaba elegir archivos.
  - Después marca «listo para editar» con el mapa de tomas adjunto.
- **Grabar dentro de Heika (Continuity Camera):** queda solo para la voz en off y las tomas rápidas.
  - Continuity Camera llega a 1920×1440, no a 4K, así que las tomas principales siguen siendo con la cámara del iPhone.
- **Depende de:** H2, y de que R2 esté activo (hoy la subida responde 503).

## H4 · Antes de grabar, en 20 segundos
- **Sonido:** mide el micrófono y el ruido del lugar, y graba sola los 10 s de ambiente.
- **Avisos:** te avisa si hay eco o ruido.
- **Hora azul:** calcula a qué hora cae hoy la hora azul en Santiago, para la pieza del piso 15.
- **Lista:** de la lista «antes de grabar» quedan solo las 3 cosas que cambian ese día.

## H5 · Revisar la entrega como en Frame.io
- **Comentarios al segundo:** pones notas sobre el video editado en el segundo exacto («acá corta antes»).
- **A Claude:** las recibe por MCP y entrega la versión 2.
- **Versiones:** v1 y v2 lado a lado.

## H6 · Heika en la barra de menú
- **De un vistazo:** «Hoy grabas: El sistema que edita mis videos · hora azul 19:48».
- **Ideas al vuelo:** con ⌥Espacio desde cualquier app dictas una idea. Llega a la bandeja de ideas por MCP y Claude la convierte en guion.
- **Avisos:** cuando Claude entrega un video, te llega una notificación con el texto del post listo.

## H7 · Aprender de los resultados
- **Métricas:** de Instagram (cuenta creador, API Graph), y de TikTok si su API lo permite.
- **Retención sobre el guion:** la curva queda pegada a cada párrafo («aquí se fue el 30 %»).
- **Aprendizaje:** alimenta `11 Lo que voy aprendiendo de Max`, para que los guiones siguientes salgan mejores solos.

---

## Banco de ideas (para elegir)
- **Ensayo:** practicas una vez solo con la voz y te dice dónde te trabaste y si vas apurado.
- **Control remoto:** desde el iPhone o el Apple Watch, para pausar o volver sin pararte.
- **Un solo botón:** «Grabar ahora» encadena antes de grabar → teleprompter → importar → listo para editar.
- **Música dentro de Heika:** votar canciones (lo que hoy hace `Escuchar.command`) y ver el BPM que usará el corte.
- **Biblioteca de tus tomas:** el b-roll que ya grabaste queda etiquetado por Vision (ciudad, manos, pantalla, noche) y Claude lo reutiliza sin pedirte que grabes de nuevo.
- **Google Calendar:** el rodaje del día aparece en tu calendario con la hora azul.
- **Constancia:** una franja de días grabados en el año, sobria, sin gamificación infantil.
- **Modo oscuro**, con el negro de la referencia de marca.

## Orden recomendado
- **H1 + H2 juntos:** son lo que más tiempo te ahorra al grabar.
- **Después H3:** necesita R2 activo.
- **H4–H7:** en el orden que elijas.
