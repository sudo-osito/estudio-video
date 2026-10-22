// Freesound (solo CC0: sin créditos) → biblioteca/sonidos/freesound/<búsqueda>/<nombre> - <id>.<ext>
// Credenciales en biblioteca/.freesound.json (fuera de git): { client_id, client_secret, access_token, refresh_token }.
//
// uso:
//   node herramientas/freesound.mjs config <client_id> <client_secret>   → guarda la app e imprime el enlace para autorizar
//   node herramientas/freesound.mjs codigo <código>                       → cambia el código de la autorización por el token
//   node herramientas/freesound.mjs bajar "<búsqueda>" [n=20] [--max-dur 30]
//
// Sin autorización OAuth2 (lo normal): se usa la clave de API y se baja la versión «preview-hq» (MP3 de alta calidad),
// suficiente para redes. Con OAuth2 (config → autorizar → codigo) baja los originales y el token se renueva solo.
import fs from "node:fs";
import path from "node:path";

const BIB = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../biblioteca");
const CRED = path.join(BIB, ".freesound.json");
const API = "https://freesound.org/apiv2";
const leerCred = () => (fs.existsSync(CRED) ? JSON.parse(fs.readFileSync(CRED, "utf8")) : {});
const guardarCred = (c) => { fs.writeFileSync(CRED, JSON.stringify(c, null, 1)); fs.chmodSync(CRED, 0o600); };

async function token(cuerpo) {
  const c = leerCred();
  const r = await fetch(`${API}/oauth2/access_token/`, { method: "POST", body: new URLSearchParams({ client_id: c.client_id, client_secret: c.client_secret, ...cuerpo }) });
  const j = await r.json();
  if (!j.access_token) throw new Error(`Freesound no entregó token: ${JSON.stringify(j)}`);
  guardarCred({ ...c, access_token: j.access_token, refresh_token: j.refresh_token, vence: Date.now() + (j.expires_in ?? 86400) * 1000 });
}

async function pedir(url, opciones = {}, reintento = true) {
  const c = leerCred();
  if (c.vence && Date.now() > c.vence - 60000) await token({ grant_type: "refresh_token", refresh_token: c.refresh_token });
  const r = await fetch(url, { ...opciones, headers: { Authorization: `Bearer ${leerCred().access_token}` } });
  if (r.status === 401 && reintento) { await token({ grant_type: "refresh_token", refresh_token: leerCred().refresh_token }); return pedir(url, opciones, false); }
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r;
}

const [accion, ...args] = process.argv.slice(2);
if (accion === "config") {
  const [client_id, client_secret] = args;
  guardarCred({ ...leerCred(), client_id, client_secret });
  console.log(`Abre este enlace, autoriza y pega el código con «codigo»:\n${API}/oauth2/authorize/?client_id=${client_id}&response_type=code`);
} else if (accion === "codigo") {
  await token({ grant_type: "authorization_code", code: args[0] });
  console.log("Listo: token guardado.");
} else if (accion === "bajar") {
  const q = args[0];
  const n = Number(args.find((a, i) => i > 0 && /^\d+$/.test(a) && args[i - 1] !== "--max-dur") ?? 20);
  const maxDur = Number(args[args.indexOf("--max-dur") + 1] || 30);
  const carpeta = path.join(BIB, "sonidos/freesound", q.replace(/[^\w áéíóúñ-]+/gi, "").trim().replace(/\s+/g, "-"));
  fs.mkdirSync(carpeta, { recursive: true });
  const filtro = `license:"Creative Commons 0" duration:[0 TO ${maxDur}] type:(wav OR aiff OR flac OR mp3)`; // .ogg no lo lee macOS
  const conOAuth = Boolean(leerCred().access_token);
  const campos = "id,name,license,duration,type,avg_rating,num_downloads,username,previews";
  const clave = conOAuth ? "" : `&token=${leerCred().client_secret}`;
  // El buscador exige todas las palabras: se quitan las de relleno («on», «from»…) o la búsqueda queda en cero.
  const consulta = q.split(/\s+/).filter((w) => !/^(on|from|of|the|a|an|in|at|to|with|and)$/i.test(w)).join(" ");
  const buscar = `${API}/search/text/?query=${encodeURIComponent(consulta)}&filter=${encodeURIComponent(conOAuth ? filtro : filtro.replace(/ type:\(.*\)/, ""))}&sort=score&fields=${campos}&page_size=${Math.min(n, 150)}${clave}`;
  const r = await (conOAuth ? await pedir(buscar) : await fetch(buscar)).json();
  let ok = 0;
  for (const s of r.results ?? []) {
    const ext = conOAuth ? s.type || "wav" : "mp3";
    const nombre = `${s.name.replace(/\.[a-z0-9]+$/i, "").replace(/[/\\:*?"<>|]+/g, " ").trim().slice(0, 70)} - ${s.id}.${ext}`;
    const destino = path.join(carpeta, nombre);
    if (fs.existsSync(destino)) continue;
    try {
      const audio = Buffer.from(await (conOAuth ? await pedir(`${API}/sounds/${s.id}/download/`) : await fetch(s.previews["preview-hq-mp3"])).arrayBuffer());
      fs.writeFileSync(destino, audio);
      ok++;
      console.log(`ok · ${nombre} (${s.duration.toFixed(1)} s · ${s.username})`);
    } catch (e) { console.log(`falló · ${s.name}: ${e.message}`); }
    await new Promise((x) => setTimeout(x, 1100)); // Freesound: ~60 descargas por minuto
  }
  console.log(`${q}: ${ok} nuevos en ${carpeta}`);
} else {
  console.log(fs.readFileSync(new URL(import.meta.url), "utf8").split("\n").slice(0, 9).join("\n"));
}
