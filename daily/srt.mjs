#!/usr/bin/env node
/**
 * PICKRIX DAILY — SUBTITULOS.srt (§18) con la misma línea de tiempo del render.
 * Uso: node daily/srt.mjs public/daily/props.json SALIDA.srt
 */
import {readFile,writeFile} from 'node:fs/promises';
const FPS=30,T={transition:30,lineup:84,pad:14}; // = src/PickrixDaily.jsx
const [,,propsPath,out]=process.argv;
const p=JSON.parse(await readFile(propsPath,'utf8'));
const groups=(words,max=5)=>{const o=[];for(let i=0;i<words.length;){let j=Math.min(words.length,i+max);
 for(let k=i+2;k<j;k++)if(/[.,:;!?…]$/.test(words[k-1].w)){j=k;break;}const g=words.slice(i,j);o.push({s:g[0].s,e:g[g.length-1].e,text:g.map(x=>x.w).join(' ')});i=j;}return o;};
const blocks=[];let t=0;
const add=(words,offset)=>{const g=groups(words||[]);g.forEach((x,i)=>blocks.push({s:offset+x.s,e:offset+Math.min(x.e+0.25,g[i+1]?g[i+1].s-0.05:Infinity),text:x.text}));};
add(p.saludoWords,t);t+=Math.round(p.saludo.seconds*FPS)/FPS;
t+=(T.transition+T.lineup)/FPS;
for(const s of p.segments){add(s.words,t);t+=(Math.round(s.seconds*FPS)+T.pad)/FPS;}
add(p.despedidaWords,t);
const ts=x=>{const ms=Math.max(0,Math.round(x*1000));const h=Math.floor(ms/3600000),m=Math.floor(ms/60000)%60,s=Math.floor(ms/1000)%60;
 return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')},${String(ms%1000).padStart(3,'0')}`;};
// Máx. 2 líneas: se parte en dos cuando el bloque pasa de ~28 caracteres.
const twoLines=s=>{if(s.length<=28)return s;const w=s.split(' ');let best=1,diff=1e9;for(let i=1;i<w.length;i++){const d=Math.abs(w.slice(0,i).join(' ').length-w.slice(i).join(' ').length);if(d<diff){diff=d;best=i;}}return w.slice(0,best).join(' ')+'\n'+w.slice(best).join(' ');};
await writeFile(out,blocks.map((b,i)=>`${i+1}\n${ts(b.s)} --> ${ts(b.e)}\n${twoLines(b.text)}\n`).join('\n'));
console.log(`✓ ${out}: ${blocks.length} bloques`);
