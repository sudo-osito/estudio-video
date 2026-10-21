// Dónde vive la API del estudio (Worker de Cloudflare). En local apunta a `wrangler dev`.
window.ESTUDIO_API = location.hostname === "localhost" ? "http://localhost:8787" : "https://estudio-video.PENDIENTE.workers.dev";
