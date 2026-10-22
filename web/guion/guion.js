/* Guion visual · videos de Max. Cada pieza es una «escena» que se anima en un teléfono, al pulso de 89 BPM
   (el de la prueba v2 con «Flashing Lights»). Los votos quedan en este navegador y se copian para Claude. */
const $ = (s, el = document) => el.querySelector(s);
const BPM = 89.1, BEAT = 60 / BPM;
const IMG = (n) => `img/${n}.jpg`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/* ── Votos ── */
let votos = {};
try { votos = JSON.parse(localStorage.getItem("guion:votos") || "{}"); } catch {}
const guardarVotos = () => { try { localStorage.setItem("guion:votos", JSON.stringify(votos)); } catch {} pintarCuenta(); };
const pintarCuenta = () => { $("#cuenta-votos").textContent = Object.keys(votos).length; };
const votosHtml = (id) => `<div class="votos"><button class="voto" data-voto="${id}" data-v="si" aria-pressed="${votos[id]?.v === "si"}" aria-label="Me gusta">👍</button><button class="voto" data-voto="${id}" data-v="no" aria-pressed="${votos[id]?.v === "no"}" aria-label="No me gusta">👎</button></div>`;
const nombres = {};

/* ── Sonido (WebAudio): pulso y aproximaciones de los efectos ── */
let ctx = null, pulsoOn = false, pulsoTimer = 0;
function audio() { if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === "suspended") ctx.resume(); return ctx; }
function ruido(dur) { const c = audio(); const b = c.createBuffer(1, c.sampleRate * dur, c.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; const s = c.createBufferSource(); s.buffer = b; return s; }
const SONIDOS = {
  bombo(t = 0) { const c = audio(); const o = c.createOscillator(), g = c.createGain(); const t0 = c.currentTime + t; o.frequency.setValueAtTime(140, t0); o.frequency.exponentialRampToValueAtTime(42, t0 + 0.18); g.gain.setValueAtTime(0.9, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.32); o.connect(g).connect(c.destination); o.start(t0); o.stop(t0 + 0.35); },
  whoosh() { const c = audio(); const s = ruido(0.45), f = c.createBiquadFilter(), g = c.createGain(); const t0 = c.currentTime; f.type = "bandpass"; f.Q.value = 1.4; f.frequency.setValueAtTime(400, t0); f.frequency.exponentialRampToValueAtTime(4200, t0 + 0.3); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.5, t0 + 0.18); g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.42); s.connect(f).connect(g).connect(c.destination); s.start(t0); },
  impacto() { SONIDOS.bombo(); const c = audio(); const s = ruido(0.6), f = c.createBiquadFilter(), g = c.createGain(); const t0 = c.currentTime; f.type = "lowpass"; f.frequency.value = 1800; g.gain.setValueAtTime(0.5, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.55); s.connect(f).connect(g).connect(c.destination); s.start(t0); },
  riser() { const c = audio(); const o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter(); const t0 = c.currentTime; o.type = "sawtooth"; o.frequency.setValueAtTime(110, t0); o.frequency.exponentialRampToValueAtTime(880, t0 + 2.2); f.type = "lowpass"; f.frequency.setValueAtTime(400, t0); f.frequency.exponentialRampToValueAtTime(6000, t0 + 2.2); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.18, t0 + 2.1); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.3); o.connect(f).connect(g).connect(c.destination); o.start(t0); o.stop(t0 + 2.35); },
  subdrop() { const c = audio(); const o = c.createOscillator(), g = c.createGain(); const t0 = c.currentTime; o.frequency.setValueAtTime(90, t0); o.frequency.exponentialRampToValueAtTime(28, t0 + 1.2); g.gain.setValueAtTime(0.9, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + 1.3); o.connect(g).connect(c.destination); o.start(t0); o.stop(t0 + 1.35); },
  pop() { const c = audio(); const o = c.createOscillator(), g = c.createGain(); const t0 = c.currentTime; o.frequency.setValueAtTime(900, t0); o.frequency.exponentialRampToValueAtTime(320, t0 + 0.06); g.gain.setValueAtTime(0.35, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.09); o.connect(g).connect(c.destination); o.start(t0); o.stop(t0 + 0.1); },
  clic() { const c = audio(); const s = ruido(0.03), f = c.createBiquadFilter(), g = c.createGain(); const t0 = c.currentTime; f.type = "highpass"; f.frequency.value = 3000; g.gain.setValueAtTime(0.6, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.03); s.connect(f).connect(g).connect(c.destination); s.start(t0); },
};
const sonar = (n) => { if (pulsoOn) try { SONIDOS[n](); } catch {} };
$("#pulso").addEventListener("click", () => {
  pulsoOn = !pulsoOn; $("#pulso").setAttribute("aria-pressed", pulsoOn);
  clearInterval(pulsoTimer);
  if (pulsoOn) { audio(); let k = 0; pulsoTimer = setInterval(() => { try { if (k % 2 === 0) SONIDOS.bombo(); else SONIDOS.clic(); } catch {} k++; }, BEAT * 1000); }
});

