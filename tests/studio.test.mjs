/**
 * Pruebas ligeras de MR. PICKRIX Studio (sin Remotion, sin red, sin claves).
 * Ejecutar desde la raíz del repo:  node --test studio/tests/*.test.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {selectVideoPicks,candidateRows,eligibleFixture,bestOdd,americanOdds,toVideoPick} from '../scripts/lib/picks.mjs';
import {buildTemplateScript,validateScript,fromModelOutput} from '../scripts/lib/script.mjs';
import {buildTimeline,captionChunks,MIN_TOTAL_SEC,MAX_TOTAL_SEC,FPS} from '../scripts/lib/timeline.mjs';
import {buildProps} from '../scripts/lib/props.mjs';
import {fetchPicks} from '../scripts/fetch-picks.mjs';
import {writeScript} from '../scripts/write-script.mjs';
import {generateVoice,voiceConfig} from '../scripts/voice.mjs';
import {generateLipsync,lipsyncConfig} from '../scripts/lipsync.mjs';

const NOW=Date.parse('2026-11-24T15:00:00Z');
const at=h=>new Date(NOW+h*3600000).toISOString();
const fx=(id,code,h,home='Local '+id,away='Visita '+id)=>({id,code,date:at(h),status:'NS',home,away,league:'Liga',competition:'Liga '+code});
const row=(f,kind,p,key='k'+kind)=>({fixture:f,kind,p,key,label:kind+' '+p,oddsDecimal:1.45});

test('elige 5 picks de partidos distintos, con mercados variados y prioridad TOP', ()=>{
 const rows=[];
 for(let i=1;i<=8;i++){const f=fx(i,i<=4?'39':'253',2+i);
  rows.push(row(f,'1X2',58+i),row(f,'Goles',70+i),row(f,'Ambos marcan',62),row(f,'Doble oportunidad',80));}
 const picks=selectVideoPicks(rows,{count:5,now:NOW});
 assert.equal(picks.length,5);
 assert.equal(new Set(picks.map(p=>p.fixture.id)).size,5,'partidos distintos');
 assert.ok(new Set(picks.map(p=>p.kind)).size>=4,'mercados variados');
 assert.equal(picks.filter(p=>p.fixture.code==='39').length,4,'primero ligas TOP');
 assert.ok(Math.max(...picks.map(p=>p.kind==='Goles'?1:0))<=1||picks.filter(p=>p.kind==='Goles').length<=2);
});

test('sin momio real, por debajo de 55 % o ya iniciado: no entra', ()=>{
 const f=fx(1,'39',3),past=fx(2,'39',-1);
 const rows=[{...row(f,'1X2',70),oddsDecimal:null},row(f,'Goles',50),row(past,'1X2',70)];
 assert.equal(selectVideoPicks(rows,{now:NOW}).length,0);
 assert.equal(eligibleFixture(fx(3,'39',0.5),{now:NOW}),false,'necesita margen para revisar');
 assert.equal(eligibleFixture(fx(4,'39',3,'Club U21','Rival'),{now:NOW}),false,'sin juveniles');
 assert.equal(eligibleFixture(fx(5,'liga-x',3),{now:NOW}),false,'solo ligas aprobadas');
});

test('candidatos, momio real y formato americano', ()=>{
 const f=fx(9,'262',4,'Toluca','América');
 const rows=candidateRows(f,{oneXtwo:{home:50,draw:25,away:25},markets:{over15:78,btts_yes:40}});
 assert.deepEqual(rows.map(r=>r.key).sort(),['double_ha','double_hd','over15'].sort());
 assert.equal(bestOdd({books:[{selections:{over15:1.3}},{selections:{over15:1.35}}]},'over15'),1.35);
 assert.equal(bestOdd({books:[]},'over15'),null);
 assert.equal(americanOdds(2.5),'+150');assert.equal(americanOdds(1.5),'-200');
 const v=toVideoPick({...rows[0],oddsDecimal:1.35});
 assert.equal(v.home,'Toluca');assert.equal(typeof v.probability,'number');assert.equal(v.oddsAmerican,'-286');
});

const demoDoc={demo:false,date:'2026-11-24',picks:[1,2,3,4].map(i=>({home:'Equipo '+i,away:'Rival '+i,league:'Liga',
 kickoffLocal:'mar., 19:00',market:'Goles',label:'Over 1.5 goles',probability:60+i,oddsDecimal:1.5,oddsAmerican:'-200'}))};

test('guion por plantilla: responsable, sin promesas y con cifras exactas', ()=>{
 const s=buildTemplateScript(demoDoc);
 const check=validateScript(s,demoDoc);
 assert.deepEqual(check.problems,[]);
 const all=s.segments.map(x=>x.text).join(' ');
 assert.match(all,/estimaci/i);assert.match(all,/18/);assert.match(all,/pickrixapp\.com/);
 assert.doesNotMatch(all,/\bseguro\b|garantizad|ganancia/i);
 const demo=buildTemplateScript({...demoDoc,demo:true});
 assert.match(demo.segments[0].text,/ficticios/);
});

test('la validación rechaza promesas, «seguro» y cifras inventadas', ()=>{
 const bad=fromModelOutput({intro:'Hoy ganancias seguras, es un pick seguro.',picks:demoDoc.picks.map(p=>`${p.home} contra ${p.away}: 99 %`),
  teaser:'Entra ya',outro:'pickrixapp.com'},demoDoc);
 const {ok,problems}=validateScript(bad,demoDoc);
 assert.equal(ok,false);
 assert.ok(problems.some(p=>p.startsWith('forbidden')));
 assert.ok(problems.includes('missing_18_notice'));
 assert.ok(problems.some(p=>p.startsWith('percent')));
});

test('sin red: fetchPicks entrega DEMO marcado (nunca como real)', async()=>{
 const doc=await fetchPicks({fetcher:async()=>{throw Error('offline');},now:new Date(NOW)});
 assert.equal(doc.demo,true);assert.equal(doc.source,'demo');
 assert.ok(doc.picks.length>=4&&doc.picks.length<=5);
});

test('con datos públicos simulados: picks reales con momio', async()=>{
 const fixtures=[1,2,3,4,5].map(i=>fx(i,'140',3+i));
 const fetcher=async url=>{
  const u=new URL(url),name=u.pathname.split('/').pop();
  const body=name==='football-fixtures'?{fixtures}:name==='football-quick'?
   {oneXtwo:{home:62,draw:20,away:18},markets:{over15:76,btts_yes:58,under35:66}}:
   {books:[{selections:{home:1.7,over15:1.3,btts_yes:1.8,under35:1.4,double_hd:1.2}}]};
  return new Response(JSON.stringify(body),{status:200});
 };
 const doc=await fetchPicks({fetcher,now:new Date(NOW)});
 assert.equal(doc.demo,false);assert.equal(doc.picks.length,5);
 assert.ok(doc.picks.every(p=>p.oddsAmerican&&p.probability>=55));
 assert.ok(new Set(doc.picks.map(p=>p.market)).size>=3);
});

test('sin ANTHROPIC_API_KEY o con respuesta inválida: usa la plantilla', async()=>{
 const a=await writeScript(demoDoc,{env:{}});
 assert.equal(a.source,'template');assert.equal(a.fallbackReason,'no_api_key');
 const client={beta:{messages:{create:async()=>({stop_reason:'end_turn',content:[{type:'text',
  text:JSON.stringify({intro:'Gana dinero seguro',picks:[],teaser:'x',outro:'y'})}]})}}};
 const b=await writeScript(demoDoc,{env:{},client});
 assert.equal(b.source,'template');assert.match(b.fallbackReason,/^validation:/);
 const failing={beta:{messages:{create:async()=>{throw Object.assign(Error('x'),{status:529});}}}};
 assert.equal((await writeScript(demoDoc,{env:{},client:failing})).fallbackReason,'api_error:529');
});

test('Claude con guion válido: se usa y pide el modelo acordado', async()=>{
 let req;
 const good={intro:'¡Hola! Soy MR. PICKRIX. Son estimaciones del modelo.',
  picks:demoDoc.picks.map(p=>`${p.home} contra ${p.away}: ${p.label}, ${p.probability} %, momio ${p.oddsAmerican}.`),
  teaser:'Más picks en PRO, ELITE y PARLAYS PICKRIX.',outro:'Estimaciones, no garantías. Solo mayores de 18. pickrixapp.com'};
 const client={beta:{messages:{create:async r=>{req=r;return {stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify(good)}]};}}}};
 const s=await writeScript(demoDoc,{env:{},client});
 assert.equal(s.source,'claude');assert.equal(req.model,'claude-sonnet-5-5');
 assert.equal(req.output_config.format.type,'json_schema');
});

test('sin claves de ElevenLabs ni Kling: video solo con subtítulos e imagen animada', async()=>{
 assert.equal(voiceConfig({}).reason,'no_api_key');
 assert.equal(voiceConfig({ELEVENLABS_API_KEY:'x'}).reason,'no_voice_id');
 const dir=await mkdtemp(join(tmpdir(),'mrp-'));
 const v=await generateVoice(buildTemplateScript(demoDoc),{env:{},outDir:dir,fetcher:()=>{throw Error('no debe llamar');}});
 assert.equal(v.enabled,false);
 const l=await generateLipsync({voice:v,env:{},voiceDir:dir,outDir:dir,fetcher:()=>{throw Error('no debe llamar');}});
 assert.equal(l.enabled,false);assert.equal(l.reason,'no_api_key');
 assert.equal(lipsyncConfig({KLING_API_KEY:'k'},{enabled:true}).reason,'no_base_video');
 assert.equal(lipsyncConfig({KLING_API_KEY:'k',KLING_BASE_VIDEO_URL:'https://x.test/a.mp4'},{enabled:false}).reason,'no_voice');
});

test('ElevenLabs falla a medias: sin voz (nunca voz incompleta)', async()=>{
 const dir=await mkdtemp(join(tmpdir(),'mrp-'));
 let n=0;
 const fetcher=async()=>++n===1?new Response(JSON.stringify({audio_base64:Buffer.from('mp3').toString('base64'),
  alignment:{character_end_times_seconds:[0.5,2.4]}}),{status:200}):new Response('{}',{status:401});
 const v=await generateVoice(buildTemplateScript(demoDoc),{env:{ELEVENLABS_API_KEY:'k',ELEVENLABS_VOICE_ID:'abcdefghij12'},outDir:dir,fetcher});
 assert.equal(v.enabled,false);assert.equal(v.reason,'api_error:http_401');
});

test('línea de tiempo 45–60 s, subtítulos cubren cada escena y props completas', ()=>{
 const script=buildTemplateScript(demoDoc);
 const t=buildTimeline(script.segments);
 assert.ok(t.durationInFrames>=MIN_TOTAL_SEC*FPS&&t.durationInFrames<=MAX_TOTAL_SEC*FPS+1,'dura '+t.seconds+' s');
 for(const s of t.scenes){
  const c=s.captions,last=c[c.length-1];
  assert.equal(last.from+last.durationInFrames,s.durationInFrames);
  assert.ok(c.every(x=>x.text.split(' ').length<=7));
 }
 const withVoice=buildTimeline(script.segments,{voice:{intro:9}});
 assert.ok(withVoice.scenes[0].durationInFrames>=9*FPS,'la voz nunca se corta');
 const props=buildProps({picksDoc:{...demoDoc,generatedAt:'x'},script,voice:{enabled:false},lipsync:{enabled:false}});
 assert.equal(props.scenes.filter(s=>s.kind==='pick').length,4);
 assert.equal(props.voice,false);assert.equal(props.lipsync,false);
 assert.equal(captionChunks('uno dos',30).length,1);
});

test('24/11: el video evita momios muy castigados y relaja solo si no alcanzan',async()=>{
 const {selectVideoPicks}=await import('../scripts/lib/picks.mjs');
 const now=Date.parse('2026-11-24T12:00:00Z');
 const mk=(id,odd,kind)=>({fixture:{id,home:'A'+id,away:'B'+id,date:'2026-11-24T20:00:00Z',code:'39'},p:70,kind,label:kind,key:kind,oddsDecimal:odd});
 const rows=[mk(1,1.07,'x1'),mk(2,1.5,'x2'),mk(3,1.6,'x3'),mk(4,1.45,'x4'),mk(5,1.8,'x5'),mk(6,1.1,'x6'),mk(7,4.15,'x7')];
 const picked=selectVideoPicks(rows,{count:5,now});
 assert.ok(picked.length>=4&&picked.every(r=>r.oddsDecimal>=1.4&&r.oddsDecimal<2),'solo favoritos de -250 a -100');
 const {typicalOdd}=await import('../scripts/lib/picks.mjs');
 assert.equal(typicalOdd({books:[{selections:{k:1.55}},{selections:{k:4.15}},{selections:{k:1.5}}]},'k'),1.55);
 const few=selectVideoPicks([mk(1,1.07,'x1'),mk(2,1.1,'x2'),mk(3,1.5,'x3'),mk(4,1.12,'x4')],{count:5,now});
 assert.equal(few.length,4,'relaja hasta cualquier momio real');
});

test('plantilla v2: edición por liga y día, guion hablado natural y kit de CapCut',async()=>{
 const {editionFrom}=await import('../scripts/fetch-picks.mjs');
 const {spokenLabel,editionIntro,buildTemplateScript,validateScript}=await import('../scripts/lib/script.mjs');
 const {buildProps,capcutKit,CAPCUT_SLOT}=await import('../scripts/lib/props.mjs');
 assert.deepEqual(editionFrom({PICKRIX_LEAGUE:'2',PICKRIX_DAY:'1'}),{league:'2',day:1,leagueName:'Champions League'});
 assert.deepEqual(editionFrom({PICKRIX_LEAGUE:'x;rm',PICKRIX_DAY:'9'}),{league:null,day:null,leagueName:null});
 assert.equal(spokenLabel({label:'Slavia Praha o Empate (1/X)'}),'Slavia Praha o empate');
 assert.equal(spokenLabel({label:'Over 2.5 goles'}),'más de 2.5 goles');
 assert.equal(spokenLabel({label:'Ambos marcan: Sí'}),'que anoten los dos equipos');
 assert.match(editionIntro({edition:{leagueName:'Champions League',day:1}},4),/^¡Mañana hay Champions League!/);
 const doc={edition:{league:'2',day:1,leagueName:'Champions League'},picks:[1,2,3,4].map(i=>({home:'Local '+i,away:'Visita '+i,label:'Over 2.5 goles',probability:60+i,oddsAmerican:'-15'+i,kickoffLocal:'mié 14:00',league:'Champions League',market:'Goles'}))};
 const script=buildTemplateScript(doc);
 assert.equal(validateScript(script,doc).ok,true,JSON.stringify(validateScript(script,doc).problems));
 const props=buildProps({picksDoc:{...doc,date:'2026-11-25'},script,voice:{enabled:false},lipsync:{enabled:false}});
 assert.equal(props.edition.leagueName,'Champions League');
 const kit=capcutKit(props);
 assert.match(kit,/Lip Sync/);assert.match(kit,new RegExp(`x = ${CAPCUT_SLOT.x}, y = ${CAPCUT_SLOT.y}`));
 assert.ok(props.scenes.every(s=>s.captions.every(c=>c.text.split(/\s+/).length<=4)),'karaoke ≤4 palabras');
});

test('voz gratuita Piper: sin claves, un WAV por escena y duración leída del archivo',async()=>{
 const {generateVoice,voiceConfig,wavSeconds}=await import('../scripts/voice.mjs');
 const {writeFileSync}=await import('node:fs');
 const {EventEmitter}=await import('node:events');
 const wav=sec=>{const rate=22050,data=Buffer.alloc(Math.round(rate*2*sec));const h=Buffer.alloc(44);
  h.write('RIFF',0);h.writeUInt32LE(36+data.length,4);h.write('WAVE',8);h.write('fmt ',12);h.writeUInt32LE(16,16);h.writeUInt16LE(1,20);h.writeUInt16LE(1,22);
  h.writeUInt32LE(rate,24);h.writeUInt32LE(rate*2,28);h.writeUInt16LE(2,32);h.writeUInt16LE(16,34);h.write('data',36);h.writeUInt32LE(data.length,40);return Buffer.concat([h,data]);};
 assert.equal(Math.round(wavSeconds(wav(2.5))*10)/10,2.5);
 assert.equal(voiceConfig({PIPER_MODEL:'/x/voz.onnx'},{exists:()=>true}).provider,'piper');
 assert.equal(voiceConfig({PIPER_MODEL:'/x/voz.onnx'},{exists:()=>false}).enabled,false);
 assert.equal(voiceConfig({ELEVENLABS_API_KEY:'k',ELEVENLABS_VOICE_ID:'abcdefghij12',PIPER_MODEL:'/x/v.onnx'},{exists:()=>true}).provider,'elevenlabs','ElevenLabs tiene prioridad si existe');
 const dir=await mkdtemp(join(tmpdir(),'piper-'));
 const spoken=[];
 const run=(bin,args)=>{const p=new EventEmitter();const file=args[args.indexOf('--output_file')+1];
  p.stderr=new EventEmitter();p.stdin={end:t=>{spoken.push(t);writeFileSync(file,wav(3));setImmediate(()=>p.emit('close',0));}};return p;};
 const script={segments:[{id:'intro',kind:'intro',text:'Hola'},{id:'pick-1',kind:'pick',text:'Pick'}]};
 const v=await generateVoice(script,{env:{PIPER_MODEL:'/x/voz.onnx'},outDir:dir,exists:()=>true,run});
 assert.equal(v.enabled,true);assert.equal(v.provider,'piper');assert.deepEqual(spoken,['Hola','Pick']);
 assert.deepEqual(v.segments.map(s=>[s.file,s.seconds]),[['generated/voice/intro.wav',3],['generated/voice/pick-1.wav',3]]);
 const bad=(bin,args)=>{const p=new EventEmitter();p.stderr=new EventEmitter();p.stdin={end:()=>setImmediate(()=>p.emit('close',1))};return p;};
 assert.equal((await generateVoice(script,{env:{PIPER_MODEL:'/x/voz.onnx'},outDir:dir,exists:()=>true,run:bad})).enabled,false,'si falla: video sin voz');
});
