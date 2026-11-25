#!/usr/bin/env bash
# PICKRIX DAILY — voz en off (Piper es_MX, gratis) de saludo, 5 análisis y despedida.
set -euo pipefail
dir="$1"; piper="$2"; model="$3"
mkdir -p "$dir/voz"
node -e '
const d=require(process.argv[1]);
const rows=[["saludo",d.saludo],...d.segments.map(s=>[s.id,s.text]),["despedida",d.despedida]];
for(const [id,t] of rows)console.log(id+"\t"+t.replace(/\s+/g," "));
' "$(realpath "$dir/daily.json")" > "$dir/voz/textos.tsv"
echo "{" > "$dir/voz/duraciones.json"; first=1
while IFS=$'\t' read -r id text; do
  printf '%s\n' "$text" | "$piper" --model "$model" --output_file "$dir/voz/$id.wav" --length_scale 0.82 --sentence_silence 0.1
  ffmpeg -v error -y -i "$dir/voz/$id.wav" -af "loudnorm=I=-16:TP=-1.5" -ar 44100 -b:a 160k "$dir/voz/$id.mp3"
  dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$dir/voz/$id.mp3"); rm "$dir/voz/$id.wav"
  [ $first -eq 1 ] && first=0 || echo "," >> "$dir/voz/duraciones.json"
  printf '"%s": %s' "$id" "$dur" >> "$dir/voz/duraciones.json"; echo "✓ $id ${dur}s"
done < "$dir/voz/textos.tsv"
echo "}" >> "$dir/voz/duraciones.json"
