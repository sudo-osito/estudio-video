#!/bin/zsh
# Arma Heika.app con swiftc (sin Xcode) y la deja en /Applications. Uso: mac/construir.sh [--sin-instalar]
# Se arma en la carpeta temporal del sistema: una copia dentro del proyecto aparecería como una segunda Heika en Aplicaciones.
set -e
cd "$(dirname "$0")"
APP="${TMPDIR:-/tmp}/heika-build/Heika.app"
rm -rf "$APP"; mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
swiftc -O -swift-version 5 -target arm64-apple-macos26.0 Heika.swift -o "$APP/Contents/MacOS/Heika" \
  -framework AppKit -framework WebKit -framework Speech -framework AVFoundation -framework IOKit
cp Info.plist "$APP/Contents/Info.plist"
cp Heika.icns "$APP/Contents/Resources/Heika.icns"
codesign --force --sign - "$APP" >/dev/null
if [[ "$1" != "--sin-instalar" ]]; then
  rm -rf /Applications/Heika.app && ditto "$APP" /Applications/Heika.app
  rm -rf "$APP"
  echo "Heika instalada en /Applications"
else
  echo "Armada en $APP"
fi
