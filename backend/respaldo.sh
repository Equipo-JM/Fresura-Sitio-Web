#!/usr/bin/env bash
# Respaldo semanal de fresura-prueba (DT-01, sección 7): cada viernes.
# Exporta a JSON cada tabla de `public` y copia el bucket `fotos`. Guarda en una
# carpeta FUERA del repositorio y conserva solo las últimas 4 copias.
# Necesita la CLI de Supabase con sesión iniciada y el proyecto enlazado
# (`npm run supabase -- link`). No usa Docker: `supabase db dump` lo exige.
#
# Uso, desde la raíz del repositorio:
#   bash backend/respaldo.sh [carpeta-de-respaldos]
# Por defecto: ../respaldos (al lado del repositorio).
set -euo pipefail

raiz="$(cd "$(dirname "$0")/.." && pwd)"
destino_base="${1:-$raiz/../respaldos}"
mkdir -p "$destino_base"
destino_base="$(cd "$destino_base" && pwd)"

case "$destino_base/" in
	"$raiz"/*)
		echo "La carpeta de respaldos no puede estar dentro del repositorio." >&2
		exit 1
		;;
esac

fecha="$(date +%F)"
destino="$destino_base/$fecha"
mkdir -p "$destino/tablas" "$destino/fotos"

supabase() { npm run -s --prefix "$raiz" supabase -- "$@"; }

consulta_json() {
	# `db query -o json` devuelve { rows: [...] }; se guarda solo la lista de filas.
	supabase db query --linked -o json "$1" 2>/dev/null |
		node -e 'let t="";process.stdin.on("data",d=>t+=d).on("end",()=>{const j=JSON.parse(t.slice(t.indexOf("{")));process.stdout.write(JSON.stringify(j.rows,null,2)+"\n")})'
}

tablas="$(consulta_json "select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' order by 1" |
	node -e 'let t="";process.stdin.on("data",d=>t+=d).on("end",()=>console.log(JSON.parse(t).map(f=>f.table_name).join(" ")))')"

for tabla in $tablas; do
	consulta_json "select * from public.\"$tabla\"" >"$destino/tablas/$tabla.json"
	echo "Tabla $tabla: $(node -e "console.log(require('$destino/tablas/$tabla.json').length)") filas"
done

en_bucket="$(consulta_json "select count(*) as n from storage.objects where bucket_id = 'fotos'" |
	node -e 'let t="";process.stdin.on("data",d=>t+=d).on("end",()=>console.log(JSON.parse(t)[0].n))')"
# Con el bucket vacío no hay nada que copiar; si hay fotos, un error de copia detiene el respaldo.
if [ "$en_bucket" -gt 0 ]; then
	supabase storage cp -r ss:///fotos "$destino/fotos" --experimental --linked >/dev/null
fi
copiadas="$(find "$destino/fotos" -type f | wc -l)"
echo "Fotos: $copiadas de $en_bucket"
if [ "$copiadas" -lt "$en_bucket" ]; then
	echo "Faltan fotos en el respaldo." >&2
	exit 1
fi

# Commit del esquema: las migraciones de ese commit reconstruyen las tablas.
git -C "$raiz" rev-parse HEAD >"$destino/commit-esquema.txt"

# Conserva las últimas 4 copias (solo carpetas con fecha AAAA-MM-DD).
find "$destino_base" -mindepth 1 -maxdepth 1 -type d -regex '.*/[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}' |
	sort | head -n -4 | while read -r vieja; do
		echo "Se borra la copia antigua $(basename "$vieja")"
		rm -rf -- "$vieja"
	done

echo "Respaldo listo en $destino"
