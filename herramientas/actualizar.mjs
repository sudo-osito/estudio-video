// uso: ESTUDIO_API=… ESTUDIO_LLAVE=es_… node herramientas/actualizar.mjs semillas/calendario-01.json [bloque…]
// Actualiza los videos que ya existen (por fecha): título, formato, pilar, gancho y los bloques de «datos» indicados (por defecto, todos).
import fs from "node:fs";
const API = process.env.ESTUDIO_API, LLAVE = process.env.ESTUDIO_LLAVE;
const h = { authorization: `Bearer ${LLAVE}`, "content-type": "application/json", "x-estudio-quien": "claude" };
const tanda = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const bloques = process.argv.length > 3 ? process.argv.slice(3) : null;
const porFecha = new Map((await (await fetch(`${API}/api/videos`, { headers: h })).json()).map((v) => [v.fecha, v.id]));
for (const v of tanda) {
  const id = porFecha.get(v.fecha);
  if (!id) { console.log("no existe", v.fecha); continue; }
  const datos = bloques ? Object.fromEntries(bloques.filter((b) => b in v.datos).map((b) => [b, v.datos[b]])) : v.datos;
  const { titulo, formato, pilar, gancho } = v;
  const r = await fetch(`${API}/api/videos/${id}`, { method: "PATCH", headers: h, body: JSON.stringify({ titulo, formato, pilar, gancho, datos }) });
  console.log(r.status, v.fecha, v.titulo);
}
