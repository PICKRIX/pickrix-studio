#!/usr/bin/env node
/**
 * PICKRIX DAILY — arma public/daily/props.json para el render a partir de
 * muestras/<fecha>/ (datos + voz). Los videos de saludo/despedida se buscan en
 * public/presentador/ (SALUDO_<CLAVE>.mp4 / DESPEDIDA_<CLAVE>.mp4); si faltan,
 * se usa la voz del diálogo sobre la imagen de MR. PICKRIX.
 */
import {readFile,writeFile,cp,mkdir} from 'node:fs/promises';
import {existsSync,readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {shortTeam} from './script.mjs';

const here=dirname(fileURLToPath(import.meta.url)),root=resolve(here,'..');
const date=process.argv[2];if(!date)throw Error('Uso: node daily/props.mjs AAAA-MM-DD [--sample]');
const src=resolve(root,'muestras',date),pub=resolve(root,'public');
const edFlag=(process.argv.find(a=>a.startsWith('--edicion='))||'').split('=')[1]||'';
// ESTELARES usa sus propios partidos (estelares.json) si existen; si no, los del diario.
const d=JSON.parse(await readFile(resolve(src,edFlag&&existsSync(resolve(src,edFlag+'.json'))?edFlag+'.json':'daily.json'),'utf8'));
const dur=JSON.parse(await readFile(resolve(src,'voz/duraciones.json'),'utf8'));
// §18: tiempos reales de cada palabra (faster-whisper). Sin ellos, el render estima.
const words=existsSync(resolve(src,'voz/palabras.json'))?JSON.parse(await readFile(resolve(src,'voz/palabras.json'),'utf8')):{};
const dialogos=JSON.parse(await readFile(resolve(here,'dialogos.json'),'utf8'));
const W=id=>words[id]?.words||null;
// Edición: --edicion=estelares usa voz_heygen/<fecha>-estelares/; sin bandera, PICKRIX DAILY (voz_heygen/<fecha>/).
const edArg=(process.argv.find(a=>a.startsWith('--edicion='))||'').split('=')[1]||'';
const hgDir=resolve(root,'voz_heygen',edArg?`${date}-${edArg}`:date);
const presDir=resolve(root,'voz_heygen','presentadores');
const presWords=existsSync(resolve(presDir,'palabras.json'))?JSON.parse(await readFile(resolve(presDir,'palabras.json'),'utf8')):{};
const presText=k=>existsSync(resolve(presDir,k+'.txt'))?readFileSync(resolve(presDir,k+'.txt'),'utf8').trim():null;
const ed=existsSync(resolve(hgDir,'guion.json'))?JSON.parse(await readFile(resolve(hgDir,'guion.json'),'utf8')):null;
const hgAll=existsSync(resolve(hgDir,'palabras.json'))?JSON.parse(await readFile(resolve(hgDir,'palabras.json'),'utf8')):{};
const txt=f=>existsSync(resolve(hgDir,f))?readFileSync(resolve(hgDir,f),'utf8').trim():null;
if(ed?.segmentos)d.segments=d.segments.map((s,i)=>({...s,text:ed.segmentos[i]??s.text,confidence:ed.confianza?.[i]||null}));
const presKey=ed?.presentador||d.greeting;
await mkdir(resolve(pub,'daily'),{recursive:true});
await cp(src,resolve(pub,'daily',date),{recursive:true});
const rel=p=>`daily/${date}/${p}`;
const seconds=f=>Number(execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','csv=p=0',f]).toString().trim());
const clip=kind=>{
 const video=`presentador/${kind}_${presKey}.mp4`;
 if(existsSync(resolve(pub,video)))return {video,seconds:Math.round(seconds(resolve(pub,video))*100)/100};
 return {audio:rel(`voz/${kind==='SALUDO'?'saludo':'despedida'}.mp3`),seconds:Math.round((dur[kind==='SALUDO'?'saludo':'despedida']+0.4)*100)/100};
};
const matches=d.matches.map(m=>({...m,homeShort:shortTeam(m.home),awayShort:shortTeam(m.away),
 homeCrest:existsSync(resolve(src,'escudos',`${m.id}-home.png`))?rel(`escudos/${m.id}-home.png`):null,
 awayCrest:existsSync(resolve(src,'escudos',`${m.id}-away.png`))?rel(`escudos/${m.id}-away.png`):null}));
const saludo=clip('SALUDO'),despedida=clip('DESPEDIDA');
// Con video del presentador, el texto y los tiempos son los del diálogo oficial de ese video.
const pres=(kind,c,fallbackId,fallbackText)=>c.video&&presWords[`${kind}_${presKey}`]?{text:presText(`${kind}_${presKey}`),words:presWords[`${kind}_${presKey}`].words}:c.video&&hgAll[kind]?{text:txt(`${kind}.txt`),words:hgAll[kind].words}:c.video?{text:dialogos[`${kind}_${d.greeting}`]||fallbackText,words:W(`${kind}_${d.greeting}`)}:{text:fallbackText,words:W(fallbackId)};
const ps=pres('SALUDO',saludo,'saludo',d.saludo),pd=pres('DESPEDIDA',despedida,'despedida',d.despedida);
// Voz HeyGen de los análisis (un solo audio con los 5 bloques): se corta por bloque con los tiempos reales.
const hgWords=hgAll.analisis?.words||null;
let segs=d.segments.map(s=>({...s,words:W(s.id),audio:rel(`voz/${s.id}.mp3`),seconds:Math.round((dur[s.id]||12)*100)/100}));
if(hgWords){
 const counts=d.segments.map(s=>s.text.trim().split(/\s+/).length);
 if(counts.reduce((a,b)=>a+b,0)!==hgWords.length)throw Error('voz HeyGen: el número de palabras no coincide con el guion');
 await mkdir(resolve(pub,'daily',date,'voz_heygen'),{recursive:true});
 let k=0;const blocks=counts.map(n=>{const w=hgWords.slice(k,k+n);k+=n;return w;});
 segs=await Promise.all(segs.map(async(s,i)=>{
  const w=blocks[i],start=Math.max(0,w[0].s-0.12),end=blocks[i+1]?Math.max(w[w.length-1].e+0.1,blocks[i+1][0].s-0.12):w[w.length-1].e+0.35;
  const out=`voz_heygen/${s.id}.mp3`;
  execFileSync('ffmpeg',['-v','error','-y','-i',resolve(hgDir,'analisis.mp3'),'-ss',String(start),'-to',String(end),'-c:a','libmp3lame','-q:a','2',resolve(pub,'daily',date,out)]);
  return {...s,audio:rel(out),seconds:Math.round((end-start)*100)/100,voice:'heygen',words:w.map(x=>({w:x.w,s:Math.round((x.s-start)*1000)/1000,e:Math.round((x.e-start)*1000)/1000}))};
 }));
}
const coverImg=`presentador/PORTADA_${d.greeting}.jpg`;
const props={date,edition:edArg||'daily',title:ed?.edicion==='ESTELARES'?['LOS 5 PARTIDOS','ESTELARES DEL DÍA']:null,cover:existsSync(resolve(pub,coverImg))?coverImg:null,sample:process.argv.includes('--sample'),greeting:d.greeting,saludo,despedida,
 saludoText:ps.text,saludoWords:ps.words,despedidaText:pd.text,despedidaWords:pd.words,matches,
 segments:segs,
 sfx:existsSync(resolve(pub,'sfx/whoosh.wav'))?'sfx/whoosh.wav':null,music:existsSync(resolve(pub,'musica/pista.mp3'))?'musica/pista.mp3':null};
await writeFile(resolve(pub,'daily/props.json'),JSON.stringify(props));
const synced=[props.saludoWords,props.despedidaWords,...props.segments.map(x=>x.words)].filter(Boolean).length;
console.log(`✓ props ${date}: ${props.segments.length} análisis · subtítulos reales ${synced}/${props.segments.length+2} · análisis ${hgWords?'voz HeyGen':'voz provisional'} · saludo ${props.saludo.video?'video':'voz'} · despedida ${props.despedida.video?'video':'voz'}`);
