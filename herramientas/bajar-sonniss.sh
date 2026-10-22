#!/bin/bash
# Sonniss GDC Game Audio Bundle 2026 (~7,5 GB, gratis, sin atribución; licencia en biblioteca/licencias/).
# Los servidores de Sonniss piden un desafío de Cloudflare y los espejos de Google Drive suelen dar «cuota excedida»,
# así que la descarga la hace Max en su navegador desde https://gdc.sonniss.com/#downloads (5 zips).
# Este script toma los zips desde ~/Downloads, los descomprime en biblioteca/sonidos/sonniss-gdc-2026/ y borra los zips.
set -e
D="$(cd "$(dirname "$0")/.." && pwd)/biblioteca/sonidos/sonniss-gdc-2026"
mkdir -p "$D"
shopt -s nullglob
for z in ~/Downloads/Sonniss.com-GDC2026-GameAudioBundle*of5.zip; do
  echo "descomprimiendo $(basename "$z")"
  unzip -qo "$z" -d "$D" && rm "$z"
done
echo "archivos de audio: $(find "$D" -type f \( -iname '*.wav' -o -iname '*.flac' -o -iname '*.mp3' -o -iname '*.ogg' \) | wc -l)"
du -sh "$D"
