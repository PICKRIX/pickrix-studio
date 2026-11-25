/**
 * PICKRIX DAILY — selección de los 5 partidos más importantes del día y sus datos.
 * Solo endpoints PÚBLICOS de pickrixapp.com (agenda + análisis gratuito). Nunca inventa
 * partidos: si hay menos de 5 elegibles, entrega los que haya y lo marca.
 */
export const BASE='https://pickrixapp.com/.netlify/functions/';
const ZONE='America/Mexico_City';

/** Peso por competición (importancia + interés para México). */
export const LEAGUE_WEIGHT={'2':100,'262':92,'39':88,'140':86,'3':78,'135':76,'78':76,'61':68,'848':62,'253':58,
 '13':72,'11':60,'international':80,'71':54,'128':52,'94':50,'88':48,'40':44};
/** Equipos con más arrastre en México (bonus de popularidad). */
export const POPULAR=/^(real madrid|barcelona|atl[eé]tico de madrid|manchester (united|city)|liverpool|arsenal|chelsea|tottenham|paris saint germain|psg|bayern|borussia dortmund|juventus|inter|ac milan|milan|napoli|benfica|porto|ajax|am[eé]rica|club am[eé]rica|guadalajara|chivas|cruz azul|pumas|tigres|monterrey|toluca|santos laguna|le[oó]n|boca juniors|river plate|flamengo|palmeiras|inter miami|la galaxy|mexico|m[eé]xico|argentina|brasil|brazil|espa[ñn]a|spain|france|francia|england|inglaterra)\b/i;

export function dayString(offset=0,now=new Date()){
 const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now).map(x=>[x.type,x.value]));
 return new Date(Date.UTC(+p.year,+p.month-1,+p.day+offset)).toISOString().slice(0,10);
}

export function importance(f){
 const w=LEAGUE_WEIGHT[String(f.code)]??30;
 const pop=[f.home,f.away].filter(t=>POPULAR.test(String(t||''))).length;
 return w+pop*14+(pop===2?10:0);
}

export function eligible(f,{now=Date.now()}={}){
 const t=Date.parse(f?.date||'');
 return f?.id&&['NS','TBD'].includes(String(f.status||''))&&Number.isFinite(t)&&t>now+30*60000&&
  !/\b(u-?(1\d|2[0-3])|reserves?|women|femenil|youth)\b|\s(ii|b)$/i.test(`${f.home} ${f.away} ${f.league}`);
}

export async function selectTop({date,fetcher=fetch,now=Date.now(),count=5}={}){
 const get=async u=>{const r=await fetcher(BASE+u,{headers:{accept:'application/json','user-agent':'pickrix-daily/1.0'},signal:AbortSignal.timeout(25000)});if(!r.ok)throw Error('http_'+r.status);return r.json();};
 const day=await get('football-fixtures?date='+date);
 const pool=(day?.fixtures||[]).filter(f=>eligible(f,{now})).sort((a,b)=>importance(b)-importance(a)||Date.parse(a.date)-Date.parse(b.date));
 const picked=[];
 for(const f of pool){
  if(picked.length>=count)break;
  let a;try{a=await get('football-analysis?fixture='+encodeURIComponent(f.id));}catch{continue;}
  // Sin probabilidades reales no hay análisis: se salta (no se rellena).
  if(!a?.oneXtwo||!['home','draw','away'].every(k=>Number.isFinite(a.oneXtwo[k])))continue;
  picked.push({id:String(f.id),date:f.date,league:String(f.competition||f.league||''),code:String(f.code||''),
   home:String(f.home),away:String(f.away),homeLogo:f.homeLogo||null,awayLogo:f.awayLogo||null,importance:importance(f),
   oneXtwo:a.oneXtwo,markets:a.markets||{},expectedGoals:a.expectedGoals||null,
   homeRecent:(a.homeRecent||[]).slice(0,5),awayRecent:(a.awayRecent||[]).slice(0,5),quality:a.probabilityQuality||null});
 }
 return picked.sort((a,b)=>Date.parse(a.date)-Date.parse(b.date));
}
