/**
 * MR. PICKRIX Studio — guion: plantilla responsable + validación.
 * Todo guion (de Claude o de plantilla) pasa por validateScript antes de usarse:
 * sin promesas de ganancia, sin «seguro», cifras idénticas a los datos, menciona
 * que son estimaciones y cierra con el aviso 18+.
 */
export const MAX_WORDS=175;
export const FORBIDDEN=[
 /\bsegur[oa]s?\b/i,/\basegur(?:a|o|ado|ada|amos|an)\b/i,/garantizad/i,/\bsin riesgo/i,/\bfij[oa]s?\b/i,/infalible/i,
 /no falla/i,/dinero f[aá]cil/i,/gan(?:a|ar|ar[aá]s|aremos)\s+dinero/i,/\bganancias?\b/i,/hazte rico/i,/\b100\s?%/,
 /apuesta\s+(?:ya|ahora)/i,/\bcandado\b/i,/\block\b/i,/no te lo pierdas/i,/[uú]ltima oportunidad/i,/millonari/i,
];
const OPENERS=['Arrancamos con','Seguimos con','Ahora,','Ojo con','Y cerramos con'];

/** Cómo se DICE el mercado (la tarjeta muestra el texto exacto del mercado). */
export function spokenLabel(p){
 const l=String(p.label||'');
 const dbl=/^(.+) o Empate \((?:1\/X|X\/2)\)$/.exec(l);if(dbl)return `${dbl[1]} o empate`;
 const both=/^(.+) o (.+) \(1\/2\)$/.exec(l);if(both)return `que gane ${both[1]} o ${both[2]}`;
 const ou=/^(Over|Under) (\d\.5) goles$/.exec(l);if(ou)return `${ou[1]==='Over'?'más':'menos'} de ${ou[2]} goles`;
 if(/^Ambos marcan: Sí$/.test(l))return 'que anoten los dos equipos';
 if(/^Ambos marcan: No$/.test(l))return 'que no anoten los dos equipos';
 return l;
}
const DAY_WORD=['hoy','mañana','pasado mañana'];
/** Gancho de apertura según la edición (liga y día); sin edición, el formato diario. */
export function editionIntro(doc,n){
 const e=doc?.edition||{},day=DAY_WORD[e.day??0]||'hoy';
 if(e.leagueName)return `¡${day.charAt(0).toUpperCase()+day.slice(1)} hay ${e.leagueName}! Soy MR. PICKRIX y te traigo mis ${n} picks para ${day}. Son estimaciones del modelo, no garantías.`;
 return '¡Hola, equipo! Soy MR. PICKRIX y estos son los HOT PICKS gratis de hoy en PICKRIX. Son estimaciones del modelo, no garantías.';
}
export function buildTemplateScript(doc){
 const picks=doc?.picks||[];
 const intro=doc?.demo?
  '¡Hola, equipo! Soy MR. PICKRIX. Este es un ejemplo con datos ficticios, solo para mostrar el formato.':
  editionIntro(doc,picks.length);
 const pickTexts=picks.map((p,i)=>{
  const opener=i===picks.length-1&&picks.length>1?OPENERS[4]:OPENERS[Math.min(i,3)];
  return `${opener} ${p.home} contra ${p.away}: ${spokenLabel(p)}, con ${p.probability} % de probabilidad${p.oddsAmerican?`, momio ${p.oddsAmerican}`:''}.`;
 });
 return {source:'template',demo:Boolean(doc?.demo),segments:[
  {id:'intro',kind:'intro',text:intro},
  ...pickTexts.map((text,i)=>({id:'pick-'+(i+1),kind:'pick',pickIndex:i,text})),
  {id:'teaser',kind:'teaser',text:'¿Quieres más? En PRO y ELITE hay más picks analizados, y en PARLAYS PICKRIX encuentras parlays listos cada día.'},
  {id:'outro',kind:'outro',text:'Recuerda: son estimaciones estadísticas, no garantías. Juega con responsabilidad, solo mayores de 18 años. Menos corazonadas, más análisis: pickrixapp.com.'},
 ]};
}

