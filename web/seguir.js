/* Seguir la voz: compara lo que se va escuchando con el guion y dice en qué palabra vas.
   Todo el guion es una sola lista de palabras (de todos los párrafos), así una frase puede pasar de un párrafo al otro.
   Lo que está entre [corchetes] es «libre» (lo cuentas con tus palabras): se salta cuando vuelves a decir algo del guion. */

const NUMEROS = {
  0: "cero", 1: "uno", 2: "dos", 3: "tres", 4: "cuatro", 5: "cinco", 6: "seis", 7: "siete", 8: "ocho", 9: "nueve",
  10: "diez", 11: "once", 12: "doce", 13: "trece", 14: "catorce", 15: "quince", 16: "dieciseis", 17: "diecisiete",
  18: "dieciocho", 19: "diecinueve", 20: "veinte", 30: "treinta", 40: "cuarenta", 50: "cincuenta", 60: "sesenta",
  70: "setenta", 80: "ochenta", 90: "noventa", 100: "cien", 1000: "mil",
};
const SINONIMOS = { un: "uno", una: "uno", primero: "uno", primer: "uno" };

export function normalizar(palabra) {
  let p = String(palabra).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9ñ]/g, "");
  if (/^\d+$/.test(p) && NUMEROS[Number(p)]) p = NUMEROS[Number(p)];
  return SINONIMOS[p] ?? p;
}

/* Separa un texto dicho en palabras normalizadas (los números con espacios, «10 000», quedan como vienen) */
export const palabrasDe = (texto) => String(texto).split(/[\s\-—–/]+/).map(normalizar).filter(Boolean);

function distancia(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 9;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

/* ¿La palabra oída es la del guion? Acepta errores chicos del reconocimiento y palabras a medio decir. */
export function parecidas(oida, guion) {
  if (oida === guion) return true;
  const corta = Math.min(oida.length, guion.length);
  if (corta >= 4 && (guion.startsWith(oida) || oida.startsWith(guion))) return true;
  if (corta >= 4) return distancia(oida, guion) <= (corta > 6 ? 2 : 1);
  return false;
}

/* Arma la lista de palabras del guion y, para cada párrafo, el HTML con un <span data-w> por palabra. */
export function prepararGuion(textos, esc = (x) => x) {
  const palabras = []; // { n: normalizada, p: párrafo, libre }
  const html = textos.map((texto, p) => {
    const trozos = String(texto).split(/(\[[^\]]*\])/).filter((t) => t !== "");
    return trozos.map((trozo) => {
      if (/^\[[^\]]*\]$/.test(trozo)) {
        palabras.push({ n: "", p, libre: true });
        return `<span class="pr-tuyo" data-w="${palabras.length - 1}">${esc(trozo.slice(1, -1))}</span>`;
      }
      return trozo.split(/(\s+)/).map((pieza) => {
        if (!pieza.trim()) return pieza;
        const n = normalizar(pieza);
        if (!n) return esc(pieza);
        palabras.push({ n, p, libre: false });
        return `<span class="pr-palabra" data-w="${palabras.length - 1}">${esc(pieza)}</span>`;
      }).join("");
    }).join("");
  });
  const inicios = textos.map((_, p) => palabras.findIndex((w) => w.p === p));
  return { palabras, html, inicios };
}

const VENTANA = 6; // hasta cuántas palabras se puede saltar hacia adelante

/* Un paso: desde el cursor (la próxima palabra por decir), con lo oído en este tramo. Es puro: no cambia nada. */
export function avanzar(guion, cursor, oidas, previas = []) {
  const W = guion.palabras;
  let c = cursor;
  let retomas = 0;
  const ultimas = [...previas]; // el dictado cierra tramos muy seguido: la repetición puede venir partida en dos
  for (const o of oidas) {
    ultimas.push(o);
    if (ultimas.length > 3) ultimas.shift();
    if (c >= W.length) continue;
    // Párrafo libre: hablas con tus palabras hasta que vuelves a decir algo del guion
    if (W[c].libre) {
      const k = buscar(W, c + 1, o);
      if (k >= 0) c = k + 1;
      continue;
    }
    const k = buscar(W, c, o);
    if (k >= 0) { c = k + 1; continue; }
    // ¿Volviste a empezar una frase? (te equivocaste y la repites)
    const r = retoma(guion, c, ultimas);
    if (r >= 0) { c = r; retomas++; ultimas.length = 0; }
  }
  return { cursor: c, retomas, ultimas };
}

function buscar(W, desde, o) {
  for (let k = desde; k < Math.min(W.length, desde + VENTANA); k++) {
    if (W[k].libre) return -1; // nunca se salta un párrafo libre sin pasar por él
    if (!parecidas(o, W[k].n)) continue;
    if (k === desde || o.length >= 4) return k; // saltarse palabras solo con palabras largas (las cortas se repiten mucho)
  }
  return -1;
}

/* Si lo último que dijiste son 2–3 palabras que ya pasaron en este párrafo (o en el anterior), vuelves ahí. */
function retoma(guion, c, ultimas) {
  const W = guion.palabras;
  if (ultimas.length < 2 || c >= W.length) return -1;
  const p = W[c].p;
  const desde = guion.inicios[Math.max(0, p - 1)] ?? 0;
  const n = ultimas.length;
  for (let q = c - 2; q >= desde + n - 1; q--) {
    let ok = true;
    for (let j = 0; j < n; j++) if (W[q - j].libre || !parecidas(ultimas[n - 1 - j], W[q - j].n)) { ok = false; break; }
    if (ok && (n === 3 || W[q - 1].p !== W[q].p || q - 1 === guion.inicios[W[q].p])) return q + 1;
  }
  return -1;
}

/* El seguidor con estado: los resultados «volátiles» se recalculan desde la última frase cerrada; los finales la cierran. */
export function crearSeguidor(textos, esc) {
  const guion = prepararGuion(textos, esc);
  let base = 0;
  let cursor = 0;
  let tomas = 0;
  let hablaLibre = false;
  let ultimasBase = []; // se escuchó algo mientras estabas en un pedazo libre
  return {
    guion,
    get cursor() { return cursor; },
    get total() { return guion.palabras.length; },
    get tomas() { return tomas; },
    parrafo() { return cursor >= guion.palabras.length ? textos.length - 1 : guion.palabras[cursor].p; },
    terminado() { return cursor >= guion.palabras.length; },
    oir(texto, final) {
      const oidas = palabrasDe(texto);
      const r = avanzar(guion, base, oidas, ultimasBase);
      if (oidas.length && guion.palabras[base]?.libre) hablaLibre = true;
      cursor = r.cursor;
      if (final) { base = cursor; tomas += r.retomas; ultimasBase = r.ultimas; }
      return { cursor, retomas: final ? r.retomas : 0 };
    },
    /* Si el último pedazo es libre y te quedaste en silencio, se da por dicho */
    silencio() {
      if (!guion.palabras[cursor]?.libre || !hablaLibre) return false;
      base = cursor = cursor + 1; hablaLibre = false;
      return true;
    },
    irA(p) { base = cursor = Math.max(0, guion.inicios[p] ?? 0); hablaLibre = false; ultimasBase = []; },
  };
}
