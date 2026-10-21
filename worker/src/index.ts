/* Estudio · API del calendario de orgánicos de Max.
   La página (GitHub Pages) lee el calendario, sube el material por trozos a R2 y avisa «listo para editar».
   Claude entra por /mcp con la misma llave y ve qué está listo, baja el material y deja la entrega. */
import { mcp } from "./mcp";
import { Env, ErrorHttp, json, quienDe, sha256 } from "./util";
import * as v from "./videos";
import * as a from "./archivos";

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const cors = corsDe(req, env);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    try {
      const r = await rutear(req, env, url);
      const h = new Headers(r.headers);
      for (const [k, val] of Object.entries(cors)) h.set(k, val);
      return new Response(r.body, { status: r.status, headers: h });
    } catch (e) {
      if (e instanceof ErrorHttp) return json({ error: e.message }, e.estado, cors);
      console.error(e);
      return json({ error: "Algo falló en el estudio." }, 500, cors);
    }
  },
};

function corsDe(req: Request, env: Env): Record<string, string> {
  const origen = req.headers.get("origin") ?? "";
  const permitidos = env.ORIGENES.split(",").map((s) => s.trim());
  if (!permitidos.includes(origen)) return {};
  return {
    "access-control-allow-origin": origen,
    "access-control-allow-methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "access-control-allow-headers": "authorization, content-type",
    "access-control-max-age": "86400",
    vary: "origin",
  };
}

async function autorizar(req: Request, env: Env): Promise<string> {
  const m = (req.headers.get("authorization") ?? "").match(/^Bearer\s+(es_[A-Za-z0-9_-]+)$/);
  if (!m) throw new ErrorHttp(401, "Falta la llave del estudio.");
  const id = await sha256(m[1]);
  const fila = await env.DB.prepare("SELECT nombre FROM llaves WHERE id = ?").bind(id).first<{ nombre: string }>();
  if (!fila) throw new ErrorHttp(401, "Llave inválida.");
  await env.DB.prepare("UPDATE llaves SET usado = datetime('now') WHERE id = ?").bind(id).run();
  return fila.nombre;
}

async function rutear(req: Request, env: Env, url: URL): Promise<Response> {
  const p = url.pathname.replace(/\/+$/, "");
  const metodo = req.method;
  if (p === "/api/salud") return json({ ok: true });
  if (p === "/mcp") return mcp(req, env, () => autorizar(req, env));

  // Descarga firmada: sirve al <video> de la página y a curl sin cabeceras.
  let m = p.match(/^\/api\/archivos\/([\w-]+)\/bajar$/);
  if (m && (metodo === "GET" || metodo === "HEAD")) return a.bajar(req, env, m[1], url);

  if (!p.startsWith("/api/")) return json({ error: "No existe." }, 404);
  const quien = quienDe(await autorizar(req, env), req);

  if (p === "/api/videos" && metodo === "GET") return json(await v.listar(env, url.searchParams.get("desde"), url.searchParams.get("hasta")));
  if (p === "/api/videos" && metodo === "POST") return json(await v.crear(env, await req.json(), quien), 201);
  if ((m = p.match(/^\/api\/videos\/([\w-]+)$/))) {
    if (metodo === "GET") return json(await v.leer(env, m[1]));
    if (metodo === "PATCH") return json(await v.editar(env, m[1], await req.json(), quien));
    if (metodo === "DELETE") return json(await v.borrar(env, m[1], quien));
  }
  if ((m = p.match(/^\/api\/videos\/([\w-]+)\/archivos$/)) && metodo === "POST") return json(await a.iniciar(env, m[1], await req.json(), quien), 201);
  if ((m = p.match(/^\/api\/archivos\/([\w-]+)\/partes$/)) && metodo === "GET") return json(await a.partesHechas(env, m[1]));
  if ((m = p.match(/^\/api\/archivos\/([\w-]+)\/partes\/(\d+)$/)) && metodo === "PUT") return json(await a.subirParte(env, m[1], Number(m[2]), req));
  if ((m = p.match(/^\/api\/archivos\/([\w-]+)\/cerrar$/)) && metodo === "POST") return json(await a.cerrar(env, m[1], quien));
  if ((m = p.match(/^\/api\/archivos\/([\w-]+)\/enlace$/)) && metodo === "GET") return json(await a.enlace(env, m[1], url.origin));
  if ((m = p.match(/^\/api\/archivos\/([\w-]+)$/)) && metodo === "DELETE") return json(await a.borrar(env, m[1], quien));
  return json({ error: "No existe." }, 404);
}
