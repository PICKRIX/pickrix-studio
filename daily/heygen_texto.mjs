#!/usr/bin/env node
/**
 * Convierte el texto de pantalla (con cifras) al texto que debe LEER la voz de HeyGen:
 * «54 %» → «cincuenta y cuatro por ciento», «2.5» → «dos punto cinco», «12 goles» → «doce goles».
 * Uso: node daily/heygen_texto.mjs voz_heygen/<carpeta>/guion.json  → escribe GUION_HEYGEN.txt al lado.
 */
import {readFile,writeFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';

const U=['cero','uno','dos','tres','cuatro','cinco','seis','siete','ocho','nueve','diez','once','doce','trece','catorce','quince',
 'dieciséis','diecisiete','dieciocho','diecinueve','veinte','veintiuno','veintidós','veintitrés','veinticuatro','veinticinco',
 'veintiséis','veintisiete','veintiocho','veintinueve'];
const D={3:'treinta',4:'cuarenta',5:'cincuenta',6:'sesenta',7:'setenta',8:'ochenta',9:'noventa'};
export function numero(n){
 n=Number(n);if(!Number.isInteger(n)||n<0||n>100)return String(n);
 if(n<30)return U[n];if(n===100)return 'cien';
 const d=Math.floor(n/10),u=n%10;return u?`${D[d]} y ${U[u]}`:D[d];
}
export function paraVoz(t){
 return String(t)
  .replace(/(\d+)\.(\d)\b/g,(_,a,b)=>`${numero(a)} punto ${numero(b)}`)
  .replace(/(\d+)\s?%/g,(_,a)=>`${numero(a)} por ciento`)
  .replace(/\b(\d+)\b/g,(_,a)=>numero(a))
  .replace(/pickrixapp\.com/gi,'pickrixapp punto com');
}
if(process.argv[2]){
 const f=resolve(process.argv[2]),g=JSON.parse(await readFile(f,'utf8'));
 const out=g.segmentos.map((s,i)=>`BLOQUE ${i+1}${g.partidos?.[i]?' — '+g.partidos[i]:''}\n${paraVoz(s)}`).join('\n\n');
 await writeFile(resolve(dirname(f),'GUION_HEYGEN.txt'),out+'\n');
 console.log(out);
}
