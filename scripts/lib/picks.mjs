/**
 * MR. PICKRIX Studio — lógica pura para elegir los picks del video.
 * Replica las reglas de los HOT PICKS gratuitos del sitio (public/index.html):
 *  - solo partidos próximos (NS/TBD) de ligas aprobadas, sin reservas ni juveniles;
 *  - probabilidad estimada ≥ 55 %;
 *  - SOLO con momio real del proveedor (nunca derivado de la probabilidad);
 *  - prioridad TOP Europa → Liga MX y selecciones → resto;
 *  - partidos distintos y mercados/rangos de probabilidad variados.
 * Sin dependencias: se prueba con `node --test studio/tests`.
 */
export const TOP_CODES=new Set(['39','140','135','78','61','2','3','848']);
export const SECOND_CODES=new Set(['262','international']);
export const ALLOWED_CODES=new Set(['262','39','140','135','78','61','88','40','253','94','71','128','2','3','848','17',
 'international','turkey-superlig','belgium-jupiler','swiss-superleague','chile-primera','spain-segunda',
 'colombia-primera','uruguay-primera','uruguay-clausura','saudi-proleague','mexico-expansion']);
const RESERVE=/(?:\b(?:u[ -]?(?:1[4-9]|2[0-3])|under[ -]?2[0-3]|reserves?|youth|academy|junior)\b|\s(?:ii|iii|b)\s*$)/i;
export const MIN_P=55;

export const leagueRank=f=>{const c=String(f?.code||'');return TOP_CODES.has(c)?0:SECOND_CODES.has(c)?1:2;};

/** ¿El partido puede aparecer en un video? (próximo, liga aprobada, margen para revisar). */
export function eligibleFixture(f,{now=Date.now(),leadMs=90*60000}={}){
 if(!f?.id||!ALLOWED_CODES.has(String(f.code||'')))return false;
 if(!['NS','TBD'].includes(String(f.status||'NS')))return false;
 const t=Date.parse(f.date||'');
 if(!Number.isFinite(t)||t<now+leadMs)return false;
 if(RESERVE.test(String(f.home||''))||RESERVE.test(String(f.away||'')))return false;
 if(String(f.code)==='belgium-jupiler'&&!/^(jupiler pro league|first division a)$/i.test(String(f.league||'')))return false;
 return true;
}

export function marketLabels(f){
 return {home:`Gana ${f.home}`,draw:'Empate',away:`Gana ${f.away}`,
  btts_yes:'Ambos marcan: Sí',btts_no:'Ambos marcan: No',
  over15:'Over 1.5 goles',under15:'Under 1.5 goles',over25:'Over 2.5 goles',under25:'Under 2.5 goles',
  over35:'Over 3.5 goles',under35:'Under 3.5 goles',
  double_hd:`${f.home} o Empate (1/X)`,double_ha:`${f.home} o ${f.away} (1/2)`,double_da:`${f.away} o Empate (X/2)`};
}
const kindOf=k=>['home','draw','away'].includes(k)?'1X2':k.startsWith('double_')?'Doble oportunidad':k.startsWith('btts_')?'Ambos marcan':'Goles';

/** Filas candidatas (mercado + probabilidad) a partir de football-quick. */
export function candidateRows(fixture,quick){
 const rows=[],o=quick?.oneXtwo,m=quick?.markets||{};
 const triple=o&&['home','draw','away'].every(k=>typeof o[k]==='number');
 const dbl=triple?{double_hd:o.home+o.draw,double_ha:o.home+o.away,double_da:o.draw+o.away}:{};
 for(const [key,label] of Object.entries(marketLabels(fixture))){
  const p=key.startsWith('double_')?dbl[key]:['home','draw','away'].includes(key)?o?.[key]:m[key];
  if(typeof p==='number'&&Number.isFinite(p)&&p>=MIN_P&&p<=100)rows.push({fixture,key,label,kind:kindOf(key),p});
 }
 return rows;
}