/* ── Motor de escenas: una escena es una lista de pasos [segundo, función(pantalla)] ── */
const timers = new WeakMap();
function correr(pantalla, pasos, alTerminar) {
  (timers.get(pantalla) || []).forEach(clearTimeout);
  pantalla.innerHTML = "";
  const lista = pasos.map(([t, f]) => setTimeout(() => f(pantalla), t * 1000));
  if (alTerminar) lista.push(setTimeout(alTerminar, (pasos.at(-1)[0] + 1.2) * 1000));
  timers.set(pantalla, lista);
}
const poner = (pantalla, html) => { const d = document.createElement("div"); d.className = "capa"; d.innerHTML = html; pantalla.appendChild(d); return d; };
const ver = (el) => { if (el) { el.classList.remove("ver"); void el.offsetWidth; el.classList.add("ver"); } };
const animar = (el, clase) => { if (!el) return; el.classList.remove(clase); void el.offsetWidth; el.classList.add(clase); el.addEventListener("animationend", () => el.classList.remove(clase), { once: true }); };
const golpeHtml = (lineas, top, tam) => `<div class="golpe" style="top:${top}%;${tam ? `font-size:${tam}cqw` : ""}">${lineas.map((l) => l.split(" ").map((p) => `<span class="p${p.startsWith("*") ? " acento" : ""}">${esc(p.replace("*", ""))}</span>`).join(" ")).join("<br>")}</div>`;
function palabraPorPalabra(capa, tiempos, conSonido = true) {
  const ps = capa.querySelectorAll(".p");
  ps.forEach((p, i) => setTimeout(() => { ver(p); if (conSonido) sonar("pop"); }, (tiempos[i] ?? tiempos.at(-1) + (i - tiempos.length + 1) * 0.12) * 1000));
}
const fondo = (pantalla, img, extra = "") => poner(pantalla, `<img class="foto empuje look ${extra}" src="${IMG(img)}" alt="">`);
const golpeSeco = (pantalla, fuerte = false) => { const d = pantalla.querySelector(".destello") || poner(pantalla, `<div class="destello"></div>`).firstChild; ver(d); animar(pantalla, fuerte ? "sacudir" : "punch"); sonar(fuerte ? "impacto" : "bombo"); };

