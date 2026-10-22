/* Guion visual · se comporta como una vista más de Heika: misma barra lateral (plegable), mismas pestañas en el celular,
   y Calendario/Agenda vuelven a la app dejando elegida esa vista. */
const $ = (q, el = document) => el.querySelector(q);
const $$ = (q, el = document) => [...el.querySelectorAll(q)];
const leerLocal = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const guardarLocal = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} };
const app = $("#app");

/* ── Volver a Heika en la vista elegida ── */
$$("[data-vista]").forEach((a) => a.addEventListener("click", () => guardarLocal("estudio:vista", a.dataset.vista)));

/* ── Barra lateral: plegar (se recuerda igual que en Heika) y cajón en el celular ── */
function plegar(on = !app.classList.contains("plegada")) {
  app.classList.toggle("plegada", on);
  guardarLocal("estudio:lateral", on ? "plegada" : null);
  $("[data-plegar]").setAttribute("aria-label", on ? "Desplegar la barra lateral" : "Plegar la barra lateral");
  setTimeout(moverIndicadores, 30);
}
if (leerLocal("estudio:lateral") === "plegada" && matchMedia("(min-width: 761px)").matches) app.classList.add("plegada");
$("[data-plegar]").addEventListener("click", () => plegar());
$("[data-abrir-lateral]").addEventListener("click", () => app.classList.add("lateral-abierta"));
$("[data-cerrar-lateral]").addEventListener("click", () => app.classList.remove("lateral-abierta"));
$$("#g-indice a").forEach((a) => a.addEventListener("click", () => app.classList.remove("lateral-abierta")));
addEventListener("keydown", (e) => {
  if (e.key === "Escape") app.classList.remove("lateral-abierta");
  if (e.key === "[" && !e.metaKey && !e.ctrlKey && !/INPUT|TEXTAREA/.test(document.activeElement?.tagName)) plegar();
});

function moverIndicadores() {
  const activo = $('#lat-nav [aria-current="true"]');
  if (activo) $(".lat-indicador").style.transform = `translateY(${activo.offsetTop}px)`;
  const pm = $('#pestanas-movil [aria-current="true"]');
  if (pm && pm.offsetWidth) Object.assign($(".pm-indicador").style, { width: `${pm.offsetWidth}px`, transform: `translateX(${pm.offsetLeft}px)` });
}
moverIndicadores();
addEventListener("resize", moverIndicadores);
document.fonts?.ready.then(moverIndicadores);
setTimeout(() => app.classList.remove("entra"), 1600);

/* ── Barra superior con fondo al bajar ── */
const barra = $("#barra");
const fondoBarra = () => barra.classList.toggle("con-fondo", scrollY > 8);
addEventListener("scroll", fondoBarra, { passive: true }); fondoBarra();

/* ── Índice: marca la sección que se está viendo ── */
const secciones = $$("#g-indice a").map((a) => [a, $(a.getAttribute("href"))]);
const espia = new IntersectionObserver((entradas) => {
  entradas.forEach((e) => { if (e.isIntersecting) secciones.forEach(([a, s]) => a.classList.toggle("activo", s === e.target)); });
}, { rootMargin: "-40% 0px -55% 0px" });
secciones.forEach(([, s]) => espia.observe(s));

/* ── Secciones que suben al aparecer ── */
const revela = new IntersectionObserver((entradas) => {
  entradas.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("visto"); revela.unobserve(e.target); } });
}, { rootMargin: "0px 0px -12% 0px" });
$$(".g-seccion").forEach((s) => { s.classList.add("g-revela"); revela.observe(s); });

/* ── Videos: corren solo cuando se ven (ahorra batería y CPU) ── */
const quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
const ojo = new IntersectionObserver((entradas) => {
  entradas.forEach((e) => { if (e.isIntersecting && !quieto) e.target.play().catch(() => {}); else e.target.pause(); });
}, { threshold: 0.25 });
$$("video").forEach((v) => ojo.observe(v));

/* ── Comparador de color antes/después ── */
const comparar = $("#comparar");
$("input", comparar).addEventListener("input", (e) => comparar.style.setProperty("--corte", `${e.target.value}%`));
