/**
 * MR. PICKRIX Studio — línea de tiempo y subtítulos (lógica pura).
 * Duración de cada escena = audio de la voz (si existe) + respiro; sin voz, se
 * estima por palabras. El total se ajusta a 45–60 s cuando es posible.
 */
export const FPS=30;
export const MIN_TOTAL_SEC=45,MAX_TOTAL_SEC=60;
const MIN_SEC={intro:4.5,pick:7,teaser:5,outro:6};
const WORDS_PER_SEC=2.6,PAD_SEC=0.45;

const words=t=>String(t||'').trim().split(/\s+/).filter(Boolean);

export function sceneSeconds(seg,voiceSec){
 const base=Number.isFinite(voiceSec)&&voiceSec>0?voiceSec+PAD_SEC:words(seg.text).length/WORDS_PER_SEC+0.8;
 return Math.max(MIN_SEC[seg.kind]||4,base);
}

/** Subtítulos: bloques de ≤7 palabras repartidos por longitud dentro de la escena. */
export function captionChunks(text,durationInFrames,{maxWords=7}={}){
 const w=words(text),chunks=[];
 for(let i=0;i<w.length;){
  let j=Math.min(w.length,i+maxWords);
  // Corta en puntuación si hay una cerca, para que se lea natural.
  for(let k=i+3;k<j;k++)if(/[.,;:!?]$/.test(w[k-1])){j=k;break;}
  chunks.push(w.slice(i,j).join(' '));i=j;
 }
 const total=chunks.reduce((a,c)=>a+c.length,0)||1;
 let from=0;
 return chunks.map((c,i)=>{
  const len=i===chunks.length-1?durationInFrames-from:Math.max(12,Math.round(durationInFrames*c.length/total));
  const out={text:c,from,durationInFrames:Math.max(1,len)};from+=len;return out;
 });
}

/** Construye las escenas con frames; `voice` = {segmentId: segundos}. */
export function buildTimeline(segments,{voice={}}={}){
 let secs=segments.map(s=>sceneSeconds(s,voice[s.id]));
 const total=secs.reduce((a,b)=>a+b,0);
 if(total<MIN_TOTAL_SEC){
  // Alarga solo las tarjetas de picks (más tiempo para leer), nunca recorta voz.
  const pickIdx=segments.map((s,i)=>s.kind==='pick'?i:-1).filter(i=>i>=0);
  const extra=(MIN_TOTAL_SEC-total)/(pickIdx.length||segments.length);
  secs=secs.map((v,i)=>pickIdx.length?(pickIdx.includes(i)?v+extra:v):v+extra);
 }
 const longTotal=secs.reduce((a,b)=>a+b,0);
 if(longTotal>MAX_TOTAL_SEC){
  // Solo se compactan escenas SIN voz (la voz real nunca se corta), sin bajar del mínimo.
  const flex=segments.map((s,i)=>Number.isFinite(voice[s.id])?0:Math.max(0,secs[i]-(MIN_SEC[s.kind]||4)));
  const flexSum=flex.reduce((a,b)=>a+b,0);
  const cut=Math.min(flexSum,longTotal-MAX_TOTAL_SEC);
  if(flexSum>0)secs=secs.map((v,i)=>v-flex[i]*cut/flexSum);
 }
 let from=0;
 const scenes=segments.map((s,i)=>{
  const durationInFrames=Math.round(secs[i]*FPS);
  // Karaoke: bloques cortos (≤4 palabras) para leerse grandes y al ritmo de la voz.
  const scene={...s,from,durationInFrames,captions:captionChunks(s.text,durationInFrames,{maxWords:4})};
  from+=durationInFrames;return scene;
 });
 return {fps:FPS,durationInFrames:from,seconds:Math.round(from/FPS*10)/10,scenes};
}
