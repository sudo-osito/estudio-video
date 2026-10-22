// uso: node herramientas/escuchar.mjs   (o doble clic en Escuchar.command) → abre http://localhost:4440
// Banco de canciones REALES de artistas para los videos de Max: escuchar la muestra de 30 s (Apple) o la canción entera
// en Spotify/YouTube, marcar ✅ / ❌ y agregar las suyas (su muestra se baja sola). La canción completa se agrega dentro
// de TikTok/Instagram al publicar. Todo queda en musica/canciones.json (versionado), así Claude aprende su gusto.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { exec } from "node:child_process";

import { CARPETA, leer, guardar, bajarMuestra, completar } from "./muestras.mjs";
const PUERTO = 4440;
const ESTILO = { mias: "Las mías", tendencia: "Tendencia en TikTok (cambia cada semana)", "pop-eeuu": "Pop y rap de EE. UU.", japonesa: "Japonesa", phonk: "Phonk", electronica: "Electrónica", cine: "Cine", indie: "Indie", latino: "Latino" };
const EMOCION = { calma: "calma", asombro: "asombro", tension: "tensión", "epica-tranquila": "épica tranquila", dia: "día", noche: "noche", nostalgia: "nostalgia" };

const PAGINA = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Canciones · Estudio</title><style>
:root{--fondo:#fff;--sup:#f6f6f6;--linea:#ececec;--texto:#0d0d0d;--suave:#6b6b6b;--si:#18a058;--no:#e5484d}
@media (prefers-color-scheme:dark){:root{--fondo:#0e0e0f;--sup:#1b1b1d;--linea:#26262a;--texto:#f2f2f2;--suave:#9a9a9a}}
*{box-sizing:border-box}body{margin:0;background:var(--fondo);color:var(--texto);font:15px/1.45 -apple-system,BlinkMacSystemFont,"SF Pro Text",Inter,sans-serif}
main{max-width:780px;margin:0 auto;padding:40px 20px 80px}h1{font-size:28px;letter-spacing:-.02em;margin:0 0 6px}
p.sub{color:var(--suave);margin:0 0 24px}h2{font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:var(--suave);margin:30px 0 10px}
.tema{display:grid;grid-template-columns:44px 1fr auto auto;gap:12px;align-items:center;padding:12px 14px;border:1px solid var(--linea);border-radius:12px;margin-bottom:8px}
.tema b{display:block;font-weight:600}.play{width:44px;height:44px;border-radius:10px;background:var(--sup) center/cover no-repeat;display:grid;place-items:center;color:#fff;font-size:15px;text-shadow:0 1px 3px #0009}.play[disabled]{opacity:.35;cursor:default}.tema.sonando{border-color:var(--texto)}.tema small{color:var(--suave)}
a.oir{font-size:13px;color:var(--texto);text-decoration:none;padding:7px 10px;border-radius:9px;background:var(--sup);white-space:nowrap}
button,input,select{font:inherit;color:inherit}button{border:0;cursor:pointer;background:none}
.votos{display:flex;gap:6px}.voto{min-width:44px;height:36px;border-radius:10px;background:var(--sup);font-size:16px}
.voto[aria-pressed=true][data-v=si]{background:var(--si);color:#fff}.voto[aria-pressed=true][data-v=no]{background:var(--no);color:#fff}
form{display:grid;grid-template-columns:1fr 1fr 150px auto;gap:8px;margin:0 0 8px}
input,select{padding:10px 12px;border:1px solid var(--linea);border-radius:10px;background:var(--fondo)}
.agregar{padding:10px 14px;border-radius:10px;background:var(--texto);color:var(--fondo);font-weight:600}
.cuenta{color:var(--suave);font-variant-numeric:tabular-nums}
.barra{position:fixed;left:0;right:0;bottom:0;padding:10px 20px;background:var(--fondo);border-top:1px solid var(--linea)}.barra audio{width:100%}
@media (max-width:640px){.tema{grid-template-columns:44px 1fr auto}.tema .oir-grupo{grid-column:1/-1}form{grid-template-columns:1fr}}
</style></head><body><main><h1>Canciones</h1>
<p class="sub">Canciones reales para tus videos. ▶ toca la muestra de 30 s; Spotify y YouTube, la canción entera. Marca ✅ / ❌ y agrega las tuyas: con eso aprendo tu gusto. <span class="cuenta" id="cuenta"></span></p>
<h2>Agregar una canción tuya</h2>
<form id="nueva"><input name="artista" placeholder="Artista" required><input name="cancion" placeholder="Canción" required>
<select name="estilo">${Object.entries(ESTILO).map(([k, v]) => `<option value="${k}"${k === "mias" ? " selected" : ""}>${v}</option>`).join("")}</select>
<button class="agregar">Agregar</button></form>
<div id="lista"></div></main><div class="barra"><audio id="audio" controls preload="none"></audio></div>
<script>
const EST=${JSON.stringify(ESTILO)},EMO=${JSON.stringify(EMOCION)};let temas=[];
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]);
const q=t=>encodeURIComponent(t.artista+" "+t.cancion);const audio=document.getElementById("audio");
async function cargar(){temas=await (await fetch("/api/canciones")).json();pintar();}
function pintar(){const g={};temas.forEach((t,i)=>(g[t.estilo||"mias"]??=[]).push([t,i]));
document.getElementById("lista").innerHTML=Object.keys(EST).filter(e=>g[e]).map(e=>"<h2>"+esc(EST[e])+"</h2>"+g[e].map(([t,i])=>
'<div class="tema" data-i="'+i+'"><button class="play" data-play="'+i+'"'+(t.muestra?"":" disabled aria-label=Sin-muestra")+(t.portada?' style="background-image:url('+esc(t.portada)+')"':"")+'>▶</button><div><b>'+esc(t.cancion)+'</b><small>'+esc(t.artista)+(t.emocion&&EMO[t.emocion]?" · "+esc(EMO[t.emocion]):"")+(t.donde?" · "+esc(t.donde):"")+'</small></div>'+
'<div class="oir-grupo"><a class="oir" target="_blank" href="https://open.spotify.com/search/'+q(t)+'">Spotify</a> <a class="oir" target="_blank" href="https://www.youtube.com/results?search_query='+q(t)+'">YouTube</a></div>'+
'<div class="votos"><button class="voto" data-v="si" data-i="'+i+'" aria-pressed="'+(t.voto==="si")+'">✅</button><button class="voto" data-v="no" data-i="'+i+'" aria-pressed="'+(t.voto==="no")+'">❌</button></div></div>').join("")).join("");
document.getElementById("cuenta").textContent=temas.filter(t=>t.voto).length+" de "+temas.length+" votadas";}
document.addEventListener("click",async e=>{const p=e.target.closest("button.play");
if(p&&!p.disabled){const i=+p.dataset.play;audio.src="/muestra/"+encodeURIComponent(temas[i].muestra);audio.play();document.querySelectorAll(".tema").forEach(x=>x.classList.toggle("sonando",x.dataset.i==i));return;}
const b=e.target.closest("button.voto");if(!b)return;const i=+b.dataset.i;
const v=temas[i].voto===b.dataset.v?null:b.dataset.v;temas[i].voto=v;pintar();
await fetch("/api/voto",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({artista:temas[i].artista,cancion:temas[i].cancion,voto:v})});});
document.getElementById("nueva").addEventListener("submit",async e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));
await fetch("/api/agregar",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(f)});e.target.reset();cargar();});
cargar();
</script></body></html>`;

const cuerpoJson = (req) => new Promise((ok) => { let c = ""; req.on("data", (d) => (c += d)); req.on("end", () => ok(JSON.parse(c || "{}"))); });

http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://x");
  if (u.pathname === "/") { res.writeHead(200, { "content-type": "text/html; charset=utf-8" }); return res.end(PAGINA); }
  if (u.pathname === "/api/canciones") { res.writeHead(200, { "content-type": "application/json" }); return res.end(JSON.stringify(leer())); }
  if (u.pathname === "/api/voto" && req.method === "POST") {
    const { artista, cancion, voto } = await cuerpoJson(req);
    const l = leer(); const t = l.find((x) => x.artista === artista && x.cancion === cancion);
    if (t) { if (voto) t.voto = voto; else delete t.voto; t.votado = new Date().toISOString(); guardar(l); }
    res.writeHead(t ? 200 : 404); return res.end();
  }
  if (u.pathname === "/api/agregar" && req.method === "POST") {
    const { artista, cancion, estilo } = await cuerpoJson(req);
    const l = leer();
    if (artista && cancion && !l.some((x) => x.artista === artista && x.cancion === cancion)) {
      const nueva = { estilo: estilo || "mias", artista: artista.trim(), cancion: cancion.trim(), propuesta: "Max", voto: "si", votado: new Date().toISOString() };
      await bajarMuestra(nueva).catch(() => {});
      const actual = leer(); actual.push(nueva); guardar(actual);
    }
    res.writeHead(200); return res.end();
  }
  if (u.pathname.startsWith("/muestra/")) {
    const archivo = path.join(CARPETA, decodeURIComponent(u.pathname.slice(9)));
    if (!archivo.startsWith(CARPETA) || !fs.existsSync(archivo)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { "content-type": archivo.endsWith(".mp3") ? "audio/mpeg" : "audio/mp4", "content-length": fs.statSync(archivo).size, "accept-ranges": "bytes" });
    return fs.createReadStream(archivo).pipe(res);
  }
  res.writeHead(404); res.end();
}).listen(PUERTO, "127.0.0.1", () => {
  console.log(`Canciones: http://localhost:${PUERTO}  (Ctrl+C para cerrar)`);
  if (!process.argv.includes("--sin-abrir")) exec(`open http://localhost:${PUERTO}`);
  completar(() => {}).catch(() => {}); // baja en segundo plano las muestras que falten
});