/* ── El reel de la portada: la prueba v2 resumida ── */
function reel(pantalla) {
  const b = (k) => 0.3 + k * BEAT;
  const pasos = [
    [0, (p) => { fondo(p, "nave"); }],
    [b(0), (p) => { const c = poner(p, golpeHtml(["LO QUE", "HACEMOS ACÁ"], 30)); palabraPorPalabra(c, [0, 0.4, 0.55, 0.75]); }],
    [b(2), (p) => { p.querySelectorAll(".capa")[1]?.remove(); const c = poner(p, golpeHtml(["NO SE VE", "DESDE", "*AFUERA"], 28)); palabraPorPalabra(c, [0, 0.12, 0.24, 0.4, 0.7]); }],
  ];
  const tarjetas = ["estudio", "teclado", "laptop", "mouse", "escritorio", "nave2"];
  const gig = ["CÓDIGO", "CÓDIGO", "DISEÑO", "DISEÑO", "EQUIPO", "EQUIPO"];
  tarjetas.forEach((img, i) => pasos.push([b(4 + i), (p) => {
    p.innerHTML = "";
    poner(p, `<img class="foto desenfocada" src="${IMG(img)}" alt="">`);
    const g = poner(p, `<div class="gigante">${gig[i]}</div>`).firstChild; ver(g);
    const t = poner(p, `<div class="tarjeta ${i % 2 ? "izq" : ""}"><img src="${IMG(img)}" alt=""></div>`).firstChild; ver(t);
    sonar("whoosh"); if (i % 4 === 0) golpeSeco(p);
  }]));
  pasos.push([b(10), (p) => { p.innerHTML = ""; fondo(p, "nave2", "desenfocada"); sonar("riser"); }]);
  pasos.push([b(11), (p) => { const c = poner(p, golpeHtml(["AQUÍ"], 26, 22)); palabraPorPalabra(c, [0], false); golpeSeco(p, true); }]);
  pasos.push([b(12), (p) => { const c = poner(p, golpeHtml(["SE"], 40, 22)); palabraPorPalabra(c, [0], false); golpeSeco(p, true); }]);
  pasos.push([b(13), (p) => { const c = poner(p, golpeHtml(["*CONSTRUYE"], 54, 12.5)); palabraPorPalabra(c, [0], false); golpeSeco(p, true); sonar("subdrop"); }]);
  pasos.push([b(16), () => {}]);
  return pasos;
}
let reelInicio = 0;
function correrReel() {
  reelInicio = performance.now();
  correr($("#escena-reel"), reel(), correrReel);
}
setInterval(() => { $("#reel-t").textContent = `${((performance.now() - reelInicio) / 1000).toFixed(1)} s`; moverCabezal(); }, 100);

