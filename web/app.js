/* Estudio · calendario de orgánicos. Lee el calendario del Worker, sube el material por trozos y avisa «listo para editar». */
const API = window.ESTUDIO_API;
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const PILARES = {
  ia: { nombre: "Construyo con IA", corto: "IA", color: "var(--p-ia)" },
  anuncios: { nombre: "Anuncios que venden", corto: "Anuncios", color: "var(--p-anuncios)" },
  diseno: { nombre: "Diseño que cobra caro", corto: "Diseño", color: "var(--p-diseno)" },
  condor: { nombre: "Cóndor por dentro", corto: "Cóndor", color: "var(--p-condor)" },
  chile: { nombre: "Chile + IA", corto: "Chile", color: "var(--p-chile)" },
};
const pilar = (k) => PILARES[k] ?? { nombre: k || "Sin pilar", corto: k || "—", color: "var(--texto-3)" };
const ESTADO = {
  grabar: "Por grabar", material: "Subiendo material", listo: "Listo para editar", editando: "En edición",
  entregado: "Entregado", publicado: "Publicado", descartado: "Descartado",
};
const HECHO = new Set(["listo", "editando", "entregado", "publicado"]);

const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MESES_LARGO = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const aFecha = (s) => { const [a, m, d] = s.split("-").map(Number); return new Date(a, m - 1, d); };
const aTexto = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const hoyTexto = () => aTexto(new Date());
const sumarDias = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const lunes = (d) => sumarDias(d, -((d.getDay() + 6) % 7));
const mb = (b) => (b >= 1073741824 ? `${(b / 1073741824).toFixed(2)} GB` : `${Math.max(1, Math.round(b / 1048576))} MB`);

