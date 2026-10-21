/* Estudio · calendario de orgánicos. Lee el calendario del Worker, sube el material por trozos y avisa «listo para editar». */
const API = window.ESTUDIO_API;
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const PILARES = {
  ia: { nombre: "Construyo con IA", var: "ia" },
  anuncios: { nombre: "Anuncios que venden", var: "anuncios" },
  diseno: { nombre: "Diseño que cobra caro", var: "diseno" },
  condor: { nombre: "Cóndor por dentro", var: "condor" },
  chile: { nombre: "Chile + IA", var: "chile" },
};
const pilar = (k) => PILARES[k] ?? { nombre: k || "Sin pilar", var: null };
const tono = (k) => { const p = pilar(k); return p.var ? `--evento:var(--p-${p.var});--evento-suave:var(--p-${p.var}-suave)` : "--evento:var(--texto-3);--evento-suave:var(--sup-2)"; };
const ESTADO = {
  grabar: "Por grabar", material: "Con material", listo: "Listo para editar", editando: "En edición",
  entregado: "Entregado", publicado: "Publicado", descartado: "Descartado",
};
const HECHO = new Set(["listo", "editando", "entregado", "publicado"]);

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
function mostrarEntrada(error) {
  $("#app").hidden = true;
  $("#entrada").hidden = false;
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
  $("#entrada").hidden = true;
  $("#app").hidden = false;
  pintar();
  const id = new URLSearchParams(location.hash.slice(1)).get("v");
  if (id && !s.sel) abrir(id);
}

/* ── Vista principal ── */
function pintar() {
  const [a, m] = s.mes.split("-").map(Number);
  const agenda = s.vista === "agenda";
  $("#titulo-mes").textContent = agenda ? "Próximos videos" : `${MESES_LARGO[m - 1]} ${a}`;
  document.querySelectorAll(".nav-mes .icono-boton, .nav-mes .boton").forEach((b) => (b.hidden = agenda));
  document.querySelectorAll(".segmento button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.vista === s.vista)));
  const hechos = s.videos.filter((v) => HECHO.has(v.estado)).length;
  $("#progreso").innerHTML = s.videos.length ? `<b>${hechos}</b> de ${s.videos.length} grabados` : "";
  pintarHoy();
  agenda ? pintarAgenda() : pintarMes();
}

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

function pintarHoy() {
  const v = videoDeHoy();
  const el = $("#hoy");
  if (!v) { el.innerHTML = ""; return; }
  const d = aFecha(v.fecha);
  el.innerHTML = `
    <div class="hoy-toca" style="${tono(v.pilar)}">
      <div class="hoy-cuando"><small>${DIAS[d.getDay()]}</small><b>${d.getDate()}</b></div>
      <div class="hoy-texto">
        <div class="hoy-etiqueta">${v.fecha === hoyTexto() ? "Hoy toca grabar" : `Próximo · ${cuandoTexto(v.fecha)}`}<span class="pilar">${esc(pilar(v.pilar).nombre)}</span></div>
        <h2>${esc(v.titulo)}</h2>
        ${v.gancho ? `<p>«${esc(v.gancho)}»</p>` : ""}
      </div>
      <div class="hoy-acciones">
        <button class="boton primario" data-abrir="${v.id}" data-pestana="guion">Ver guion</button>
        <button class="boton" data-prompter="${v.id}">Teleprompter</button>
        <button class="boton" data-abrir="${v.id}" data-pestana="material">Subir</button>
      </div>
    </div>`;
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
    const clases = ["cal-dia", d.getMonth() !== m - 1 && "fuera", f === hoy && "hoy", f === s.dia && "elegido"].filter(Boolean).join(" ");
    return `<div class="${clases}" data-dia="${f}">
      <span class="cal-num">${d.getDate()}</span>
      ${vs.map((v) => `<button class="evento${HECHO.has(v.estado) ? " hecho" : ""}${v.id === s.sel ? " activo" : ""}" style="${tono(v.pilar)}" data-abrir="${v.id}"><b>${esc(v.titulo)}</b><span class="estado e-${v.estado}">${ESTADO[v.estado]}</span></button>`).join("")}
      ${vs.length ? `<i class="punto-ev${vs.every((v) => HECHO.has(v.estado)) ? " hecho" : ""}" style="${tono(vs[0].pilar)}"></i>` : ""}
    </div>`;
  }).join("");
  const delDia = porDia.get(s.dia) ?? [];
  const dd = aFecha(s.dia);
  $("#vista").innerHTML = `
    <div class="calendario">
      <div class="cal-cabeza">${["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((x) => `<div>${x}</div>`).join("")}</div>
      <div class="cal-grilla">${celdas}</div>
    </div>
    <div class="dia-panel">
      <h3>${s.dia === hoy ? "Hoy" : `${DIAS[dd.getDay()]} ${dd.getDate()} de ${MESES_LARGO[dd.getMonth()].toLowerCase()}`}</h3>
      ${delDia.length ? delDia.map(tarjetaHtml).join("") : `<p class="vacio">Sin video este día.</p>`}
    </div>`;
}

