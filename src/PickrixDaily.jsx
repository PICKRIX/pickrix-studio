/**
 * PICKRIX DAILY — programa diario 9:16 (1080×1920, 30 fps).
 * Secuencia: saludo (video original) → transición PICKRIX → LOS 5 PARTIDAZOS DEL DÍA →
 * 5 análisis con voz en off (sin presentador) → despedida (video original) → pantalla final.
 * Diseño por competición, cifras y nombres como capas de texto (nunca dentro de imágenes).
 */
import {AbsoluteFill,Sequence,Img,OffthreadVideo,Audio,staticFile,useCurrentFrame,useVideoConfig,interpolate,spring} from 'remotion';

const FPS=30;
const C={black:'#030504',lime:'#b8ff2c',white:'#f4f7f2',graphite:'#1b211d',muted:'#a9b6a5'};
const FONT='"Montserrat","Inter","Segoe UI","Helvetica Neue",Arial,sans-serif';
export const T={transition:30,lineup:84,wipe:10,end:66,pad:14};

/** Personalidad gráfica por competición (siempre con verde lima de PICKRIX). */
const THEMES={
 '2':{name:'UEFA CHAMPIONS LEAGUE',bg:['#0b1a52','#02040f'],accent:'#c9d3e8',stars:true},
 '3':{name:'UEFA EUROPA LEAGUE',bg:['#1a0d02','#050302'],accent:'#ff7a1a',angles:true},
 '848':{name:'UEFA CONFERENCE LEAGUE',bg:['#062018','#020604'],accent:'#2fe08b'},
 '39':{name:'PREMIER LEAGUE',bg:['#3a0052','#0a0010'],accent:'#d65cff'},
 '140':{name:'LALIGA',bg:['#3a0d0d','#080303'],accent:'#ff5a4e',angles:true},
 '262':{name:'LIGA MX',bg:['#0a4d23','#020a05'],accent:'#33d26b'},
 '78':{name:'BUNDESLIGA',bg:['#3d0207','#060101'],accent:'#ff2638',angles:true},
 '135':{name:'SERIE A',bg:['#06246e','#02050f'],accent:'#4d8dff'},
 '61':{name:'LIGUE 1',bg:['#0b1f4d','#02040b'],accent:'#5aa0ff'},
};
const theme=m=>THEMES[m?.code]||{name:String(m?.league||'').toUpperCase(),bg:['#1b211d','#030504'],accent:C.lime};

const Logo=({size=60,glow=false})=>(
 <div style={{fontFamily:FONT,fontWeight:900,fontSize:size,letterSpacing:3,color:C.white,lineHeight:1,
  textShadow:glow?`0 0 30px ${C.lime},0 0 60px rgba(184,255,44,.5)`:'none'}}>PICK<span style={{color:C.lime}}>RIX</span></div>
);

const Crest=({name,file,size=120,glow=0})=>{
 const initials=String(name||'?').split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase();
 return (
  <div style={{width:size,height:size,borderRadius:'50%',background:'rgba(244,247,242,.96)',display:'flex',alignItems:'center',justifyContent:'center',flex:`0 0 ${size}px`,
   boxShadow:`0 0 0 ${4+glow*4}px ${C.lime},0 0 ${20+glow*60}px rgba(184,255,44,${.25+glow*.6}),0 14px 40px rgba(0,0,0,.6)`,transform:`scale(${1+glow*.06})`}}>
   {file?<Img src={staticFile(file)} style={{width:'74%',height:'74%',objectFit:'contain'}}/>:
    <span style={{fontFamily:FONT,fontWeight:900,fontSize:size*.34,color:C.black}}>{initials}</span>}
  </div>
 );
};

