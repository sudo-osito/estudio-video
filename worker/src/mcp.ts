/* MCP del estudio (HTTP «streamable», JSON-RPC en POST /mcp). Claude planifica el calendario, ve qué grabó Max,
   baja el material y deja la entrega editada. Misma llave que la página (Authorization: Bearer es_…). */
import * as a from "./archivos";
import { anotar, Env, ErrorHttp, json } from "./util";
import * as v from "./videos";

const VERSION = "2025-06-18";
type Args = Record<string, unknown>;
const obj = (props: Record<string, unknown>, req: string[] = []) => ({ type: "object", properties: props, required: req, additionalProperties: false });
const str = (d: string) => ({ type: "string", description: d });
const estado = { type: "string", enum: [...v.ESTADOS] };
const DATOS = {
  type: "object",
  description:
    "Bloques del video (se mezclan con los actuales): por_que, origen (chiste|persona|evento|espacio|objeto), ganchos_alt[], duracion, " +
    "grabar{plano, lugar, ropa, luz}, " +
    "beats[{t, modo: camara|voz|pantalla|escena, dice, hace (gesto o acción mientras lo dice), ve (qué se ve encima si es voz/pantalla: lo que Max graba aparte), plano, seg}] " +
    "(el gancho = beats[0].dice; cada párrafo debe dejar claro si Max se graba diciéndolo, si es voz en off y qué graba para encima, o si es una escena sin hablar), " +
    "recursos[{que, detalle}] (lo que Max debe mandar: datos reales, capturas, archivos), broll[], props[], edicion{estilo, subtitulos, musica, efectos[], ritmo}, " +
    "post{texto, hashtags[], sonido, inicio_sonido}, " +
    "tomas[{id, que, detalle, grupo: Tomas|Aparte}] (lo que Max debe grabar para editar; si falta, la página lo arma desde el guion), beats[].seg (segundos fijos de un párrafo en el teleprompter)",
};

const HERRAMIENTAS = [
  { name: "calendario", description: "Videos entre dos fechas con su estado y cuánto material o entregas tienen. Sin fechas: todo.", inputSchema: obj({ desde: str("AAAA-MM-DD"), hasta: str("AAAA-MM-DD") }) },
  { name: "pendientes", description: "Lo que Max dejó «listo para editar» (y lo que está «en edición»), con su material y nota. Úsalo cuando Max avise que subió todo.", inputSchema: obj({}) },
  { name: "leer_video", description: "Todo de un video: gancho, guion (beats), plan de edición, post, archivos, nota de Max y bitácora.", inputSchema: obj({ id: str("id del video") }, ["id"]) },
  { name: "crear_video", description: "Agrega un video al calendario.", inputSchema: obj({ fecha: str("AAAA-MM-DD"), titulo: str("título corto"), pilar: str("pilar de contenido"), formato: str("formato"), gancho: str("la primera frase exacta"), datos: DATOS }, ["fecha", "titulo"]) },
  { name: "editar_video", description: "Cambia un video. «datos» se mezcla por bloque (mandar el bloque entero que cambia).", inputSchema: obj({ id: str("id"), fecha: str("AAAA-MM-DD"), titulo: str("título"), pilar: str("pilar"), formato: str("formato"), gancho: str("gancho"), estado, nota: str("nota visible para Max"), datos: DATOS }, ["id"]) },
  { name: "enlace_descarga", description: "Enlace firmado (12 h) para bajar un archivo con curl: curl -L -o <nombre> '<url>'.", inputSchema: obj({ archivo_id: str("id del archivo") }, ["archivo_id"]) },
  { name: "anotar", description: "Deja una nota en la bitácora del video (qué se decidió al editar y por qué).", inputSchema: obj({ id: str("id del video"), texto: str("la nota") }, ["id", "texto"]) },
];

