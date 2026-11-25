/**
 * MR. PICKRIX Studio — props del video y hoja de revisión (lógica pura, sin node:fs;
 * la usan tanto el script como el bundle de Remotion).
 */
import {buildTimeline} from './timeline.mjs';

export function buildProps({picksDoc,script,voice,lipsync}){
 const voiceSec=Object.fromEntries((voice?.enabled?voice.segments:[]).map(s=>[s.id,s.seconds]));
 const audio=Object.fromEntries((voice?.enabled?voice.segments:[]).map(s=>[s.id,s.file]));
 const timeline=buildTimeline(script.segments,{voice:voiceSec});
 const clips=lipsync?.enabled?Object.fromEntries(Object.entries(lipsync.clips||{}).filter(([k])=>!k.endsWith('Error'))):{};
 return {demo:Boolean(picksDoc.demo),sample:Boolean(picksDoc.sample),edition:picksDoc.edition||{},date:picksDoc.date,generatedAt:picksDoc.generatedAt,
  scriptSource:script.source,voice:Boolean(voice?.enabled),lipsync:Object.keys(clips).length>0,
  durationInFrames:timeline.durationInFrames,fps:timeline.fps,seconds:timeline.seconds,
  picks:picksDoc.picks,
  scenes:timeline.scenes.map(s=>({...s,audio:audio[s.id]||null,avatarVideo:clips[s.id]||null}))};
}

export function reviewSheet(props,check){
 const lines=[
  `# Revisión manual — MR. PICKRIX ${props.date}`,'',
  props.demo?'> ⚠ **DEMO — DATOS FICTICIOS. NO PUBLICAR.** No hubo suficientes picks reales con momio.':'> Picks reales gratuitos (HOT PICKS). Revisa antes de publicar.','',
  `- Duración: ${props.seconds} s · Guion: ${props.scriptSource} · Voz: ${props.voice?'sí':'no'} · Labios: ${props.lipsync?'sí':'no (imagen animada)'}`,
  `- Validación automática del guion: ${check.ok?'OK':'FALLÓ → '+check.problems.join(', ')}`,'',
  '## Picks del video','',
  ...props.picks.map((p,i)=>`${i+1}. ${p.home} vs ${p.away} (${p.league}, ${p.kickoffLocal}) — ${p.label} · ${p.probability} % · momio ${p.oddsAmerican||'—'}`),'',
  '## Antes de publicar (marca cada punto)','',
  '- [ ] Ningún partido ha comenzado y siguen en la app con la misma estimación.',
  '- [ ] Cifras, equipos y momios del video = los de esta hoja.',
  '- [ ] Rostro, ropa y estilo de MR. PICKRIX iguales a la referencia aprobada.',
  '- [ ] Voz clara; sin promesas de ganancia ni palabras como «seguro» o «garantizado».',
  '- [ ] Se ve el aviso 18+ y «estimaciones, no garantías».',
  '- [ ] La red social permite contenido de pronósticos deportivos en tu país y cuenta.',
  '- [ ] Publicación MANUAL (este flujo nunca publica en redes).',
 ];
 return lines.join('\n')+'\n';
}


/** Zona fija de MR. PICKRIX en el video (debe coincidir con SLOT de MrPickrixDaily.jsx). */
export const CAPCUT_SLOT={x:170,y:165,width:740,height:780};
const mmss=f=>{const t=Math.round(f/30);return Math.floor(t/60)+':'+String(t%60).padStart(2,'0');};
/** Guía para hacer hablar a MR. PICKRIX en CapCut (Lip Sync) y montarlo sobre el video. */
export function capcutKit(props){
 const full=props.scenes.map(s=>s.text).join(' ');
 return [
  `# Kit CapCut — MR. PICKRIX ${props.date}${props.edition?.leagueName?' · '+props.edition.leagueName:''}`,'',
  props.demo?'> ⚠ DEMO — DATOS FICTICIOS. NO PUBLICAR.':'> Revisa REVISION.md antes de publicar.','',
  '## 1 · Guion completo (pégalo en CapCut → Lip Sync)','','```',full,'```','',
  `Duración objetivo: ${props.seconds} s. Si la voz de CapCut queda más corta o larga, ajusta su velocidad para acercarte a esa duración.`,'',
  '## 2 · Qué dice en cada parte del video','',
  '| Desde | Hasta | Parte | Texto |','|---|---|---|---|',
  ...props.scenes.map(s=>`| ${mmss(s.from)} | ${mmss(s.from+s.durationInFrames)} | ${s.kind==='pick'?'Pick '+(s.pickIndex+1):s.kind} | ${s.text.replace(/\|/g,'/')} |`),'',
  '## 3 · Dónde va MR. PICKRIX hablando','',
  `Video de 1080 × 1920. Coloca el clip de Lip Sync encima del recuadro de MR. PICKRIX:`,
  `- Posición: x = ${CAPCUT_SLOT.x}, y = ${CAPCUT_SLOT.y} (esquina superior izquierda)`,
  `- Tamaño: ${CAPCUT_SLOT.width} × ${CAPCUT_SLOT.height}`,
  '- En CapCut: Superposición → ajusta escala y posición hasta cubrir el recuadro con borde lima (puedes recortar el clip a esquinas redondeadas).','',
  '## 4 · Pasos','',
  '1. CapCut → Lip Sync / Talking Photo → sube la imagen de MR. PICKRIX → pega el guion de la sección 1 → elige la voz → genera.',
  '2. Nuevo proyecto 9:16 → importa `mr-pickrix.mp4` (este video) como fondo.',
  '3. Agrega el clip de MR. PICKRIX hablando como **superposición** sobre el recuadro (sección 3).',
  '4. Revisa que la voz y las tarjetas coincidan; ajusta la velocidad de la voz si hace falta.',
  '5. Exporta en 1080p y publica (descripción sugerida en REVISION.md).',
 ].join('\n')+'\n';
}