function tarjetaHtml(v) {
  return `<button class="tarjeta-video${HECHO.has(v.estado) ? " hecho" : ""}" style="${tono(v.pilar)}" data-abrir="${v.id}">
    <span class="tono"></span>
    <span><b>${esc(v.titulo)}</b><span class="meta"><span class="pilar">${esc(pilar(v.pilar).nombre)}</span><span class="estado e-${v.estado}">${ESTADO[v.estado] ?? v.estado}</span></span></span>
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
  let html = [...grupos].map(([l, vs]) => `<div class="agenda-grupo"><h3>${nombre(l)}</h3><div class="agenda-filas">${vs.map(fila).join("")}</div></div>`).join("");
  if (anteriores.length) html += `<div class="agenda-grupo"><h3>Anteriores</h3><div class="agenda-filas">${anteriores.reverse().map(fila).join("")}</div></div>`;
  $("#vista").innerHTML = `<div class="agenda">${html}</div>`;
}

/* ── Detalle (cajón) ── */
async function abrir(id, pestana) {
  if (s.sel !== id) { s.borrador = null; s.recien = false; }
  s.sel = id;
  if (pestana) s.pestana = pestana;
  history.replaceState(null, "", `#v=${id}`);
  $("#detalle").hidden = false;
  $("#velo").hidden = false;
  document.body.style.overflow = "hidden";
  if (!s.detalle || s.detalle.id !== id) $("#detalle").innerHTML = `<div class="cajon-cuerpo"><p class="vacio">Cargando…</p></div>`;
  pintar();
  try { s.detalle = await api(`/api/videos/${id}`); pintarDetalle(); }
  catch (e) { avisar(e.message); }
}
function cerrarDetalle() {
  s.sel = null; s.detalle = null; s.recien = false;
  history.replaceState(null, "", location.pathname);
  $("#detalle").hidden = true;
  $("#velo").hidden = true;
  document.body.style.overflow = "";
  pintar();
}

function pintarDetalle() {
  const v = s.detalle;
  if (!v) return;
  const material = v.archivos.filter((a) => a.tipo === "material" && a.estado === "ok");
  const entregas = v.archivos.filter((a) => a.tipo === "entrega" && a.estado === "ok");
  const pest = [["guion", "Guion"], ["material", `Material${material.length ? `<span class="cuenta">${material.length}</span>` : ""}`], ["edicion", "Edición"], ["entrega", `Entrega${entregas.length ? `<span class="cuenta">${entregas.length}</span>` : ""}`]];
  $("#detalle").innerHTML = `
    <div class="cajon-cabeza" style="${tono(v.pilar)}">
      <div class="cajon-arriba">
        <span class="estado e-${v.estado}">${ESTADO[v.estado]}</span>
        <button class="icono-boton" data-cerrar aria-label="Cerrar"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M5 5l10 10M15 5L5 15"/></svg></button>
      </div>
      <h2>${esc(v.titulo)}</h2>
      <div class="meta-fila"><span class="pilar">${esc(pilar(v.pilar).nombre)}</span><span>${cuandoTexto(v.fecha)}</span>${v.formato ? `<span>${esc(v.formato)}</span>` : ""}${v.datos.duracion ? `<span>${esc(v.datos.duracion)}</span>` : ""}</div>
      <div class="pestanas" role="tablist">${pest.map(([k, t]) => `<button role="tab" data-pestana-det="${k}" aria-selected="${s.pestana === k}">${t}</button>`).join("")}</div>
    </div>
    <div class="cajon-cuerpo">${({ guion: guionHtml, material: materialHtml, edicion: edicionHtml, entrega: entregaHtml })[s.pestana](v)}</div>`;
  if (s.pestana === "entrega") cargarEntregas(v);
}