/* ── Demos ── */
const DEMOS = {
  "texto": [
    { id: "golpe-palabra", titulo: "Golpe palabra por palabra", uso: "Gancho y frases clave. Cada palabra entra con la voz (tiempos de la transcripción). Máximo 3–4 palabras por línea.",
      pasos: () => [[0, (p) => fondo(p, "nave")], [0.3, (p) => palabraPorPalabra(poner(p, golpeHtml(["LO QUE", "HACEMOS ACÁ"], 32)), [0, 0.35, 0.5, 0.7])]] },
    { id: "palabra-acento", titulo: "Palabra acento", uso: "La palabra que pesa, en el color de acento y más grande. Una por frase.",
      pasos: () => [[0, (p) => fondo(p, "nave2")], [0.3, (p) => palabraPorPalabra(poner(p, golpeHtml(["NO SE VE", "DESDE", "*AFUERA"], 30)), [0, 0.12, 0.24, 0.4, 0.7])]] },
    { id: "apilado-final", titulo: "Apilado final en tres golpes", uso: "El cierre épico: una palabra por beat, con destello y sacudida. Solo al final.",
      pasos: () => [[0, (p) => fondo(p, "nave", "desenfocada")], [0.4, (p) => { palabraPorPalabra(poner(p, golpeHtml(["AQUÍ"], 26, 22)), [0], false); golpeSeco(p, true); }], [0.4 + BEAT, (p) => { palabraPorPalabra(poner(p, golpeHtml(["SE"], 40, 22)), [0], false); golpeSeco(p, true); }], [0.4 + 2 * BEAT, (p) => { palabraPorPalabra(poner(p, golpeHtml(["*CONSTRUYE"], 54, 12.5)), [0], false); golpeSeco(p, true); }]] },
    { id: "subtitulo-menton", titulo: "Subtítulo bajo el mentón", uso: "Cuando Max habla a cámara: 1–2 palabras a la vez, bajo el mentón, nunca sobre la cara.",
      pasos: () => [[0, (p) => fondo(p, "teclado")], [0.3, (p) => { const c = poner(p, `<div class="sub"><span class="p">POR</span> <span class="p">ESO</span></div>`); palabraPorPalabra(c, [0, 0.18]); }], [1.0, (p) => { p.querySelectorAll(".capa")[1]?.remove(); const c = poner(p, `<div class="sub"><span class="p">EMPECÉ</span> <span class="p">A</span></div>`); palabraPorPalabra(c, [0, 0.3]); }], [1.6, (p) => { p.querySelectorAll(".capa")[1]?.remove(); const c = poner(p, `<div class="sub"><span class="p" style="color:var(--acento)">GRABARLO</span></div>`); palabraPorPalabra(c, [0]); }]] },
    { id: "gigante-detras", titulo: "Palabra gigante detrás", uso: "En los montajes: una palabra enorme y transparente detrás de las tarjetas que dice de qué se trata la sección.",
      pasos: () => [[0, (p) => { poner(p, `<img class="foto desenfocada" src="${IMG("laptop")}" alt="">`); ver(poner(p, `<div class="gigante">CÓDIGO</div>`).firstChild); }], [0.35, (p) => { ver(poner(p, `<div class="tarjeta"><img src="${IMG("laptop")}" alt=""></div>`).firstChild); sonar("whoosh"); }]] },
  ],
  "encuadre": [
    { id: "completo-empuje", titulo: "Pantalla completa con empuje", uso: "Para el gancho y el final: la toma llena la pantalla y se acerca sola, despacio.",
      pasos: () => [[0, (p) => fondo(p, "nave")]] },
    { id: "tarjeta-flotante", titulo: "Tarjeta flotante sobre desenfoque", uso: "Toda toma horizontal: la tarjeta entra al beat con rebote y giro; detrás, el mismo clip desenfocado y oscuro.",
      pasos: () => [[0, (p) => poner(p, `<img class="foto desenfocada" src="${IMG("mouse")}" alt="">`)], [0.3, (p) => { ver(poner(p, `<div class="tarjeta"><img src="${IMG("mouse")}" alt=""></div>`).firstChild); sonar("whoosh"); }]] },
    { id: "doble-tarjeta", titulo: "Doble tarjeta", uso: "Para mostrar dos cosas a la vez (antes/después, persona/pantalla). Entran una tras otra.",
      pasos: () => [[0, (p) => poner(p, `<img class="foto desenfocada" src="${IMG("escritorio")}" alt="">`)], [0.3, (p) => { ver(poner(p, `<div class="tarjeta arriba"><img src="${IMG("escritorio")}" alt=""></div>`).firstChild); sonar("whoosh"); }], [0.3 + BEAT, (p) => { ver(poner(p, `<div class="tarjeta abajo izq"><img src="${IMG("estudio")}" alt=""></div>`).firstChild); sonar("whoosh"); }]] },
    { id: "pantalla-3d", titulo: "Pantalla del sistema en 3D", uso: "Para mostrar el Estudio, Medula o el flujo de María: la pantalla gira y se asienta en el espacio.",
      pasos: () => [[0, (p) => poner(p, `<img class="foto desenfocada" src="${IMG("nave2")}" alt="">`)], [0.3, (p) => { ver(poner(p, `<div class="pantalla-3d"><img src="${IMG("estudio")}" alt=""></div>`).firstChild); sonar("whoosh"); }]] },
  ],
  "golpes": [
    { id: "zoom-punch", titulo: "Zoom punch", uso: "En los beats fuertes (cada 4). Acercamiento seco de 12 % y vuelta. Con bombo.",
      pasos: () => [[0, (p) => fondo(p, "teclado")], [0.5, (p) => golpeSeco(p)], [0.5 + 4 * BEAT, (p) => golpeSeco(p)]] },
    { id: "sacudida-destello", titulo: "Sacudida + destello", uso: "Los momentos épicos (final, cambio de sección). Destello blanco de 3 cuadros, sacudida corta. Con impacto.",
      pasos: () => [[0, (p) => fondo(p, "nave2")], [0.5, (p) => golpeSeco(p, true)]] },
    { id: "whip", titulo: "Whip (barrido)", uso: "Transición entre ideas: la toma sale disparada con desenfoque y entra la otra. Con whoosh.",
      pasos: () => [[0, (p) => fondo(p, "laptop")], [0.8, (p) => { animar(p.querySelector(".capa"), "whip-sale"); sonar("whoosh"); }], [0.98, (p) => { p.innerHTML = ""; const c = fondo(p, "mouse"); animar(c, "whip-entra"); }]] },
    { id: "linea-luz", titulo: "Línea de luz (firma)", uso: "La firma de la cuenta: una línea en el color de acento que se dibuja bajo el título final.",
      pasos: () => [[0, (p) => poner(p, `<div style="position:absolute;inset:0;background:#000"></div>`)], [0.3, (p) => { ver(poner(p, `<div class="linea-luz"></div>`).firstChild); sonar("whoosh"); }], [0.7, (p) => palabraPorPalabra(poner(p, golpeHtml(["AQUÍ SE", "*CONSTRUYE"], 44, 11)), [0, 0.1, 0.25], false)]] },
  ],
};