/** Convierte la salida JSON de Claude {intro,picks[],teaser,outro} al formato de segmentos. */
export function fromModelOutput(out,doc){
 const picks=Array.isArray(out?.picks)?out.picks:[];
 return {source:'claude',demo:Boolean(doc?.demo),segments:[
  {id:'intro',kind:'intro',text:String(out?.intro||'').trim()},
  ...picks.map((t,i)=>({id:'pick-'+(i+1),kind:'pick',pickIndex:i,text:String(t||'').trim()})),
  {id:'teaser',kind:'teaser',text:String(out?.teaser||'').trim()},
  {id:'outro',kind:'outro',text:String(out?.outro||'').trim()},
 ]};
}

const words=t=>String(t).trim().split(/\s+/).filter(Boolean).length;
const norm=s=>String(s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();

export function validateScript(script,doc){
 const problems=[],segs=script?.segments||[],picks=doc?.picks||[];
 const all=segs.map(s=>s.text).join(' ');
 if(segs.some(s=>!String(s.text||'').trim()))problems.push('empty_segment');
 for(const re of FORBIDDEN)if(re.test(all))problems.push('forbidden:'+re.source.slice(0,24));
 if(!/estimaci/i.test(all))problems.push('missing_estimate_notice');
 const outro=segs.find(s=>s.kind==='outro')?.text||'';
 if(!/18/.test(outro))problems.push('missing_18_notice');
 if(!/pickrixapp\.com/i.test(outro))problems.push('missing_site');
 if(doc?.demo&&!/ficticio|demo/i.test(segs.find(s=>s.kind==='intro')?.text||''))problems.push('demo_not_disclosed');
 const pickSegs=segs.filter(s=>s.kind==='pick');
 if(pickSegs.length!==picks.length)problems.push('pick_count');
 pickSegs.forEach((s,i)=>{
  const p=picks[i];if(!p)return;
  if(!norm(s.text).includes(norm(p.home))||!norm(s.text).includes(norm(p.away)))problems.push('teams:'+(i+1));
  // Cualquier porcentaje dicho debe ser EXACTAMENTE la estimación del dato.
  for(const m of s.text.matchAll(/(\d{1,3})\s?(?:%|por ciento)/gi))if(Number(m[1])!==p.probability)problems.push('percent:'+(i+1));
  if(!new RegExp('\\b'+p.probability+'\\s?(?:%|por ciento)','i').test(s.text))problems.push('percent_missing:'+(i+1));
  for(const m of s.text.matchAll(/([+-]\d{3,4})\b/g))if(m[1]!==p.oddsAmerican)problems.push('odds:'+(i+1));
 });
 if(words(all)>MAX_WORDS)problems.push('too_long');
 return {ok:problems.length===0,problems};
}

export const SYSTEM_PROMPT=`Eres el guionista de MR. PICKRIX, comunicador deportivo de PICKRIX (pickrixapp.com).
Escribe en español latinoamericano neutro con matiz mexicano, cercano y dinámico, seguro de sí mismo pero sin parecer infalible.
Reglas obligatorias:
- Usa SOLO los datos recibidos. No inventes estadísticas, lesiones, rachas ni contexto.
- Cada pick menciona a ambos equipos, el mercado tal como viene, la probabilidad exacta en formato "NN %" y, si existe, el momio americano exacto.
- Las probabilidades son estimaciones del modelo, no garantías: dilo al menos una vez.
- Prohibido: prometer ganancias o dinero, «seguro», «asegurado», «garantizado», «fijo», «sin riesgo», «candado», urgencia para apostar o invitaciones directas a apostar.
- Si los datos son DEMO, di en la introducción que son datos ficticios para mostrar el formato.
- El cierre debe incluir: son estimaciones, juego responsable, solo mayores de 18 años, y "pickrixapp.com".
- El teaser invita a conocer PRO, ELITE y PARLAYS PICKRIX sin presionar.
- Total máximo: 150 palabras (video de 45 a 60 segundos). Frases cortas, fáciles de leer como subtítulo.`;

export const OUTPUT_SCHEMA={type:'object',additionalProperties:false,required:['intro','picks','teaser','outro'],properties:{
 intro:{type:'string'},picks:{type:'array',items:{type:'string'}},teaser:{type:'string'},outro:{type:'string'}}};