function guionHtml(v) {
  const d = v.datos;
  const g = d.grabar ?? {};
  const beats = d.beats ?? [];
  return `
    ${v.gancho ? `<div class="bloque"><h4>Primera frase</h4><p class="gancho">${esc(v.gancho)}</p></div>` : ""}
    <div class="acciones"><button class="boton primario" data-prompter="${v.id}">Abrir teleprompter</button><button class="boton" data-pestana-det="material">Subir material</button></div>
    ${beats.length ? `<div class="bloque"><h4>Lo que dices, en orden · ≈ ${reloj(partesDe(v).reduce((a, p) => a + segundosDe(p.texto, "normal", p.fijo), 0))} en total, contando la primera frase</h4><div class="beats">${beats.map((b, i) => `
      <label class="beat"><input type="checkbox" data-beat="${i}" ${v.hechos.includes(i) ? "checked" : ""}>
        <div><span class="beat-t">${b.t ? `${esc(b.t)} · ` : ""}${Math.round(segundosDe(b.dice, "normal", b.seg))} s</span><p class="beat-dice">${esc(b.dice)}</p>${b.plano ? `<p class="beat-plano">${esc(b.plano)}</p>` : ""}</div></label>`).join("")}</div></div>` : ""}
    ${d.ganchos_alt?.length ? `<div class="bloque"><h4>Graba también estas primeras frases (para probar cuál funciona)</h4><div class="alt">${d.ganchos_alt.map((x) => `<div>${esc(x)}</div>`).join("")}</div></div>` : ""}
    ${Object.keys(g).length ? `<div class="bloque"><h4>Cómo grabarlo</h4><div class="datos">${[["plano", "Plano"], ["lugar", "Lugar"], ["luz", "Luz"], ["ropa", "Ropa"]].filter(([k]) => g[k]).map(([k, t]) => `<div><small>${t}</small><span>${esc(g[k])}</span></div>`).join("")}</div></div>` : ""}
    ${d.broll?.length ? `<div class="bloque"><h4>Graba aparte</h4><ul class="lista-simple">${d.broll.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>` : ""}
    ${d.props?.length ? `<div class="bloque"><h4>Ten a mano</h4><ul class="lista-simple">${d.props.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>` : ""}
    ${d.por_que ? `<div class="bloque"><h4>Por qué funciona</h4><div class="caja">${esc(d.por_que)}</div></div>` : ""}`;
}

const ICONO_ARCHIVO = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><rect x="2" y="3.5" width="9" height="9" rx="2"/><path d="M11 7l3-2v6l-3-2"/></svg>`;

function materialHtml(v) {
  const material = v.archivos.filter((a) => a.tipo === "material");
  const subiendo = [...s.subidas.values()].filter((x) => x.video === v.id && x.estado !== "ok");
  const puedeAvisar = material.some((a) => a.estado === "ok") && !subiendo.length;
  const yaListo = HECHO.has(v.estado);
  return `
    <label class="zona-subir" id="zona-subir">
      <input type="file" id="campo-archivos" multiple accept="video/*,audio/*,image/*,.mov,.mp4,.m4a,.wav" hidden>
      <span class="icono"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13V3.5m0 0L6.5 7M10 3.5L13.5 7"/><path d="M3.5 12.5v2a2 2 0 002 2h9a2 2 0 002-2v-2"/></svg></span>
      <b>Sube tus tomas</b>
      <span>Tal cual salen del celular: tomas, primeras frases extra, b-roll, capturas.</span>
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
  const palabras = t.replace(/\[[^\]]*\]/g, "xx xx xx").split(/\s+/).filter(Boolean).length;
  return Math.max(1.5, Math.round((palabras / (RITMOS[ritmo] / 60) + 0.5) * 10) / 10);
}
const reloj = (seg) => `${Math.floor(seg / 60)}:${String(Math.floor(seg % 60)).padStart(2, "0")}`;