function pintarDemos(clave, contenedor) {
  contenedor.innerHTML = DEMOS[clave].map((d) => {
    nombres[d.id] = d.titulo;
    return `<article class="demo"><div class="telefono"><div class="pantalla" data-demo="${d.id}"></div></div>
      <div class="demo-texto"><h3>${esc(d.titulo)}</h3><p>${esc(d.uso)}</p></div>
      <div class="demo-pie"><button class="mini" data-repetir="${d.id}">↺ Repetir</button>${votosHtml(d.id)}</div></article>`;
  }).join("");
}
const todasLasDemos = () => Object.values(DEMOS).flat();
function correrDemo(id) {
  const d = todasLasDemos().find((x) => x.id === id);
  const p = document.querySelector(`[data-demo="${id}"]`);
  if (d && p) correr(p, d.pasos());
}

/* ── Letras ── */
const LETRAS = [
  { id: "letra-clash", nombre: "Clash Display Bold", familia: "'Clash Display'", peso: 700, nota: "La de la prueba v2. Geométrica, moderna, con carácter." },
  { id: "letra-satoshi", nombre: "Satoshi Black", familia: "'Satoshi'", peso: 900, nota: "Más limpia y redonda. Muy legible en subtítulos." },
  { id: "letra-archivo", nombre: "Archivo Black", familia: "'Archivo Black'", peso: 400, nota: "Ancha y pesada. Máximo impacto, estilo deportivo." },
  { id: "letra-anton", nombre: "Anton", familia: "'Anton'", peso: 400, nota: "Condensada y alta. Entra más texto, muy de edits." },
  { id: "letra-intertight", nombre: "Inter Tight Black", familia: "'Inter Tight'", peso: 900, nota: "Neutra y tech. Se siente producto, menos marca." },
];
function pintarLetras() {
  $("#grilla-letras").innerHTML = LETRAS.map((l) => { nombres[l.id] = `Letra: ${l.nombre}`; return `<article class="muestra">
    <div class="espec" style="font-family:${l.familia};font-weight:${l.peso}">Aquí se<br>construye</div>
    <h3>${esc(l.nombre)}</h3><p class="meta">${esc(l.nota)}</p>
    <div class="demo-pie"><span class="meta">Titular</span>${votosHtml(l.id)}</div></article>`; }).join("");
}

/* ── Color ── */
const COLORES = [
  { id: "color-mandarina", nombre: "Mandarina", hex: "#FF6A13", nota: "El acento de Optimizo. Cálido, energético, se ve en cualquier toma.", img: "nave" },
  { id: "color-lima", nombre: "Lima eléctrica", hex: "#C8FF2E", nota: "Muy de redes y tech. Salta sobre fondos oscuros.", img: "laptop" },
  { id: "color-azul", nombre: "Azul eléctrico", hex: "#3D7BFF", nota: "Tecnológico y frío. Contrasta con la piel y la oficina cálida.", img: "teclado" },
  { id: "color-rojo", nombre: "Rojo señal", hex: "#FF2E3F", nota: "Urgencia y fuerza. Para pocos momentos, no para todo.", img: "nave2" },
];
function pintarColores() {
  $("#grilla-color").innerHTML = COLORES.map((c) => { nombres[c.id] = `Color: ${c.nombre}`; return `<article class="muestra">
    <div class="prueba-color" style="background-image:url(${IMG(c.img)})"><div class="golpe-color">No se ve<br>desde <span style="color:${c.hex}">afuera</span></div></div>
    <div class="paleta"><span style="background:#0A0A0B"></span><span style="background:#F5F5F4"></span><span style="background:${c.hex}"></span></div>
    <h3>${esc(c.nombre)} <span class="meta">${c.hex}</span></h3><p class="meta">${esc(c.nota)}</p>
    <div class="demo-pie"><button class="mini" data-acento="${c.hex}">Probar en todo</button>${votosHtml(c.id)}</div></article>`; }).join("");
}