let s = {
  llave: leerLocal("estudio:llave"),
  videos: [],
  vista: leerLocal("estudio:vista") || "lista",
  sel: null,
  detalle: null,
  pestana: "guion",
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
  pintarHoy();
  pintarSemana();
  s.vista === "mes" ? pintarMes() : pintarLista();
  document.querySelectorAll(".vista-selector button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.vista === s.vista)));
  const hechos = s.videos.filter((v) => HECHO.has(v.estado)).length;
  $("#racha").hidden = !s.videos.length;
  $("#racha").textContent = `${hechos}/${s.videos.length} GRABADOS`;
}

function numeroToma(v) { return s.videos.findIndex((x) => x.id === v.id) + 1; }

function videoDeHoy() {
  const hoy = hoyTexto();
  return s.videos.find((v) => v.fecha === hoy) ?? s.videos.find((v) => v.fecha > hoy && !HECHO.has(v.estado) && v.estado !== "descartado");
}

function cuandoTexto(fecha) {
  const hoy = hoyTexto();
  if (fecha === hoy) return "Hoy se graba";
  if (fecha === aTexto(sumarDias(new Date(), 1))) return "Mañana";
  const d = aFecha(fecha);
  return `${DIAS[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]}`;
}

function pintarHoy() {
  const v = videoDeHoy();
  const el = $("#hoy");
  if (!v) { el.innerHTML = s.videos.length ? `<p class="vacio">No queda nada por grabar. Pídele a Claude la próxima tanda.</p>` : `<p class="vacio">El calendario está vacío.</p>`; return; }
  const p = pilar(v.pilar);
  const d = aFecha(v.fecha);
  const cerrada = HECHO.has(v.estado);
  el.innerHTML = `
    <article class="claqueta${cerrada ? " cerrada" : ""}" id="claqueta-hoy">
      <div class="claqueta-brazo" aria-hidden="true"></div>
      <div class="claqueta-cuerpo">
        <div class="pizarra">
          <div><small>Escena</small><b style="color:${p.color}">${esc(p.corto)}</b></div>
          <div><small>Toma</small><b>${String(numeroToma(v)).padStart(2, "0")}/${s.videos.length}</b></div>
          <div><small>Fecha</small><b>${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}</b></div>
        </div>
        <div class="claqueta-contenido">
          <div class="claqueta-cuando">${cerrada ? `<span class="estado e-${v.estado}">${ESTADO[v.estado]}</span>` : `<span class="rec"></span>${cuandoTexto(v.fecha)}`}</div>
          <h2>${esc(v.titulo)}</h2>
          ${v.gancho ? `<p class="gancho">${esc(v.gancho)}</p>` : ""}
          <div class="fichas">${v.formato ? `<span class="ficha">${esc(v.formato)}</span>` : ""}${v.material ? `<span class="ficha">${v.material} archivo${v.material > 1 ? "s" : ""}</span>` : ""}</div>
          <div class="acciones">
            <button class="boton primario" data-abrir="${v.id}" data-pestana="guion">Ver guion</button>
            <button class="boton" data-prompter="${v.id}">Teleprompter</button>
            <button class="boton" data-abrir="${v.id}" data-pestana="material">Subir material</button>
          </div>
        </div>
      </div>
    </article>`;
}

function pintarSemana() {
  const inicio = lunes(new Date());
  const hoy = hoyTexto();
  $("#semana").innerHTML = Array.from({ length: 7 }, (_, i) => {
    const d = sumarDias(inicio, i);
    const f = aTexto(d);
    const v = s.videos.find((x) => x.fecha === f);
    return `<button class="dia${f === hoy ? " hoy" : ""}${v && v.id === s.sel ? " activo" : ""}" ${v ? `data-abrir="${v.id}"` : "disabled"} aria-label="${DIAS[d.getDay()]} ${d.getDate()}${v ? ": " + esc(v.titulo) : ""}">
      <small>${DIAS[d.getDay()]}</small><b>${d.getDate()}</b><span class="punto ${v ? "e-" + v.estado : ""}"></span></button>`;
  }).join("");
}

function filaHtml(v) {
  const d = aFecha(v.fecha);
  const p = pilar(v.pilar);
  const pasada = v.fecha < hoyTexto() && HECHO.has(v.estado);
  return `<button class="fila${v.id === s.sel ? " activa" : ""}${pasada ? " pasada" : ""}" data-abrir="${v.id}">
    <span class="fecha-mini"><small>${DIAS[d.getDay()]}</small><b>${d.getDate()}</b></span>
    <span class="fila-titulo"><b>${esc(v.titulo)}</b><span><i class="pilar-punto" style="background:${p.color}"></i>${esc(p.nombre)}${v.formato ? " · " + esc(v.formato) : ""}</span></span>
    <span class="estado e-${v.estado}">${ESTADO[v.estado] ?? v.estado}</span>
  </button>`;
}

function pintarLista() {
  if (!s.videos.length) { $("#listado").innerHTML = ""; return; }
  const esta = aTexto(lunes(new Date()));
  const grupos = new Map();
  const anteriores = [];
  for (const v of s.videos) {
    const l = aTexto(lunes(aFecha(v.fecha)));
    if (l < esta) { anteriores.push(v); continue; }
    if (!grupos.has(l)) grupos.set(l, []);
    grupos.get(l).push(v);
  }
  const prox = aTexto(sumarDias(lunes(new Date()), 7));
  const nombre = (l) => (l === esta ? "Esta semana" : l === prox ? "Próxima semana" : `Semana del ${aFecha(l).getDate()} ${MESES[aFecha(l).getMonth()]}`);
  let html = [...grupos].map(([l, vs]) => `<div class="grupo"><h3>${nombre(l)}</h3><div class="filas">${vs.map(filaHtml).join("")}</div></div>`).join("");
  if (anteriores.length) html += `<div class="grupo"><h3>Anteriores</h3><div class="filas">${anteriores.reverse().map(filaHtml).join("")}</div></div>`;
  $("#listado").innerHTML = html;
}

function pintarMes() {
  const meses = [...new Set(s.videos.map((v) => v.fecha.slice(0, 7)))];
  if (!meses.length) { $("#listado").innerHTML = ""; return; }
  const hoy = hoyTexto();
  $("#listado").innerHTML = meses.map((ym) => {
    const [a, m] = ym.split("-").map(Number);
    const primero = new Date(a, m - 1, 1);
    const huecos = (primero.getDay() + 6) % 7;
    const total = new Date(a, m, 0).getDate();
    const celdas = [];
    for (let i = 0; i < huecos; i++) celdas.push(`<div class="celda vacia"></div>`);
    for (let d = 1; d <= total; d++) {
      const f = `${ym}-${String(d).padStart(2, "0")}`;
      const v = s.videos.find((x) => x.fecha === f);
      celdas.push(v
        ? `<button class="celda${f === hoy ? " hoy" : ""}" data-abrir="${v.id}" title="${esc(v.titulo)}"><b>${d}</b><span>${esc(v.titulo)}</span><i class="barra-pilar" style="background:${HECHO.has(v.estado) ? "var(--verde)" : pilar(v.pilar).color}"></i></button>`
        : `<div class="celda${f === hoy ? " hoy" : ""}"><b>${d}</b></div>`);
    }
    return `<section class="mes"><h3 class="mes-titulo">${MESES_LARGO[m - 1]} ${a}</h3><div class="mes-grilla">${["lun", "mar", "mié", "jue", "vie", "sáb", "dom"].map((x) => `<small>${x}</small>`).join("")}${celdas.join("")}</div></section>`;
  }).join("");
}

/* ── Detalle ── */
async function abrir(id, pestana) {
  if (s.sel !== id) s.borrador = null;
  s.sel = id;
  if (pestana) s.pestana = pestana;
  history.replaceState(null, "", `#v=${id}`);
  $(".lienzo").classList.add("con-detalle");
  $("#detalle").hidden = false;
  if (!s.detalle || s.detalle.id !== id) $("#detalle").innerHTML = `<div class="detalle-cuerpo"><p class="vacio">Cargando…</p></div>`;
  pintar();
  try { s.detalle = await api(`/api/videos/${id}`); pintarDetalle(); }
  catch (e) { avisar(e.message); }
}
function cerrarDetalle() {
  s.sel = null; s.detalle = null;
  history.replaceState(null, "", location.pathname);
  $("#detalle").hidden = true;
  $(".lienzo").classList.remove("con-detalle");
  pintar();
}

function pintarDetalle() {
  const v = s.detalle;
  if (!v) return;
  const p = pilar(v.pilar);
  const material = v.archivos.filter((a) => a.tipo === "material" && a.estado === "ok");
  const entregas = v.archivos.filter((a) => a.tipo === "entrega" && a.estado === "ok");
  const pest = [["guion", "Guion"], ["material", `Material${material.length ? `<span class="cuenta">${material.length}</span>` : ""}`], ["edicion", "Edición"], ["entrega", `Entrega${entregas.length ? `<span class="cuenta">●</span>` : ""}`]];
  $("#detalle").innerHTML = `
    <div class="detalle-cabeza">
      <div class="detalle-arriba">
        <span class="estado e-${v.estado}">${ESTADO[v.estado]}</span>
        <button class="cerrar" data-cerrar aria-label="Cerrar"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 3l10 10M13 3L3 13"/></svg></button>
      </div>
      <div class="fichas" style="margin:0"><span class="ficha" style="color:${p.color}">${esc(p.nombre)}</span>${v.formato ? `<span class="ficha">${esc(v.formato)}</span>` : ""}<span class="ficha">${cuandoTexto(v.fecha)}</span>${v.datos.duracion ? `<span class="ficha">${esc(v.datos.duracion)}</span>` : ""}</div>
      <h2>${esc(v.titulo)}</h2>
      <div class="pestanas" role="tablist">${pest.map(([k, t]) => `<button role="tab" data-pestana-det="${k}" aria-selected="${s.pestana === k}">${t}</button>`).join("")}</div>
    </div>
    <div class="detalle-cuerpo">${({ guion: guionHtml, material: materialHtml, edicion: edicionHtml, entrega: entregaHtml })[s.pestana](v)}</div>`;
  if (s.pestana === "entrega") cargarEntregas(v);
}

function guionHtml(v) {
  const d = v.datos;
  const g = d.grabar ?? {};
  const beats = d.beats ?? [];
  return `
    ${v.gancho ? `<div class="bloque"><p class="gancho">${esc(v.gancho)}</p></div>` : ""}
    ${d.ganchos_alt?.length ? `<div class="bloque"><h4>Graba también estos ganchos (para probar)</h4><div class="alt">${d.ganchos_alt.map((x) => `<div>${esc(x)}</div>`).join("")}</div></div>` : ""}
    ${d.por_que ? `<div class="bloque"><h4>Por qué funciona</h4><div class="tarjeta"><p>${esc(d.por_que)}</p></div></div>` : ""}
    ${Object.keys(g).length ? `<div class="bloque"><h4>Cómo grabarlo</h4><div class="datos-grabar">${[["plano", "Plano"], ["lugar", "Lugar"], ["luz", "Luz"], ["ropa", "Ropa"]].filter(([k]) => g[k]).map(([k, t]) => `<div><small>${t}</small><span>${esc(g[k])}</span></div>`).join("")}</div></div>` : ""}
    ${beats.length ? `<div class="bloque"><h4>Lo que dices, en orden</h4><div class="beats">${beats.map((b, i) => `
      <label class="beat"><input type="checkbox" data-beat="${i}" ${v.hechos.includes(i) ? "checked" : ""}>
        <div>${b.t ? `<span class="beat-t">${esc(b.t)}</span>` : ""}<p class="beat-dice">${esc(b.dice)}</p>${b.plano ? `<p class="beat-plano">${esc(b.plano)}</p>` : ""}</div></label>`).join("")}</div></div>` : ""}
    ${d.broll?.length ? `<div class="bloque"><h4>Graba aparte (b-roll y pantalla)</h4><ul class="lista-simple">${d.broll.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>` : ""}
    ${d.props?.length ? `<div class="bloque"><h4>Ten a mano</h4><ul class="lista-simple">${d.props.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>` : ""}
    <div class="acciones"><button class="boton primario" data-prompter="${v.id}">Abrir teleprompter</button><button class="boton" data-pestana-det="material">Subir material</button></div>`;
}

function materialHtml(v) {
  const material = v.archivos.filter((a) => a.tipo === "material");
  const subiendo = [...s.subidas.values()].filter((x) => x.video === v.id && x.estado !== "ok");
  const puedeAvisar = material.some((a) => a.estado === "ok") && !subiendo.length;
  const yaListo = HECHO.has(v.estado);
  return `
    <label class="zona-subir" id="zona-subir">
      <input type="file" id="campo-archivos" multiple accept="video/*,audio/*,image/*,.mov,.mp4,.m4a,.wav" hidden>
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4m0 0l-4.5 4.5M12 4l4.5 4.5"/><path d="M4 15v3a2 2 0 002 2h12a2 2 0 002-2v-3"/></svg>
      <b>Sube las tomas tal cual salen del celular</b>
      <span>Todas las que quieras: tomas, ganchos extra, b-roll, capturas. Sin comprimir.</span>
    </label>
    <div class="archivos">
      ${subiendo.map((x) => `<div class="archivo"><b>${esc(x.nombre)}</b><small>${Math.floor((x.hecho / x.bytes) * 100)}%</small><div class="progreso"><i style="width:${(x.hecho / x.bytes) * 100}%"></i></div></div>`).join("")}
      ${material.filter((a) => a.estado === "ok").map((a) => `<div class="archivo"><b>${esc(a.nombre)}</b><button class="quitar" data-quitar="${a.id}">Quitar</button><small>${mb(a.bytes)}</small></div>`).join("")}
    </div>
    ${yaListo ? `
      <div class="tarjeta"><p><b style="color:var(--texto)">Claude ya lo tiene en la cola.</b> ${v.nota ? `Tu nota: «${esc(v.nota)}»` : ""}</p></div>
      ${v.estado === "listo" ? `<button class="boton" data-estado="material">Espera, quiero agregar algo</button>` : ""}` : `
      <div class="bloque listo-caja">
        <h4>Para Claude (opcional)</h4>
        <textarea class="nota-campo" id="nota" placeholder="La toma 3 es la buena, el gancho B me salió mejor, bota el final…">${esc(s.borrador ?? v.nota)}</textarea>
        <div class="claqueta mini" id="claqueta-listo"><div class="claqueta-brazo" aria-hidden="true"></div></div>
        <button class="boton rec-boton" data-listo ${puedeAvisar ? "" : "disabled"}>Listo para editar</button>
        ${!puedeAvisar ? `<p style="font-size:13px">${subiendo.length ? "Espera a que terminen de subir." : "Sube al menos una toma."}</p>` : ""}
      </div>`}
    ${v.bitacora.length ? `<div class="bloque"><h4>Bitácora</h4><div class="bitacora">${v.bitacora.map((b) => `<div><b>${esc(b.quien)}</b> ${esc(b.texto)}<time>${esc(b.creado.slice(5, 16).replace("T", " "))}</time></div>`).join("")}</div></div>` : ""}`;
}

function edicionHtml(v) {
  const e = v.datos.edicion ?? {};
  if (!Object.keys(e).length) return `<p class="vacio">Claude todavía no arma el plan de edición.</p>`;
  return `
    ${e.estilo ? `<div class="bloque"><h4>La idea</h4><div class="tarjeta"><p>${esc(e.estilo)}</p></div></div>` : ""}
    <div class="datos-grabar">
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
    ${entregas.length ? entregas.map((a) => `<div class="bloque"><video class="video-entrega" controls playsinline preload="metadata" data-video="${a.id}"></video><div class="acciones" style="margin-top:10px"><a class="boton primario" data-bajar="${a.id}" href="#" download>Descargar ${esc(a.nombre)}</a></div></div>`).join("")
      : `<p class="vacio">${v.estado === "editando" ? "Claude lo está editando." : "Todavía no hay video editado."}</p>`}
    ${post.texto ? `<div class="bloque"><h4>Texto del post</h4><div class="tarjeta copiable">${esc(post.texto)}<button class="boton" data-copiar="texto">Copiar</button></div></div>` : ""}
    ${tags ? `<div class="bloque"><h4>Hashtags</h4><div class="tarjeta copiable">${esc(tags)}<button class="boton" data-copiar="tags">Copiar</button></div></div>` : ""}
    ${post.sonido ? `<div class="bloque"><h4>Sonido para agregar en la app</h4><div class="tarjeta"><p><b style="color:var(--texto)">${esc(post.sonido)}</b>${post.inicio_sonido ? ` · desde el segundo ${esc(post.inicio_sonido)}` : ""}</p><p>Agrégalo dentro de TikTok o Instagram (no viene en el archivo, así no te silencian el video).</p></div></div>` : ""}
    ${v.estado === "entregado" ? `<button class="boton rec-boton" data-estado="publicado">Ya lo publiqué</button>` : ""}`;
}

async function cargarEntregas(v) {
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

/* ── Claqueta: golpe + sonido + vibración al avisar ── */
function claquetazo() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const golpe = (t, vol) => {
      const largo = Math.floor(ctx.sampleRate * 0.06);
      const buf = ctx.createBuffer(1, largo, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < largo; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / largo, 6);
      const src = ctx.createBufferSource(); src.buffer = buf;
      const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 2400; f.Q.value = 0.7;
      const g = ctx.createGain(); g.gain.value = vol;
      src.connect(f).connect(g).connect(ctx.destination);
      src.start(ctx.currentTime + t);
    };
    golpe(0.22, 0.9);
    golpe(0.28, 0.25);
  } catch {}
  navigator.vibrate?.([0, 220, 30]);
  for (const c of document.querySelectorAll("#claqueta-hoy, #claqueta-listo")) { c.classList.remove("golpe"); void c.offsetWidth; c.classList.add("golpe", "cerrada"); }
}

async function cambiarEstado(estado, extra = {}) {
  const v = s.detalle;
  s.detalle = await api(`/api/videos/${v.id}`, { method: "PATCH", body: JSON.stringify({ estado, ...extra }) });
  const i = s.videos.findIndex((x) => x.id === v.id);
  if (i >= 0) s.videos[i] = { ...s.videos[i], estado };
  pintar();
  pintarDetalle();
}

/* ── Teleprompter ── */
let prompter = { corre: false, raf: 0, ultimo: 0 };
function abrirPrompter(v) {
  const beats = (v.datos?.beats ?? []).filter((b) => b.dice !== v.gancho);
  $("#prompter-texto").innerHTML = (v.gancho ? `<p><span class="marca-beat">GANCHO</span>${esc(v.gancho)}</p>` : "") +
    beats.map((b) => `<p>${b.t ? `<span class="marca-beat">${esc(b.t)}</span>` : ""}${esc(b.dice)}</p>`).join("");
  $("#prompter").hidden = false;
  $("#prompter-texto").scrollTop = 0;
  pararPrompter();
}
function pararPrompter() { prompter.corre = false; cancelAnimationFrame(prompter.raf); $('[data-p="play"]').textContent = "Partir"; }
function correrPrompter() {
  prompter.corre = true; prompter.ultimo = performance.now();
  $('[data-p="play"]').textContent = "Pausa";
  const el = $("#prompter-texto");
  let resto = 0;
  const paso = (t) => {
    if (!prompter.corre) return;
    resto += (Number($("#prompter-vel").value) * (t - prompter.ultimo)) / 1000;
    prompter.ultimo = t;
    const px = Math.floor(resto); resto -= px; el.scrollTop += px;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 1) return pararPrompter();
    prompter.raf = requestAnimationFrame(paso);
  };
  prompter.raf = requestAnimationFrame(paso);
}

/* ── Eventos ── */
document.addEventListener("click", async (e) => {
  const t = e.target.closest("[data-abrir],[data-cerrar],[data-pestana-det],[data-prompter],[data-listo],[data-estado],[data-quitar],[data-copiar],[data-vista],[data-p]");
  if (!t) return;
  const d = t.dataset;
  if (d.abrir) return abrir(d.abrir, d.pestana || (s.sel === d.abrir ? s.pestana : "guion"));
  if ("cerrar" in d) return cerrarDetalle();
  if (d.pestanaDet) { s.pestana = d.pestanaDet; return pintarDetalle(); }
  if (d.vista) { s.vista = d.vista; guardarLocal("estudio:vista", d.vista); return pintar(); }
  if (d.prompter) {
    const v = s.detalle?.id === d.prompter ? s.detalle : await api(`/api/videos/${d.prompter}`);
    return abrirPrompter(v);
  }
  if (d.p === "cerrar") { pararPrompter(); $("#prompter").hidden = true; return; }
  if (d.p === "espejo") return $("#prompter").classList.toggle("espejo");
  if (d.p === "play") return prompter.corre ? pararPrompter() : correrPrompter();
  try {
    if ("listo" in d) {
      t.disabled = true;
      const nota = $("#nota")?.value.trim() ?? "";
      claquetazo();
      await Promise.all([new Promise((r) => setTimeout(r, 650)), api(`/api/videos/${s.sel}`, { method: "PATCH", body: JSON.stringify({ estado: "listo", nota }) }).then((d) => (s.detalle = d))]);
      const i = s.videos.findIndex((x) => x.id === s.sel);
      if (i >= 0) s.videos[i] = { ...s.videos[i], estado: "listo" };
      s.borrador = null;
      pintar(); pintarDetalle();
      avisar("Listo. Claude ya lo ve en la cola 🎬");
    } else if (d.estado) {
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

$("#prompter-texto").addEventListener("click", () => (prompter.corre ? pararPrompter() : correrPrompter()));

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
  if (e.key !== "Escape") return;
  if (!$("#prompter").hidden) { pararPrompter(); $("#prompter").hidden = true; }
  else if (s.sel) cerrarDetalle();
});

window.addEventListener("beforeunload", (e) => { if ([...s.subidas.values()].some((x) => x.estado !== "ok")) e.preventDefault(); });
document.addEventListener("visibilitychange", async () => {
  if (document.visibilityState !== "visible" || !s.llave || s.subidas.size) return;
  try { s.videos = await api("/api/videos"); pintar(); if (s.sel) { s.detalle = await api(`/api/videos/${s.sel}`); pintarDetalle(); } } catch {}
});

if (s.llave) cargar().catch((e) => mostrarEntrada(e.message));
else mostrarEntrada();
