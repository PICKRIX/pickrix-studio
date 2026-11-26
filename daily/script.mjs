/**
 * PICKRIX DAILY — guion de los 5 análisis (voz en off) y de saludo/despedida.
 * Cada análisis usa SOLO los datos del partido (probabilidades, forma, goles esperados,
 * mercados) y explica POR QUÉ. Nunca: «seguro», «garantizado», «apuesta».
 */
export const GREETINGS={
 CRACKS:{saludo:'¡Qué onda, cracks! Ustedes ponen la pasión, nosotros ponemos los números. Hoy tenemos cinco partidazos bajo la lupa. ¡Esto es PICKRIX y arrancamos!',
  despedida:'¡Y listo, cracks! Ya tienen los números, ahora toca disfrutar los partidazos. Encuentren más análisis en pickrixapp punto com. Nos vemos mañana y recuerden… ¡No adivinen, analicen!'},
 PICKXERS:{saludo:'¡Hey, Pickxers! Ya saben que aquí no usamos la bola de cristal, usamos las estadísticas. Tenemos cinco encuentros que no se pueden perder. ¡Vamos con el análisis!',
  despedida:'¡Eso es todo por hoy, Pickxers! La acción está por comenzar, pero nuestro análisis no se detiene. Descubran mucho más en pickrixapp punto com. Y recuerden nuestro lema: ¡No adivines, analiza!'},
 AMANTES_DEL_DEPORTE:{saludo:'¡Qué tal, amantes del deporte! Antes de que comience la acción, veamos qué nos cuentan los números. Estos son los cinco encuentros que hoy están en el radar de PICKRIX. ¡Comenzamos!',
  despedida:'¡Hasta aquí nuestro radar deportivo de hoy! Porque disfrutar del deporte también es entenderlo. Encuentren más estadísticas y análisis en pickrixapp punto com. Nos vemos en la próxima jornada. ¡No adivines, analiza!'},
};
/** Lunes=1 … Domingo=0, tabla oficial. */
const ROTATION={1:'CRACKS',2:'PICKXERS',3:'AMANTES_DEL_DEPORTE',4:'CRACKS',5:'PICKXERS',6:'AMANTES_DEL_DEPORTE',0:'PICKXERS'};
export function greetingFor(date){return ROTATION[new Date(date+'T12:00:00Z').getUTCDay()];}

const OPENERS=['Arrancamos con un partidazo','Seguimos','Ojo con este duelo','Aquí los números se ponen interesantes','Y cerramos con todo'];
const pct=v=>Math.round(Number(v));
const wins=r=>r.filter(x=>x.outcome==='G').length;
const gf=r=>r.reduce((n,x)=>n+x.goalsFor,0);
/** Nombre corto de la competición para la narración. */
export function shortLeague(l){
 const t=String(l||'');
 return /championship/i.test(t)?'Championship':/primeira liga/i.test(t)?'Liga de Portugal':/brasileir/i.test(t)?'Brasileirão':/champions/i.test(t)?'Champions':/europa league/i.test(t)?'Europa League':/conference/i.test(t)?'Conference League':
  /premier/i.test(t)?'Premier League':/la ?liga/i.test(t)?'LaLiga':/liga mx/i.test(t)?'Liga MX':/serie a/i.test(t)?'Serie A':
  /bundesliga/i.test(t)?'Bundesliga':/ligue 1/i.test(t)?'Ligue 1':/major league soccer|^mls$|·\s*mls/i.test(t)?'MLS':t.replace(/^[^·]*·\s*/,'');
}
const leagueSpoken=l=>{const n=shortLeague(l);if(n==='Brasileirão')return 'el Brasileirão';if(n==='Championship'||n==='Liga de Portugal')return 'la '+n;return /^(Champions|Europa League|Conference League|Premier League|Liga MX|Serie A|Bundesliga|Ligue 1)$/.test(n)||n==='MLS'?'la '+(n==='Champions'||n==='Premier League'?n.replace(' League',''):n):n;};
/** Nombre corto del equipo para decirlo (la tarjeta muestra el nombre completo). */
/** Cómo se DICEN los equipos en México (la tarjeta muestra el nombre oficial). */
const SPOKEN={'club brugge kv':'Brujas','club brugge':'Brujas','bayern münchen':'Bayern','bayern munich':'Bayern','club america':'América','america':'América',
 'vfb stuttgart':'Stuttgart','paris saint germain':'PSG','manchester united':'Manchester United','manchester city':'Manchester City',
 'borussia dortmund':'Dortmund','atletico madrid':'Atlético de Madrid','inter':'Inter','ac milan':'Milan','guadalajara':'Chivas',
 'u.n.a.m. - pumas':'Pumas','pumas unam':'Pumas','tigres uanl':'Tigres','cruz azul':'Cruz Azul','sporting cp':'Sporting de Lisboa','fc porto':'Porto','stade brestois 29':'Brest','paris fc':'París FC','maritimo':'Marítimo','vancouver whitecaps':'Vancouver','real salt lake':'Real Salt Lake','borussia mönchengladbach':'Gladbach','borussia monchengladbach':'Gladbach','racing santander':'Racing de Santander','columbus crew':'Columbus','nottingham forest':'Nottingham Forest','werder bremen':'Werder Bremen',
 'olympiakos piraeus':'Olympiakos','guadalajara chivas':'Chivas','cf pachuca':'Pachuca','leon':'León','club leon':'León','club queretaro':'Querétaro',
 'atletico san luis':'Atlético de San Luis','santos laguna':'Santos','fc juarez':'Juárez','mazatlán':'Mazatlán','plzen':'Plzen','omonia nicosia':'Omonia'};
