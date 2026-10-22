#!/bin/bash
# Maneja After Effects en segundo plano: abre sin activarse (open -g) y nunca le quita el foco ni le cambia la
# ventana a Max. Puede quedar visible detrás para que Max mire si quiere (Max, 22-oct). «ocultar» queda como opción.
# uso: herramientas/ae.sh reiniciar            → cierra (si está trabado), limpia los avisos de «cierre inesperado» y abre oculto
#      herramientas/ae.sh correr <script.jsx> [segundos=300]  → corre un script (sin activar la app)
#      herramientas/ae.sh ocultar
APP="Adobe After Effects 2026"
SD="$HOME/Library/Caches/Adobe/After Effects/26.0/SentryIO-db"
OCULTAR="${AE_OCULTO:-0}"   # AE_OCULTO=1 para ocultarlo además
ocultar() { [ "$OCULTAR" = 1 ] || [ "$forzar" = 1 ] || return 0; osascript -e 'tell application "System Events" to set visible of (first process whose name contains "After Effects") to false' >/dev/null 2>&1; }
case "$1" in
  reiniciar)
    pkill -9 -f "Contents/MacOS/After Effects"; pkill -9 -f dynamiclinkmanager; sleep 2
    find "$SD" -mindepth 1 -maxdepth 1 -name "*.run*" -exec rm -rf {} + 2>/dev/null
    find "$SD/pending" "$SD/new" "$SD/external" "$SD/attachments" -mindepth 1 -exec rm -rf {} + 2>/dev/null
    find "$HOME/Library/Logs/DiagnosticReports" -name "After Effects-*.ips" -delete 2>/dev/null
    # Sin esto, AE abre con «Crash Repair Options» tras un cierre forzado y ese diálogo bloquea los scripts.
    PREF="$HOME/Library/Preferences/Adobe/After Effects/26.5/Adobe After Effects 26.5 Prefs.txt"
    grep -q '"Skip Crash Recovery Prompt"' "$PREF" 2>/dev/null || sed -i '' 's/^\["General Section"\]$/["General Section"]\
	"Skip Crash Recovery Prompt" = 01/' "$PREF"
    open -g -a "$APP"
    marca="/tmp/ae-vivo-$$"
    # Esperar a que cargue (memoria > 900 MB) antes de mandar scripts: si llega antes, AE muestra
    # «Scripting Plugin is not installed» y queda trabado en ese diálogo.
    for i in $(seq 1 120); do
      rss=$(ps -o rss= -p "$(pgrep -f 'Contents/MacOS/After Effects' | head -1)" 2>/dev/null | tr -d ' ')
      [ "${rss:-0}" -gt 900000 ] && break; sleep 2
    done
    sleep 8
    for i in $(seq 1 90); do
      ocultar
      osascript -e "with timeout of 8 seconds" -e "tell application \"$APP\" to DoScript \"app.beginSuppressDialogs(); var f=new File('$marca'); f.open('w'); f.write('ok'); f.close();\"" -e "end timeout" >/dev/null 2>&1
      [ -f "$marca" ] && { rm -f "$marca"; ocultar; echo "After Effects listo (en segundo plano)"; exit 0; }
      sleep 3
    done
    echo "After Effects no respondió"; exit 1;;
  correr)
    ocultar
    osascript -e "with timeout of ${3:-300} seconds" -e "tell application \"$APP\" to DoScriptFile (POSIX file \"$2\")" -e "end timeout" >/dev/null 2>&1
    rc=$?; ocultar; exit $rc;;
  ocultar) forzar=1 ocultar;;
esac
