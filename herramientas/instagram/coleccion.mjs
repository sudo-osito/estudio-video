import { chromium } from "/Users/osito/Proyectos/medula-mac/.pruebas-tmp/pw/node_modules/playwright-core/index.mjs";
import fs from "node:fs";
const [estado, ruta, salida] = process.argv.slice(2);
const b = await chromium.launch();
const ctx = await b.newContext({ storageState: estado, userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36", viewport: { width: 1300, height: 1000 }, locale: "es-CL" });
const p = await ctx.newPage();
const medios = new Map();
function buscar(o) {
  if (!o || typeof o !== "object") return;
  if (o.code && (o.video_versions || o.media_type)) { if (!medios.has(o.code) || (o.video_versions && !medios.get(o.code).video_versions)) medios.set(o.code, o); }
  for (const k in o) buscar(o[k]);
}
p.on("response", async (r) => { const ct = r.headers()["content-type"] || ""; if (!/json|javascript/.test(ct)) return; try { const t = await r.text(); if (t.includes('"code"')) buscar(JSON.parse(t.replace(/^for \(;;\);/, ""))); } catch {} });
await p.goto("https://www.instagram.com" + ruta, { waitUntil: "domcontentloaded" }); await p.waitForTimeout(5000);
// datos incrustados en el HTML
for (const s of await p.$$eval("script[type='application/json']", (ss) => ss.map((x) => x.textContent))) { if (s.includes('"code"')) try { buscar(JSON.parse(s)); } catch {} }
const enlaces = new Set();
for (let i = 0; i < 25; i++) {
  (await p.$$eval("a[href*='/p/'], a[href*='/reel/']", (as) => as.map((a) => a.getAttribute("href")))).forEach((h) => enlaces.add(h));
  const antes = enlaces.size; await p.mouse.wheel(0, 2500); await p.waitForTimeout(1800);
  (await p.$$eval("a[href*='/p/'], a[href*='/reel/']", (as) => as.map((a) => a.getAttribute("href")))).forEach((h) => enlaces.add(h));
  if (enlaces.size === antes && i > 3) break;
}
const codigos = [...enlaces].map((h) => h.split("/").filter(Boolean).pop());
const lista = codigos.map((c) => { const m = medios.get(c) || {}; return { codigo: c, url: `https://www.instagram.com/reel/${c}/`, autor: m.user?.username, tipo: m.media_type, dur: m.video_duration, video: m.video_versions?.[0]?.url || null, texto: (m.caption?.text || "").slice(0, 300), musica: m.clips_metadata?.music_info?.music_asset_info ? `${m.clips_metadata.music_info.music_asset_info.display_artist} - ${m.clips_metadata.music_info.music_asset_info.title}` : null }; });
fs.writeFileSync(salida, JSON.stringify(lista, null, 1));
console.log("enlaces:", enlaces.size, "| con datos:", lista.filter((x) => x.autor).length, "| con video:", lista.filter((x) => x.video).length);
for (const x of lista) console.log(`${x.codigo} · @${x.autor || "?"} · ${x.dur ? x.dur.toFixed(0) + " s" : ""} · ${x.musica || ""}`);
await b.close();