/* ── Línea de tiempo de la prueba v2 ── */
const DUR = 15.2, F = 0.42, b2 = (k) => F + k * BEAT;
function pintarLinea() {
  const pct = (t) => `${(t / DUR) * 100}%`;
  const bloque = (t0, t1, txt, ac) => `<div class="lt-bloque${ac ? " acento" : ""}" style="left:${pct(t0)};width:calc(${pct(t1 - t0)} - 2px)" title="${esc(txt)}">${esc(txt)}</div>`;
  const tarjetas = ["Estudio", "Teclado", "Código", "Colega", "Mouse", "Escritorio", "Pantallas", "Hombro", "Laptop", "Equipo"];
  const imagen = [bloque(0, b2(4), "Nave · gancho")].concat(tarjetas.map((t, i) => bloque(b2(4 + i), b2(5 + i), t))).concat([bloque(9.85, 11.75, "Max a cámara", true), bloque(11.87, DUR, "Final · nave", true)]);
  const texto = [bloque(F, F + 1.22, "LO QUE HACEMOS ACÁ"), bloque(F + 1.22, b2(4), "NO SE VE DESDE AFUERA", true), bloque(b2(4), b2(14), "CÓDIGO · DISEÑO · EQUIPO · IA · SISTEMAS"), bloque(10.03, 11.75, "POR ESO EMPECÉ A GRABARLO", true), bloque(11.87, DUR, "AQUÍ / SE / CONSTRUYE", true)];
  const golpes = [b2(4), b2(8), b2(12), 9.85, 11.87, 11.87 + BEAT, 11.87 + 2 * BEAT].map((t) => `<div class="lt-marca" style="left:${pct(t)}"></div>`);
  const musica = [bloque(0, DUR, "«Flashing Lights» · Kanye West · 89 BPM")];
  const sonido = [bloque(F, F + 2.3, "Voz", true), bloque(9.34, 11.87, "Riser"), bloque(10.03, 11.2, "Voz", true)];
  const beats = Array.from({ length: Math.floor((DUR - F) / BEAT) + 1 }, (_, k) => `<div class="lt-beat${k % 4 === 0 ? " fuerte" : ""}" style="left:${pct(b2(k))}"></div>`).join("");
  const fila = (n, html) => `<div class="lt-fila"><span class="lt-nombre">${n}</span><div class="lt-pista">${beats}${html}</div></div>`;
  $("#linea-tiempo").innerHTML = `<div class="lt-interior" id="lt-interior">${fila("Imagen", imagen.join(""))}${fila("Texto", texto.join(""))}${fila("Golpes", golpes.join(""))}${fila("Música", musica.join(""))}${fila("Voz y efectos", sonido.join(""))}
    <div class="lt-regla"><i></i><div>${[0, 3, 6, 9, 12, 15].map((s) => `<span style="left:${pct(s)}">${s} s</span>`).join("")}</div></div>
    <div class="lt-cabezal" id="lt-cabezal" style="left:110px"></div></div>`;
}
function moverCabezal() {
  const c = $("#lt-cabezal"), int = $("#lt-interior"); if (!c || !int) return;
  const t = ((performance.now() - reelInicio) / 1000) % DUR;
  const ancho = int.clientWidth - 110;
  c.style.left = `${110 + (t / DUR) * ancho}px`;
}

