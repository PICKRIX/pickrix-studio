/**
 * MR. PICKRIX — plantilla v2 (9:16, 1080×1920, 30 fps).
 *
 * Arriba: MR. PICKRIX grande y FIJO todo el video (SLOT), para que en CapCut se pueda
 * superponer un solo clip suyo hablando (Lip Sync) en exactamente ese rectángulo.
 * En medio: subtítulos karaoke (palabra activa en lima). Abajo: el contenido de cada
 * escena — agenda (intro), tarjeta del pick, invitación (teaser) y tablero final.
 * Fondo de estadio animado (luces, partículas, cancha). Estética PICKRIX.
 */
import {useState} from 'react';
import {AbsoluteFill,Sequence,Img,OffthreadVideo,Audio,staticFile,useCurrentFrame,useVideoConfig,interpolate,spring} from 'remotion';

export const SLOT={x:170,y:165,width:740,height:780};
const C={bg:'#050806',panel:'rgba(13,22,16,.92)',line:'rgba(184,255,44,.28)',lime:'#b8ff2c',text:'#f2f7ee',muted:'#9fb09a'};
const FONT='"Montserrat","Inter","Segoe UI","Helvetica Neue",Arial,sans-serif';
const AVATAR=staticFile('brand/mr-pickrix-approved.png');
const DAY_LABEL=['HOY','MAÑANA','PASADO MAÑANA'];

const Logo=({size=56})=>(
 <div style={{fontFamily:FONT,fontWeight:900,fontSize:size,letterSpacing:2,color:C.text,lineHeight:1}}>PICK<span style={{color:C.lime}}>RIX</span></div>
);

/* ---------- Fondo de estadio animado ---------- */
const PARTICLES=Array.from({length:34},(_,i)=>({x:(i*397)%1080,y:(i*631)%1920,s:3+(i%4)*2,v:.6+(i%5)*.25,o:.25+(i%3)*.18}));
const Background=()=>{
 const f=useCurrentFrame();
 const sweep=Math.sin(f/70)*18;
 return (
  <AbsoluteFill style={{background:`radial-gradient(1200px 900px at 50% 0%,#14240f 0%,${C.bg} 62%)`,overflow:'hidden'}}>
   {/* Reflectores */}
   {[[-120,-14+sweep],[1200,14-sweep]].map(([x,r],i)=>(
    <div key={i} style={{position:'absolute',left:x,top:-200,width:340,height:2300,transformOrigin:'50% 0',transform:`rotate(${r}deg)`,
     background:'linear-gradient(180deg,rgba(214,255,140,.22),rgba(184,255,44,.05) 55%,transparent)',filter:'blur(18px)'}}/>
   ))}
   {/* Cancha en perspectiva */}
   <div style={{position:'absolute',left:-300,right:-300,bottom:-120,height:900,transform:'perspective(900px) rotateX(62deg)',transformOrigin:'50% 100%',
    backgroundImage:`linear-gradient(rgba(184,255,44,.16) 3px,transparent 3px),linear-gradient(90deg,rgba(184,255,44,.12) 3px,transparent 3px)`,
    backgroundSize:'160px 160px',backgroundPosition:`0 ${(f*2)%160}px`,maskImage:'linear-gradient(to top,#000 30%,transparent)'}}/>
   {/* Partículas */}
   {PARTICLES.map((p,i)=>{const y=(p.y-f*p.v*2+1920*4)%1920;return (
    <div key={i} style={{position:'absolute',left:p.x+Math.sin((f+i*13)/30)*14,top:y,width:p.s,height:p.s,borderRadius:'50%',background:C.lime,opacity:p.o,boxShadow:`0 0 12px ${C.lime}`}}/>);})}
  </AbsoluteFill>
 );
};

