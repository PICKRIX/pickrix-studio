#!/usr/bin/env node
/**
 * MR. PICKRIX Studio — paso 2: guion.
 * Con ANTHROPIC_API_KEY: Claude (claude-sonnet-5-5) redacta el guion en JSON estructurado.
 * El resultado SIEMPRE se valida (sin promesas, cifras exactas, aviso 18+); si no
 * pasa, o no hay clave, o la API falla, se usa la plantilla responsable.
 */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {buildTemplateScript,fromModelOutput,validateScript,SYSTEM_PROMPT,OUTPUT_SCHEMA} from './lib/script.mjs';

const here=dirname(fileURLToPath(import.meta.url));
export const MODEL='claude-sonnet-5-5';

/** Pide el guion a Claude. `client` se inyecta en pruebas; en producción usa el SDK oficial. */
export async function askClaude(doc,{client}={}){
 if(!client){
  const {default:Anthropic}=await import('@anthropic-ai/sdk');
  client=new Anthropic(); // lee ANTHROPIC_API_KEY del entorno
 }
 const facts={demo:Boolean(doc.demo),fecha:doc.date,picks:doc.picks.map(p=>({local:p.home,visitante:p.away,liga:p.league,
  hora:p.kickoffLocal,mercado:p.label,probabilidad:p.probability+' %',momio:p.oddsAmerican||null}))};
 const response=await client.beta.messages.create({
  model:MODEL,max_tokens:4000,
  betas:['server-side-fallback-2026-07-01'],fallbacks:'default',
  system:SYSTEM_PROMPT,
  output_config:{effort:'medium',format:{type:'json_schema',schema:OUTPUT_SCHEMA}},
  messages:[{role:'user',content:'Escribe el guion del video de hoy con estos datos (un texto por pick, en el mismo orden):\n'+JSON.stringify(facts)}],
 });
 if(response.stop_reason!=='end_turn')throw Error('stop_'+response.stop_reason);
 const text=(response.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('');
 return JSON.parse(text);
}

export async function writeScript(doc,{env=process.env,client}={}){
 const template=buildTemplateScript(doc);
 if(!env.ANTHROPIC_API_KEY&&!client)return {...template,fallbackReason:'no_api_key'};
 try{
  const script=fromModelOutput(await askClaude(doc,{client}),doc);
  const check=validateScript(script,doc);
  if(check.ok)return script;
  return {...template,fallbackReason:'validation:'+check.problems.slice(0,4).join(',')};
 }catch(e){
  // Nunca se imprime la clave ni el cuerpo de la respuesta: solo un código corto.
  return {...template,fallbackReason:'api_error:'+String(e?.status||e?.name||'error').slice(0,30)};
 }
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
 const out=resolve(here,'../out');await mkdir(out,{recursive:true});
 const doc=JSON.parse(await readFile(resolve(out,'picks.json'),'utf8'));
 const script=await writeScript(doc);
 const check=validateScript(script,doc);
 if(!check.ok){console.error('✗ El guion no pasó la validación:',check.problems.join(', '));process.exit(1);}
 await writeFile(resolve(out,'script.json'),JSON.stringify(script,null,1));
 await writeFile(resolve(out,'guion.txt'),(doc.demo?'⚠ DEMO — DATOS FICTICIOS. NO PUBLICAR.\n\n':'')+script.segments.map(s=>`[${s.id}] ${s.text}`).join('\n\n')+'\n');
 console.log(`✓ Guion (${script.source}${script.fallbackReason?' · '+script.fallbackReason:''}).`);
}
