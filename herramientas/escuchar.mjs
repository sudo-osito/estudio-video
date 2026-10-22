// uso: node herramientas/escuchar.mjs   → abre http://localhost:4440
// Página local para que Max escuche la música de la biblioteca por emoción y marque ✅ / ❌.
// Los votos se guardan en biblioteca/musica/catalogo.json (campo «voto»), así Claude aprende su gusto.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { exec } from "node:child_process";

const BASE = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../biblioteca/musica");
const CAT = path.join(BASE, "catalogo.json");
const PUERTO = 4440;
const EMOCION = { calma: "Calma, foco", asombro: "Asombro", tension: "Tensión controlada", "epica-tranquila": "Épica tranquila", dia: "Día, movimiento", noche: "Noche construyendo", nostalgia: "Nostalgia" };
const leer = () => JSON.parse(fs.readFileSync(CAT, "utf8"));

const PAGINA = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Escuchar · Estudio</title><style>
:root{--fondo:#fff;--sup:#f6f6f6;--linea:#ececec;--texto:#0d0d0d;--suave:#6b6b6b;--si:#18a058;--no:#e5484d}
@media (prefers-color-scheme:dark){:root{--fondo:#0e0e0f;--sup:#18181a;--linea:#26262a;--texto:#f2f2f2;--suave:#9a9a9a}}
*{box-sizing:border-box}body{margin:0;background:var(--fondo);color:var(--texto);font:15px/1.45 -apple-system,BlinkMacSystemFont,"SF Pro Text",Inter,sans-serif}
main{max-width:760px;margin:0 auto;padding:40px 20px 120px}h1{font-size:28px;letter-spacing:-.02em;margin:0 0 6px}
p.sub{color:var(--suave);margin:0 0 28px}h2{font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:var(--suave);margin:32px 0 10px}
.tema{display:grid;grid-template-columns:40px 1fr auto;gap:12px;align-items:center;padding:12px 14px;border:1px solid var(--linea);border-radius:12px;margin-bottom:8px;transition:border-color .15s}
.tema.sonando{border-color:var(--texto)}.tema b{display:block;font-weight:600}.tema small{color:var(--suave)}
button{font:inherit;border:0;cursor:pointer;color:inherit;background:none}
.play{width:40px;height:40px;border-radius:50%;background:var(--sup);display:grid;place-items:center;font-size:14px}
.votos{display:flex;gap:6px}.voto{min-width:44px;height:36px;border-radius:10px;background:var(--sup);font-size:16px}
.voto[aria-pressed=true][data-v=si]{background:var(--si);color:#fff}.voto[aria-pressed=true][data-v=no]{background:var(--no);color:#fff}
.barra{position:fixed;left:0;right:0;bottom:0;padding:12px 20px;background:var(--fondo);border-top:1px solid var(--linea)}
.barra audio{width:100%}.cuenta{color:var(--suave);font-variant-numeric:tabular-nums}
</style></head><body><main><h1>Escuchar</h1><p class="sub">Marca lo que te gusta (✅) y lo que no (❌). Tus votos le enseñan a Claude tu gusto. <span class="cuenta" id="cuenta"></span></p>
<div id="lista"></div></main><div class="barra"><audio id="audio" controls preload="none"></audio></div>
<script>
const EMO=${JSON.stringify(EMOCION)};
let temas=[];const audio=document.getElementById("audio");
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]);
async function cargar(){temas=await (await fetch("/api/temas")).json();pintar();}
function pintar(){const grupos={};temas.forEach((t,i)=>(grupos[t.emocion]??=[]).push([t,i]));
document.getElementById("lista").innerHTML=Object.entries(grupos).map(([e,ts])=>"<h2>"+esc(EMO[e]||e)+"</h2>"+ts.map(([t,i])=>
'<div class="tema" data-i="'+i+'"><button class="play" data-play="'+i+'" aria-label="Escuchar">▶</button><div><b>'+esc(t.titulo)+'</b><small>'+esc(t.autor)+'</small></div>'+
'<div class="votos"><button class="voto" data-v="si" data-i="'+i+'" aria-pressed="'+(t.voto==="si")+'">✅</button><button class="voto" data-v="no" data-i="'+i+'" aria-pressed="'+(t.voto==="no")+'">❌</button></div></div>').join("")).join("");
const n=temas.filter(t=>t.voto).length;document.getElementById("cuenta").textContent=n+" de "+temas.length+" votados";}
document.addEventListener("click",async e=>{const b=e.target.closest("button");if(!b)return;
if(b.dataset.play!=null){const i=+b.dataset.play;audio.src="/audio/"+encodeURIComponent(temas[i].archivo);audio.play();
document.querySelectorAll(".tema").forEach(x=>x.classList.toggle("sonando",x.dataset.i==i));}
if(b.dataset.v){const i=+b.dataset.i;const v=temas[i].voto===b.dataset.v?null:b.dataset.v;temas[i].voto=v;pintar();
await fetch("/api/voto",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({pagina:temas[i].pagina,voto:v})});}});
cargar();
</script></body></html>`;

http.createServer((req, res) => {
  const u = new URL(req.url, "http://x");
  if (u.pathname === "/") { res.writeHead(200, { "content-type": "text/html; charset=utf-8" }); return res.end(PAGINA); }
  if (u.pathname === "/api/temas") { res.writeHead(200, { "content-type": "application/json" }); return res.end(JSON.stringify(leer())); }
  if (u.pathname === "/api/voto" && req.method === "POST") {
    let cuerpo = "";
    req.on("data", (c) => (cuerpo += c));
    return req.on("end", () => {
      const { pagina, voto } = JSON.parse(cuerpo);
      const cat = leer();
      const t = cat.find((x) => x.pagina === pagina);
      if (t) { if (voto) t.voto = voto; else delete t.voto; t.votado = new Date().toISOString(); fs.writeFileSync(CAT, JSON.stringify(cat, null, 1)); }
      res.writeHead(t ? 200 : 404); res.end();
    });
  }
  if (u.pathname.startsWith("/audio/")) {
    const archivo = path.join(BASE, decodeURIComponent(u.pathname.slice(7)));
    if (!archivo.startsWith(BASE) || !fs.existsSync(archivo)) { res.writeHead(404); return res.end(); }
    const tam = fs.statSync(archivo).size;
    const rango = /bytes=(\d*)-(\d*)/.exec(req.headers.range || "");
    if (rango) {
      const ini = Number(rango[1] || 0), fin = rango[2] ? Number(rango[2]) : tam - 1;
      res.writeHead(206, { "content-type": "audio/mpeg", "accept-ranges": "bytes", "content-range": `bytes ${ini}-${fin}/${tam}`, "content-length": fin - ini + 1 });
      return fs.createReadStream(archivo, { start: ini, end: fin }).pipe(res);
    }
    res.writeHead(200, { "content-type": "audio/mpeg", "accept-ranges": "bytes", "content-length": tam });
    return fs.createReadStream(archivo).pipe(res);
  }
  res.writeHead(404); res.end();
}).listen(PUERTO, "127.0.0.1", () => {
  console.log(`Escuchar: http://localhost:${PUERTO}  (Ctrl+C para cerrar)`);
  if (!process.argv.includes("--sin-abrir")) exec(`open http://localhost:${PUERTO}`);
});