export const shortTeam=t=>SPOKEN[String(t).toLowerCase()]||String(t).replace(/^(FC|CF|AC|AS|SS|SC|CD|Club|Real Club)\s+/i,'').replace(/\s+(FC|CF|SC|KV)$/i,'');
const nWord=n=>['ninguno','uno','dos','tres','cuatro','cinco'][n]??String(n);

/** Elige 2–3 datos que de verdad explican la tendencia del partido (≈ 35–45 palabras). */
export function analyze(m){
 const p=m.oneXtwo,H=shortTeam(m.home),A=shortTeam(m.away);
 const entries=[['home',p.home],['draw',p.draw],['away',p.away]].sort((a,b)=>b[1]-a[1]);
 const [topKey,topP]=entries[0],gap=topP-entries[1][1];
 const fav=topKey==='home'?H:topKey==='away'?A:null;
 const hr=m.homeRecent||[],ar=m.awayRecent||[];
 const facts=[],highlights=[H,A];
 if(fav&&gap>=8){facts.push(`PICKRIX ve favorito a ${fav}, con ${pct(topP)} %.`);highlights.push(`${pct(topP)} %`);}
 else{facts.push(`Duelo parejo: ${pct(p.home)} % para ${H}, ${pct(p.draw)} % de empate y ${pct(p.away)} % para ${A}.`);highlights.push(`${pct(p.home)} %`,`${pct(p.away)} %`);}
 if(hr.length>=4&&ar.length>=4){
  const wh=wins(hr),wa=wins(ar);
  if(Math.abs(wh-wa)>=2){const [t,w,o,wo]=wh>wa?[H,wh,A,wa]:[A,wa,H,wh];facts.push(w===5?`La clave: ${t} ganó sus últimos cinco; ${o}, ${nWord(wo)}.`:`La clave: ${t} ganó ${nWord(w)} de sus últimos cinco; ${o}, ${nWord(wo)}.`);}
  else if(gf(hr)+gf(ar)>=16)facts.push(`Dato clave: entre los dos suman ${gf(hr)+gf(ar)} goles en sus últimos cinco.`);
  else facts.push(`Llegan con forma parecida: ${H} ganó ${nWord(wh)} de sus últimos cinco y ${A}, ${nWord(wa)}.`);
 }
 const mk=m.markets||{},xg=m.expectedGoals;
 const total=xg&&Number.isFinite(xg.home)&&Number.isFinite(xg.away)?Math.round((xg.home+xg.away)*10)/10:null;
 if(Number.isFinite(mk.over25)&&mk.over25>=58){facts.push(`Y ojo: el Over 2.5 sale con ${pct(mk.over25)} %.`);highlights.push('Over 2.5');}
 else if(Number.isFinite(mk.under25)&&mk.under25>=58){facts.push(`Pinta cerrado: el Under 2.5 sale con ${pct(mk.under25)} %.`);highlights.push('Under 2.5');}
 else if(Number.isFinite(mk.btts_yes)&&mk.btts_yes>=58){facts.push(`Y que anoten ambos sale con ${pct(mk.btts_yes)} %.`);highlights.push('ambos');}
 return {facts:facts.slice(0,3),highlights,favorite:fav,top:{key:topKey,p:pct(topP)},xgTotal:total};
}

export function buildDaily({date,matches}){
 const key=greetingFor(date),g=GREETINGS[key];
 const segments=matches.map((m,i)=>{
  const a=analyze(m);
  const opener=OPENERS[i===matches.length-1&&matches.length>1?4:Math.min(i,3)];
  return {id:'match-'+(i+1),matchIndex:i,text:`${opener} en ${leagueSpoken(m.league)}: ${shortTeam(m.home)} contra ${shortTeam(m.away)}. ${a.facts.join(' ')}`,highlights:a.highlights,analysis:a};
 });
 return {date,greeting:key,saludo:g.saludo,despedida:g.despedida,segments};
}

const FORBIDDEN=/\b(segur[oa]|asegurad[oa]|garantizad[oa]|infalible|apuesta|dinero f[aá]cil)\b/i;
export function validateDaily(d){
 const problems=[];
 for(const s of d.segments){if(FORBIDDEN.test(s.text))problems.push('forbidden:'+s.id);if(s.text.split(/\s+/).length>40)problems.push('long:'+s.id);}
 return {ok:!problems.length,problems};
}
