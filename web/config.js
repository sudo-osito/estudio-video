// Dónde vive la API del estudio (Worker de Cloudflare). En local apunta a `wrangler dev`; con ?prod, a la de verdad.
window.ESTUDIO_API = location.hostname === "localhost" && !new URLSearchParams(location.search).has("prod") ? "http://localhost:8787" : "https://estudio-video.maxpino.workers.dev";
