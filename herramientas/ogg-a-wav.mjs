// uso: node herramientas/ogg-a-wav.mjs <carpeta>   → convierte cada .ogg a .wav (16 bits) y borra el .ogg.
// macOS no decodifica Ogg Vorbis; Chromium sí (decodeAudioData), así que se usa el Chromium de Playwright.
import { chromium } from "/Users/osito/Proyectos/medula-mac/.pruebas-tmp/pw/node_modules/playwright-core/index.mjs";
import fs from "node:fs";
import path from "node:path";
const raiz = path.resolve(process.argv[2]);
const oggs = [];
(function recorrer(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) recorrer(p); else if (/\.ogg$/i.test(e.name)) oggs.push(p); } })(raiz);
const b = await chromium.launch();
const pg = await b.newPage();
await pg.goto("about:blank");
let ok = 0;
for (const f of oggs) {
  const datos = await pg.evaluate(async (b64) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const ctx = new OfflineAudioContext(1, 1, 48000);
    const buf = await ctx.decodeAudioData(bytes.buffer);
    const canales = [];
    for (let c = 0; c < buf.numberOfChannels; c++) canales.push(Array.from(buf.getChannelData(c), (x) => Math.max(-32768, Math.min(32767, Math.round(x * 32767)))));
    return { sr: buf.sampleRate, canales };
  }, fs.readFileSync(f).toString("base64")).catch((e) => { console.log("no pude", f, e.message); return null; });
  if (!datos) continue;
  const nc = datos.canales.length, n = datos.canales[0].length;
  const wav = Buffer.alloc(44 + n * nc * 2);
  wav.write("RIFF", 0); wav.writeUInt32LE(36 + n * nc * 2, 4); wav.write("WAVE", 8); wav.write("fmt ", 12);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(nc, 22); wav.writeUInt32LE(datos.sr, 24);
  wav.writeUInt32LE(datos.sr * nc * 2, 28); wav.writeUInt16LE(nc * 2, 32); wav.writeUInt16LE(16, 34); wav.write("data", 36); wav.writeUInt32LE(n * nc * 2, 40);
  for (let i = 0; i < n; i++) for (let c = 0; c < nc; c++) wav.writeInt16LE(datos.canales[c][i], 44 + (i * nc + c) * 2);
  fs.writeFileSync(f.replace(/\.ogg$/i, ".wav"), wav);
  fs.unlinkSync(f);
  ok++;
}
await b.close();
console.log(`convertidos ${ok} de ${oggs.length}`);
