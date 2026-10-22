#!/bin/bash
# Tanda de Freesound pensada para los videos de Max (su pieza en el piso 15, la oficina industrial, trabajo de noche).
cd "$(dirname "$0")/.."
while IFS='|' read -r q n dur; do
  [ -z "$q" ] && continue
  node herramientas/freesound.mjs bajar "$q" "$n" --max-dur "$dur" | tail -1
done <<'LISTA'
city night ambience|15|180
city traffic distant|12|180
rain window|10|180
wind building|8|120
industrial ambience|15|180
factory machine|12|120
metal clank|15|10
room tone|8|120
mechanical keyboard|15|30
keyboard typing|12|30
mouse click|15|3
trackpad|8|3
laptop close|8|5
coffee pour|10|15
espresso machine|8|30
cup table|10|5
page turn|12|5
pencil writing|10|15
book close|8|5
footsteps concrete|10|20
door close|10|10
elevator|8|15
phone vibrate|8|5
camera shutter|8|3
chair creak|8|5
light switch|8|3
whoosh|20|5
swish|15|3
riser|15|15
sub drop|12|8
cinematic impact|15|8
heartbeat|6|30
clock tick|8|30
breath|8|5
LISTA
swift herramientas/catalogar.swift | tail -1
