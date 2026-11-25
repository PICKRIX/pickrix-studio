#!/usr/bin/env node
/**
 * MR. PICKRIX Studio — paso 3: voz.
 *  1) ElevenLabs si hay ELEVENLABS_API_KEY y ELEVENLABS_VOICE_ID (de pago, opcional).
 *  2) Si no, Piper (GRATIS, sin cuenta ni clave) si PIPER_MODEL apunta a una voz
 *     descargada (p. ej. es_MX-ald-medium.onnx). Corre dentro de GitHub Actions.
 *  3) Sin ninguna: video solo con subtítulos (voice.json → enabled:false).
 * Un archivo por escena; su duración define la escena (la voz nunca se corta).
 */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {existsSync} from 'node:fs';
import {spawn} from 'node:child_process';

const here=dirname(fileURLToPath(import.meta.url));
const API='https://api.elevenlabs.io/v1/text-to-speech/';
export const VOICE_MODEL='eleven_multilingual_v2';
const VOICE_ID=/^[A-Za-z0-9]{10,40}$/;

export function voiceConfig(env=process.env,{exists=existsSync}={}){
 const key=String(env.ELEVENLABS_API_KEY||''),voiceId=String(env.ELEVENLABS_VOICE_ID||'');
 if(!key){
  const model=String(env.PIPER_MODEL||'');
  if(model&&/\.onnx$/.test(model)&&exists(model))return {enabled:true,provider:'piper',model,bin:String(env.PIPER_BIN||'piper')};
  return {enabled:false,reason:'no_api_key'};
 }
 if(!VOICE_ID.test(voiceId))return {enabled:false,reason:'no_voice_id'};
 return {enabled:true,provider:'elevenlabs',key,voiceId};
}

export async function synthesize(text,{key,voiceId,fetcher=fetch}){
 const r=await fetcher(API+encodeURIComponent(voiceId)+'/with-timestamps?output_format=mp3_44100_128',{
  method:'POST',signal:AbortSignal.timeout(60000),
  headers:{'xi-api-key':key,'content-type':'application/json',accept:'application/json'},
  body:JSON.stringify({text,model_id:VOICE_MODEL,language_code:'es',
   voice_settings:{stability:0.45,similarity_boost:0.8,style:0.25,use_speaker_boost:true}})});
 if(!r.ok)throw Object.assign(Error('elevenlabs'),{code:'http_'+r.status});
 const d=await r.json();
 const ends=d?.alignment?.character_end_times_seconds||[];
 const seconds=Number(ends[ends.length-1]);
 if(!d?.audio_base64||!Number.isFinite(seconds))throw Object.assign(Error('elevenlabs'),{code:'bad_response'});
 return {audio:Buffer.from(d.audio_base64,'base64'),seconds};
}

/** Duración exacta de un WAV PCM leyendo su cabecera (sin ffprobe). */
export function wavSeconds(buf){
 if(buf.toString('ascii',0,4)!=='RIFF'||buf.toString('ascii',8,12)!=='WAVE')return NaN;
 let byteRate=0;
 for(let o=12;o+8<=buf.length;){
  const id=buf.toString('ascii',o,o+4),size=buf.readUInt32LE(o+4);
  if(id==='fmt ')byteRate=buf.readUInt32LE(o+16);
  if(id==='data')return byteRate?size/byteRate:NaN;
  o+=8+size+(size%2);
 }
 return NaN;
}
/** Piper: texto → WAV local. Sin red, sin claves. */
export function synthesizePiper(text,{bin,model,file,run=spawn}){
 return new Promise((ok,fail)=>{
  const p=run(bin,['--model',model,'--output_file',file,'--length_scale','0.8','--sentence_silence','0.08'],{stdio:['pipe','ignore','pipe']});
  let err='';p.stderr?.on('data',d=>{err+=d;});
  p.on('error',e=>fail(Object.assign(Error('piper'),{code:'spawn'})));
  p.on('close',c=>c===0?ok():fail(Object.assign(Error('piper'),{code:'exit_'+c,detail:err.slice(-200)})));
  p.stdin.end(text);
 });
}
export async function generateVoice(script,{env=process.env,fetcher=fetch,outDir,exists,run}={}){
 const cfg=voiceConfig(env,exists?{exists}:{});
 if(!cfg.enabled)return {enabled:false,reason:cfg.reason,segments:[]};
 await mkdir(outDir,{recursive:true});
 const segments=[];
 try{
  for(const s of script.segments){
   if(cfg.provider==='piper'){
    const path=resolve(outDir,s.id+'.wav');
    await synthesizePiper(s.text,{...cfg,file:path,...(run?{run}:{})});
    const seconds=wavSeconds(await readFile(path));
    if(!Number.isFinite(seconds)||seconds<=0)throw Object.assign(Error('piper'),{code:'bad_wav'});
    segments.push({id:s.id,file:'generated/voice/'+s.id+'.wav',seconds:Math.round(seconds*100)/100});
    continue;
   }
   const {audio,seconds}=await synthesize(s.text,{...cfg,fetcher});
   const file='generated/voice/'+s.id+'.mp3';
   await writeFile(resolve(outDir,s.id+'.mp3'),audio);
   segments.push({id:s.id,file,seconds:Math.round(seconds*100)/100});
  }
 }catch(e){
  // Falla parcial: mejor video sin voz que con voz incompleta. Nunca se imprime la clave.
  return {enabled:false,reason:'api_error:'+String(e?.code||'error'),segments:[]};
 }
 return {enabled:true,provider:cfg.provider,model:cfg.provider==='piper'?String(cfg.model).split('/').pop():VOICE_MODEL,segments};
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
 const out=resolve(here,'../out');
 const script=JSON.parse(await readFile(resolve(out,'script.json'),'utf8'));
 const voice=await generateVoice(script,{outDir:resolve(here,'../public/generated/voice')});
 await writeFile(resolve(out,'voice.json'),JSON.stringify(voice,null,1));
 console.log(voice.enabled?`✓ Voz (${voice.provider}): ${voice.segments.length} escenas.`:`ℹ Sin voz (${voice.reason}): el video lleva solo subtítulos.`);
}