/* ── Sonido ── */
const ROLES = [
  { id: "son-whoosh", n: "whoosh", titulo: "Whoosh", uso: "En cada corte de tarjeta y en los whips.", real: "Mixkit «Air woosh», «Fast air sweep»" },
  { id: "son-impacto", n: "impacto", titulo: "Impacto", uso: "En los golpes del final y los cambios de sección.", real: "Sonniss · Cinematic Sound Design «Impact Hit Rapid Chord»" },
  { id: "son-riser", n: "riser", titulo: "Riser", uso: "Sube 2–3 s antes del momento épico; termina justo en el golpe.", real: "Mixkit «Cinematic trailer riser»" },
  { id: "son-subdrop", n: "subdrop", titulo: "Sub drop", uso: "Grave profundo en la palabra final. Se siente más que se escucha.", real: "Sonniss · 344 Audio «Bass Drops & Downers»" },
  { id: "son-pop", n: "pop", titulo: "Pop de texto", uso: "Cuando entra cada palabra del gancho. Muy bajo.", real: "Freesound / Mixkit «pop»" },
  { id: "son-clic", n: "clic", titulo: "Clic real", uso: "Cuando se ve una mano en el mouse o el teclado.", real: "Freesound «mouse-click-single»" },
];
function pintarSonidos() {
  $("#grilla-sonido").innerHTML = ROLES.map((r) => { nombres[r.id] = `Sonido: ${r.titulo}`; return `<article class="sonido"><button class="play" data-sonar="${r.n}" aria-label="Escuchar ${esc(r.titulo)}">▶</button>
    <div><h3>${esc(r.titulo)}</h3><p>${esc(r.uso)}</p><small>${esc(r.real)}</small><div style="margin-top:8px">${votosHtml(r.id)}</div></div></article>`; }).join("");
}

/* ── Elecciones ── */
function textoElecciones() {
  const lineas = Object.entries(votos).sort((a, b) => a[1].t - b[1].t).map(([id, x]) => `${x.v === "si" ? "👍" : "👎"} ${nombres[id] || id}`);
  return lineas.length ? `Guion visual · mis elecciones\n${lineas.join("\n")}` : "Todavía no marcas nada. Usa 👍 / 👎 en cada pieza.";
}
function avisar(t) { const a = $("#aviso"); a.textContent = t; a.hidden = false; clearTimeout(avisar.t); avisar.t = setTimeout(() => (a.hidden = true), 1800); }

document.addEventListener("click", async (e) => {
  const b = e.target.closest("button, a"); if (!b) return;
  if (b.dataset.voto) {
    const id = b.dataset.voto, v = b.dataset.v;
    if (votos[id]?.v === v) delete votos[id]; else votos[id] = { v, t: Date.now() };
    guardarVotos();
    document.querySelectorAll(`[data-voto="${id}"]`).forEach((x) => x.setAttribute("aria-pressed", String(votos[id]?.v === x.dataset.v)));
  }
  if (b.dataset.repetir) { audio(); b.dataset.repetir === "reel" ? correrReel() : correrDemo(b.dataset.repetir); }
  if (b.dataset.sonar) { try { audio(); SONIDOS[b.dataset.sonar](); } catch {} }
  if (b.dataset.acento) { document.documentElement.style.setProperty("--acento", b.dataset.acento); avisar("Acento aplicado a toda la página"); }
  if (b.id === "ver-elecciones") { $("#texto-elecciones").textContent = textoElecciones(); $("#elecciones").hidden = false; }
  if (b.id === "cerrar-elecciones") $("#elecciones").hidden = true;
  if (b.id === "copiar-elecciones") { try { await navigator.clipboard.writeText(textoElecciones()); avisar("Copiado"); } catch { avisar("No se pudo copiar"); } }
});

/* Las demos se animan solas cuando entran en pantalla */
const vista = new IntersectionObserver((es) => es.forEach((x) => { if (x.isIntersecting) correrDemo(x.target.dataset.demo); }), { threshold: 0.55 });

pintarDemos("texto", $("#demos-texto"));
pintarDemos("encuadre", $("#demos-encuadre"));
pintarDemos("golpes", $("#demos-golpes"));
pintarLetras(); pintarColores(); pintarLinea(); pintarSonidos(); pintarCuenta();
document.querySelectorAll("[data-demo]").forEach((p) => vista.observe(p));
correrReel();
