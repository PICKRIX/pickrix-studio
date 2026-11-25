#!/usr/bin/env node
/**
 * MR. PICKRIX Studio — paso 1: picks GRATUITOS del día.
 * Usa solo los mismos endpoints públicos que la app usa para HOT PICKS:
 *   football-fixtures?date=  →  football-quick?fixture=  →  football-odds?fixture=&v=3
 * Nunca usa endpoints de PRO/ELITE ni credenciales. Si no hay al menos 4 picks
 * reales, escribe un set DEMO (demo:true) que el video marca como «DATOS FICTICIOS»
 * y que el flujo nunca debe publicar como real.
 */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {eligibleFixture,leagueRank,candidateRows,typicalOdd,selectVideoPicks,toVideoPick,MIN_VIDEO_PICKS} from './lib/picks.mjs';

const here=dirname(fileURLToPath(import.meta.url));
export const DEFAULT_BASE='https://pickrixapp.com';
const ZONE='America/Mexico_City';
const MAX_FIXTURES=18;

export function dayString(offset=0,now=new Date()){
 const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:ZONE,year:'numeric',month:'2-digit',day:'2-digit'})
  .formatToParts(now).map(x=>[x.type,x.value]));
 return new Date(Date.UTC(+p.year,+p.month-1,+p.day+offset)).toISOString().slice(0,10);
}

async function getJson(fetcher,url){
 const r=await fetcher(url,{headers:{accept:'application/json','user-agent':'pickrix-studio/1.0'},signal:AbortSignal.timeout(20000)});
 if(!r.ok)throw Error('http_'+r.status);
 return r.json();
}

export async function loadDemo(reason){
 const demo=JSON.parse(await readFile(resolve(here,'../data/demo-picks.json'),'utf8'));
 return {...demo,demo:true,source:'demo',reason:String(reason||'unavailable').slice(0,80)};
}

/** Edición del video: liga opcional (código PICKRIX, p. ej. '2' = Champions) y día (0 hoy, 1 mañana). */
export const LEAGUE_NAMES={'2':'Champions League','3':'Europa League','848':'Conference League','262':'Liga MX','39':'Premier League','140':'LaLiga'};
export function editionFrom(env={}){
 const league=/^[a-z0-9-]{1,30}$/i.test(String(env.PICKRIX_LEAGUE||''))?String(env.PICKRIX_LEAGUE):null;
 const day=['0','1','2'].includes(String(env.PICKRIX_DAY??''))?Number(env.PICKRIX_DAY):null;
 return {league,day,leagueName:league?(LEAGUE_NAMES[league]||'Liga '+league):null};
}
export async function fetchLivePicks({baseUrl=DEFAULT_BASE,fetcher=fetch,now=new Date(),count=5,edition={}}={}){
 const fn=baseUrl.replace(/\/+$/,'')+'/.netlify/functions/';
 const fixtures=[],seen=new Set();
 for(const day of edition.day!=null?[edition.day]:[0,1]){
  let data;try{data=await getJson(fetcher,fn+'football-fixtures?date='+dayString(day,now));}catch{continue;}
  for(const f of [...(data?.fixtures||[])].sort((a,b)=>leagueRank(a)-leagueRank(b)))
   if((!edition.league||String(f.code)===edition.league)&&eligibleFixture(f,{now:now.getTime()})&&!seen.has(f.id)){seen.add(f.id);fixtures.push(f);if(fixtures.length>=MAX_FIXTURES)break;}
  if(fixtures.length>=MAX_FIXTURES)break;
 }
 const rows=[];
 // Secuencial y con pocas llamadas: respeta los límites por IP de las funciones públicas.
 for(const f of fixtures){
  let quick;try{quick=await getJson(fetcher,fn+'football-quick?fixture='+encodeURIComponent(f.id));}catch{continue;}
  const cand=candidateRows(f,quick);if(!cand.length)continue;
  let odds;try{odds=await getJson(fetcher,fn+'football-odds?fixture='+encodeURIComponent(f.id)+'&v=3');}catch{continue;}
  for(const r of cand){const d=typicalOdd(odds,r.key);if(d!==null)rows.push({...r,oddsDecimal:d});}
 }
 return selectVideoPicks(rows,{count,now:now.getTime()}).map(r=>toVideoPick(r,{zone:ZONE}));
}

export async function fetchPicks(opts={}){
 const now=opts.now||new Date(),edition=opts.edition||{};
 const date=dayString(edition.day??0,now);
 let picks=[],reason='not_enough_live_picks';
 try{picks=await fetchLivePicks({...opts,now,edition});}catch(e){reason='fetch_failed';picks=[];}
 if(picks.length>=MIN_VIDEO_PICKS)
  return {demo:false,source:'live',generatedAt:now.toISOString(),date,edition,picks};
 return {...(await loadDemo(reason)),generatedAt:now.toISOString(),date,edition};
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
 const out=resolve(here,'../out');await mkdir(out,{recursive:true});
 const result=await fetchPicks({baseUrl:process.env.PICKRIX_BASE_URL||DEFAULT_BASE,edition:editionFrom(process.env)});
 await writeFile(resolve(out,'picks.json'),JSON.stringify(result,null,1));
 console.log(result.demo?`⚠ DEMO (${result.reason}): ${result.picks.length} picks ficticios. NO publicar.`:`✓ ${result.picks.length} picks reales del ${result.date}.`);
}
