// uso: node herramientas/muestras.mjs [--todo]   → baja la muestra oficial de 30 s (Apple / iTunes Search API, o Deezer) de cada canción
// de musica/canciones.json que todavía no la tenga, a biblioteca/canciones/<estilo>/<Artista - Canción>.m4a.
// Es la vista previa que Apple publica para escuchar antes de comprar: sirve para escuchar el banco y para editar al
// ritmo de la canción. La canción completa se pone en TikTok/Instagram al publicar.
import fs from "node:fs";
import path from "node:path";

const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
export const ARCHIVO = path.join(RAIZ, "musica/canciones.json");
export const CARPETA = path.join(RAIZ, "biblioteca/canciones");
export const leer = () => JSON.parse(fs.readFileSync(ARCHIVO, "utf8"));
export const guardar = (l) => fs.writeFileSync(ARCHIVO, JSON.stringify(l, null, 1));

const normal = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9ぁ-んァ-ン一-龯 ]+/g, " ").trim();

async function buscar(t) {
  // Primero en EE. UU.; lo japonés también en Japón (ahí están los nombres originales y más catálogo).
  const paises = t.estilo === "japonesa" ? ["JP", "US"] : ["US", "CL"];
  const artista = normal(t.artista).split(" ")[0];
  const cancion = normal(t.cancion);
  const variante = /remix|reimagined|live|sped up|slowed|acoustic|instrumental|version|edit\b| ii\b/;
  // Puntaje: tiene que ser el mismo artista y la misma canción; se prefiere la versión original (sin remix ni «II»).
  const puntaje = (x) => {
    const tn = normal(x.trackName).replace(/\s*(feat|with)\b.*$/, "");
    if (!normal(x.artistName).includes(artista) || !tn.startsWith(cancion.split(" ").slice(0, 3).join(" "))) return -1;
    let p = 10;
    if (tn === cancion) p += 5;
    if (variante.test(normal(x.trackName)) && !variante.test(cancion)) p -= 8;
    if (normal(x.artistName) === normal(t.artista)) p += 2;
    return p;
  };
  for (const pais of paises) {
    const u = `https://itunes.apple.com/search?term=${encodeURIComponent(`${t.artista} ${t.cancion}`)}&entity=song&limit=25&country=${pais}`;
    let r = null;
    for (let intento = 0; intento < 3 && !r; intento++) {
      const res = await fetch(u).catch(() => null);
      if (res?.ok) r = await res.json(); else await new Promise((ok) => setTimeout(ok, 20000)); // 403/429 = límite de Apple: esperar
    }
    const mejor = (r?.results || []).filter((x) => x.previewUrl).map((x) => [puntaje(x), x]).filter(([p]) => p > 0).sort((a, b) => b[0] - a[0])[0];
    if (mejor && mejor[0] >= 5) return mejor[1];
  }
  // Segunda fuente: Deezer (también publica muestras de 30 s); tiene lo que falta en Apple (Childish Gambino, phonk…).
  const dz = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(`${t.artista} ${t.cancion}`)}&limit=25`).then((x) => x.json()).catch(() => ({}));
  const comoApple = (d) => ({ artistName: d.artist?.name ?? "", trackName: d.title ?? "", previewUrl: d.preview, trackViewUrl: d.link, artworkUrl100: d.album?.cover_medium, trackTimeMillis: (d.duration ?? 0) * 1000 });
  const mejorDz = (dz.data || []).map(comoApple).filter((x) => x.previewUrl).map((x) => [puntaje(x), x]).filter(([p]) => p > 0).sort((a, b) => b[0] - a[0])[0];
  if (mejorDz && mejorDz[0] >= 5) return mejorDz[1];
  return null;
}

export async function bajarMuestra(t) {
  if (t.muestra && fs.existsSync(path.join(CARPETA, t.muestra))) return false;
  const r = await buscar(t);
  if (!r) { t.sin_muestra = true; return false; }
  const ext = /\.mp3(\?|$)/.test(r.previewUrl) || r.previewUrl.includes("dzcdn") ? ".mp3" : ".m4a";
  const nombre = `${t.artista} - ${t.cancion}`.replace(/[/\\:*?"<>|]+/g, " ").trim() + ext;
  const rel = path.join(t.estilo || "mias", nombre);
  fs.mkdirSync(path.join(CARPETA, t.estilo || "mias"), { recursive: true });
  const audio = Buffer.from(await (await fetch(r.previewUrl)).arrayBuffer());
  fs.writeFileSync(path.join(CARPETA, rel), audio);
  Object.assign(t, { muestra: rel, apple_titulo: `${r.artistName} - ${r.trackName}`, apple: r.trackViewUrl, portada: r.artworkUrl100, duracion_s: Math.round((r.trackTimeMillis || 0) / 1000) });
  delete t.sin_muestra;
  return true;
}

export async function completar(log = console.log, todo = false) {
  const l = leer();
  let nuevas = 0;
  for (const t of l) {
    if (!todo && (t.muestra || t.sin_muestra)) continue;
    if (todo) { delete t.muestra; delete t.sin_muestra; }
    try { if (await bajarMuestra(t)) { nuevas++; log(`ok · ${t.artista} - ${t.cancion}`); } else log(`sin muestra · ${t.artista} - ${t.cancion}`); }
    catch (e) { log(`error · ${t.artista} - ${t.cancion}: ${e.message}`); }
    // Guarda de a poco (la página puede estar votando al mismo tiempo): relee y mezcla solo los campos de la muestra.
    const actual = leer();
    const a = actual.find((x) => x.artista === t.artista && x.cancion === t.cancion);
    if (a) { for (const k of ["muestra", "apple_titulo", "apple", "portada", "duracion_s", "sin_muestra"]) { if (k in t) a[k] = t[k]; else delete a[k]; } guardar(actual); }
    await new Promise((ok) => setTimeout(ok, 3200)); // la API de Apple limita a ~20 consultas por minuto
  }
  return nuevas;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const n = await completar(console.log, process.argv.includes("--todo"));
  console.log(`muestras nuevas: ${n} · carpeta: ${CARPETA}`);
}