/* ---------- Fondos animados ---------- */
const Particles=({count=30,color=C.lime,star=false})=>{
 const f=useCurrentFrame();
 return <>{Array.from({length:count},(_,i)=>{const x=(i*373)%1080,y=((i*617)-f*(0.6+(i%5)*.3)*2+19200)%1920,s=star?2+(i%3):3+(i%4)*2;
  const tw=star?0.35+0.65*Math.abs(Math.sin((f+i*17)/14)):0.25+(i%3)*.15;
  return <div key={i} style={{position:'absolute',left:x,top:y,width:s,height:s,borderRadius:'50%',background:color,opacity:tw,boxShadow:`0 0 ${star?8:12}px ${color}`}}/>;})}</>;
};
const ThemeBg=({th})=>{
 const f=useCurrentFrame();
 const zoom=1.04+0.04*Math.sin(f/90);
 return (
  <AbsoluteFill style={{overflow:'hidden',background:`radial-gradient(1300px 1100px at 50% 18%,${th.bg[0]},${th.bg[1]} 70%)`}}>
   <AbsoluteFill style={{transform:`scale(${zoom})`}}>
    {/* Reflectores de estadio */}
    {[[-160,-16+Math.sin(f/60)*10],[1240,16-Math.sin(f/60)*10]].map(([x,r],i)=>(
     <div key={i} style={{position:'absolute',left:x,top:-240,width:360,height:2400,transformOrigin:'50% 0',transform:`rotate(${r}deg)`,
      background:`linear-gradient(180deg,${th.accent}55,transparent 60%)`,filter:'blur(22px)'}}/>))}
    {th.angles&&[0,1,2].map(i=><div key={i} style={{position:'absolute',left:-200,right:-200,top:300+i*520+((f*1.4)%520),height:6,background:th.accent,opacity:.18,transform:'rotate(-12deg)'}}/>)}
    {/* Cancha en perspectiva */}
    <div style={{position:'absolute',left:-300,right:-300,bottom:-160,height:900,transform:'perspective(900px) rotateX(64deg)',transformOrigin:'50% 100%',
     backgroundImage:`linear-gradient(rgba(184,255,44,.16) 3px,transparent 3px),linear-gradient(90deg,rgba(184,255,44,.12) 3px,transparent 3px)`,
     backgroundSize:'170px 170px',backgroundPosition:`0 ${(f*2)%170}px`,maskImage:'linear-gradient(to top,#000 30%,transparent)'}}/>
    <Particles star={th.stars} color={th.stars?'#ffffff':C.lime} count={th.stars?46:28}/>
   </AbsoluteFill>
  </AbsoluteFill>
 );
};

