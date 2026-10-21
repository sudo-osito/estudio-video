// uso: ESTUDIO_API=… ESTUDIO_LLAVE=es_… node herramientas/subir.mjs <video_id> <archivo> [material|entrega]
// Sube un archivo por trozos (la entrega editada, normalmente) igual que la página.
import fs from "node:fs";
import path from "node:path";
const API = process.env.ESTUDIO_API, LLAVE = process.env.ESTUDIO_LLAVE;
const [videoId, ruta, tipo = "entrega"] = process.argv.slice(2);
const h = { authorization: `Bearer ${LLAVE}`, "x-estudio-quien": "claude" };
const pedir = async (u, o = {}) => { const r = await fetch(API + u, { ...o, headers: { ...h, ...o.headers } }); const d = await r.json(); if (!r.ok) throw new Error(d.error); return d; };
const bytes = fs.statSync(ruta).size;
const mime = { ".mp4": "video/mp4", ".mov": "video/quicktime", ".jpg": "image/jpeg", ".png": "image/png", ".srt": "text/plain" }[path.extname(ruta).toLowerCase()] ?? "application/octet-stream";
const { id, parte } = await pedir(`/api/videos/${videoId}/archivos`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ nombre: path.basename(ruta), mime, bytes, tipo }) });
const fd = fs.openSync(ruta, "r");
const total = Math.max(1, Math.ceil(bytes / parte));
for (let n = 1; n <= total; n++) {
  const largo = Math.min(parte, bytes - (n - 1) * parte);
  const buf = Buffer.alloc(largo);
  fs.readSync(fd, buf, 0, largo, (n - 1) * parte);
  await pedir(`/api/archivos/${id}/partes/${n}`, { method: "PUT", body: buf });
  process.stdout.write(`\r${n}/${total}`);
}
console.log("\n", await pedir(`/api/archivos/${id}/cerrar`, { method: "POST" }), id);