function partesDe(v) {
  const beats = (v.datos?.beats ?? []).filter((b) => b.dice !== v.gancho);
  return [
    ...(v.gancho ? [{ t: "GANCHO", texto: v.gancho }] : []),
    ...beats.map((b) => ({ t: b.t ?? "", texto: b.dice, fijo: b.seg })),
  ];
}

let pr = {
  partes: [], i: 0, hecho: 0, corre: false, raf: 0, ultimo: 0, cuenta: 0,
  ritmo: leerLocal("estudio:ritmo") in RITMOS ? leerLocal("estudio:ritmo") : "normal",
  auto: leerLocal("estudio:auto") !== "no",
};
const durPr = (k) => segundosDe(pr.partes[k].texto, pr.ritmo, pr.partes[k].fijo);
const totalPr = () => pr.partes.reduce((a, _, k) => a + durPr(k), 0);

function abrirPrompter(v) {
  pr.partes = partesDe(v);
  if (!pr.partes.length) return avisar("Este video todavía no tiene guion.");
  pr.i = 0; pr.hecho = 0;
  $("#pr-lista").innerHTML = pr.partes.map((p, k) => `
    <div class="pr-parrafo${DIRECCION.test(p.texto.trim()) ? " direccion" : ""}" data-pi="${k}">
      <span class="pr-etiqueta">${esc(p.t)}<em data-seg="${k}"></em></span>
      <p>${esc(p.texto)}</p>
      <i class="pr-progreso"><b></b></i>
    </div>`).join("");
  $("#prompter").classList.toggle("espejo", leerLocal("estudio:espejo") === "si");
  $("#pr-auto").checked = pr.auto;
  $("#prompter").hidden = false;
  document.body.style.overflow = "hidden";
  history.pushState({ prompter: true }, "");
  mantenerPantalla(true);
  pintarPrompter();
}

function cerrarPrompter(desdeHistorial = false) {
  if ($("#prompter").hidden) return;
  pausarPrompter();
  clearInterval(pr.cuentaIntervalo); $("#pr-cuenta").hidden = true;
  $("#prompter").hidden = true;
  document.body.style.overflow = s.sel ? "hidden" : "";
  if (!s.subidas.size) mantenerPantalla(false);
  if (!desdeHistorial && history.state?.prompter) history.back();
}