/* ---------- Subtítulos (máx. 2 líneas, palabras clave en lima) ---------- */
export function chunks(text,frames,maxWords=5){
 const w=String(text).split(/\s+/).filter(Boolean),out=[];
 for(let i=0;i<w.length;){let j=Math.min(w.length,i+maxWords);for(let k=i+2;k<j;k++)if(/[.,:;!?]$/.test(w[k-1])){j=k;break;}out.push(w.slice(i,j).join(' '));i=j;}
 const total=out.reduce((n,c)=>n+c.length+4,0)||1;let from=0;
 return out.map((c,i)=>{const len=i===out.length-1?Math.max(1,frames-from):Math.max(10,Math.round(frames*(c.length+4)/total));const r={text:c,from,dur:len};from+=len;return r;});
}
/** §18: agrupa palabras con tiempos reales en bloques de ≤5 palabras (máx. 2 líneas). */
export function wordGroups(words,maxWords=5){
 const out=[];
 for(let i=0;i<words.length;){let j=Math.min(words.length,i+maxWords);for(let k=i+2;k<j;k++)if(/[.,:;!?…]$/.test(words[k-1].w)){j=k;break;}
  const g=words.slice(i,j);out.push({words:g,s:g[0].s,e:g[g.length-1].e,text:g.map(x=>x.w).join(' ')});i=j;}
 return out;
}
/** Bloque visible en el segundo t: aparece con la 1.ª palabra y se va con la última (o con el siguiente bloque). */
export function activeGroup(groups,t){
 return groups.find((g,i)=>t>=g.s-0.05&&t<Math.min(g.e+0.25,groups[i+1]?groups[i+1].s-0.05:Infinity))||null;
}
const Subtitles=({text,words,frames,highlights=[],top=1560})=>{
 const f=useCurrentFrame(),t=f/FPS;
 const keys=highlights.map(h=>String(h).toLowerCase());
 const hot=w=>/\d+\s?%|^\d/.test(w)||/pickrix/i.test(w)||keys.some(k=>k&&(k.includes(w.toLowerCase().replace(/[.,:;!?¡¿]/g,''))&&w.length>2));
 const box={position:'absolute',left:60,right:60,top,display:'flex',flexWrap:'wrap',justifyContent:'center',gap:'0 16px',
  fontFamily:FONT,fontWeight:900,fontSize:58,lineHeight:1.15,textAlign:'center',textTransform:'uppercase'};
 const stroke={WebkitTextStroke:'2px #000',textShadow:'0 5px 0 rgba(0,0,0,.7),0 0 22px rgba(0,0,0,.85)'};
 if(words&&words.length){
  const g=activeGroup(wordGroups(words),t);if(!g)return null;
  const s=spring({frame:f-Math.round(g.s*FPS),fps:FPS,config:{damping:14,mass:.5}});
  return (
   <div style={{...box,transform:`translateY(${(1-s)*18}px)`,opacity:Math.min(1,s*1.4)}}>
    {g.words.map((x,i)=>{const on=t>=x.s&&t<x.e,said=t>=x.s;
     return <span key={i} style={{...stroke,display:'inline-block',color:on||hot(x.w)&&said?C.lime:said?C.white:'rgba(255,255,255,.55)',
      transform:`scale(${on?1.12:1})`}}>{x.w}</span>;})}
   </div>
  );
 }
 const c=chunks(text,frames).find(x=>f>=x.from&&f<x.from+x.dur);if(!c)return null;
 const s=spring({frame:f-c.from,fps:FPS,config:{damping:14,mass:.5}});
 return (
  <div style={{...box,transform:`translateY(${(1-s)*18}px)`,opacity:s}}>
   {c.text.split(/\s+/).map((w,i)=><span key={i} style={{...stroke,color:hot(w)?C.lime:C.white}}>{w}</span>)}
  </div>
 );
};

/* ---------- Bloques ---------- */
const Presenter=({clip,text,words})=>{
 const frames=Math.round(clip.seconds*FPS);
 return (
  <AbsoluteFill style={{background:C.black}}>
   {clip.video?<OffthreadVideo src={staticFile(clip.video)} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:
    <AbsoluteFill style={{alignItems:'center',justifyContent:'center'}}>
     <Img src={staticFile('brand/mr-pickrix-approved.png')} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
     <div style={{position:'absolute',top:120,fontFamily:FONT,fontWeight:900,fontSize:34,color:C.black,background:C.lime,padding:'8px 20px',borderRadius:30}}>VIDEO DE SALUDO PENDIENTE</div>
    </AbsoluteFill>}
   {clip.audio&&<Audio src={staticFile(clip.audio)}/>}
   <Subtitles text={text} words={words} frames={frames} highlights={['PICKRIX','pickrixapp']} top={1430}/>
  </AbsoluteFill>
 );
};

