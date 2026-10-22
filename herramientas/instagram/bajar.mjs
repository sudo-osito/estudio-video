import { chromium } from "/Users/osito/Proyectos/medula-mac/.pruebas-tmp/pw/node_modules/playwright-core/index.mjs";
import fs from "node:fs";
const [estado, listaRuta, carpeta] = process.argv.slice(2);
const lista = JSON.parse(fs.readFileSync(listaRuta, "utf8"));
const b = await chromium.launch();
const ctx = await b.newContext({ storageState: estado, userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36", viewport: { width: 1300, height: 1000 }, locale: "es-CL" });
for (const x of lista) {
  const destino = `${carpeta}/${x.codigo}.mp4`;
  if (fs.existsSync(destino)) { console.log("ya", x.codigo); continue; }
  const p = await ctx.newPage();
  let mejor = null;
  const buscar = (o) => { if (!o || typeof o !== "object") return; if (o.code === x.codigo && o.video_versions) mejor = o; for (const k in o) buscar(o[k]); };
  p.on("response", async (r) => { const ct = r.headers()["content-type"] || ""; if (!/json|javascript|html/.test(ct)) return; try { const t = await r.text(); if (t.includes("video_versions")) { for (const m of t.matchAll(/<script type="application\/json"[^>]*>([\s\S]*?)<\/script>/g)) try { buscar(JSON.parse(m[1])); } catch {} try { buscar(JSON.parse(t.replace(/^for \(;;\);/, ""))); } catch {} } } catch {} });
  await p.goto(`https://www.instagram.com/reel/${x.codigo}/`, { waitUntil: "domcontentloaded" }); await p.waitForTimeout(5000);
  for (const s of await p.$$eval("script[type='application/json']", (ss) => ss.map((q) => q.textContent))) if (s.includes("video_versions")) try { buscar(JSON.parse(s)); } catch {}
  if (mejor) {
    const v = mejor.video_versions.sort((a, c) => (c.width || 0) - (a.width || 0))[0];
    const r = await ctx.request.get(v.url);
    fs.writeFileSync(destino, await r.body());
    x.dur = mejor.video_duration; x.ancho = v.width; x.alto = v.height;
    x.musica = mejor.clips_metadata?.music_info?.music_asset_info ? `${mejor.clips_metadata.music_info.music_asset_info.display_artist} - ${mejor.clips_metadata.music_info.music_asset_info.title}` : (mejor.clips_metadata?.original_sound_info ? `audio original de @${mejor.clips_metadata.original_sound_info.ig_artist?.username || x.autor}` : x.musica);
    x.texto = (mejor.caption?.text || x.texto || "").slice(0, 400);
    console.log("ok", x.codigo, `${v.width}x${v.height}`, (fs.statSync(destino).size / 1e6).toFixed(1), "MB ·", x.musica || "");
  } else console.log("sin video", x.codigo);
  await p.close();
  await new Promise((r) => setTimeout(r, 2500));
}
fs.writeFileSync(listaRuta, JSON.stringify(lista, null, 1));
await b.close();
