export interface Env {
  DB: D1Database;
  MATERIAL?: R2Bucket; // R2: falta activarlo en la cuenta
  ORIGENES: string;
  FIRMA?: string;
}

export class ErrorHttp extends Error {
  constructor(public estado: number, mensaje: string) {
    super(mensaje);
  }
}

export function json(datos: unknown, estado = 200, extra: HeadersInit = {}): Response {
  return new Response(JSON.stringify(datos), {
    status: estado,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extra },
  });
}

export const nuevoId = () => crypto.randomUUID();

export async function sha256(texto: string): Promise<string> {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hmac(secreto: string, texto: string): Promise<string> {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(secreto), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const f = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(texto));
  return btoa(String.fromCharCode(...new Uint8Array(f))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/* «Max» desde la página, «Claude» desde el MCP: así la bitácora dice quién hizo qué. */
export function quienDe(llave: string, req: Request): string {
  return req.headers.get("x-estudio-quien") === "claude" ? "Claude" : llave;
}

export async function anotar(env: Env, videoId: string | null, quien: string, texto: string) {
  await env.DB.prepare("INSERT INTO bitacora (video_id, quien, texto) VALUES (?, ?, ?)").bind(videoId, quien, texto).run();
}
