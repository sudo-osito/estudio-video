/* Heika · calendario de orgánicos. Lee el calendario del Worker, sube el material por trozos y avisa «listo para editar». */
import { crearSeguidor } from "./seguir.js";

const API = window.ESTUDIO_API;
/* Dentro de la app del Mac hay un puente al lado nativo (voz sin internet, pantalla encendida, ventana privada) */
const PUENTE = window.webkit?.messageHandlers?.heika;
const nativo = PUENTE ? (tipo, datos = {}) => PUENTE.postMessage({ tipo, ...datos }) : null;
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const PILARES = { proyectos: "Proyectos", vida: "Vida", criterio: "Criterio" };
const pilar = (k) => ({ nombre: PILARES[k] ?? (k || "Sin pilar") });
const ESTADO = {
  grabar: "Por grabar", material: "Con material", listo: "Listo para editar", editando: "En edición",
  entregado: "Entregado", publicado: "Publicado", descartado: "Descartado",
};
const HECHO = new Set(["listo", "editando", "entregado", "publicado"]);

/* El estado es un anillo que se llena a medida que el video avanza: sin colores, se lee por la forma. */
const AVANCE = { grabar: 0, material: 25, listo: 50, editando: 75, entregado: 100, publicado: 100, descartado: 0 };
const glifo = (estado) => {
  const p = AVANCE[estado] ?? 0;
  if (estado === "publicado") return `<svg class="glifo" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="currentColor"/><path d="M5 8.3l2 2 4-4.4" fill="none" stroke="var(--fondo)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  return `<svg class="glifo" viewBox="0 0 16 16"><circle class="g-pista" cx="8" cy="8" r="6.2"${estado === "grabar" ? ' stroke-dasharray="2 2.4"' : ""}/>${p ? `<circle class="g-valor" cx="8" cy="8" r="6.2" pathLength="100" stroke-dasharray="${p} 100" transform="rotate(-90 8 8)"/>` : ""}${estado === "entregado" ? `<path d="M5.4 8.2l1.8 1.8 3.4-3.8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>` : ""}</svg>`;
};
const estadoHtml = (e) => `<span class="estado">${glifo(e)}${ESTADO[e] ?? e}</span>`;

/* La ruta de cada video: dónde está y qué falta. */
const RUTA = ["Grabar", "Subir", "Editar", "Entregar", "Publicar"];
const PASO = { grabar: 0, material: 1, listo: 2, editando: 2, entregado: 3, publicado: 5, descartado: -1 };

/* ── Logo: la H con terminales en cuarto de círculo + «heika» (Clash Display, en curvas). El punto de la i es rojo. ── */
const LETRAS = [
  "M190 0V-251C190 -335 221 -376 322 -376C416 -376 452 -346 452 -262V0H602V-307C602 -423 536 -511 401 -511C273 -511 214 -433 198 -348H190V-670H40V0Z",
  "M934 10C1093 10 1199 -66 1199 -175V-186H1049V-176C1049 -133 1018 -110 929 -110C832 -110 796 -143 792 -220H1200C1202 -237 1204 -250 1204 -268C1204 -425 1095 -511 931 -511C766 -511 653 -410 653 -250C653 -72 767 10 934 10ZM928 -394C1016 -394 1056 -365 1060 -299H794C801 -364 839 -394 928 -394Z",
  "M1408 0V-501H1258V0Z",
  "M1627 0V-181H1742L1867 0H2044L1864 -259L2047 -501H1869L1741 -315H1627V-670H1477V0Z",
  "M2227 10C2338 10 2408 -37 2431 -115H2439V0H2579V-294C2579 -425 2500 -511 2333 -511C2168 -511 2064 -425 2064 -301V-298H2215V-302C2215 -359 2246 -379 2322 -379C2402 -379 2431 -361 2431 -296V-277L2216 -255C2109 -244 2054 -198 2054 -124C2054 -40 2119 10 2227 10ZM2205 -134C2205 -158 2221 -168 2257 -171L2431 -191C2427 -120 2372 -96 2270 -96C2226 -96 2205 -107 2205 -134Z",
];
const H = `<g class="l-h"><path class="l-pieza l-izq" d="M10 92V40A32 32 0 0 1 42 8V92Z"/><path class="l-pieza l-der" d="M90 8V60A32 32 0 0 1 58 92V8Z"/><rect class="l-pieza l-cruz" x="41" y="39" width="18" height="22"/></g>`;
function logoSvg(tipo, armar = true) {
  if (tipo === "simbolo") return `<svg class="logo${armar ? " armar" : ""}" viewBox="0 0 100 100" aria-hidden="true">${H}</svg>`;
  return `<svg class="logo${armar ? " armar" : ""}" viewBox="0 0 388 100" aria-hidden="true">${H}<g transform="translate(124 92) scale(.1)">${LETRAS.map((d, k) => `<path class="l-letra" style="--l:${k}" d="${d}"/>`).join("")}<path class="l-punto" d="M1408 -552V-670H1258V-552Z"/></g></svg>`;
}
document.querySelectorAll("[data-logo]").forEach((el) => { el.innerHTML = logoSvg(el.dataset.logo); });

/* Cómo se graba cada párrafo del guion (beats[].modo). */
const MODOS = {
  camara: { nombre: "A cámara", ayuda: "Te grabas diciéndolo, mirando al lente." },
  voz: { nombre: "Voz en off", ayuda: "Solo tu voz. Encima va otra imagen que grabas aparte." },
  pantalla: { nombre: "Voz + pantalla", ayuda: "Solo tu voz, sobre una grabación de pantalla." },
  escena: { nombre: "Sin hablar", ayuda: "Actúas sin decir nada." },
};
const modoDe = (b) => (MODOS[b?.modo] ? b.modo : "camara");
const enOff = (m) => m === "voz" || m === "pantalla";
const ICONO_MODO = {
  camara: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><rect x="1.5" y="4" width="9.5" height="8" rx="2"/><path d="M11 7l3.5-2v6L11 9"/></svg>`,
  voz: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="5.5" y="1.5" width="5" height="8" rx="2.5"/><path d="M3 7.5a5 5 0 0010 0M8 12.5v2"/></svg>`,
  pantalla: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1.5" y="2.5" width="13" height="8.5" rx="1.5"/><path d="M5.5 14h5M8 11v3"/></svg>`,
  escena: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6.5h12v7H2zM2 6.5l1.5-4 11 2.5-.5 1.5"/><path d="M6 3.2l-.8 3.3M10 4.1l-.8 2.4"/></svg>`,
};
const chipModo = (m) => `<span class="modo m-${m}">${ICONO_MODO[m]}${MODOS[m].nombre}</span>`;
const listaNum = (ns) => (ns.length > 1 ? `${ns.slice(0, -1).join(", ")} y ${ns.at(-1)}` : `${ns[0]}`);

const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MESES_LARGO = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const aFecha = (s) => { const [a, m, d] = s.split("-").map(Number); return new Date(a, m - 1, d); };
const aTexto = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const hoyTexto = () => aTexto(new Date());
const sumarDias = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const lunes = (d) => sumarDias(d, -((d.getDay() + 6) % 7));
const mb = (b) => (b >= 1073741824 ? `${(b / 1073741824).toFixed(2)} GB` : `${Math.max(1, Math.round(b / 1048576))} MB`);
const FLECHA = `<svg class="flecha" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7.5 5l5 5-5 5"/></svg>`;
const CHECK = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 8.5l3 3 6-7"/></svg>`;

let s = {
  llave: leerLocal("estudio:llave"),
  videos: [],
  vista: leerLocal("estudio:vista") === "agenda" ? "agenda" : "mes",
  mes: hoyTexto().slice(0, 7),
  dia: hoyTexto(),
  sel: null,
  detalle: null,
  pestana: "guion",
  recien: false,
  subidas: new Map(), // id temporal → { nombre, bytes, hecho, estado }
  animar: "entra", // qué movimiento usa el próximo pintado: "entra", "izq", "der" o nada
};

function leerLocal(k) { try { return localStorage.getItem(k); } catch { return null; } }
function guardarLocal(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} }

async function api(ruta, opciones = {}) {
  const r = await fetch(API + ruta, {
    ...opciones,
    headers: { authorization: `Bearer ${s.llave}`, ...(opciones.body && typeof opciones.body === "string" ? { "content-type": "application/json" } : {}), ...opciones.headers },
  });
  const datos = await r.json().catch(() => ({}));
  if (r.status === 401) { salir(); throw new Error(datos.error || "Llave inválida."); }
  if (!r.ok) throw new Error(datos.error || `Error ${r.status}`);
  return datos;
}

function avisar(texto) {
  const el = $("#aviso");
  el.textContent = texto;
  el.classList.add("visible");
  clearTimeout(avisar.t);
  avisar.t = setTimeout(() => el.classList.remove("visible"), 2600);
}

/* ── Entrada ── */
function salir() { guardarLocal("estudio:llave", null); s.llave = null; mostrarEntrada(); }
/* En el Mac, la animación nativa es la pantalla de carga: se le avisa dónde quedó el logo para que la H aterrice ahí */
function avisarLista(selector) {
  if (!nativo) return;
  // con un temporizador y no con requestAnimationFrame: si la ventana arranca tapada, rAF no corre
  setTimeout(() => {
    const r = $(selector)?.getBoundingClientRect();
    nativo("lista", r ? { x: r.x, y: r.y, alto: r.height } : {});
  }, 60);
}

function mostrarEntrada(error) {
  $("#cargando").classList.add("fuera");
  $("#app").hidden = true;
  $("#entrada").hidden = false;
  avisarLista(".entrada-logo svg");
  $("#error-llave").hidden = !error;
  $("#error-llave").textContent = error || "";
}
$("#form-llave").addEventListener("submit", async (e) => {
  e.preventDefault();
  s.llave = $("#campo-llave").value.trim();
  try { await cargar(); guardarLocal("estudio:llave", s.llave); }
  catch (err) { mostrarEntrada(err.message); }
});