async function llamar(env: Env, nombre: string, x: Args, origen: string): Promise<unknown> {
  const req = (k: string) => { const s = String(x[k] ?? ""); if (!s) throw new ErrorHttp(400, `Falta ${k}.`); return s; };
  switch (nombre) {
    case "calendario": return v.listar(env, (x.desde as string) ?? null, (x.hasta as string) ?? null);
    case "pendientes": {
      const { results } = await env.DB.prepare("SELECT id FROM videos WHERE estado IN ('listo', 'editando') ORDER BY fecha").all<{ id: string }>();
      return Promise.all(results.map((r) => v.leer(env, r.id)));
    }
    case "leer_video": return v.leer(env, req("id"));
    case "crear_video": return v.crear(env, x as never, "Claude");
    case "editar_video": { const { id, ...resto } = x; return v.editar(env, req("id"), resto as never, "Claude"); }
    case "enlace_descarga": return a.enlace(env, req("archivo_id"), origen);
    case "anotar": await anotar(env, req("id"), "Claude", req("texto")); return { ok: true };
    default: throw new ErrorHttp(404, `No existe la herramienta ${nombre}.`);
  }
}

interface Rpc { jsonrpc: "2.0"; id?: string | number | null; method: string; params?: Args }
const respuesta = (id: Rpc["id"], result: unknown) => ({ jsonrpc: "2.0", id, result });
const falla = (id: Rpc["id"], code: number, message: string) => ({ jsonrpc: "2.0", id, error: { code, message } });

export async function mcp(req: Request, env: Env, autorizar: () => Promise<string>): Promise<Response> {
  if (req.method !== "POST") return new Response("Estudio · MCP: usa POST con JSON-RPC.", { status: 405, headers: { allow: "POST" } });
  try { await autorizar(); } catch { return json({ error: "Falta la llave del estudio (Authorization: Bearer es_…)." }, 401, { "www-authenticate": "Bearer" }); }
  let cuerpo: Rpc | Rpc[];
  try { cuerpo = await req.json(); } catch { return json(falla(null, -32700, "JSON inválido"), 400); }
  const origen = new URL(req.url).origin;
  const lote = Array.isArray(cuerpo) ? cuerpo : [cuerpo];
  const salidas = [];
  for (const m of lote) {
    if (m.id === undefined) continue;
    switch (m.method) {
      case "initialize":
        salidas.push(respuesta(m.id, {
          protocolVersion: String(m.params?.protocolVersion ?? VERSION),
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: "estudio", title: "Estudio · orgánicos de Max", version: "1.0.0" },
          instructions:
            "Calendario de videos orgánicos de Max (TikTok e Instagram). Antes de escribir o cambiar guiones, lee el vault de Obsidian ~/Obsidian Vaults/Estudio " +
            "(Inicio.md; quién es Max hoy, lo que voy aprendiendo de Max, reglas, cómo se graba). Max graba y sube el material desde la página; cuando avisa, " +
            "usa «pendientes», baja el material con «enlace_descarga», pasa el video a «editando», edítalo con la skill de video y súbelo " +
            "como entrega (herramientas/subir.mjs del repo estudio-video) con el post listo; después pásalo a «entregado».",
        }));
        break;
      case "ping": salidas.push(respuesta(m.id, {})); break;
      case "tools/list": salidas.push(respuesta(m.id, { tools: HERRAMIENTAS })); break;
      case "tools/call": {
        const nombre = String(m.params?.name ?? "");
        try {
          const r = await llamar(env, nombre, (m.params?.arguments ?? {}) as Args, origen);
          salidas.push(respuesta(m.id, { content: [{ type: "text", text: JSON.stringify(r) }] }));
        } catch (e) {
          const msg = e instanceof ErrorHttp ? e.message : "Algo falló en el estudio.";
          if (!(e instanceof ErrorHttp)) console.error("mcp", nombre, e);
          salidas.push(respuesta(m.id, { content: [{ type: "text", text: msg }], isError: true }));
        }
        break;
      }
      default: salidas.push(falla(m.id, -32601, `Método desconocido: ${m.method}`));
    }
  }
  if (!salidas.length) return new Response(null, { status: 202 });
  return json(Array.isArray(cuerpo) ? salidas : salidas[0]);
}
