#!/bin/zsh
# Arma Heika.app con swiftc (sin Xcode) y la deja en /Applications. Uso: mac/construir.sh [--sin-instalar]
set -e
cd "$(dirname "$0")"
APP=build/Heika.app
rm -rf "$APP"; mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
swiftc -O -swift-version 5 -target arm64-apple-macos26.0 Heika.swift -o "$APP/Contents/MacOS/Heika" \
  -framework AppKit -framework WebKit -framework Speech -framework AVFoundation -framework IOKit
cp Info.plist "$APP/Contents/Info.plist"
cp Heika.icns "$APP/Contents/Resources/Heika.icns"
codesign --force --sign - "$APP" >/dev/null
if [[ "$1" != "--sin-instalar" ]]; then
  rm -rf /Applications/Heika.app && ditto "$APP" /Applications/Heika.app
  echo "Heika instalada en /Applications"
fi