async function cargar() {
  s.videos = await api("/api/videos");
  $("#cargando").classList.add("fuera");
  $("#entrada").hidden = true;
  $("#app").hidden = false;
  // La barra lateral entra, el logo se arma y el contenido sube en cascada; después se quita la clase para no repetirlo.
  $("#app").classList.add("entra");
  setTimeout(() => $("#app").classList.remove("entra"), 1600);
  s.animar = "entra";
  pintar();
  avisarLista(".lat-logo svg");
  const id = new URLSearchParams(location.hash.slice(1)).get("v");
  if (id && !s.sel) abrir(id);
}
// Cuando el punto de la i aterriza, el logo queda quieto (y vuelve a responder al plegar y al pasar el mouse).
document.addEventListener("animationend", (e) => { if (e.animationName === "l-punto") e.target.closest(".logo")?.classList.remove("armar"); });

/* ── Barra lateral ── */
function plegar(on = !$("#app").classList.contains("plegada")) {
  $("#app").classList.toggle("plegada", on);
  guardarLocal("estudio:lateral", on ? "plegada" : null);
  $("[data-plegar]").setAttribute("aria-label", on ? "Desplegar la barra lateral" : "Plegar la barra lateral");
  setTimeout(moverIndicadores, 30);
}
if (leerLocal("estudio:lateral") === "plegada" && matchMedia("(min-width: 761px)").matches) $("#app").classList.add("plegada");
function lateralMovil(on) { $("#app").classList.toggle("lateral-abierta", on); }

/* Los indicadores (barra lateral, pestañas del celular) se deslizan al elemento activo */
function moverIndicadores() {
  const activo = $(`#lat-nav [data-vista="${s.vista}"]`);
  if (activo) $(".lat-indicador").style.transform = `translateY(${activo.offsetTop}px)`;
  const pm = $(`#pestanas-movil [data-vista="${s.vista}"]`);
  if (pm && pm.offsetWidth) Object.assign($(".pm-indicador").style, { width: `${pm.offsetWidth}px`, transform: `translateX(${pm.offsetLeft}px)` });
}

function pintarLateral() {
  const hoy = hoyTexto();
  const prox = s.videos.filter((v) => v.fecha >= hoy && !HECHO.has(v.estado) && v.estado !== "descartado").slice(0, 4);
  $("#lat-proximos").innerHTML = prox.length ? prox.map((v) => { const d = aFecha(v.fecha); return `
    <button class="lat-prox${v.fecha === hoy ? " es-hoy" : ""}" data-abrir="${v.id}" title="${esc(v.titulo)}">
      <span class="fecha-mini"><small>${DIAS[d.getDay()]}</small><b>${d.getDate()}</b></span><span>${esc(v.titulo)}</span>
    </button>`; }).join("") : `<p class="lat-vacio">Nada pendiente por grabar.</p>`;
  const total = s.videos.filter((v) => v.estado !== "descartado").length;
  const hechos = s.videos.filter((v) => HECHO.has(v.estado)).length;
  const p = total ? Math.round((hechos / total) * 100) : 0;
  $("#prog-num").textContent = `${hechos} de ${total}`;
  $("#prog-texto").textContent = total === 1 ? "video grabado" : "videos grabados";
  $(".anillo-valor").style.strokeDashoffset = String(100 - p);
  $(".anillo-valor").classList.toggle("cero", !p);
  $("#prog-barra").style.clipPath = `inset(0 ${100 - p}% 0 0 round 2px)`; // el degradado se revela, no se aplasta
  document.querySelectorAll("[data-vista]").forEach((b) => b.setAttribute("aria-current", String(b.dataset.vista === s.vista)));
  requestAnimationFrame(moverIndicadores);
}

function irAHoy() {
  const mes = hoyTexto().slice(0, 7);
  s.animar = mes === s.mes && s.vista === "mes" ? null : mes < s.mes ? "izq" : "der";
  if (s.vista !== "mes") { s.vista = "mes"; guardarLocal("estudio:vista", "mes"); s.animar = "vista"; }
  s.mes = mes; s.dia = hoyTexto();
  pintar();
}

/* ── Vista principal ── */
function pintar() {
  const [a, m] = s.mes.split("-").map(Number);
  const agenda = s.vista === "agenda";
  const titulo = agenda ? "Agenda" : MESES_LARGO[m - 1];
  const sub = agenda ? "Próximos videos" : String(a);
  const t = $(".titulo-vista");
  if ($("#titulo-mes").textContent !== titulo || $("#titulo-sub").textContent !== sub) {
    $("#titulo-mes").textContent = titulo;
    $("#titulo-sub").textContent = sub;
    t.classList.remove("cambia", "atras");
    void t.offsetWidth; // reinicia la animación del título
    t.classList.add("cambia");
    if (s.animar === "izq") t.classList.add("atras");
  }
  $("#nav-mes").hidden = agenda;
  $("#volver-hoy").hidden = agenda || s.mes === hoyTexto().slice(0, 7); // solo cuando estás mirando otro mes
  pintarLateral();
  pintarHoy();
  agenda ? pintarAgenda() : pintarMes();
  s.animar = null;
}

/* La barra de arriba toma vidrio solo cuando el contenido pasa por debajo */
addEventListener("scroll", () => $("#barra").classList.toggle("con-fondo", scrollY > 8), { passive: true });

function videoDeHoy() {
  const hoy = hoyTexto();
  return s.videos.find((v) => v.fecha === hoy && !HECHO.has(v.estado)) ?? s.videos.find((v) => v.fecha >= hoy && !HECHO.has(v.estado) && v.estado !== "descartado");
}

function cuandoTexto(fecha) {
  if (fecha === hoyTexto()) return "Hoy";
  if (fecha === aTexto(sumarDias(new Date(), 1))) return "Mañana";
  const d = aFecha(fecha);
  return `${DIAS[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]}`;
}

