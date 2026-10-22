#!/bin/bash
# uso: herramientas/sonido.sh buscar <palabras…> [--max-dur 1.5] [--n 20]   → busca en el catálogo (todas las palabras)
#      herramientas/sonido.sh escuchar <ruta-relativa>                       → lo reproduce (afplay)
#      herramientas/sonido.sh favorito|descartar <ruta-relativa>             → marca el gusto de Max
#      herramientas/sonido.sh resumen                                        → cuántos hay por fuente y categoría
B="$(cd "$(dirname "$0")/.." && pwd)/biblioteca"; DB="$B/catalogo.db"
accion="$1"; shift
case "$accion" in
  buscar)
    maxdur=999; n=20; palabras=()
    while [ $# -gt 0 ]; do case "$1" in --max-dur) maxdur="$2"; shift 2;; --n) n="$2"; shift 2;; *) palabras+=("$1"); shift;; esac; done
    where="descartado = 0 AND (duracion IS NULL OR duracion <= $maxdur)"
    for p in "${palabras[@]}"; do where="$where AND etiquetas LIKE '%$(echo "$p" | tr 'A-Z' 'a-z' | sed "s/'//g")%'"; done
    sqlite3 -column -header "$DB" "SELECT ifnull(printf('%.2f', duracion), '–') AS dur, ifnull(printf('%.2f', golpe), '–') AS golpe, ifnull(printf('%.0f', pico_db), '–') AS pico, favorito AS fav, ruta FROM sonidos WHERE $where ORDER BY favorito DESC, duracion LIMIT $n";;
  escuchar) afplay "$B/sonidos/$1";;
  favorito) sqlite3 "$DB" "UPDATE sonidos SET favorito = 1 WHERE ruta = '$1'";;
  descartar) sqlite3 "$DB" "UPDATE sonidos SET descartado = 1 WHERE ruta = '$1'";;
  resumen) sqlite3 -column -header "$DB" "SELECT fuente, categoria, COUNT(*) AS n, printf('%.1f', AVG(duracion)) AS dur_media FROM sonidos GROUP BY fuente, categoria ORDER BY fuente, n DESC";;
  *) sed -n '2,6p' "$0";;
esac
