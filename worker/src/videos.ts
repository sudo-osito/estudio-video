import { anotar, Env, ErrorHttp, nuevoId } from "./util";

export const ESTADOS = ["grabar", "material", "listo", "editando", "entregado", "publicado", "descartado"] as const;
const NOMBRE_ESTADO: Record<string, string> = {
  grabar: "por grabar", material: "con material", listo: "listo para editar", editando: "en edición",
  entregado: "entregado", publicado: "publicado", descartado: "descartado",
};

type Fila = Record<string, unknown> & { datos: string; hechos: string; estado: string; nota: string };
const abrir = (f: Fila) => ({ ...f, datos: JSON.parse(f.datos || "{}"), hechos: JSON.parse(f.hechos || "[]") });

export async function listar(env: Env, desde: string | null, hasta: string | null) {
  const { results } = await env.DB.prepare(
    `SELECT v.id, v.fecha, v.pilar, v.formato, v.titulo, v.gancho, v.estado,
            (SELECT COUNT(*) FROM archivos x WHERE x.video_id = v.id AND x.tipo = 'material' AND x.estado = 'ok') AS material,
            (SELECT COUNT(*) FROM archivos x WHERE x.video_id = v.id AND x.tipo = 'entrega' AND x.estado = 'ok') AS entregas
     FROM videos v WHERE v.fecha >= ? AND v.fecha <= ? ORDER BY v.fecha, v.creado`,
  ).bind(desde || "0000-00-00", hasta || "9999-12-31").all();
  return results;
}

export async function leer(env: Env, id: string) {
  const f = await env.DB.prepare("SELECT * FROM videos WHERE id = ?").bind(id).first<Fila>();
  if (!f) throw new ErrorHttp(404, "No existe ese video.");
  const { results: archivos } = await env.DB.prepare(
    "SELECT id, tipo, nombre, mime, bytes, estado, creado FROM archivos WHERE video_id = ? AND estado != 'borrado' ORDER BY creado",
  ).bind(id).all();
  const { results: bitacora } = await env.DB.prepare(
    "SELECT quien, texto, creado FROM bitacora WHERE video_id = ? ORDER BY id DESC LIMIT 30",
  ).bind(id).all();
  return { ...abrir(f), archivos, bitacora };
}

interface Cambios { fecha?: string; pilar?: string; formato?: string; titulo?: string; gancho?: string; datos?: Record<string, unknown>; estado?: string; nota?: string; hechos?: unknown[] }

function validar(c: Cambios) {
  if (c.fecha != null && !/^\d{4}-\d{2}-\d{2}$/.test(c.fecha)) throw new ErrorHttp(400, "La fecha va como AAAA-MM-DD.");
  if (c.estado != null && !ESTADOS.includes(c.estado as (typeof ESTADOS)[number])) throw new ErrorHttp(400, `Estado inválido: ${c.estado}.`);
}

export async function crear(env: Env, c: Cambios, quien: string) {
  validar(c);
  if (!c.titulo || !c.fecha) throw new ErrorHttp(400, "Falta título o fecha.");
  const id = nuevoId();
  await env.DB.prepare("INSERT INTO videos (id, fecha, pilar, formato, titulo, gancho, datos, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(id, c.fecha, c.pilar ?? "", c.formato ?? "", c.titulo, c.gancho ?? "", JSON.stringify(c.datos ?? {}), c.estado ?? "grabar").run();
  await anotar(env, id, quien, "Creó el video.");
  return leer(env, id);
}

/* «datos» se mezcla por bloque (guion, edicion, post…): mandar solo lo que cambia. */
export async function editar(env: Env, id: string, c: Cambios, quien: string) {
  validar(c);
  const actual = await leer(env, id);
  const campos: string[] = [];
  const valores: unknown[] = [];
  for (const k of ["fecha", "pilar", "formato", "titulo", "gancho", "estado", "nota"] as const) {
    if (c[k] != null) { campos.push(`${k} = ?`); valores.push(c[k]); }
  }
  if (c.datos) { campos.push("datos = ?"); valores.push(JSON.stringify({ ...actual.datos, ...c.datos })); }
  if (c.hechos) { campos.push("hechos = ?"); valores.push(JSON.stringify(c.hechos)); }
  if (!campos.length) return actual;
  await env.DB.prepare(`UPDATE videos SET ${campos.join(", ")}, actualizado = datetime('now') WHERE id = ?`).bind(...valores, id).run();
  if (c.estado && c.estado !== actual.estado) await anotar(env, id, quien, `Pasó a «${NOMBRE_ESTADO[c.estado]}».${c.nota ? ` Nota: ${c.nota}` : ""}`);
  else if (c.nota != null && c.nota !== actual.nota) await anotar(env, id, quien, `Nota: ${c.nota}`);
  return leer(env, id);
}

export async function borrar(env: Env, id: string, quien: string) {
  const { results } = await env.DB.prepare("SELECT clave FROM archivos WHERE video_id = ?").bind(id).all<{ clave: string }>();
  if (results.length && env.MATERIAL) await env.MATERIAL.delete(results.map((r) => r.clave));
  await env.DB.prepare("DELETE FROM videos WHERE id = ?").bind(id).run();
  await anotar(env, null, quien, `Borró el video ${id}.`);
  return { ok: true };
}