const LogoTransition=()=>{
 const f=useCurrentFrame();
 const s=spring({frame:f,fps:FPS,config:{damping:11}});
 const sweep=interpolate(f,[0,T.transition],[-1200,1200]);
 return (
  <AbsoluteFill style={{background:C.black,alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
   {[0,1,2].map(i=><div key={i} style={{position:'absolute',left:sweep+i*140-200,top:-200,width:40,height:2400,background:C.lime,opacity:.55-i*.15,transform:'rotate(18deg)',filter:'blur(6px)'}}/>)}
   <div style={{transform:`scale(${0.6+0.4*s})`,opacity:s}}><Logo size={150} glow/></div>
  </AbsoluteFill>
 );
};

const when=(iso,zone='America/Mexico_City')=>new Intl.DateTimeFormat('es-MX',{timeZone:zone,hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(iso));
const longDate=d=>new Intl.DateTimeFormat('es-MX',{timeZone:'UTC',weekday:'long',day:'numeric',month:'long'}).format(new Date(d+'T12:00:00Z')).toUpperCase();

const Lineup=({matches,date})=>{
 const f=useCurrentFrame();
 return (
  <AbsoluteFill style={{background:`radial-gradient(1200px 1000px at 50% 10%,#16300f,${C.black} 70%)`}}>
   <Particles count={22}/>
   <div style={{position:'absolute',top:110,left:0,right:0,display:'flex',flexDirection:'column',alignItems:'center',gap:18}}>
    <Logo size={64}/>
    <div style={{fontFamily:FONT,fontWeight:900,fontSize:76,color:C.white,textAlign:'center',lineHeight:1.02}}>LOS 5 <span style={{color:C.lime}}>PARTIDAZOS</span><br/>DEL DÍA</div>
    <div style={{fontFamily:FONT,fontWeight:800,fontSize:32,color:C.muted,letterSpacing:2}}>{longDate(date)}</div>
   </div>
   <div style={{position:'absolute',top:520,left:56,right:56,display:'grid',gap:22}}>
    {matches.map((m,i)=>{const s=spring({frame:f-6-i*5,fps:FPS,config:{damping:14}});return (
     <div key={i} style={{opacity:s,transform:`translateX(${(1-s)*(i%2?120:-120)}px)`,display:'flex',alignItems:'center',gap:18,background:'rgba(13,22,16,.9)',
      border:`2px solid ${theme(m).accent}66`,borderLeft:`8px solid ${C.lime}`,borderRadius:24,padding:'18px 22px'}}>
      <Crest name={m.home} file={m.homeCrest} size={78}/>
      <div style={{flex:1,minWidth:0,textAlign:'center'}}>
       <div style={{fontFamily:FONT,fontWeight:900,fontSize:34,color:C.white,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{m.home} <span style={{color:C.muted}}>vs</span> {m.away}</div>
       <div style={{fontFamily:FONT,fontWeight:700,fontSize:24,color:C.muted,marginTop:4}}>{theme(m).name} · <span style={{color:C.lime}}>{when(m.date)} h</span></div>
      </div>
      <Crest name={m.away} file={m.awayCrest} size={78}/>
     </div>);})}
   </div>
   <div style={{position:'absolute',bottom:60,left:0,right:0,textAlign:'center',fontFamily:FONT,fontWeight:700,fontSize:24,color:C.muted}}>Horario del centro de México · Estimaciones estadísticas, no garantías · 18+</div>
  </AbsoluteFill>
 );
};

const FormChips=({rec})=>(
 <div style={{display:'flex',gap:8}}>{(rec||[]).slice(0,5).map((r,i)=>(
  <div key={i} style={{width:44,height:44,borderRadius:10,display:'grid',placeItems:'center',fontFamily:FONT,fontWeight:900,fontSize:24,
   background:r.outcome==='G'?C.lime:r.outcome==='E'?'#d9dfd6':'#5b6258',color:r.outcome==='P'?C.white:C.black}}>{r.outcome}</div>))}</div>
);

const Analysis=({m,seg,index,total})=>{
 const f=useCurrentFrame(),th=theme(m);
 const frames=Math.round(seg.seconds*FPS)+T.pad;
 const cur=(seg.words?.length?activeGroup(wordGroups(seg.words),f/FPS)?.text:chunks(seg.text,frames).find(x=>f>=x.from&&f<x.from+x.dur)?.text)?.toLowerCase()||'';
 const short=t=>String(t).replace(/^(FC|CF|AC|AS|SS|SC|CD|Club)\s+/i,'').replace(/^Borussia /,'').toLowerCase().split(' ')[0];
 const glowH=cur.includes(short(m.home))?1:0,glowA=cur.includes(short(m.away))?1:0,glowP=/%/.test(cur)?1:0;
 const p=m.oneXtwo,rows=[[m.home,p.home],['Empate',p.draw],[m.away,p.away]];
 const enter=k=>spring({frame:f-k,fps:FPS,config:{damping:14}});
 const mk=m.markets||{},trend=Number.isFinite(mk.over25)&&mk.over25>=58?['OVER 2.5',mk.over25]:Number.isFinite(mk.under25)&&mk.under25>=58?['UNDER 2.5',mk.under25]:
  Number.isFinite(mk.btts_yes)&&mk.btts_yes>=58?['AMBOS ANOTAN',mk.btts_yes]:null;
 const xg=m.expectedGoals&&Number.isFinite(m.expectedGoals.home)?Math.round((m.expectedGoals.home+m.expectedGoals.away)*10)/10:null;
 return (
  <AbsoluteFill>
   <ThemeBg th={th}/>
   <div style={{position:'absolute',top:70,left:56,right:56,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
    <Logo size={46}/>
    <div style={{fontFamily:FONT,fontWeight:900,fontSize:26,color:C.black,background:C.lime,borderRadius:30,padding:'8px 20px'}}>PARTIDO {index+1}/{total}</div>
   </div>
   <div style={{position:'absolute',top:160,left:0,right:0,textAlign:'center',fontFamily:FONT,fontWeight:900,fontSize:34,letterSpacing:3,color:th.accent}}>{th.name}</div>
   {/* Escudos enfrentados */}
   <div style={{position:'absolute',top:250,left:40,right:40,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
    {[[m.home,m.homeCrest,glowH,-1],[m.away,m.awayCrest,glowA,1]].map(([n,file,g,dir],i)=>{const s=enter(4+i*4);return (
     <div key={i} style={{width:420,display:'flex',flexDirection:'column',alignItems:'center',gap:20,opacity:s,transform:`translateX(${(1-s)*dir*260}px)`,order:i?2:0}}>
      <Crest name={n} file={file} size={230} glow={g}/>
      <div style={{fontFamily:FONT,fontWeight:900,fontSize:42,color:g?C.lime:C.white,textAlign:'center',lineHeight:1.05}}>{n}</div>
     </div>);})}
    <div style={{order:1,fontFamily:FONT,fontWeight:900,fontSize:70,color:C.lime,textShadow:`0 0 30px ${C.lime}`}}>VS</div>
   </div>
   <div style={{position:'absolute',top:640,left:0,right:0,textAlign:'center',fontFamily:FONT,fontWeight:800,fontSize:32,color:C.white}}>
    {new Intl.DateTimeFormat('es-MX',{timeZone:'America/Mexico_City',weekday:'short',day:'numeric',month:'short'}).format(new Date(m.date)).toUpperCase()} · <span style={{color:C.lime}}>{when(m.date)} h</span>
   </div>
   {/* Probabilidades */}
   <div style={{position:'absolute',top:730,left:56,right:56,background:'rgba(5,9,7,.82)',border:`2px solid ${glowP?C.lime:'rgba(184,255,44,.3)'}`,borderRadius:28,padding:'24px 30px',
    boxShadow:glowP?`0 0 40px rgba(184,255,44,.35)`:'none'}}>
    <div style={{fontFamily:FONT,fontWeight:800,fontSize:24,color:C.muted,letterSpacing:1.5,marginBottom:10}}>PROBABILIDAD ESTIMADA · PICKRIX</div>
    {rows.map(([label,v],i)=>{const w=interpolate(f,[14+i*5,44+i*5],[0,v],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});const top=v===Math.max(p.home,p.draw,p.away);return (
     <div key={i} style={{display:'flex',alignItems:'center',gap:16,marginTop:12}}>
      <div style={{width:250,fontFamily:FONT,fontWeight:800,fontSize:27,color:top?C.lime:C.white,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{label}</div>
      <div style={{flex:1,height:26,borderRadius:13,background:'rgba(255,255,255,.08)',overflow:'hidden'}}><div style={{width:`${w}%`,height:'100%',background:top?C.lime:'#6d7869',borderRadius:13}}/></div>
      <div style={{width:96,textAlign:'right',fontFamily:FONT,fontWeight:900,fontSize:36,color:C.white}}>{Math.round(w)}%</div>
     </div>);})}
   </div>
   {/* Datos clave */}
   <div style={{position:'absolute',top:1110,left:56,right:56,display:'grid',gridTemplateColumns:'1fr 1fr',gap:18}}>
    <div style={{opacity:enter(30),background:'rgba(5,9,7,.82)',border:'2px solid rgba(184,255,44,.3)',borderRadius:24,padding:'18px 22px',gridColumn:'1 / span 2'}}>
     <div style={{fontFamily:FONT,fontWeight:800,fontSize:22,color:C.muted,letterSpacing:1.5}}>FORMA · ÚLTIMOS 5</div>
     {[[m.home,m.homeRecent],[m.away,m.awayRecent]].map(([n,r],i)=>(
      <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:12}}>
       <span style={{fontFamily:FONT,fontWeight:800,fontSize:28,color:C.white,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:430}}>{n}</span><FormChips rec={r}/>
      </div>))}
    </div>
    {xg!=null&&<div style={{opacity:enter(40),background:'rgba(5,9,7,.82)',border:'2px solid rgba(184,255,44,.3)',borderRadius:24,padding:'18px 22px'}}>
     <div style={{fontFamily:FONT,fontWeight:800,fontSize:22,color:C.muted,letterSpacing:1.5}}>GOLES ESPERADOS</div>
     <div style={{fontFamily:FONT,fontWeight:900,fontSize:64,color:C.white}}>{xg}</div></div>}
    {trend&&<div style={{opacity:enter(48),background:'rgba(5,9,7,.82)',border:`2px solid ${C.lime}`,borderRadius:24,padding:'18px 22px'}}>
     <div style={{fontFamily:FONT,fontWeight:800,fontSize:22,color:C.muted,letterSpacing:1.5}}>TENDENCIA</div>
     <div style={{fontFamily:FONT,fontWeight:900,fontSize:38,color:C.lime}}>{trend[0]}</div>
     <div style={{fontFamily:FONT,fontWeight:900,fontSize:40,color:C.white}}>{Math.round(trend[1])}%</div></div>}
   </div>
   {seg.audio&&<Audio src={staticFile(seg.audio)}/>}
   <Subtitles text={seg.text} words={seg.words} frames={frames} highlights={seg.highlights} top={1585}/>
   <div style={{position:'absolute',bottom:34,left:0,right:0,textAlign:'center',fontFamily:FONT,fontWeight:700,fontSize:22,color:C.muted}}>Estimaciones estadísticas de PICKRIX · no son garantías · 18+</div>
  </AbsoluteFill>
 );
};

const Wipe=()=>{
 const f=useCurrentFrame();
 const x=interpolate(f,[0,T.wipe],[-1300,1300]);
 return <AbsoluteFill style={{pointerEvents:'none'}}><div style={{position:'absolute',top:-300,bottom:-300,left:x,width:420,background:`linear-gradient(90deg,transparent,${C.lime},transparent)`,transform:'skewX(-18deg)',opacity:.9}}/></AbsoluteFill>;
};

const EndScreen=()=>{
 const f=useCurrentFrame(),s=spring({frame:f,fps:FPS,config:{damping:12}});
 return (
  <AbsoluteFill style={{background:C.black,alignItems:'center',justifyContent:'center',gap:26}}>
   <Particles count={26}/>
   <div style={{transform:`scale(${0.7+0.3*s})`,opacity:s,textAlign:'center'}}>
    <Logo size={130} glow/>
    <div style={{fontFamily:FONT,fontWeight:800,fontSize:38,letterSpacing:6,color:C.muted,marginTop:20}}>INTELIGENCIA DEPORTIVA</div>
    <div style={{fontFamily:FONT,fontWeight:900,fontSize:66,color:C.lime,marginTop:50,lineHeight:1.05}}>NO ADIVINES.<br/>ANALIZA.</div>
    <div style={{fontFamily:FONT,fontWeight:900,fontSize:44,color:C.white,marginTop:50,letterSpacing:2}}>PICKRIXAPP.COM</div>
   </div>
  </AbsoluteFill>
 );
};

/** Línea de tiempo (cuadros) a partir de las duraciones reales. */
export function dailyTimeline(p){
 const sal=Math.round(p.saludo.seconds*FPS),des=Math.round(p.despedida.seconds*FPS);
 let t=0;const at={};
 at.saludo=[t,sal];t+=sal;
 at.transition=[t,T.transition];t+=T.transition;
 at.lineup=[t,T.lineup];t+=T.lineup;
 at.segments=p.segments.map(s=>{const d=Math.round(s.seconds*FPS)+T.pad;const r=[t,d];t+=d;return r;});
 at.despedida=[t,des];t+=des;
 at.end=[t,T.end];t+=T.end;
 return {at,total:t};
}

export const PickrixDaily=(p)=>{
 const {at}=dailyTimeline(p);
 return (
  <AbsoluteFill style={{background:C.black,fontFamily:FONT}}>
   <Sequence from={at.saludo[0]} durationInFrames={at.saludo[1]} name="saludo"><Presenter clip={p.saludo} text={p.saludoText} words={p.saludoWords}/></Sequence>
   <Sequence from={at.transition[0]} durationInFrames={at.transition[1]} name="transicion">
    <LogoTransition/>{p.sfx&&<Audio src={staticFile(p.sfx)} volume={0.6}/>}
   </Sequence>
   <Sequence from={at.lineup[0]} durationInFrames={at.lineup[1]} name="partidos"><Lineup matches={p.matches} date={p.date}/></Sequence>
   {p.segments.map((s,i)=>(
    <Sequence key={s.id} from={at.segments[i][0]} durationInFrames={at.segments[i][1]} name={s.id}>
     <Analysis m={p.matches[s.matchIndex]} seg={s} index={i} total={p.segments.length}/>
     <Sequence durationInFrames={T.wipe}><Wipe/>{p.sfx&&<Audio src={staticFile(p.sfx)} volume={0.4}/>}</Sequence>
    </Sequence>
   ))}
   <Sequence from={at.despedida[0]} durationInFrames={at.despedida[1]} name="despedida"><Presenter clip={p.despedida} text={p.despedidaText} words={p.despedidaWords}/></Sequence>
   <Sequence from={at.end[0]} durationInFrames={at.end[1]} name="final"><EndScreen/>{p.sfx&&<Audio src={staticFile(p.sfx)} volume={0.5}/>}</Sequence>
   {p.music&&<Audio src={staticFile(p.music)} volume={0.12} loop/>}
   {p.sample&&<AbsoluteFill style={{alignItems:'center',justifyContent:'flex-end',paddingBottom:80,pointerEvents:'none'}}>
    <div style={{fontFamily:FONT,fontWeight:900,fontSize:22,color:C.black,background:'#ffcf5a',padding:'6px 14px',borderRadius:20,marginTop:16}}>MUESTRA INTERNA</div></AbsoluteFill>}
  </AbsoluteFill>
 );
};