const TopBar=({badge})=>(
 <div style={{position:'absolute',top:56,left:60,right:60,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
  <Logo/>
  <div style={{fontFamily:FONT,color:C.bg,background:C.lime,fontSize:28,fontWeight:900,borderRadius:40,padding:'10px 26px',letterSpacing:.5}}>{badge}</div>
 </div>
);

const Footer=()=>(
 <div style={{position:'absolute',bottom:34,left:0,right:0,textAlign:'center',fontFamily:FONT,color:C.muted,fontSize:24,fontWeight:600}}>
  18+ · Estimaciones, no garantías · Juega con responsabilidad · pickrixapp.com
 </div>
);

const Stamp=({text,color='rgba(255,70,70,.32)'})=>(
 <AbsoluteFill style={{alignItems:'center',justifyContent:'center',pointerEvents:'none'}}>
  <div style={{transform:'rotate(-24deg)',fontFamily:FONT,fontWeight:900,fontSize:84,color,border:`8px solid ${color}`,padding:'10px 40px',borderRadius:20,whiteSpace:'nowrap'}}>{text}</div>
 </AbsoluteFill>
);

/* ---------- MR. PICKRIX (zona fija para CapCut) ---------- */
const Stage=({video,talking,beats=[],cuts=[]})=>{
 const f=useCurrentFrame();
 // «Habla»: en cada frase (bloque del karaoke) un asentimiento rápido que se desvanece.
 const lastBeat=beats.filter(b=>b<=f).pop();const db=lastBeat==null?99:f-lastBeat;
 const nod=Math.exp(-db/6)*Math.sin(db/2.2);
 // Corte de cámara en cada escena: acercamiento que se asienta, con encuadre alterno.
 const ci=cuts.filter(c=>c<=f).length-1,dc=f-(cuts[ci]??0);
 const punch=1+0.10*Math.exp(-dc/9);
 const focus=['50% 18%','42% 22%','58% 20%','50% 26%'][((ci%4)+4)%4];
 const zoom=1.06+0.06*Math.min(1,dc/240);
 const sway=Math.sin(f/26)*3+nod*4,bob=Math.sin(f/9)*10-Math.abs(nod)*18;
 const pulse=0.5+0.5*Math.abs(nod)+0.15*Math.sin(f/15);
 return (
  <div style={{position:'absolute',left:SLOT.x,top:SLOT.y,width:SLOT.width,height:SLOT.height,borderRadius:44,overflow:'hidden',
   border:`5px solid ${C.lime}`,boxShadow:`0 0 ${40+70*pulse}px rgba(184,255,44,${.3+.45*pulse})`,background:'#0b140d',
   transform:`scale(${1+0.015*Math.abs(nod)})`}}>
   {video?<OffthreadVideo src={staticFile(video)} muted style={{width:'100%',height:'100%',objectFit:'cover'}}/>:
    <Img src={AVATAR} style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:focus,transformOrigin:focus,
     transform:`translateY(${bob}px) rotate(${sway}deg) scale(${zoom*punch})`}}/>}
   <div style={{position:'absolute',left:0,right:0,bottom:0,height:150,background:'linear-gradient(transparent,rgba(5,8,6,.9))'}}/>
   {/* Ondas de voz: indican que MR. PICKRIX está hablando */}
   <div style={{position:'absolute',right:26,bottom:28,display:'flex',gap:6,alignItems:'flex-end',height:44}}>
    {[0,1,2,3,4].map(i=><div key={i} style={{width:8,borderRadius:4,background:C.lime,height:10+30*Math.abs(Math.sin(f/3+i*1.3))*(talking||beats.length?1:.3)}}/>)}
   </div>
   <div style={{position:'absolute',left:28,bottom:22,fontFamily:FONT,fontWeight:900,fontSize:44,color:C.text}}>MR. <span style={{color:C.lime}}>PICKRIX</span></div>
  </div>
 );
};

/* ---------- Karaoke ---------- */
const Karaoke=({captions})=>{
 const f=useCurrentFrame();
 const c=captions.find(x=>f>=x.from&&f<x.from+x.durationInFrames);
 if(!c)return null;
 const words=c.text.split(/\s+/);
 const active=Math.min(words.length-1,Math.floor((f-c.from)/c.durationInFrames*words.length));
 const pop=spring({frame:f-c.from,fps:30,config:{damping:12,mass:.5}});
 return (
  <div style={{position:'absolute',left:40,right:40,top:975,display:'flex',justifyContent:'center',flexWrap:'wrap',gap:'0 18px',
   transform:`scale(${.92+.08*pop})`,fontFamily:FONT,fontWeight:900,fontSize:62,lineHeight:1.12,textTransform:'uppercase',textAlign:'center'}}>
   {words.map((w,i)=>(
    <span key={i} style={{color:i===active?C.lime:C.text,WebkitTextStroke:'2px #000',textShadow:'0 6px 0 rgba(0,0,0,.65),0 0 24px rgba(0,0,0,.8)'}}>{w}</span>
   ))}
  </div>
 );
};

/* ---------- Piezas ---------- */
const Enter=({children,delay=0,from=90})=>{
 const f=useCurrentFrame(),{fps}=useVideoConfig();
 const s=spring({frame:f-delay,fps,config:{damping:14}});
 return <div style={{opacity:s,transform:`translateY(${(1-s)*from}px)`}}>{children}</div>;
};