const ICONO = {
  guion: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5.5 2.5h6l3.5 3.5v10a1.5 1.5 0 01-1.5 1.5h-8A1.5 1.5 0 014 16V4a1.5 1.5 0 011.5-1.5z"/><path d="M11 2.5V6.5h4M7 10h6M7 13h4"/></svg>`,
  subir: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13V3.5m0 0L6.5 7M10 3.5L13.5 7"/><path d="M3.5 12.5v2a2 2 0 002 2h9a2 2 0 002-2v-2"/></svg>`,
  prompter: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="3.5" width="15" height="10" rx="2"/><path d="M6 7h8M6 10h5M10 13.5v3M7 16.5h6"/></svg>`,
};

/* Próximo rodaje: una sola acción principal según dónde va el video; lo demás queda a mano, en silencio. */
function pintarHoy() {
  const v = videoDeHoy();
  const el = $("#hoy");
  if (!v) { el.innerHTML = ""; return; }
  const d = aFecha(v.fecha);
  const esHoy = v.fecha === hoyTexto();
  const faltan = Math.round((d - aFecha(hoyTexto())) / 86400000);
  const paso = PASO[v.estado] ?? 0;
  const grabado = v.estado !== "grabar";
  const principal = grabado
    ? `<button class="boton primario" data-abrir="${v.id}" data-pestana="material">${ICONO.subir}Subir material</button>`
    : `<button class="boton primario" data-prompter="${v.id}"><i class="rec"></i>Grabar ahora</button>`;
  const otras = grabado
    ? `<button class="accion-suave" data-abrir="${v.id}" data-pestana="guion">${ICONO.guion}Guion</button><button class="accion-suave" data-prompter="${v.id}">${ICONO.prompter}Teleprompter</button>`
    : `<button class="accion-suave" data-abrir="${v.id}" data-pestana="guion">${ICONO.guion}Guion</button><button class="accion-suave" data-abrir="${v.id}" data-pestana="material">${ICONO.subir}Subir</button>`;
  el.innerHTML = `
    <article class="rodaje vidrio${s.animar === "entra" ? " animar" : ""}">
      <div class="rodaje-fecha${esHoy ? " es-hoy" : ""}"><small>${esHoy ? "Hoy" : DIAS[d.getDay()]}</small><b>${d.getDate()}</b><span>${esHoy ? MESES[d.getMonth()] : faltan === 1 ? "mañana" : `en ${faltan} días`}</span></div>
      <div class="rodaje-cuerpo">
        <div class="rodaje-cabeza" style="--n:0">
          <div class="rodaje-etiqueta">${esHoy && !grabado ? `<i class="rec"></i>Hoy toca grabar` : `Próximo rodaje · ${cuandoTexto(v.fecha)}`}<span class="chip">${esc(pilar(v.pilar).nombre)}</span></div>
          <h2>${esc(v.titulo)}</h2>
        </div>
        ${v.gancho ? `<p class="rodaje-gancho" style="--n:1">«${esc(v.gancho)}»</p>` : ""}
        <div class="rodaje-pie" style="--n:2">
          <div class="rodaje-acciones">${principal}${otras}</div>
          <ol class="ruta" aria-label="En qué va">${RUTA.map((r, k) => `<li class="${k < paso ? "hecho" : k === paso ? "actual" : ""}"><i class="nodo"></i>${r}</li>`).join("")}</ol>
        </div>
      </div>
    </article>`;
}

function pintarMes() {
  const [a, m] = s.mes.split("-").map(Number);
  const inicio = lunes(new Date(a, m - 1, 1));
  const hoy = hoyTexto();
  const porDia = new Map();
  for (const v of s.videos) { if (!porDia.has(v.fecha)) porDia.set(v.fecha, []); porDia.get(v.fecha).push(v); }
  const semanas = Math.ceil(((new Date(a, m - 1, 1).getDay() + 6) % 7 + new Date(a, m, 0).getDate()) / 7);
  const celdas = Array.from({ length: semanas * 7 }, (_, i) => {
    const d = sumarDias(inicio, i);
    const f = aTexto(d);
    const vs = porDia.get(f) ?? [];
    const clases = ["cal-dia", d.getMonth() !== m - 1 && "fuera", f === hoy && "hoy", f === s.dia && "elegido", i % 7 > 4 && "finde"].filter(Boolean).join(" ");
    return `<div class="${clases}" data-dia="${f}" style="--f:${Math.floor(i / 7)};--c:${i % 7}">
      <span class="cal-num">${d.getDate()}</span>
      ${vs.map((v) => `<button class="evento${HECHO.has(v.estado) ? " hecho" : ""}${v.id === s.sel ? " activo" : ""}${f === hoy && v.estado === "grabar" ? " toca" : ""}" data-abrir="${v.id}"><b>${esc(v.titulo)}</b><span class="ev-pie">${estadoHtml(v.estado)}</span></button>`).join("")}
      ${vs.length ? `<i class="punto-ev${vs.every((v) => HECHO.has(v.estado)) ? " hecho" : ""}"></i>` : ""}
    </div>`;
  }).join("");
  const delDia = porDia.get(s.dia) ?? [];
  const dd = aFecha(s.dia);
  const animar = s.animar ? ` animar ${s.animar}` : "";
  $("#vista").innerHTML = `
    <div class="calendario vidrio">
      <div class="cal-cabeza">${["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((x) => `<div>${x}</div>`).join("")}</div>
      <div class="cal-grilla${animar}">${celdas}</div>
    </div>
    <div class="dia-panel">
      <h3>${s.dia === hoy ? "Hoy" : `${DIAS[dd.getDay()]} ${dd.getDate()} de ${MESES_LARGO[dd.getMonth()].toLowerCase()}`}</h3>
      ${delDia.length ? delDia.map(tarjetaHtml).join("") : `<p class="vacio">Sin video este día.</p>`}
    </div>`;
}

function tarjetaHtml(v) {
  return `<button class="tarjeta-video${HECHO.has(v.estado) ? " hecho" : ""}" data-abrir="${v.id}">
    ${glifo(v.estado)}
    <span><b>${esc(v.titulo)}</b><span class="meta"><span>${ESTADO[v.estado] ?? v.estado}</span><span class="pilar">${esc(pilar(v.pilar).nombre)}</span></span></span>
    ${FLECHA}
  </button>`;
}

function pintarAgenda() {
  if (!s.videos.length) { $("#vista").innerHTML = `<p class="vacio">El calendario está vacío.</p>`; return; }
  const esta = aTexto(lunes(new Date()));
  const prox = aTexto(sumarDias(lunes(new Date()), 7));
  const hoy = hoyTexto();
  const grupos = new Map();
  const anteriores = [];
  for (const v of s.videos) {
    const l = aTexto(lunes(aFecha(v.fecha)));
    if (l < esta) { anteriores.push(v); continue; }
    if (!grupos.has(l)) grupos.set(l, []);
    grupos.get(l).push(v);
  }
  const nombre = (l) => (l === esta ? "Esta semana" : l === prox ? "La próxima semana" : `Semana del ${aFecha(l).getDate()} de ${MESES_LARGO[aFecha(l).getMonth()].toLowerCase()}`);
  const fila = (v) => { const d = aFecha(v.fecha); return `<div class="agenda-fila${v.fecha === hoy ? " hoy" : ""}"><div class="agenda-fecha"><small>${DIAS[d.getDay()]}</small><b>${d.getDate()}</b></div>${tarjetaHtml(v)}</div>`; };
  let html = [...grupos].map(([l, vs], g) => `<div class="agenda-grupo" style="--g:${g}"><h3>${nombre(l)}</h3><div class="agenda-filas">${vs.map(fila).join("")}</div></div>`).join("");
  if (anteriores.length) html += `<div class="agenda-grupo" style="--g:${grupos.size}"><h3>Anteriores</h3><div class="agenda-filas">${anteriores.reverse().map(fila).join("")}</div></div>`;
  $("#vista").innerHTML = `<div class="agenda${s.animar ? " animar" : ""}">${html}</div>`;
}

/* ── Detalle (cajón) ── */
async function abrir(id, pestana) {
  if (s.sel !== id) { s.borrador = null; s.recien = false; }
  s.sel = id;
  if (pestana) s.pestana = pestana;
  history.replaceState(null, "", `#v=${id}`);
  clearTimeout(cerrarDetalle.t);
  $("#detalle").classList.remove("saliendo");
  $("#velo").classList.remove("saliendo");
  $("#detalle").hidden = false;
  $("#velo").hidden = false;
  lateralMovil(false);
  document.body.style.overflow = "hidden";
  if (!s.detalle || s.detalle.id !== id) { s.pildora = null; $("#detalle").innerHTML = `<div class="cajon-cuerpo"><i class="cajon-carga" aria-label="Cargando"></i></div>`; }
  pintar();
  try { s.detalle = await api(`/api/videos/${id}`); s.cambioPestana = true; pintarDetalle(); }
  catch (e) { cerrarDetalle(); avisar(e.message); }
}
/* Se va deslizando (hoja hacia abajo en el celular) y recién entonces se oculta */
function cerrarDetalle() {
  s.sel = null; s.detalle = null; s.recien = false;
  history.replaceState(null, "", location.pathname);
  $("#detalle").classList.add("saliendo");
  $("#velo").classList.add("saliendo");
  cerrarDetalle.t = setTimeout(() => {
    $("#detalle").hidden = true;
    $("#velo").hidden = true;
    $("#detalle").classList.remove("saliendo");
    $("#velo").classList.remove("saliendo");
  }, 250);
  document.body.style.overflow = "";
  pintar();
}

function pintarDetalle() {
  const v = s.detalle;
  if (!v) return;
  const material = v.archivos.filter((a) => a.tipo === "material" && a.estado === "ok");
  const entregas = v.archivos.filter((a) => a.tipo === "entrega" && a.estado === "ok");
  const pest = [["guion", "Guion"], ["material", `Material${material.length ? `<span class="cuenta">${material.length}</span>` : ""}`], ["edicion", "Edición"], ["entrega", `Entrega${entregas.length ? `<span class="cuenta">${entregas.length}</span>` : ""}`]];
  const cuerpoViejo = $("#detalle .cajon-cuerpo");
  const scroll = !s.cambioPestana && cuerpoViejo ? cuerpoViejo.scrollTop : 0;
  $("#detalle").innerHTML = `
    <div class="cajon-cabeza">
      <div class="cajon-arriba">
        ${estadoHtml(v.estado)}
        <button class="icono-boton" data-cerrar aria-label="Cerrar"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M5 5l10 10M15 5L5 15"/></svg></button>
      </div>
      <h2>${esc(v.titulo)}</h2>
      <div class="meta-fila"><span class="chip">${esc(pilar(v.pilar).nombre)}</span><span class="chip">${cuandoTexto(v.fecha)}</span>${v.formato ? `<span class="chip">${esc(v.formato)}</span>` : ""}${v.datos.duracion ? `<span class="chip">${esc(v.datos.duracion)}</span>` : ""}</div>
      <div class="pestanas" role="tablist"><i class="pildora" aria-hidden="true"></i>${pest.map(([k, t]) => `<button role="tab" data-pestana-det="${k}" aria-selected="${s.pestana === k}">${t}</button>`).join("")}</div>
    </div>
    <div class="cajon-cuerpo${s.cambioPestana ? " cambia" : ""}">${({ guion: guionHtml, material: materialHtml, edicion: edicionHtml, entrega: entregaHtml })[s.pestana](v)}</div>`;
  const cuerpo = $("#detalle .cajon-cuerpo");
  [...cuerpo.children].forEach((el, k) => el.style.setProperty("--k", Math.min(k, 8)));
  cuerpo.scrollTop = scroll;
  s.cambioPestana = false;
  moverPildora();
  if (s.pestana === "entrega") cargarEntregas(v);
}

/* La píldora parte donde estaba y se desliza a la pestaña nueva */
function moverPildora() {
  const p = $("#detalle .pildora");
  const b = $(`#detalle [data-pestana-det][aria-selected="true"]`);
  if (!p || !b) return;
  const nueva = { x: b.offsetLeft, w: b.offsetWidth };
  const vieja = s.pildora ?? nueva;
  p.style.transition = "none";
  p.style.width = `${vieja.w}px`;
  p.style.transform = `translateX(${vieja.x}px)`;
  void p.offsetWidth;
  p.style.transition = "";
  p.style.width = `${nueva.w}px`;
  p.style.transform = `translateX(${nueva.x}px)`;
  s.pildora = nueva;
}

function guionHtml(v) {
  const d = v.datos;
  const g = d.grabar ?? {};
  const beats = d.beats ?? [];
  const cuenta = {};
  beats.forEach((b) => { const m = modoDe(b); cuenta[m] = (cuenta[m] ?? 0) + 1; });
  const ganchoAparte = v.gancho && !beats.some((b) => b.dice === v.gancho);
  return `
    ${ganchoAparte ? `<div class="bloque"><h4>Primera frase</h4><p class="gancho">${esc(v.gancho)}</p></div>` : ""}
    <div class="acciones"><button class="boton primario" data-prompter="${v.id}">Abrir teleprompter</button><button class="boton" data-pestana-det="material">Qué grabar y subir</button></div>
    ${beats.length ? `
      <div class="bloque">
        <h4>Cómo se arma · ≈ ${reloj(partesDe(v).reduce((a, p) => a + segundosDe(p.texto, "normal", p.fijo), 0))}</h4>
        <div class="modos-resumen">${Object.keys(MODOS).filter((m) => cuenta[m]).map((m) => `<div>${chipModo(m)}<span><b>${cuenta[m]}</b> ${cuenta[m] === 1 ? "párrafo" : "párrafos"} · ${MODOS[m].ayuda}</span></div>`).join("")}</div>
      </div>
      <div class="bloque"><h4>Párrafo por párrafo</h4><div class="beats">${beats.map((b, i) => {
        const m = modoDe(b);
        const filas = [
          b.hace ? ["Haces", b.hace] : null,
          b.ve ? [m === "pantalla" ? "Grabas en pantalla" : enOff(m) ? "Se ve (grábalo aparte)" : "Se ve", b.ve] : null,
          b.plano ? ["Plano", b.plano] : null,
        ].filter(Boolean);
        return `
        <label class="beat paso"><input type="checkbox" data-beat="${i}" ${v.hechos.includes(i) ? "checked" : ""}>
          <div>
            <div class="paso-cabeza"><span class="paso-n">${i + 1}</span>${chipModo(m)}<span class="beat-t">${b.t ? `${esc(b.t)} · ` : ""}${Math.round(segundosDe(b.dice, "normal", b.seg))} s</span></div>
            ${enOff(m) ? `<small class="paso-off">Dices, en off:</small>` : ""}
            <p class="beat-dice${DIRECCION.test(String(b.dice).trim()) ? " direccion" : ""}">${esc(b.dice)}</p>
            ${filas.length ? `<dl class="paso-como">${filas.map(([k, x]) => `<div><dt>${k}</dt><dd>${esc(x)}</dd></div>`).join("")}</dl>` : ""}
          </div></label>`;
      }).join("")}</div></div>` : ""}
    ${d.recursos?.length ? `<div class="bloque"><h4>Lo que necesito de ti</h4><ul class="lista-simple">${d.recursos.map((x) => `<li><b>${esc(x.que)}</b>${x.detalle ? `. ${esc(x.detalle)}` : ""}</li>`).join("")}</ul></div>` : ""}
    ${d.ganchos_alt?.length ? `<div class="bloque"><h4>Graba también estas primeras frases (para probar cuál funciona)</h4><div class="alt">${d.ganchos_alt.map((x) => `<div>${esc(x)}</div>`).join("")}</div></div>` : ""}
    ${Object.keys(g).length ? `<div class="bloque"><h4>Cómo grabarlo</h4><div class="datos">${[["plano", "Plano"], ["lugar", "Lugar"], ["luz", "Luz"], ["ropa", "Ropa"]].filter(([k]) => g[k]).map(([k, t]) => `<div><small>${t}</small><span>${esc(g[k])}</span></div>`).join("")}</div></div>` : ""}
    ${d.props?.length ? `<div class="bloque"><h4>Ten a mano</h4><ul class="lista-simple">${d.props.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>` : ""}
    ${d.por_que ? `<div class="bloque"><h4>Por qué funciona</h4><div class="caja">${esc(d.por_que)}</div></div>` : ""}`;
}

const ICONO_ARCHIVO = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><rect x="2" y="3.5" width="9" height="9" rx="2"/><path d="M11 7l3-2v6l-3-2"/></svg>`;

/* Lo que tiene que venir en el material para poder editar. Claude puede fijarlo por MCP en datos.tomas;
   si no, se arma solo desde el guion (modo de cada párrafo). Cada ítem se marca y queda en «hechos» como "t:<id>". */
const GRUPOS = { camara: "1 · A cámara", voz: "2 · Voz en off", encima: "3 · Lo que va encima de tu voz", aparte: "Graba aparte", mandame: "Mándame también", Tomas: "A cámara", Aparte: "Graba aparte" };

function tomasDe(v) {
  const d = v.datos ?? {};
  if (Array.isArray(d.tomas) && d.tomas.length) return d.tomas.map((t, k) => ({ id: t.id ?? `c${k}`, que: t.que, detalle: t.detalle ?? "", grupo: t.grupo ?? "Tomas" }));
  const beats = d.beats ?? [];
  const cita = (x) => `«${String(x).trim().replace(/^[«"]|[»"]$/g, "").replace(/[.]$/, "")}»`;
  const sinParentesis = (x) => String(x).trim().replace(/^\(|\)$/g, "");
  const nums = (f) => beats.map((b, i) => (f(modoDe(b)) ? i + 1 : 0)).filter(Boolean);
  const aCamara = nums((m) => m === "camara"), enVoz = nums(enOff);
  const lista = [];
  if (!beats.length || aCamara.length === beats.length) lista.push({ id: "principal", grupo: "camara", que: "Todo el guion, de corrido", detalle: "De principio a fin con el teleprompter. Si te equivocas, no pares: repite la frase y sigue, yo corto." });
  else if (aCamara.length) lista.push({ id: "principal", grupo: "camara", que: `Los párrafos a cámara, de corrido (${aCamara.length === 1 ? "el" : "los"} ${listaNum(aCamara)})`, detalle: "En el teleprompter elige «A cámara»: se salta los de voz en off. Si te equivocas, repite la frase y sigue." });
  beats.forEach((b, i) => {
    if (modoDe(b) === "escena") lista.push({ id: `esc${i}`, grupo: "camara", que: `Párrafo ${i + 1}, sin hablar: ${sinParentesis(b.dice)}`, detalle: [b.hace, b.ve].filter(Boolean).join(" ") });
  });
  if (v.gancho) lista.push({ id: "gancho", grupo: "camara", que: "La primera frase, 3 veces más", detalle: `${cita(v.gancho)}. Tranquilo; cambia la intención y las pausas, no el volumen. Es lo que decide si se quedan.` });
  (d.ganchos_alt ?? []).forEach((g, k) => lista.push({ id: `alt${k}`, grupo: "camara", que: `Primera frase alternativa ${k + 1}`, detalle: `${cita(g)}. Mismo tono, para probar cuál funciona mejor.` }));
  if (enVoz.length) lista.push({ id: "voz", grupo: "voz", que: `Tu voz en off: ${enVoz.length === 1 ? "el párrafo" : "los párrafos"} ${listaNum(enVoz)}`, detalle: "En el teleprompter elige «Voz en off». Celular a un palmo de la boca, en un lugar sin eco (un clóset con ropa es perfecto); sirve la app Notas de voz. Lee cada párrafo 2 veces." });
  beats.forEach((b, i) => {
    const m = modoDe(b);
    if (enOff(m)) lista.push({ id: `ve${i}`, grupo: "encima", que: `Párrafo ${i + 1} · ${m === "pantalla" ? "grabación de pantalla" : "imagen"}`, detalle: b.ve || "Algo que muestre lo que dices (5–8 s)." });
  });
  (d.broll ?? []).forEach((x, k) => lista.push({ id: `broll${k}`, grupo: "aparte", que: x, detalle: "" }));
  lista.push(
    { id: "reacciones", grupo: "aparte", que: "4 reacciones sin hablar (2 s cada una)", detalle: "Mirar a cámara serio, sonreír, cara de sorpresa y negar con la cabeza. Sirven para cortes, remates y transiciones." },
    { id: "ambiente", grupo: "aparte", que: "10 segundos de silencio en el mismo lugar", detalle: "Sin hablar ni moverte, con la misma cámara. Con eso limpio el ruido de fondo." },
  );
  (d.recursos ?? []).forEach((x, k) => lista.push({ id: `rec${k}`, grupo: "mandame", que: x.que, detalle: x.detalle ?? "" }));
  return lista;
}

function antesDeGrabar(v) {
  const g = v.datos?.grabar ?? {};
  const min = (x) => String(x).charAt(0).toLowerCase() + String(x).slice(1).replace(/\.$/, "");
  return [
    "Graba con el celular en vertical, con la cámara trasera, en 4K a 30 fps (Ajustes → Cámara → Grabar video).",
    "Abre el teleprompter en el Mac o en un iPad, justo debajo del lente, para que se vea que miras a cámara.",
    "Lente limpio, modo «No molestar» y la batería sobre 50 %.",
    g.luz ? `Luz: ${min(g.luz)}.` : "Luz de frente (la ventana delante tuyo, nunca detrás).",
    g.plano ? `Plano: ${min(g.plano)}.` : "Plano medio, a la altura de los ojos, con aire sobre la cabeza.",
    g.lugar ? `Lugar: ${min(g.lugar)}.` : "",
    g.ropa ? `Ropa: ${min(g.ropa)}.` : "",
    "Micrófono de solapa si tienes; si no, el celular a menos de un metro y sin eco.",
    "Deja 2 segundos quieto y en silencio antes y después de cada toma.",
    ...(v.datos?.props?.length ? [`Ten a mano: ${v.datos.props.join(", ")}.`] : []),
  ].filter(Boolean);
}

function listaGrabarHtml(v) {
  const tomas = tomasDe(v);
  const hechas = tomas.filter((t) => v.hechos.includes(`t:${t.id}`)).length;
  const grupos = [...new Set(tomas.map((t) => t.grupo))];
  return `
    <div class="bloque">
      <div class="titulo-lista"><h4>Qué necesito para editar</h4><span class="contador${hechas === tomas.length ? " completo" : ""}">${hechas} de ${tomas.length}</span></div>
      ${grupos.map((gr) => `
        ${grupos.length > 1 ? `<p class="subgrupo">${esc(GRUPOS[gr] ?? gr)}</p>` : ""}
        <div class="beats">${tomas.filter((t) => t.grupo === gr).map((t) => `
          <label class="beat"><input type="checkbox" data-toma="${esc(t.id)}" ${v.hechos.includes(`t:${t.id}`) ? "checked" : ""}>
            <div><p class="beat-dice">${esc(t.que)}</p>${t.detalle ? `<p class="beat-plano">${esc(t.detalle)}</p>` : ""}</div></label>`).join("")}</div>`).join("")}
    </div>
    <details class="antes">
      <summary>Antes de grabar <span>${antesDeGrabar(v).length} cosas</span></summary>
      <ul class="lista-simple">${antesDeGrabar(v).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
    </details>`;
}

function materialHtml(v) {
  const material = v.archivos.filter((a) => a.tipo === "material");
  const subiendo = [...s.subidas.values()].filter((x) => x.video === v.id && x.estado !== "ok");
  const puedeAvisar = material.some((a) => a.estado === "ok") && !subiendo.length;
  const yaListo = HECHO.has(v.estado);
  return `
    ${listaGrabarHtml(v)}
    <label class="zona-subir" id="zona-subir">
      <input type="file" id="campo-archivos" multiple hidden>
      <span class="icono"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13V3.5m0 0L6.5 7M10 3.5L13.5 7"/><path d="M3.5 12.5v2a2 2 0 002 2h9a2 2 0 002-2v-2"/></svg></span>
      <b>Sube tus tomas</b>
      <span>Videos, notas de voz, capturas y archivos, tal cual salen del celular o del computador. Todo junto está bien.</span>
    </label>
    <div class="archivos">${subiendo.map((x) => `<div class="archivo"><span class="ic">${ICONO_ARCHIVO}</span><b>${esc(x.nombre)}</b><small>Subiendo · ${Math.floor((x.hecho / x.bytes) * 100)}%</small><div class="progreso-barra"><i style="width:${(x.hecho / x.bytes) * 100}%"></i></div></div>`).join("")}${material.filter((a) => a.estado === "ok").map((a) => `<div class="archivo"><span class="ic">${ICONO_ARCHIVO}</span><b>${esc(a.nombre)}</b><button class="quitar" data-quitar="${a.id}">Quitar</button><small>${mb(a.bytes)}</small></div>`).join("")}</div>
    ${yaListo ? `
      <div class="en-cola${s.recien ? " recien" : ""}"><span class="check">${CHECK}</span><div><b>${v.estado === "listo" ? "Listo para editar" : ESTADO[v.estado]}</b><span>${v.nota ? `Tu nota: «${esc(v.nota)}»` : "Claude ya lo tiene en la cola."}</span></div></div>
      ${v.estado === "listo" ? `<button class="boton" data-estado="material">Espera, quiero agregar algo</button>` : ""}` : `
      <div class="bloque listo-caja">
        <h4>Nota para Claude (opcional)</h4>
        <textarea class="nota-campo" id="nota" placeholder="La toma 3 es la buena, la segunda primera frase me salió mejor…">${esc(s.borrador ?? v.nota)}</textarea>
        <button class="boton primario ancho" data-listo ${puedeAvisar ? "" : "disabled"}>Listo para editar</button>
        ${!puedeAvisar ? `<p class="ayuda">${subiendo.length ? "Espera a que terminen de subir." : "Sube al menos una toma."}</p>` : ""}
      </div>`}
    ${v.bitacora.length ? `<div class="bloque"><h4>Actividad</h4><div class="bitacora">${v.bitacora.map((b) => `<div><b>${esc(b.quien)}</b> ${esc(b.texto)}<time>${esc(b.creado.slice(5, 16).replace("T", " "))}</time></div>`).join("")}</div></div>` : ""}`;
}

function edicionHtml(v) {
  const e = v.datos.edicion ?? {};
  if (!Object.keys(e).length) return `<p class="vacio">Claude todavía no arma el plan de edición.</p>`;
  return `
    ${e.estilo ? `<div class="bloque"><h4>La idea</h4><div class="caja">${esc(e.estilo)}</div></div>` : ""}
    <div class="datos">
      ${e.subtitulos ? `<div><small>Subtítulos</small><span>${esc(e.subtitulos)}</span></div>` : ""}
      ${e.musica ? `<div><small>Música</small><span>${esc(e.musica)}</span></div>` : ""}
      ${e.ritmo ? `<div><small>Ritmo</small><span>${esc(e.ritmo)}</span></div>` : ""}
    </div>
    ${e.efectos?.length ? `<div class="bloque"><h4>Momentos clave</h4><ul class="lista-simple">${e.efectos.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>` : ""}`;
}

function entregaHtml(v) {
  const entregas = v.archivos.filter((a) => a.tipo === "entrega" && a.estado === "ok");
  const post = v.datos.post ?? {};
  const tags = (post.hashtags ?? []).join(" ");
  return `
    ${entregas.length ? entregas.map((a) => `<div class="bloque"><video class="video-entrega" controls playsinline preload="metadata" data-video="${a.id}"></video><div class="acciones" style="margin-top:10px"><a class="boton primario" data-bajar="${a.id}" href="#" download>Descargar video</a></div></div>`).join("")
      : `<p class="vacio">${v.estado === "editando" ? "Claude lo está editando." : "Todavía no hay video editado."}</p>`}
    ${post.texto ? `<div class="bloque"><h4>Texto del post</h4><div class="caja copiable">${esc(post.texto)}<button class="boton chico" data-copiar="texto">Copiar</button></div></div>` : ""}
    ${tags ? `<div class="bloque"><h4>Hashtags</h4><div class="caja copiable">${esc(tags)}<button class="boton chico" data-copiar="tags">Copiar</button></div></div>` : ""}
    ${post.sonido ? `<div class="bloque"><h4>Sonido para agregar en la app</h4><div class="caja"><b style="color:var(--texto);font-weight:600">${esc(post.sonido)}</b>${post.inicio_sonido ? ` · desde el segundo ${esc(post.inicio_sonido)}` : ""}<br>Agrégalo dentro de TikTok o Instagram: no viene en el archivo, así no te silencian el video.</div></div>` : ""}
    ${v.estado === "entregado" ? `<button class="boton primario ancho" data-estado="publicado">Ya lo publiqué</button>` : ""}`;
}

async function cargarEntregas() {
  for (const el of document.querySelectorAll("[data-video]")) {
    try {
      const { url } = await api(`/api/archivos/${el.dataset.video}/enlace`);
      el.src = url;
      const a = document.querySelector(`[data-bajar="${el.dataset.video}"]`);
      if (a) a.href = url;
    } catch (e) { avisar(e.message); }
  }
}

/* ── Subida por trozos (se retoma si se corta) ── */
let candado = null;
async function mantenerPantalla(on) {
  if (nativo) return nativo("pantalla", { on });
  try {
    if (on && !candado && "wakeLock" in navigator) candado = await navigator.wakeLock.request("screen");
    if (!on && candado) { await candado.release(); candado = null; }
  } catch {}
}

function enviarTrozo(url, cuerpo, alAvanzar) {
  return new Promise((ok, mal) => {
    const x = new XMLHttpRequest();
    x.open("PUT", url);
    x.setRequestHeader("authorization", `Bearer ${s.llave}`);
    x.upload.onprogress = (e) => alAvanzar(e.loaded);
    x.onload = () => (x.status < 300 ? ok() : mal(new Error(`Trozo rechazado (${x.status})`)));
    x.onerror = () => mal(new Error("Se cortó la conexión"));
    x.send(cuerpo);
  });
}

async function subir(videoId, archivo) {
  const temp = crypto.randomUUID();
  const sub = { video: videoId, nombre: archivo.name, bytes: archivo.size || 1, hecho: 0, estado: "subiendo" };
  s.subidas.set(temp, sub);
  const memoria = `estudio:subida:${videoId}:${archivo.name}:${archivo.size}:${archivo.lastModified}`;
  let id = leerLocal(memoria);
  let parte, hechas = [];
  if (id) {
    try { ({ parte, hechas } = await api(`/api/archivos/${id}/partes`)); } catch { id = null; }
  }
  if (!id) {
    ({ id, parte } = await api(`/api/videos/${videoId}/archivos`, { method: "POST", body: JSON.stringify({ nombre: archivo.name, mime: archivo.type, bytes: archivo.size }) }));
    guardarLocal(memoria, id);
  }
  const total = Math.max(1, Math.ceil(archivo.size / parte));
  const avance = new Map(hechas.map((n) => [n, Math.min(parte, archivo.size - (n - 1) * parte)]));
  const refrescar = () => { sub.hecho = [...avance.values()].reduce((a, b) => a + b, 0); if (s.pestana === "material" && s.sel === videoId) pintarDetalle(); };
  const cola = Array.from({ length: total }, (_, i) => i + 1).filter((n) => !hechas.includes(n));
  const obrero = async () => {
    while (cola.length) {
      const n = cola.shift();
      const trozo = archivo.slice((n - 1) * parte, Math.min(n * parte, archivo.size));
      for (let intento = 1; ; intento++) {
        try {
          await enviarTrozo(`${API}/api/archivos/${id}/partes/${n}`, trozo, (b) => { avance.set(n, b); refrescar(); });
          avance.set(n, trozo.size); refrescar();
          break;
        } catch (e) {
          if (intento >= 5) throw e;
          await new Promise((r) => setTimeout(r, 1500 * intento));
        }
      }
    }
  };
  await Promise.all([obrero(), obrero(), obrero()]);
  await api(`/api/archivos/${id}/cerrar`, { method: "POST" });
  guardarLocal(memoria, null);
  sub.estado = "ok";
  s.subidas.delete(temp);
}

async function subirVarios(videoId, archivos) {
  if (!archivos.length) return;
  mantenerPantalla(true);
  avisar(`Subiendo ${archivos.length} archivo${archivos.length > 1 ? "s" : ""}. No cierres esta pestaña.`);
  let fallas = 0;
  for (const a of archivos) {
    try { await subir(videoId, a); }
    catch (e) { fallas++; avisar(`«${a.name}»: ${e.message}. Vuelve a elegirlo y sigue donde quedó.`); }
    finally { for (const [k, x] of s.subidas) if (x.nombre === a.name && x.video === videoId) s.subidas.delete(k); }
  }
  mantenerPantalla(false);
  if (!fallas) avisar("Material arriba ✓");
  if (s.sel === videoId) { s.detalle = await api(`/api/videos/${videoId}`); pintarDetalle(); }
  s.videos = await api("/api/videos");
  pintar();
}


/* ── Teleprompter: un párrafo a la vez, cada uno con su tiempo (como el estudio de voz de Delta Force) ── */
const RITMOS = { lento: 135, normal: 160, rapido: 185 }; // palabras por minuto
const DIRECCION = /^\(.*\)$/s; // «(mira a cámara en silencio, 2 segundos)» es una indicación, no se dice

/* Segundos de un párrafo: lo que dura decirlo al ritmo elegido + medio segundo de aire. Las indicaciones usan su propio número. */
function segundosDe(texto, ritmo = "normal", fijo) {
  if (fijo) return Number(fijo);
  const t = String(texto).trim();
  if (DIRECCION.test(t)) { const n = t.match(/(\d+(?:[.,]\d+)?)\s*seg/); return n ? Number(n[1].replace(",", ".")) : 2; }
  if (/^\[[^\]]*\]\.?$/.test(t)) return 10; // un párrafo que es solo [lo que cuentas tú] se estima como una historia corta
  const palabras = t.replace(/\[[^\]]*\]/g, "xx xx xx").split(/\s+/).filter(Boolean).length;
  return Math.max(1.5, Math.round((palabras / (RITMOS[ritmo] / 60) + 0.5) * 10) / 10);
}
const reloj = (seg) => `${Math.floor(seg / 60)}:${String(Math.floor(seg % 60)).padStart(2, "0")}`;

function partesDe(v, filtro = "todo") {
  const beats = v.datos?.beats ?? [];
  const partes = beats.map((b, i) => ({ n: i + 1, t: b.t ?? "", texto: b.dice, fijo: b.seg, modo: modoDe(b), hace: b.hace ?? "" }));
  if (v.gancho && !beats.some((b) => b.dice === v.gancho)) partes.unshift({ n: 0, t: "GANCHO", texto: v.gancho, modo: "camara", hace: "" });
  if (filtro === "camara") return partes.filter((p) => !enOff(p.modo));
  if (filtro === "voz") return partes.filter((p) => enOff(p.modo));
  return partes;
}

let pr = {
  partes: [], i: 0, hecho: 0, corre: false, raf: 0, ultimo: 0, cuenta: 0,
  ritmo: leerLocal("estudio:ritmo") in RITMOS ? leerLocal("estudio:ritmo") : "normal",
  auto: leerLocal("estudio:auto") !== "no",
  v: null, filtro: "todo",
  voz: false, seg: null, palabras: [], pintado: 0, ultimaVoz: 0, vigia: 0, terminado: false,
};
const durPr = (k) => segundosDe(pr.partes[k].texto, pr.ritmo, pr.partes[k].fijo);

/* ── Seguir la voz: en el Mac con el oído nativo (sin internet); en el navegador, con el reconocimiento del navegador si existe ── */
const fuenteVoz = (() => {
  if (nativo) return { nativa: true, oir: (frases) => nativo("oir", { frases }), callar: () => nativo("callar") };
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;
  let r = null;
  return {
    nativa: false,
    oir() {
      r = new SR(); r.lang = "es-CL"; r.continuous = true; r.interimResults = true;
      r.onresult = (e) => {
        let tramo = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const x = e.results[i];
          if (x.isFinal) alOir(x[0].transcript, true); else tramo += ` ${x[0].transcript}`;
        }
        if (tramo.trim()) alOir(tramo, false);
      };
      r.onstart = () => alEstadoVoz("escuchando");
      r.onerror = (e) => { if (e.error === "not-allowed" || e.error === "service-not-allowed") alErrorVoz("El navegador no tiene permiso para el micrófono."); };
      r.onend = () => { if (pr.corre && pr.voz && r) try { r.start(); } catch {} }; // el navegador corta solo cada tanto: se retoma
      r.start();
    },
    callar() { const x = r; r = null; try { x?.stop(); } catch {} },
  };
})();
window.heikaNativo = {
  recibir(tipo, d) {
    if (tipo === "oido") alOir(d.texto, d.final);
    else if (tipo === "oido-estado") alEstadoVoz(d.estado, d.progreso);
    else if (tipo === "oido-error") alErrorVoz(d.mensaje);
    else if (tipo === "oido-nivel") pintarNivel(d.nivel);
    else if (tipo === "aviso") avisar(d.texto);
  },
};

function alOir(texto, final) {
  if (!pr.voz || !pr.corre || !pr.seg) return;
  const antes = pr.seg.cursor;
  const { retomas } = pr.seg.oir(texto, final);
  confirmar(antes, pr.seg.cursor);
  if (pr.seg.cursor !== antes || String(texto).trim()) pr.ultimaVoz = performance.now();
  if (retomas) marcarToma();
  seguirCursor();
}

function alEstadoVoz(estado, progreso) {
  const t = { preparando: "Preparando…", descargando: `Bajando el español · ${Math.round((progreso ?? 0) * 100)} %`, escuchando: "Te escucho" }[estado] ?? estado;
  oidoTexto(t, estado === "escuchando");
}
function alErrorVoz(mensaje) { pausarPrompter(); avisar(mensaje); }
function oidoTexto(t, vivo = false) { $("#pr-oido-texto").textContent = t; $("#pr-oido").classList.toggle("vivo", vivo); }
function pintarNivel(n) {
  // ¿Estás hablando? Se compara con el ruido de fondo, que se va aprendiendo solo (sube lento, baja de inmediato)
  const c = pr.cab;
  c.piso = n < c.piso ? n : c.piso + (n - c.piso) * 0.004;
  if (n > c.piso + 0.13) c.hablaHasta = performance.now() + 260;
  // cinco barras que suben con la voz (la del medio más alta)
  [0.55, 0.8, 1, 0.8, 0.55].forEach((f, k) => { const b = $(`#pr-oido .pr-nivel b:nth-child(${k + 1})`); if (b) b.style.transform = `scaleY(${Math.max(0.18, Math.min(1, n * f * 1.25))})`; });
}

/* Pinta las palabras ya dichas y la que viene, y mueve el párrafo cuando lo terminas */
/* El cabezal: las palabras se llenan en continuo mientras hablas.
   El reconocimiento llega ~0,8 s tarde, así que mientras el micrófono oye voz el cabezal avanza solo a tu ritmo
   (hasta 2 palabras más allá de lo confirmado) y el reconocimiento lo va corrigiendo. Si te callas, vuelve a lo confirmado. */
const ADELANTO = 2.2;
function cabezalNuevo() { return { pos: 0, extra: 0, ritmo: 2.6, tAvance: performance.now(), piso: 0.12, hablaHasta: 0, calla: 0, raf: 0, ultimo: performance.now(), llenos: [] }; }
pr.cab = cabezalNuevo();
window.__pos = () => pr.cab.pos.toFixed(1); // para las pruebas

function confirmar(antes, ahora) {
  const c = pr.cab, t = performance.now();
  if (ahora > antes) {
    const dt = (t - c.tAvance) / 1000;
    if (dt > 0.08) c.ritmo = c.ritmo * 0.75 + Math.min(4.5, Math.max(1.3, (ahora - antes) / dt)) * 0.25;
    c.extra = Math.max(0, c.extra - (ahora - antes));
    c.tAvance = t;
  } else if (ahora < antes) { c.extra = 0; c.pos = Math.min(c.pos, ahora); } // repetiste o volviste: el cabezal vuelve
}

function moverCabezal(t) {
  const c = pr.cab;
  const dt = Math.min(0.05, (t - c.ultimo) / 1000);
  c.ultimo = t;
  const seg = pr.seg, W = seg.guion.palabras, cur = seg.cursor;
  const nativa = fuenteVoz?.nativa;
  const habla = pr.corre && (nativa ? t < c.hablaHasta : t - pr.ultimaVoz < 700);
  const p = cur < W.length ? W[cur].p : pr.partes.length - 1;
  const fin = seg.guion.inicios[p + 1] ?? W.length;
  const libre = W[cur]?.libre;
  if (habla && !libre) c.extra = Math.min(ADELANTO, c.extra + c.ritmo * dt);
  c.calla = habla ? 0 : c.calla + dt;
  if (c.calla > 0.5) c.extra = Math.max(0, c.extra - dt * 3); // callado: se devuelve a lo confirmado
  const objetivo = Math.min(fin, cur + c.extra);
  // sube rápido y suave; baja más lento (solo cuando te callaste y lo predicho no se dijo)
  c.pos += (objetivo - c.pos) * (1 - Math.exp(-dt * (objetivo >= c.pos ? 16 : 6)));
  pintarLlenado();
  pintarReloj();
  c.raf = requestAnimationFrame(moverCabezal);
}

function pintarLlenado() {
  const c = pr.cab, pos = c.pos;
  for (let k = 0; k < pr.palabras.length; k++) {
    const v = Math.max(0, Math.min(1, pos - k));
    if (Math.abs((c.llenos[k] ?? -1) - v) < 0.004) continue;
    c.llenos[k] = v;
    pr.palabras[k].style.setProperty("--lleno", v.toFixed(3));
    pr.palabras[k].classList.toggle("dicha", v >= 1);
  }
  const W = pr.seg.guion.palabras;
  $("#pr-lista").querySelectorAll(".pr-tuyo.hablando").forEach((x) => x.classList.remove("hablando"));
  if (W[pr.seg.cursor]?.libre && performance.now() - pr.ultimaVoz < 900) pr.palabras[pr.seg.cursor]?.classList.add("hablando");
}

function arrancarCabezal() { cancelAnimationFrame(pr.cab.raf); pr.cab.ultimo = performance.now(); pr.cab.raf = requestAnimationFrame(moverCabezal); }
function pararCabezal() { cancelAnimationFrame(pr.cab.raf); pr.cab.raf = 0; }

function seguirCursor() {
  const p = pr.seg.parrafo();
  if (p !== pr.i) { pr.i = p; pintarPrompter(); } else pintarReloj();
  if (pr.seg.terminado() && !pr.terminado) {
    pr.terminado = true;
    setTimeout(() => { if (pr.terminado) { pausarPrompter(); avisar(pr.seg.tomas ? `Terminado · repetiste ${pr.seg.tomas} ${pr.seg.tomas === 1 ? "frase" : "frases"}` : "Terminado"); } }, 1200);
  }
}

/* Te equivocaste y repetiste: se anota la toma (servirá para que Claude encuentre la buena) */
function marcarToma() {
  pr.marcas = pr.marcas ?? [];
  pr.marcas.push({ parrafo: pr.partes[pr.seg.parrafo()]?.n, en: new Date().toISOString() });
  const el = $("#pr-toma");
  el.textContent = `Toma ${pr.seg.tomas + 1} · desde el principio de la frase`;
  el.classList.remove("visible"); void el.offsetWidth; el.classList.add("visible");
}
const totalPr = () => pr.partes.reduce((a, _, k) => a + durPr(k), 0);

/* El teleprompter muestra SOLO lo que se dice: fuera las tomas sin hablar, las indicaciones entre paréntesis,
   las etiquetas y el «cómo se graba» (eso vive en el guion y en Material, no frente al lente). */
const sinIndicaciones = (t) => String(t).replace(/\([^)]*\)/g, " ").replace(/\s{2,}/g, " ").replace(/\s+([.,;:!?])/g, "$1").trim();
function hablado(v, filtro) {
  return partesDe(v)
    .filter((p) => p.modo !== "escena" && !DIRECCION.test(String(p.texto).trim()))
    .map((p) => ({ ...p, texto: sinIndicaciones(p.texto) }))
    .filter((p) => p.texto && (filtro === "camara" ? !enOff(p.modo) : filtro === "voz" ? enOff(p.modo) : true));
}

function abrirPrompter(v) {
  if (!partesDe(v).length) return avisar("Este video todavía no tiene guion.");
  const camara = hablado(v, "camara").length, voz = hablado(v, "voz").length;
  if (!camara && !voz) return avisar("En este video no hablas: son tomas sin texto. Están en Material.");
  pr.v = v; pr.filtro = camara ? "camara" : "voz"; // primero lo que dices a cámara; la voz en off se graba aparte
  $("#pr-filtro").hidden = !(camara && voz);
  $('[data-filtro="camara"]').textContent = `A cámara · ${camara}`;
  $('[data-filtro="voz"]').textContent = `Voz en off · ${voz}`;
  pr.voz = !!fuenteVoz && (fuenteVoz.nativa ? leerLocal("estudio:voz") !== "no" : leerLocal("estudio:voz") === "si");
  $("#pr-modo").hidden = !fuenteVoz;
  armarPrompter();
  nativo?.("privado", { on: true }); // el teleprompter no sale en las grabaciones de pantalla
  $("#prompter").classList.toggle("espejo", leerLocal("estudio:espejo") === "si");
  $("#pr-auto").checked = pr.auto;
  $("#prompter").hidden = false;
  document.body.style.overflow = "hidden";
  history.pushState({ prompter: true }, "");
  mantenerPantalla(true);
  pintarPrompter();
}

/* «A cámara» deja solo lo que se dice mirando al lente; «Voz en off», lo que se graba solo con la voz. */
function armarPrompter() {
  pr.partes = hablado(pr.v, pr.filtro);
  pr.i = 0; pr.hecho = 0; pr.pintado = 0; pr.terminado = false;
  // Cada palabra en su <span>, para pintar las que ya dijiste. [lo que cuentas con tus palabras] se ve más suave.
  pr.seg = crearSeguidor(pr.partes.map((p) => p.texto), esc);
  $("#pr-lista").innerHTML = pr.partes.map((p, k) => `
    <div class="pr-parrafo" data-pi="${k}">
      <p>${pr.seg.guion.html[k]}</p>
      <i class="pr-progreso"><b></b></i>
    </div>`).join("");
  pr.palabras = [...$("#pr-lista").querySelectorAll("[data-w]")];
  $("#prompter").classList.toggle("modo-voz", pr.voz);
  document.querySelectorAll("[data-modo]").forEach((b) => b.setAttribute("aria-pressed", String((b.dataset.modo === "voz") === pr.voz)));
  oidoTexto(pr.voz ? "Toca ▶ y empieza a hablar" : "");
  $("#pr-oido").hidden = !pr.voz;
  pararCabezal();
  pr.cab = { ...cabezalNuevo(), piso: pr.cab.piso };
  if (pr.voz) { pintarLlenado(); seguirCursor(); }
}

function cerrarPrompter(desdeHistorial = false) {
  if ($("#prompter").hidden) return;
  pausarPrompter();
  clearInterval(pr.cuentaIntervalo); $("#pr-cuenta").hidden = true;
  $("#prompter").hidden = true;
  nativo?.("privado", { on: false });
  document.body.style.overflow = s.sel ? "hidden" : "";
  if (!s.subidas.size) mantenerPantalla(false);
  if (!desdeHistorial && history.state?.prompter) history.back();
}

function pintarPrompter() {
  document.querySelectorAll("[data-ritmo]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.ritmo === pr.ritmo)));
  document.querySelectorAll("[data-filtro]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.filtro === pr.filtro)));
  document.querySelectorAll(".pr-parrafo").forEach((el, k) => {
    el.classList.toggle("actual", k === pr.i);
    el.classList.toggle("pasado", k < pr.i);
    el.querySelector(".pr-progreso b").style.transform = `scaleX(${k < pr.i ? 1 : k === pr.i ? avanceParrafo(k) : 0})`;
  });
  // El párrafo actual queda arriba, cerca del lente, para que no se note que lees.
  const actual = document.querySelector(`.pr-parrafo[data-pi="${pr.i}"]`);
  $("#pr-escenario").scrollTop = 0; // nada debe desplazar el escenario fuera del transform
  if (actual) $("#pr-lista").style.transform = `translateY(${Math.round($("#pr-escenario").clientHeight * 0.22 - actual.offsetTop)}px)`;
  pintarReloj();
  $("#prompter").classList.toggle("corriendo", pr.corre);
  $('[data-p="play"]').setAttribute("aria-label", pr.corre ? "Pausa" : "Partir");
}

/* Cuánto llevas del párrafo: por palabras dichas (voz) o por tiempo */
function avanceParrafo(k) {
  if (!pr.voz) return Math.min(1, pr.hecho / durPr(k));
  const W = pr.seg.guion.palabras, ini = pr.seg.guion.inicios[k];
  const fin = (pr.seg.guion.inicios[k + 1] ?? W.length);
  return fin > ini ? Math.min(1, Math.max(0, (pr.cab.pos - ini) / (fin - ini))) : 0;
}

function pintarReloj() {
  if (pr.voz) $("#pr-reloj").textContent = `${pr.i + 1} de ${pr.partes.length}`;
  else {
    let pasado = pr.hecho;
    for (let k = 0; k < pr.i; k++) pasado += durPr(k);
    $("#pr-reloj").textContent = `${pr.i + 1} de ${pr.partes.length} · ${reloj(pasado)} / ${reloj(totalPr())}`;
  }
  const b = document.querySelector(`.pr-parrafo[data-pi="${pr.i}"] .pr-progreso b`);
  if (b) b.style.transform = `scaleX(${avanceParrafo(pr.i)})`;
}

function irA(k) {
  pr.i = Math.max(0, Math.min(pr.partes.length - 1, k));
  pr.hecho = 0;
  if (pr.seg) {
    pr.seg.irA(pr.i); pr.terminado = false;
    Object.assign(pr.cab, { pos: pr.seg.cursor, extra: 0, tAvance: performance.now() });
    if (pr.voz) { pintarLlenado(); return seguirCursor(); }
  }
  pintarPrompter();
}

/* En modo voz, ▶ empieza a escuchar (sin cuenta regresiva: el texto espera a que hables) */
function escuchar() {
  pr.corre = true; pr.terminado = false; pr.ultimaVoz = performance.now();
  oidoTexto("Preparando…");
  fuenteVoz.oir([...new Set(pr.partes.flatMap((p) => p.texto.split(/\s+/)).map((w) => w.replace(/[^\p{L}\p{N}]/gu, "")).filter((w) => w.length > 3))].slice(0, 200));
  clearInterval(pr.vigia);
  // Si te quedas callado en un pedazo [libre], se da por dicho y pasa al siguiente
  pr.vigia = setInterval(() => { if (performance.now() - pr.ultimaVoz > 1700 && performance.now() > pr.cab.hablaHasta + 1200 && pr.seg.silencio()) { confirmar(pr.seg.cursor - 1, pr.seg.cursor); seguirCursor(); } }, 300);
  arrancarCabezal();
  pintarPrompter();
}

function partirPrompter() {
  if (pr.corre || pr.cuenta) return;
  if (pr.voz) return escuchar();
  // Cuenta regresiva antes de partir desde un párrafo nuevo (no al retomar una pausa).
  if (pr.hecho === 0) {
    pr.cuenta = 3;
    $("#pr-cuenta").hidden = false;
    $("#pr-cuenta").innerHTML = `<span>${pr.cuenta}</span>`;
    pr.cuentaIntervalo = setInterval(() => {
      pr.cuenta--;
      if (pr.cuenta > 0) { $("#pr-cuenta").innerHTML = `<span>${pr.cuenta}</span>`; return; }
      clearInterval(pr.cuentaIntervalo);
      $("#pr-cuenta").hidden = true;
      correrPrompter();
    }, 800);
    return;
  }
  correrPrompter();
}

function correrPrompter() {
  pr.corre = true; pr.cuenta = 0; pr.ultimo = performance.now();
  pintarPrompter();
  const paso = (t) => {
    if (!pr.corre) return;
    pr.hecho += (t - pr.ultimo) / 1000;
    pr.ultimo = t;
    if (pr.hecho >= durPr(pr.i)) {
      if (!pr.auto) { pr.hecho = durPr(pr.i); pintarReloj(); return pausarPrompter(); }
      if (pr.i >= pr.partes.length - 1) { pr.hecho = durPr(pr.i); pausarPrompter(); return avisar(`Terminado · ${reloj(totalPr())}`); }
      pr.i++; pr.hecho = 0;
      pintarPrompter();
    } else pintarReloj();
    pr.raf = requestAnimationFrame(paso);
  };
  pr.raf = requestAnimationFrame(paso);
}

function pausarPrompter() {
  if (pr.cuenta) { clearInterval(pr.cuentaIntervalo); pr.cuenta = 0; $("#pr-cuenta").hidden = true; }
  if (pr.voz && pr.corre) { fuenteVoz?.callar(); clearInterval(pr.vigia); pararCabezal(); oidoTexto("En pausa"); pintarNivel(0); }
  pr.corre = false;
  cancelAnimationFrame(pr.raf);
  pintarPrompter();
}

function accionPrompter(p) {
  if (p === "cerrar") return cerrarPrompter();
  if (p === "espejo") { const on = $("#prompter").classList.toggle("espejo"); return guardarLocal("estudio:espejo", on ? "si" : null); }
  if (p === "play") return pr.corre || pr.cuenta ? pausarPrompter() : partirPrompter();
  const seguia = pr.corre;
  const alInicio = pr.voz ? pr.seg.cursor === pr.seg.guion.inicios[pr.i] : pr.hecho <= 1.5;
  if (p === "anterior") irA(alInicio ? pr.i - 1 : pr.i); // como en un reproductor: primero vuelve al inicio del párrafo
  if (p === "siguiente") irA(pr.i + 1);
  if (seguia) { pr.ultimo = performance.now(); }
}


async function cambiarEstado(estado, extra = {}) {
  const v = s.detalle;
  s.detalle = await api(`/api/videos/${v.id}`, { method: "PATCH", body: JSON.stringify({ estado, ...extra }) });
  const i = s.videos.findIndex((x) => x.id === v.id);
  if (i >= 0) s.videos[i] = { ...s.videos[i], estado };
  pintar();
  pintarDetalle();
}

/* ── Eventos ── */
document.addEventListener("click", async (e) => {
  const t = e.target.closest("[data-abrir],[data-cerrar],[data-pestana-det],[data-prompter],[data-listo],[data-estado],[data-quitar],[data-copiar],[data-vista],[data-mes],[data-p],[data-ritmo],[data-filtro],[data-modo],[data-pi],[data-dia],[data-plegar],[data-abrir-lateral],[data-cerrar-lateral],[data-salir],[data-ir-hoy]");
  if (!t) { if (e.target.id === "velo") cerrarDetalle(); return; }
  const d = t.dataset;
  if ("plegar" in d) return plegar();
  if ("abrirLateral" in d) return lateralMovil(true);
  if ("cerrarLateral" in d) return lateralMovil(false);
  if ("salir" in d) { if (confirm("¿Cambiar la llave de acceso en este equipo?")) salir(); return; }
  if ("irHoy" in d) { lateralMovil(false); return irAHoy(); }
  if (d.abrir) return abrir(d.abrir, d.pestana || (s.sel === d.abrir ? s.pestana : "guion"));
  if (d.dia) {
    s.dia = d.dia;
    if (d.dia.slice(0, 7) !== s.mes) s.mes = d.dia.slice(0, 7);
    return pintar();
  }
  if ("cerrar" in d) return cerrarDetalle();
  if (d.pestanaDet) { if (d.pestanaDet !== s.pestana) { s.pestana = d.pestanaDet; s.cambioPestana = true; } return pintarDetalle(); }
  if (d.vista) {
    lateralMovil(false);
    if (d.vista === s.vista) return;
    s.vista = d.vista; guardarLocal("estudio:vista", d.vista); s.animar = "vista"; scrollTo({ top: 0 });
    return pintar();
  }
  if (d.mes) {
    if (d.mes === "hoy") return irAHoy();
    const [a, m] = s.mes.split("-").map(Number); const x = new Date(a, m - 1 + Number(d.mes), 1);
    s.mes = aTexto(x).slice(0, 7);
    s.animar = Number(d.mes) < 0 ? "izq" : "der";
    return pintar();
  }
  if (d.prompter) {
    const v = s.detalle?.id === d.prompter ? s.detalle : await api(`/api/videos/${d.prompter}`);
    return abrirPrompter(v);
  }
  if (d.p) return accionPrompter(d.p);
  if (d.filtro) { pausarPrompter(); pr.filtro = d.filtro; armarPrompter(); return pintarPrompter(); }
  if (d.modo) { pausarPrompter(); pr.voz = d.modo === "voz"; guardarLocal("estudio:voz", pr.voz ? "si" : "no"); armarPrompter(); return pintarPrompter(); }
  if (d.ritmo) { pr.ritmo = d.ritmo; guardarLocal("estudio:ritmo", d.ritmo); pr.hecho = Math.min(pr.hecho, durPr(pr.i) - 0.1); return pintarPrompter(); }
  if (d.pi) { const seguia = pr.corre; irA(Number(d.pi)); if (seguia) pr.ultimo = performance.now(); return; }
  try {
    if ("listo" in d) {
      t.disabled = true;
      await cambiarEstado("listo", { nota: $("#nota")?.value.trim() ?? "" });
      s.recien = true; s.borrador = null;
      pintarDetalle();
      navigator.vibrate?.(18);
      avisar("Listo. Claude ya lo ve en la cola");
    } else if (d.estado) {
      s.recien = false;
      await cambiarEstado(d.estado);
    } else if (d.quitar) {
      if (!confirm("¿Quitar este archivo?")) return;
      await api(`/api/archivos/${d.quitar}`, { method: "DELETE" });
      s.detalle = await api(`/api/videos/${s.sel}`);
      pintarDetalle();
    } else if (d.copiar) {
      const post = s.detalle.datos.post ?? {};
      await navigator.clipboard.writeText(d.copiar === "tags" ? (post.hashtags ?? []).join(" ") : post.texto);
      avisar("Copiado");
    }
  } catch (err) { avisar(err.message); t.disabled = false; }
});

$("#pr-auto").addEventListener("change", (e) => { pr.auto = e.target.checked; guardarLocal("estudio:auto", pr.auto ? null : "no"); });
window.addEventListener("popstate", () => cerrarPrompter(true));
window.addEventListener("resize", () => { if (!$("#prompter").hidden) pintarPrompter(); moverIndicadores(); });

document.addEventListener("input", (e) => { if (e.target.id === "nota") s.borrador = e.target.value; });

document.addEventListener("change", (e) => {
  if (e.target.id === "campo-archivos") { subirVarios(s.sel, [...e.target.files]); e.target.value = ""; }
  if (e.target.dataset.beat != null || e.target.dataset.toma != null) {
    const visibles = new Set([...document.querySelectorAll("[data-beat],[data-toma]")].map((x) => (x.dataset.toma != null ? `t:${x.dataset.toma}` : Number(x.dataset.beat))));
    const marcados = [...document.querySelectorAll("[data-beat]:checked,[data-toma]:checked")].map((x) => (x.dataset.toma != null ? `t:${x.dataset.toma}` : Number(x.dataset.beat)));
    const hechos = [...s.detalle.hechos.filter((h) => !visibles.has(h)), ...marcados];
    s.detalle.hechos = hechos;
    api(`/api/videos/${s.sel}`, { method: "PATCH", body: JSON.stringify({ hechos }) }).catch((err) => avisar(err.message));
    if (e.target.dataset.toma != null) {
      const c = $(".contador"); const total = document.querySelectorAll("[data-toma]").length; const n = document.querySelectorAll("[data-toma]:checked").length;
      if (c) { c.textContent = `${n} de ${total}`; c.classList.toggle("completo", n === total); }
    }
  }
});

for (const tipo of ["dragenter", "dragover"]) document.addEventListener(tipo, (e) => {
  const z = e.target.closest?.("#zona-subir");
  if (z) { e.preventDefault(); z.classList.add("encima"); }
});
document.addEventListener("dragleave", (e) => e.target.closest?.("#zona-subir")?.classList.remove("encima"));
document.addEventListener("drop", (e) => {
  const z = e.target.closest?.("#zona-subir");
  if (!z) return;
  e.preventDefault();
  z.classList.remove("encima");
  subirVarios(s.sel, [...e.dataTransfer.files]);
});

document.addEventListener("keydown", (e) => {
  if (e.target.matches?.("textarea, input[type=password], input[type=text]")) return;
  if (!$("#prompter").hidden) {
    const tecla = { Escape: "cerrar", " ": "play", ArrowLeft: "anterior", ArrowUp: "anterior", ArrowRight: "siguiente", ArrowDown: "siguiente" }[e.key];
    if (tecla) { e.preventDefault(); accionPrompter(tecla); }
    return;
  }
  if (e.key === "Escape" && $("#app").classList.contains("lateral-abierta")) return lateralMovil(false);
  if (e.key === "Escape" && s.sel) cerrarDetalle();
  if (e.key === "[" && !s.sel) return plegar();
  if (s.sel || s.vista !== "mes" || !$("#prompter").hidden) return;
  if (e.key === "ArrowLeft") $('[data-mes="-1"]').click();
  if (e.key === "ArrowRight") $('[data-mes="1"]').click();
});

window.addEventListener("beforeunload", (e) => { if ([...s.subidas.values()].some((x) => x.estado !== "ok")) e.preventDefault(); });
document.addEventListener("visibilitychange", async () => {
  if (document.visibilityState !== "visible" || !s.llave || s.subidas.size) return;
  try { s.videos = await api("/api/videos"); pintar(); if (s.sel) { s.detalle = await api(`/api/videos/${s.sel}`); pintarDetalle(); } } catch {}
});

if (s.llave) cargar().catch((e) => mostrarEntrada(e.message));
else mostrarEntrada();
