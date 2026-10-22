// uso: node herramientas/musica-pixabay.mjs <emoción> "<búsqueda>" [n=5]
// Baja los primeros n temas de una búsqueda de Pixabay Music a biblioteca/musica/<emoción>/ y los anota en
// biblioteca/musica/catalogo.json (título, autor, página = prueba de licencia, fecha). Pixabay bloquea curl:
// se usa Chromium headless y se captura el mp3 que suena al apretar Play.
import { chromium } from "/Users/osito/Proyectos/medula-mac/.pruebas-tmp/pw/node_modules/playwright-core/index.mjs";
import fs from "node:fs";
import path from "node:path";
const [emocion, q, nArg] = process.argv.slice(2);
const n = Number(nArg || 5);
const BASE = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../biblioteca/musica");
const carpeta = path.join(BASE, emocion);
fs.mkdirSync(carpeta, { recursive: true });
const rutaCat = path.join(BASE, "catalogo.json");
const catalogo = fs.existsSync(rutaCat) ? JSON.parse(fs.readFileSync(rutaCat, "utf8")) : [];
const b = await chromium.launch();
try {
  const ctx = await b.newContext({ userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36", viewport: { width: 1400, height: 1000 } });
  const p = await ctx.newPage();
  await p.goto("https://pixabay.com/music/search/" + encodeURIComponent(q) + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await p.waitForTimeout(5000);
  const filas = await p.$$('[class*="audioRow"]');
  for (const fila of filas.slice(0, n)) {
    const titulo = (await fila.$eval('a[class*="title"]', (a) => a.textContent.trim()).catch(() => "")) || "sin-titulo";
    const pagina = "https://pixabay.com" + (await fila.$eval('a[class*="title"]', (a) => a.getAttribute("href")).catch(() => ""));
    const autor = await fila.$eval('a[class*="name"]', (a) => a.textContent.trim()).catch(() => "");
    if (catalogo.some((c) => c.pagina === pagina)) { console.log("ya está", titulo); continue; }
    const espera = p.waitForResponse((r) => /\.mp3(\?|$)/.test(r.url()), { timeout: 15000 }).catch(() => null);
    await fila.$eval('button[class*="playOverlay"]', (btn) => btn.click()).catch(() => {});
    const r = await espera;
    await fila.$eval('button[class*="playOverlay"]', (btn) => btn.click()).catch(() => {});
    if (!r) { console.log("sin mp3", titulo); continue; }
    const cuerpo = await (await ctx.request.get(r.url())).body();
    const archivo = path.join(carpeta, `${titulo.replace(/[^\p{L}\p{N} ()-]+/gu, "").trim()} - ${autor}.mp3`);
    fs.writeFileSync(archivo, cuerpo);
    catalogo.push({ emocion, busqueda: q, titulo, autor, pagina, archivo: path.relative(BASE, archivo), licencia: "Pixabay Content License", bajado: new Date().toISOString().slice(0, 10) });
    console.log("ok", emocion, "·", titulo, "·", autor, (cuerpo.length / 1e6).toFixed(1), "MB");
    await p.waitForTimeout(1500);
  }
} finally {
  fs.writeFileSync(rutaCat, JSON.stringify(catalogo, null, 1));
  await b.close();
}