function pintarPrompter() {
  document.querySelectorAll(".pr-segmento button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.ritmo === pr.ritmo)));
  document.querySelectorAll(".pr-parrafo").forEach((el, k) => {
    el.classList.toggle("actual", k === pr.i);
    el.classList.toggle("pasado", k < pr.i);
    el.querySelector("[data-seg]").textContent = ` · ${Math.round(durPr(k))} s`;
    el.querySelector(".pr-progreso b").style.transform = `scaleX(${k < pr.i ? 1 : k === pr.i ? Math.min(1, pr.hecho / durPr(k)) : 0})`;
  });
  // El párrafo actual queda arriba, cerca del lente, para que no se note que lees.
  const actual = document.querySelector(`.pr-parrafo[data-pi="${pr.i}"]`);
  $("#pr-escenario").scrollTop = 0; // nada debe desplazar el escenario fuera del transform
  if (actual) $("#pr-lista").style.transform = `translateY(${Math.round($("#pr-escenario").clientHeight * 0.22 - actual.offsetTop)}px)`;
  pintarReloj();
  $("#prompter").classList.toggle("corriendo", pr.corre);
  $('[data-p="play"]').setAttribute("aria-label", pr.corre ? "Pausa" : "Partir");
}

function pintarReloj() {
  let pasado = pr.hecho;
  for (let k = 0; k < pr.i; k++) pasado += durPr(k);
  $("#pr-reloj").textContent = `${reloj(pasado)} / ${reloj(totalPr())}`;
  const b = document.querySelector(`.pr-parrafo[data-pi="${pr.i}"] .pr-progreso b`);
  if (b) b.style.transform = `scaleX(${Math.min(1, pr.hecho / durPr(pr.i))})`;
}

function irA(k) {
  pr.i = Math.max(0, Math.min(pr.partes.length - 1, k));
  pr.hecho = 0;
  pintarPrompter();
}

function partirPrompter() {
  if (pr.corre || pr.cuenta) return;
  // Cuenta regresiva antes de partir desde un párrafo nuevo (no al retomar una pausa).
  if (pr.hecho === 0) {
    pr.cuenta = 3;
    $("#pr-cuenta").hidden = false;
    $("#pr-cuenta").textContent = pr.cuenta;
    pr.cuentaIntervalo = setInterval(() => {
      pr.cuenta--;
      if (pr.cuenta > 0) { $("#pr-cuenta").textContent = pr.cuenta; return; }
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
  pr.corre = false;
  cancelAnimationFrame(pr.raf);
  pintarPrompter();
}

function accionPrompter(p) {
  if (p === "cerrar") return cerrarPrompter();
  if (p === "espejo") { const on = $("#prompter").classList.toggle("espejo"); return guardarLocal("estudio:espejo", on ? "si" : null); }
  if (p === "play") return pr.corre || pr.cuenta ? pausarPrompter() : partirPrompter();
  const seguia = pr.corre;
  if (p === "anterior") irA(pr.hecho > 1.5 ? pr.i : pr.i - 1); // como en un reproductor: primero vuelve al inicio del párrafo
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
  const t = e.target.closest("[data-abrir],[data-cerrar],[data-pestana-det],[data-prompter],[data-listo],[data-estado],[data-quitar],[data-copiar],[data-vista],[data-mes],[data-p],[data-ritmo],[data-pi],[data-dia]");
  if (!t) { if (e.target.id === "velo") cerrarDetalle(); return; }
  const d = t.dataset;
  if (d.abrir) return abrir(d.abrir, d.pestana || (s.sel === d.abrir ? s.pestana : "guion"));
  if (d.dia) {
    s.dia = d.dia;
    if (d.dia.slice(0, 7) !== s.mes) s.mes = d.dia.slice(0, 7);
    return pintar();
  }
  if ("cerrar" in d) return cerrarDetalle();
  if (d.pestanaDet) { s.pestana = d.pestanaDet; return pintarDetalle(); }
  if (d.vista) { s.vista = d.vista; guardarLocal("estudio:vista", d.vista); return pintar(); }
  if (d.mes) {
    if (d.mes === "hoy") { s.mes = hoyTexto().slice(0, 7); s.dia = hoyTexto(); }
    else { const [a, m] = s.mes.split("-").map(Number); const x = new Date(a, m - 1 + Number(d.mes), 1); s.mes = aTexto(x).slice(0, 7); }
    return pintar();
  }
  if (d.prompter) {
    const v = s.detalle?.id === d.prompter ? s.detalle : await api(`/api/videos/${d.prompter}`);
    return abrirPrompter(v);
  }
  if (d.p) return accionPrompter(d.p);
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
window.addEventListener("resize", () => { if (!$("#prompter").hidden) pintarPrompter(); });

document.addEventListener("input", (e) => { if (e.target.id === "nota") s.borrador = e.target.value; });

document.addEventListener("change", (e) => {
  if (e.target.id === "campo-archivos") { subirVarios(s.sel, [...e.target.files]); e.target.value = ""; }
  if (e.target.dataset.beat != null) {
    const hechos = [...document.querySelectorAll("[data-beat]:checked")].map((x) => Number(x.dataset.beat));
    s.detalle.hechos = hechos;
    api(`/api/videos/${s.sel}`, { method: "PATCH", body: JSON.stringify({ hechos }) }).catch((err) => avisar(err.message));
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
  if (e.key === "Escape" && s.sel) cerrarDetalle();
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