/** Cuota TÍPICA (mediana) entre las casas: un dato aislado no se cuela. */
export function typicalOdd(odds,key){
 const v=(odds?.books||[]).map(b=>Number(b?.selections?.[key])).filter(d=>Number.isFinite(d)&&d>1&&d<1000).sort((x,y)=>x-y);
 if(!v.length)return null;const m=v.length>>1;return v.length%2?v[m]:(v[m-1]+v[m])/2;
}
/** Mejor cuota decimal REAL de ese mercado entre las casas (football-odds). */
export function bestOdd(odds,key){
 let best=null;
 for(const b of odds?.books||[]){const d=Number(b?.selections?.[key]);if(Number.isFinite(d)&&d>1&&d<1000&&(best===null||d>best))best=d;}
 return best;
}
export function americanOdds(decimal){
 const d=Number(decimal);
 if(!Number.isFinite(d)||d<=1||d>=1000)return null;
 const v=d>=2?Math.round((d-1)*100):-Math.round(100/(d-1));
 return v>0?'+'+v:String(v);
}

export const MIN_VIDEO_PICKS=4;
const band=p=>p<65?0:p<75?1:2;
// Igual que HOT PICKS: favoritos de -250 a -100 (cuota 1.40–1.99); si no alcanzan,
// desde -400 (1.25) y al final cualquier favorito. Nunca momios positivos.
export const VIDEO_MIN_ODDS=[1.40,1.25,1.01];
/** Elige hasta `count` picks evitando momios muy castigados. */
export function selectVideoPicks(rows,{count=5,now=Date.now(),minCount=MIN_VIDEO_PICKS}={}){
 let picked=[];
 for(const min of VIDEO_MIN_ODDS){
  // Solo favoritos (momio negativo) y coherentes con la probabilidad estimada.
  picked=selectByOdds((rows||[]).filter(r=>{const d=Number(r?.oddsDecimal);return d>=min&&d<2&&100/d>=Number(r?.p)-20;}),{count,now});
  if(picked.length>=Math.min(minCount,count))break;
 }
 return picked;
}
/** Partidos distintos, mercados y rangos variados, por prioridad de liga. */
function selectByOdds(rows,{count,now}){
 const pool=(rows||[]).filter(r=>r?.fixture?.id&&Number.isFinite(r.p)&&r.p>=MIN_P&&r.p<=100&&
   Number.isFinite(r.oddsDecimal)&&r.oddsDecimal>1&&Date.parse(r.fixture.date)>now)
  .sort((a,b)=>leagueRank(a.fixture)-leagueRank(b.fixture)||Date.parse(a.fixture.date)-Date.parse(b.fixture.date)||b.p-a.p);
 const picked=[],fixtures=new Set(),kinds=new Map(),bands=new Set();
 const take=test=>{const r=pool.find(x=>!fixtures.has(String(x.fixture.id))&&test(x));if(!r)return false;
  picked.push(r);fixtures.add(String(r.fixture.id));kinds.set(r.kind,(kinds.get(r.kind)||0)+1);bands.add(band(r.p));return true;};
 // 1) un pick por rango de probabilidad con mercado nuevo; 2) mercado nuevo; 3) máx. 2 por mercado; 4) lo que haya.
 for(const b of [2,1,0]){if(picked.length>=count)break;take(r=>band(r.p)===b&&!kinds.has(r.kind));}
 while(picked.length<count&&take(r=>!kinds.has(r.kind))){}
 while(picked.length<count&&take(r=>(kinds.get(r.kind)||0)<2)){}
 while(picked.length<count&&take(()=>true)){}
 return picked.sort((a,b)=>Date.parse(a.fixture.date)-Date.parse(b.fixture.date));
}

// Escudos: solo imágenes oficiales del proveedor de datos (https).
const safeLogo=u=>/^https:\/\/media\.api-sports\.io\/football\/teams\/\d+\.png$/.test(String(u||''))?String(u):null;
/** Formato público y mínimo de un pick (sin datos de usuarios ni de planes de pago). */
export function toVideoPick(r,{zone='America/Mexico_City'}={}){
 const kickoff=new Date(r.fixture.date);
 return {fixtureId:String(r.fixture.id),home:String(r.fixture.home),away:String(r.fixture.away),
  league:String(r.fixture.competition||r.fixture.league||''),kickoffIso:kickoff.toISOString(),
  kickoffLocal:new Intl.DateTimeFormat('es-MX',{timeZone:zone,weekday:'short',hour:'2-digit',minute:'2-digit'}).format(kickoff),
  homeLogo:safeLogo(r.fixture.homeLogo),awayLogo:safeLogo(r.fixture.awayLogo),leagueCode:String(r.fixture.code||''),
  market:r.kind,label:r.label,probability:Math.round(r.p),oddsDecimal:Number(r.oddsDecimal.toFixed(2)),
  oddsAmerican:americanOdds(r.oddsDecimal)};
}

