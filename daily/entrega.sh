#!/usr/bin/env bash
# PICKRIX — arma la carpeta de entrega a partir de muestras/<fecha> y voz_heygen/<fecha>[-edicion].
# Uso: bash daily/entrega.sh AAAA-MM-DD [estelares]
set -euo pipefail
cd "$(dirname "$0")/.."
FECHA=$1; ED=${2:-}
BROWSER=${REMOTION_BROWSER:-/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell}
if [ -n "$ED" ]; then NOMBRE=PICKRIX_${ED^^}_$FECHA; VOZ=voz_heygen/$FECHA-$ED; node daily/props.mjs "$FECHA" "--edicion=$ED";
else NOMBRE=PICKRIX_DAILY_$FECHA; VOZ=voz_heygen/$FECHA; node daily/props.mjs "$FECHA"; fi
O=out/$NOMBRE; mkdir -p "$O"; P=public/daily/props.json
npx remotion render src/index.jsx PickrixDaily "$O/VIDEO_FINAL.mp4" --props=$P --codec=h264 --browser-executable="$BROWSER" --concurrency=4 --log=error
node daily/frames.mjs $P | while read -r nombre cuadro; do
 npx remotion still src/index.jsx PickrixDaily "$O/$nombre.png" --frame="$cuadro" --props=$P --browser-executable="$BROWSER" --log=error
done
cp "$O/PARTIDOS.png" "$O/PORTADA.png"; [ -n "$ED" ] && mv "$O/PARTIDOS.png" "$O/PARTIDOS_ESTELARES.png" || true
node daily/srt.mjs $P "$O/SUBTITULOS.srt"
[ -f "$VOZ/analisis.mp3" ] && cp "$VOZ/analisis.mp3" "$O/VOZ_EN_OFF.mp3"
[ -f "$VOZ/GUION_HEYGEN.txt" ] && cp "$VOZ/GUION_HEYGEN.txt" "$O/GUION_COMPLETO.txt" || cp "muestras/$FECHA/GUION_COMPLETO.txt" "$O/GUION_COMPLETO.txt"
node -e "
const p=require('./$P');
const j={fecha:p.date,edicion:p.edition,fuente_probabilidades:'Modelo PICKRIX (pickrixapp.com, football-analysis)',partidos:p.matches.map((m,i)=>({
 partido:m.home+' vs '+m.away,competicion:m.league,inicio:m.date,probabilidades_1x2:m.oneXtwo,goles_esperados:m.expectedGoals,mercados:m.markets,
 ultimos5_local:m.homeRecent,ultimos5_visita:m.awayRecent,confianza:p.segments[i]?.confidence||null,guion:p.segments[i]?.text}))};
require('fs').writeFileSync('$O/ESTADISTICAS_Y_PROBABILIDADES.json',JSON.stringify(j,null,1));"
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$O/VIDEO_FINAL.mp4")
echo "✓ $O · ${DUR%.*} s"; ls "$O"