const Crest=({name,logo,size=96})=>{
 const [failed,setFailed]=useState(false);
 const initials=String(name||'?').split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase();
 return (
  <div style={{width:size,height:size,borderRadius:'50%',background:'#f2f7ee',display:'flex',alignItems:'center',justifyContent:'center',
   boxShadow:`0 0 0 4px ${C.lime},0 10px 30px rgba(0,0,0,.5)`,overflow:'hidden',flex:`0 0 ${size}px`}}>
   {logo&&!failed?<Img src={logo} onError={()=>setFailed(true)} style={{width:'78%',height:'78%',objectFit:'contain'}}/>:
    <span style={{fontFamily:FONT,fontWeight:900,fontSize:size*.36,color:C.bg}}>{initials}</span>}
  </div>
 );
};

const when=(p,day)=>{const hour=String(p.kickoffLocal||'').replace(/^[^\d]*/,'');return (DAY_LABEL[day]||'')+(hour?' · '+hour:'');};

const Content=({children})=><div style={{position:'absolute',left:50,right:50,top:1150}}>{children}</div>;

const Agenda=({picks,title,day})=>(
 <Content>
  <Enter><div style={{background:C.panel,border:`3px solid ${C.line}`,borderRadius:34,padding:'26px 34px'}}>
   <div style={{fontFamily:FONT,fontWeight:900,fontSize:34,color:C.lime,letterSpacing:1}}>{title}</div>
   {picks.slice(0,5).map((p,i)=>(
    <Enter key={i} delay={8+i*5} from={30}><div style={{display:'flex',alignItems:'center',gap:18,marginTop:16}}>
     <span style={{fontFamily:FONT,fontWeight:800,fontSize:26,color:C.muted,width:150}}>{when(p,day).replace(/^.*· /,'')}</span>
     <Crest name={p.home} logo={p.homeLogo} size={52}/>
     <span style={{fontFamily:FONT,fontWeight:800,fontSize:32,color:C.text,flex:1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{p.home} <span style={{color:C.muted}}>vs</span> {p.away}</span>
     <Crest name={p.away} logo={p.awayLogo} size={52}/>
    </div></Enter>
   ))}
  </div></Enter>
 </Content>
);

const PickCard=({pick,index,total,day})=>{
 const f=useCurrentFrame();
 const w=interpolate(f,[12,42],[0,pick.probability],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
 return (
  <Content>
   <Enter><div style={{background:C.panel,border:`3px solid ${C.lime}`,borderRadius:38,padding:'30px 38px',boxShadow:'0 30px 80px rgba(0,0,0,.55)'}}>
    <div style={{display:'flex',justifyContent:'space-between',fontFamily:FONT,fontSize:28,fontWeight:900}}>
     <span style={{color:C.lime}}>PICK {index+1}/{total}</span><span style={{color:C.text}}>{when(pick,day)}</span>
    </div>
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:16,marginTop:22}}>
     <Crest name={pick.home} logo={pick.homeLogo}/>
     <div style={{flex:1,textAlign:'center',fontFamily:FONT,fontWeight:900,fontSize:40,color:C.text,lineHeight:1.12}}>
      {pick.home}<div style={{color:C.muted,fontSize:26,margin:'4px 0'}}>vs</div>{pick.away}
     </div>
     <Crest name={pick.away} logo={pick.awayLogo}/>
    </div>
    <div style={{fontFamily:FONT,fontSize:24,fontWeight:700,color:C.muted,marginTop:22,textTransform:'uppercase',letterSpacing:1}}>{pick.league} · {pick.market}</div>
    <div style={{fontFamily:FONT,fontSize:48,fontWeight:900,color:C.lime,lineHeight:1.1,marginTop:4}}>{pick.label}</div>
    <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',marginTop:16}}>
     <div style={{flex:1,marginRight:28}}>
      <div style={{fontFamily:FONT,fontSize:24,fontWeight:700,color:C.muted}}>Probabilidad estimada</div>
      <div style={{height:22,borderRadius:11,background:'rgba(255,255,255,.08)',marginTop:10,overflow:'hidden'}}><div style={{width:`${w}%`,height:'100%',background:C.lime}}/></div>
     </div>
     <div style={{fontFamily:FONT,fontSize:76,fontWeight:900,color:C.text,lineHeight:1}}>{Math.round(w)}<span style={{fontSize:40}}>%</span></div>
    </div>
    <div style={{fontFamily:FONT,fontSize:30,fontWeight:900,color:C.text,marginTop:14}}>Momio {pick.oddsAmerican||'—'} <span style={{color:C.muted,fontWeight:600,fontSize:22}}>· momio típico entre casas</span></div>
   </div></Enter>
  </Content>
 );
};

const Teaser=()=>(
 <Content>
  {[['🔒 PRO & ELITE','Más HOT PICKS analizados y comparativas'],['🔒 PARLAYS PICKRIX','Parlays listos para la jornada · de SMART a LEGENDARY']].map(([t,s],i)=>(
   <Enter key={t} delay={i*8}><div style={{marginBottom:22,background:C.panel,border:`3px solid ${C.lime}`,borderRadius:32,padding:'26px 34px'}}>
    <div style={{fontFamily:FONT,fontWeight:900,fontSize:46,color:C.lime}}>{t}</div>
    <div style={{fontFamily:FONT,fontWeight:700,fontSize:30,color:C.text,marginTop:6}}>{s}</div>
   </div></Enter>
  ))}
  <Enter delay={18}><div style={{textAlign:'center',fontFamily:FONT,fontWeight:900,fontSize:56,color:C.lime}}>pickrixapp.com</div></Enter>
 </Content>
);

const Board=({picks})=>(
 <Content>
  <Enter><div style={{background:C.panel,border:`3px solid ${C.lime}`,borderRadius:34,padding:'22px 30px'}}>
   <div style={{fontFamily:FONT,fontWeight:900,fontSize:30,color:C.lime,marginBottom:6}}>RESUMEN DE PICKS</div>
   {picks.slice(0,5).map((p,i)=>(
    <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:16,padding:'10px 0',borderTop:i?'1px solid rgba(255,255,255,.08)':'none',fontFamily:FONT}}>
     <div style={{minWidth:0}}><div style={{fontWeight:800,fontSize:26,color:C.text,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{p.home} vs {p.away}</div>
      <div style={{fontWeight:800,fontSize:24,color:C.lime,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{p.label}</div></div>
     <div style={{textAlign:'right',flex:'0 0 auto'}}><div style={{fontWeight:900,fontSize:34,color:C.text}}>{p.probability}%</div><div style={{fontWeight:700,fontSize:22,color:C.muted}}>{p.oddsAmerican||''}</div></div>
    </div>
   ))}
  </div></Enter>
  <Enter delay={10}><div style={{display:'flex',justifyContent:'center',alignItems:'center',gap:20,marginTop:20}}>
   <span style={{fontFamily:FONT,fontWeight:900,fontSize:52,color:C.lime}}>pickrixapp.com</span>
   <span style={{fontFamily:FONT,fontWeight:900,fontSize:34,color:C.bg,background:C.lime,borderRadius:40,padding:'4px 20px'}}>18+</span>
  </div></Enter>
 </Content>
);

export const MrPickrixDaily=(props)=>{
 const {scenes=[],picks=[],demo=false,sample=false,date='',edition={}}=props;
 const pickTotal=scenes.filter(s=>s.kind==='pick').length;
 const day=edition?.day??0;
 const badge=edition?.leagueName?`⚽ ${String(edition.leagueName).replace(/ League$/,'').toUpperCase()} · ${DAY_LABEL[day]||''}`:
  `🔥 HOT PICKS ${date&&date!=='DEMO'?date.split('-').reverse().slice(0,2).join('/'):''}`;
 const agendaTitle=edition?.leagueName?`${String(edition.leagueName).toUpperCase()} · ${DAY_LABEL[day]||''}`:'PARTIDOS DEL DÍA';
 const talking=scenes.some(s=>s.audio);
 const clip=scenes.find(s=>s.avatarVideo)?.avatarVideo||null;
 return (
  <AbsoluteFill style={{fontFamily:FONT}}>
   <Background/>
   <Stage video={clip} talking={talking}
    beats={scenes.flatMap(sc=>(sc.captions||[]).map(c=>sc.from+c.from))}
    cuts={scenes.map(sc=>sc.from)}/>
   {scenes.map(scene=>(
    <Sequence key={scene.id} from={scene.from} durationInFrames={scene.durationInFrames} name={scene.id}>
     {scene.kind==='intro'&&<Agenda picks={picks} title={agendaTitle} day={day}/>}
     {scene.kind==='pick'&&picks[scene.pickIndex]&&<PickCard pick={picks[scene.pickIndex]} index={scene.pickIndex} total={pickTotal} day={day}/>}
     {scene.kind==='teaser'&&<Teaser/>}
     {scene.kind==='outro'&&<Board picks={picks}/>}
     {scene.audio&&<Audio src={staticFile(scene.audio)}/>}
     <Karaoke captions={scene.captions||[]}/>
    </Sequence>
   ))}
   <TopBar badge={badge}/>
   <Footer/>
   {demo&&<Stamp text="DEMO · DATOS FICTICIOS"/>}
   {sample&&!demo&&<Stamp text="MUESTRA DE DISEÑO" color="rgba(184,255,44,.22)"/>}
  </AbsoluteFill>
 );
};
