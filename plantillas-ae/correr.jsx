var __e = new File("/Users/osito/Proyectos/estudio-video/material/2026-10-22-prueba/trabajo/error.txt"); __e.encoding = "UTF-8";
try { $.evalFile(new File(__ruta)); __e.open("w"); __e.write("ok"); __e.close(); }
catch (err) { __e.open("w"); __e.write("ERROR: " + err.toString() + " | línea " + err.line + " | " + (err.source ? "" : "")); __e.close(); }
