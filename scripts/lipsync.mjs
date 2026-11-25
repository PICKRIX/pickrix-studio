#!/usr/bin/env node
/**
 * MR. PICKRIX Studio — paso 4: labios sincronizados con Kling (opcional, solo intro y cierre).
 * Se usa Kling a través de la cola de fal.ai (una sola clave, pago por segundo):
 *   KLING_API_KEY          clave de fal.ai (secreto de GitHub)
 *   KLING_BASE_VIDEO_URL   URL pública de un clip base de MR. PICKRIX (5–10 s, plano
 *                          medio, boca cerrada) creado UNA vez a partir de la imagen
 *                          aprobada (variable de GitHub, no secreta)
 *   KLING_LIPSYNC_MODEL    opcional; por defecto fal-ai/kling-video/lipsync/audio-to-video
 * Requiere la voz (voice.json). Sin clave, sin clip base o sin voz → MR. PICKRIX
 * aparece como imagen fija animada (la imagen aprobada del personaje).
 */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';

const here=dirname(fileURLToPath(import.meta.url));
export const LIPSYNC_SEGMENTS=['intro','outro'];
export const DEFAULT_MODEL='fal-ai/kling-video/lipsync/audio-to-video';
const MODEL_RE=/^[a-z0-9-]+(?:\/[a-z0-9.-]+){1,4}$/;
const sleep=ms=>new Promise(ok=>setTimeout(ok,ms));

export function lipsyncConfig(env=process.env,voice){
 const key=String(env.KLING_API_KEY||'');
 if(!key)return {enabled:false,reason:'no_api_key'};
 let base;try{base=new URL(String(env.KLING_BASE_VIDEO_URL||''));}catch{return {enabled:false,reason:'no_base_video'};}
 if(base.protocol!=='https:')return {enabled:false,reason:'no_base_video'};
 if(!voice?.enabled)return {enabled:false,reason:'no_voice'};
 const model=String(env.KLING_LIPSYNC_MODEL||DEFAULT_MODEL);
 if(!MODEL_RE.test(model))return {enabled:false,reason:'bad_model'};
 return {enabled:true,key,baseVideoUrl:base.href,model};
}

async function call(fetcher,url,key,init={}){
 const r=await fetcher(url,{...init,signal:AbortSignal.timeout(30000),
  headers:{authorization:'Key '+key,'content-type':'application/json',accept:'application/json'}});
 if(!r.ok)throw Object.assign(Error('kling'),{code:'http_'+r.status});
 return r.json();
}

export async function lipsyncClip({audioBuffer,cfg,fetcher=fetch,wait=sleep,maxPolls=90}){
 const audioUrl='data:audio/mpeg;base64,'+audioBuffer.toString('base64');
 const job=await call(fetcher,'https://queue.fal.run/'+cfg.model,cfg.key,{method:'POST',
  body:JSON.stringify({video_url:cfg.baseVideoUrl,audio_url:audioUrl})});
 if(!job?.status_url||!job?.response_url)throw Object.assign(Error('kling'),{code:'bad_job'});
 for(let i=0;i<maxPolls;i++){
  const st=await call(fetcher,job.status_url,cfg.key);
  if(st?.status==='COMPLETED'){
   const res=await call(fetcher,job.response_url,cfg.key);
   const url=res?.video?.url;if(!url)throw Object.assign(Error('kling'),{code:'no_video'});
   const v=await fetcher(url,{signal:AbortSignal.timeout(60000)});
   if(!v.ok)throw Object.assign(Error('kling'),{code:'download_'+v.status});
   return Buffer.from(await v.arrayBuffer());
  }
  if(['FAILED','ERROR','CANCELLED'].includes(st?.status))throw Object.assign(Error('kling'),{code:'job_failed'});
  await wait(10000);
 }
 throw Object.assign(Error('kling'),{code:'timeout'});
}

export async function generateLipsync({voice,env=process.env,fetcher=fetch,wait,voiceDir,outDir}){
 const cfg=lipsyncConfig(env,voice);
 if(!cfg.enabled)return {enabled:false,reason:cfg.reason,clips:{}};
 await mkdir(outDir,{recursive:true});
 const clips={};
 for(const id of LIPSYNC_SEGMENTS){
  if(!voice.segments.some(s=>s.id===id))continue;
  try{
   const mp4=await lipsyncClip({audioBuffer:await readFile(resolve(voiceDir,id+'.mp3')),cfg,fetcher,wait});
   await writeFile(resolve(outDir,id+'.mp4'),mp4);
   clips[id]='generated/lipsync/'+id+'.mp4';
  }catch(e){clips[id+'Error']=String(e?.code||'error');} // esa escena usa la imagen fija
 }
 const ok=Object.keys(clips).filter(k=>!k.endsWith('Error'));
 return {enabled:ok.length>0,model:cfg.model,clips};
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
 const out=resolve(here,'../out');
 let voice={enabled:false,segments:[]};try{voice=JSON.parse(await readFile(resolve(out,'voice.json'),'utf8'));}catch{}
 const res=await generateLipsync({voice,voiceDir:resolve(here,'../public/generated/voice'),outDir:resolve(here,'../public/generated/lipsync')});
 await writeFile(resolve(out,'lipsync.json'),JSON.stringify(res,null,1));
 console.log(res.enabled?`✓ Labios sincronizados: ${Object.keys(res.clips).filter(k=>!k.endsWith('Error')).join(', ')}.`:
  `ℹ Sin lipsync (${res.reason||'error'}): MR. PICKRIX aparece como imagen animada.`);
}
