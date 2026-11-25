#!/usr/bin/env node
/**
 * PICKRIX DAILY — arma public/daily/props.json para el render a partir de
 * muestras/<fecha>/ (datos + voz). Los videos de saludo/despedida se buscan en
 * public/presentador/ (SALUDO_<CLAVE>.mp4 / DESPEDIDA_<CLAVE>.mp4); si faltan,
 * se usa la voz del diálogo sobre la imagen de MR. PICKRIX.
 */
import {readFile,writeFile,cp,mkdir} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';

const here=dirname(fileURLToPath(import.meta.url)),root=resolve(here,'..');
const date=process.argv[2];if(!date)throw Error('Uso: node daily/props.mjs AAAA-MM-DD [--sample]');
const src=resolve(root,'muestras',date),pub=resolve(root,'public');
const d=JSON.parse(await readFile(resolve(src,'daily.json'),'utf8'));
const dur=JSON.parse(await readFile(resolve(src,'voz/duraciones.json'),'utf8'));
await mkdir(resolve(pub,'daily'),{recursive:true});
await cp(src,resolve(pub,'daily',date),{recursive:true});
const rel=p=>`daily/${date}/${p}`;
const seconds=f=>Number(execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','csv=p=0',f]).toString().trim());
const clip=kind=>{
 const video=`presentador/${kind}_${d.greeting}.mp4`;
 if(existsSync(resolve(pub,video)))return {video,seconds:Math.round(seconds(resolve(pub,video))*100)/100};
 return {audio:rel(`voz/${kind==='SALUDO'?'saludo':'despedida'}.mp3`),seconds:Math.round((dur[kind==='SALUDO'?'saludo':'despedida']+0.4)*100)/100};
};
const matches=d.matches.map(m=>({...m,
 homeCrest:existsSync(resolve(src,'escudos',`${m.id}-home.png`))?rel(`escudos/${m.id}-home.png`):null,
 awayCrest:existsSync(resolve(src,'escudos',`${m.id}-away.png`))?rel(`escudos/${m.id}-away.png`):null}));
const props={date,sample:process.argv.includes('--sample'),greeting:d.greeting,saludo:clip('SALUDO'),despedida:clip('DESPEDIDA'),
 saludoText:d.saludo,despedidaText:d.despedida,matches,
 segments:d.segments.map(s=>({...s,audio:rel(`voz/${s.id}.mp3`),seconds:Math.round((dur[s.id]||12)*100)/100})),
 sfx:existsSync(resolve(pub,'sfx/whoosh.wav'))?'sfx/whoosh.wav':null,music:existsSync(resolve(pub,'musica/pista.mp3'))?'musica/pista.mp3':null};
await writeFile(resolve(pub,'daily/props.json'),JSON.stringify(props));
console.log(`✓ props ${date}: ${props.segments.length} análisis · saludo ${props.saludo.video?'video':'voz'} · despedida ${props.despedida.video?'video':'voz'}`);
