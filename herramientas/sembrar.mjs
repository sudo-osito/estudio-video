// uso: ESTUDIO_API=… ESTUDIO_LLAVE=es_… node herramientas/sembrar.mjs semillas/calendario-01.json
// Carga una tanda de videos al calendario; salta las fechas que ya tienen video.
import fs from "node:fs";
const API = process.env.ESTUDIO_API, LLAVE = process.env.ESTUDIO_LLAVE;
const h = { authorization: `Bearer ${LLAVE}`, "content-type": "application/json", "x-estudio-quien": "claude" };
const tanda = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const hay = new Set((await (await fetch(`${API}/api/videos`, { headers: h })).json()).map((v) => v.fecha));
for (const v of tanda) {
  if (hay.has(v.fecha)) { console.log("ya existe", v.fecha); continue; }
  const r = await fetch(`${API}/api/videos`, { method: "POST", headers: h, body: JSON.stringify(v) });
  console.log(r.status, v.fecha, v.titulo);
}
