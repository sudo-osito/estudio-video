/* Subida por trozos a R2 (cada trozo cabe en el límite de 100 MB del Worker) y descarga con enlace firmado.
   Los trozos hechos quedan en D1: si el celular corta la subida, la página retoma desde el que falta. */
import { anotar, Env, ErrorHttp, hmac, nuevoId } from "./util";

export const PARTE = 20 * 1024 * 1024; // R2 exige trozos iguales (salvo el último) y de al menos 5 MiB
const HORAS_ENLACE = 12;

interface Archivo { id: string; video_id: string; tipo: string; nombre: string; mime: string; bytes: number; clave: string; subida: string | null; estado: string }

async function archivo(env: Env, id: string): Promise<Archivo> {
  const f = await env.DB.prepare("SELECT * FROM archivos WHERE id = ?").bind(id).first<Archivo>();
  if (!f || f.estado === "borrado") throw new ErrorHttp(404, "No existe ese archivo.");
  return f;
}

export async function iniciar(env: Env, videoId: string, c: { nombre?: string; mime?: string; bytes?: number; tipo?: string }, quien: string) {
  const v = await env.DB.prepare("SELECT fecha FROM videos WHERE id = ?").bind(videoId).first<{ fecha: string }>();
  if (!v) throw new ErrorHttp(404, "No existe ese video.");
  const nombre = String(c.nombre ?? "archivo").replace(/[\/\\]/g, "-").slice(0, 160);
  const tipo = c.tipo === "entrega" ? "entrega" : "material";
  const id = nuevoId();
  const clave = `${v.fecha}/${videoId.slice(0, 8)}/${tipo}/${id.slice(0, 8)}-${nombre}`;
  const mime = String(c.mime || "application/octet-stream");
  const sub = await env.MATERIAL.createMultipartUpload(clave, { httpMetadata: { contentType: mime } });
  await env.DB.prepare("INSERT INTO archivos (id, video_id, tipo, nombre, mime, bytes, clave, subida) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(id, videoId, tipo, nombre, mime, Number(c.bytes) || 0, clave, sub.uploadId).run();
  if (tipo === "entrega") await anotar(env, videoId, quien, `Empezó a subir la entrega «${nombre}».`);
  return { id, parte: PARTE };
}

export async function partesHechas(env: Env, id: string) {
  await archivo(env, id);
  const { results } = await env.DB.prepare("SELECT n FROM partes WHERE archivo_id = ? ORDER BY n").bind(id).all<{ n: number }>();
  return { parte: PARTE, hechas: results.map((r) => r.n) };
}

export async function subirParte(env: Env, id: string, n: number, req: Request) {
  const f = await archivo(env, id);
  if (f.estado !== "subiendo" || !f.subida) throw new ErrorHttp(409, "Ese archivo ya se cerró.");
  if (!(n >= 1 && n <= 10000)) throw new ErrorHttp(400, "Número de trozo inválido.");
  const cuerpo = await req.arrayBuffer();
  if (!cuerpo.byteLength) throw new ErrorHttp(400, "Trozo vacío.");
  const parte = await env.MATERIAL.resumeMultipartUpload(f.clave, f.subida).uploadPart(n, cuerpo);
  await env.DB.prepare("INSERT OR REPLACE INTO partes (archivo_id, n, etag) VALUES (?, ?, ?)").bind(id, n, parte.etag).run();
  return { n, ok: true };
}

export async function cerrar(env: Env, id: string, quien: string) {
  const f = await archivo(env, id);
  if (f.estado === "ok") return { ok: true };
  const { results } = await env.DB.prepare("SELECT n, etag FROM partes WHERE archivo_id = ? ORDER BY n").bind(id).all<{ n: number; etag: string }>();
  if (!results.length) throw new ErrorHttp(400, "No hay trozos subidos.");
  const esperadas = Math.max(1, Math.ceil(f.bytes / PARTE));
  if (f.bytes && results.length !== esperadas) throw new ErrorHttp(409, `Faltan trozos: hay ${results.length} de ${esperadas}.`);
  const obj = await env.MATERIAL.resumeMultipartUpload(f.clave, f.subida!).complete(results.map((r) => ({ partNumber: r.n, etag: r.etag })));
  await env.DB.batch([
    env.DB.prepare("UPDATE archivos SET estado = 'ok', bytes = ?, subida = NULL WHERE id = ?").bind(obj.size, id),
    env.DB.prepare("DELETE FROM partes WHERE archivo_id = ?").bind(id),
  ]);
  if (f.tipo === "material") {
    await env.DB.prepare("UPDATE videos SET estado = 'material', actualizado = datetime('now') WHERE id = ? AND estado = 'grabar'").bind(f.video_id).run();
    await anotar(env, f.video_id, quien, `Subió «${f.nombre}» (${(obj.size / 1048576).toFixed(0)} MB).`);
  } else {
    await anotar(env, f.video_id, quien, `Dejó la entrega «${f.nombre}».`);
  }
  return { ok: true, bytes: obj.size };
}

export async function borrar(env: Env, id: string, quien: string) {
  const f = await archivo(env, id);
  if (f.subida) await env.MATERIAL.resumeMultipartUpload(f.clave, f.subida).abort().catch(() => {});
  else await env.MATERIAL.delete(f.clave);
  await env.DB.batch([
    env.DB.prepare("UPDATE archivos SET estado = 'borrado', subida = NULL WHERE id = ?").bind(id),
    env.DB.prepare("DELETE FROM partes WHERE archivo_id = ?").bind(id),
  ]);
  await anotar(env, f.video_id, quien, `Borró «${f.nombre}».`);
  return { ok: true };
}

function secreto(env: Env) {
  if (!env.FIRMA) throw new ErrorHttp(500, "Falta el secreto FIRMA del Worker.");
  return env.FIRMA;
}

export async function enlace(env: Env, id: string, origen: string) {
  const f = await archivo(env, id);
  if (f.estado !== "ok") throw new ErrorHttp(409, "El archivo todavía se está subiendo.");
  const exp = Math.floor(Date.now() / 1000) + HORAS_ENLACE * 3600;
  const firma = await hmac(secreto(env), `${id}.${exp}`);
  return { url: `${origen}/api/archivos/${id}/bajar?exp=${exp}&f=${firma}`, nombre: f.nombre, bytes: f.bytes, vence: new Date(exp * 1000).toISOString() };
}

/* Responde Range para que el <video> pueda adelantar sin bajar todo. */
export async function bajar(req: Request, env: Env, id: string, url: URL) {
  const exp = Number(url.searchParams.get("exp"));
  const f = url.searchParams.get("f") ?? "";
  if (!exp || exp < Date.now() / 1000 || f !== (await hmac(secreto(env), `${id}.${exp}`))) throw new ErrorHttp(403, "Enlace vencido o inválido.");
  const a = await archivo(env, id);
  const obj = await env.MATERIAL.get(a.clave, { range: req.headers, onlyIf: req.headers });
  if (!obj) throw new ErrorHttp(404, "El archivo no está en el almacenamiento.");
  const h = new Headers();
  obj.writeHttpMetadata(h);
  h.set("etag", obj.httpEtag);
  h.set("accept-ranges", "bytes");
  h.set("content-disposition", `inline; filename*=UTF-8''${encodeURIComponent(a.nombre)}`);
  if (!("body" in obj)) return new Response(null, { status: 304, headers: h });
  const r = obj.range as { offset?: number; length?: number } | undefined;
  if (r && req.headers.has("range")) {
    const ini = r.offset ?? 0;
    const largo = r.length ?? obj.size - ini;
    h.set("content-range", `bytes ${ini}-${ini + largo - 1}/${obj.size}`);
    h.set("content-length", String(largo));
    return new Response(req.method === "HEAD" ? null : obj.body, { status: 206, headers: h });
  }
  h.set("content-length", String(obj.size));
  return new Response(req.method === "HEAD" ? null : obj.body, { headers: h });
}
