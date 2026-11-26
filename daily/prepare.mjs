#!/usr/bin/env node
/** PICKRIX DAILY — paso 1: partidos + guion (sin voz). Escribe muestras/<fecha>/daily.json y guion. */
import {writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {selectTop,dayString} from './select.mjs';
import {buildDaily,validateDaily} from './script.mjs';

const here=dirname(fileURLToPath(import.meta.url));
const date=process.env.PICKRIX_DATE||dayString(Number(process.env.PICKRIX_DAY||0));
const out=resolve(here,'../muestras',date);await mkdir(out,{recursive:true});
// 10 partidos por importancia: los 5 más importantes → ESTELARES; los 5 siguientes → DAILY (nunca se repiten).
const byTime=l=>[...l].sort((a,b)=>Date.parse(a.date)-Date.parse(b.date));
const ranked=await selectTop({date,count:10});
const estelaresMatches=byTime(ranked.slice(0,5)),matches=byTime(ranked.slice(5,10).length?ranked.slice(5,10):ranked.slice(0,5));
await writeFile(resolve(here,'../muestras/ULTIMA.txt'),date);
const daily=buildDaily({date,matches});
const check=validateDaily(daily);
await writeFile(resolve(out,'daily.json'),JSON.stringify({...daily,matches,check},null,1));
const est=buildDaily({date,matches:estelaresMatches});
await writeFile(resolve(out,'estelares.json'),JSON.stringify({...est,matches:estelaresMatches,check:validateDaily(est)},null,1));
await writeFile(resolve(out,'GUION_COMPLETO.txt'),[`PICKRIX DAILY ${date} · saludo/despedida: ${daily.greeting}`,'',`SALUDO: ${daily.saludo}`,'',...daily.segments.map((s,i)=>`PARTIDO ${i+1}: ${s.text}`),'',`DESPEDIDA: ${daily.despedida}`].join('\n')+'\n');
// Escudos oficiales del proveedor (para la imagen de partidos y cada análisis).
await mkdir(resolve(out,'escudos'),{recursive:true});
for(const m of [...estelaresMatches,...matches])for(const side of ['home','away']){
 const url=m[side+'Logo'];if(!/^https:\/\/media\.api-sports\.io\/football\/teams\/\d+\.png$/.test(String(url||'')))continue;
 try{const r=await fetch(url,{signal:AbortSignal.timeout(15000)});if(r.ok)await writeFile(resolve(out,'escudos',`${m.id}-${side}.png`),Buffer.from(await r.arrayBuffer()));}catch{}
}
console.log(`✓ ${matches.length} partidos · ${daily.greeting} · guion ${check.ok?'OK':'REVISAR '+check.problems.join(',')}`);
console.log('ESTELARES:');for(const m of estelaresMatches)console.log(`  - ${m.league}: ${m.home} vs ${m.away} (${m.date})`);
console.log('DAILY:');for(const m of matches)console.log(`  - ${m.league}: ${m.home} vs ${m.away} (${m.date})`);
