#!/usr/bin/env node
/**
 * MR. PICKRIX Studio — paso 5: arma las props del video y la hoja de revisión.
 * Junta picks + guion + voz + lipsync en out/props.json (lo lee Remotion) y
 * escribe out/REVISION.md con la lista de verificación manual obligatoria.
 */
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {buildProps,reviewSheet,capcutKit} from './lib/props.mjs';
import {validateScript} from './lib/script.mjs';

const here=dirname(fileURLToPath(import.meta.url));
const readJson=async(p,fallback)=>{try{return JSON.parse(await readFile(p,'utf8'));}catch{return fallback;}};

if(process.argv[1]===fileURLToPath(import.meta.url)){
 const out=resolve(here,'../out');
 const picksDoc=await readJson(resolve(out,'picks.json'));
 const script=await readJson(resolve(out,'script.json'));
 if(!picksDoc||!script){console.error('✗ Faltan out/picks.json o out/script.json');process.exit(1);}
 const props=buildProps({picksDoc,script,voice:await readJson(resolve(out,'voice.json'),{enabled:false}),
  lipsync:await readJson(resolve(out,'lipsync.json'),{enabled:false})});
 await writeFile(resolve(out,'props.json'),JSON.stringify(props));
 await writeFile(resolve(out,'REVISION.md'),reviewSheet(props,validateScript(script,picksDoc)));
 await writeFile(resolve(out,'CAPCUT.md'),capcutKit(props));
 console.log(`✓ Props listas: ${props.seconds} s, ${props.scenes.length} escenas${props.demo?' (DEMO)':''}.`);
}
