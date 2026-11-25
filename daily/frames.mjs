#!/usr/bin/env node
/** Cuadros clave del render (misma línea de tiempo que src/PickrixDaily.jsx) para exportar imágenes fijas. */
import {readFile} from 'node:fs/promises';
const FPS=30,T={transition:30,lineup:84,pad:14,end:66};
const p=JSON.parse(await readFile(process.argv[2],'utf8'));
let t=Math.round(p.saludo.seconds*FPS)+T.transition;
const out={PARTIDOS:t+70};t+=T.lineup;
p.segments.forEach((s,i)=>{const d=Math.round(s.seconds*FPS)+T.pad;out[`ANALISIS_PARTIDO_0${i+1}`]=t+Math.round(d*0.8);t+=d;});
console.log(Object.entries(out).map(([k,v])=>`${k} ${v}`).join('\n'));
