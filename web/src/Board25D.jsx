import React, {memo, useEffect, useRef, useState} from 'react';

// The board uses shared polygon boundaries, not individually positioned rotated cards.
// Every cell touches its neighbors with no geometric gaps, including all four corners.
const BOARD_LENGTH=41;
const SIDE_COUNTS=[11,10,10,10];
const OUTER=[[800,876],[52,450],[800,24],[1548,450],[800,876]];
const INNER=[[800,717],[275,450],[800,183],[1325,450],[800,717]];
const GROUP_COLORS=['#f0ad45','#f47795','#65b9f7','#50dfba','#a58af6','#ebbd63','#d584e5','#6fcfdb','#8dca60'];
const PLAYER_COLORS={tatsung:'#ffe177',mint:'#75efc3',berry:'#ff8cac',sky:'#8dbafc'};
const KIND_ICONS={start:'🏁',jail:'🔒',chance:'?',tourist:'★',minigame:'🎲',olympics:'🏆',airport:'✈',tax:'🏦'};
// Buildings are lightweight isometric SVG solids. Both plot ownership and roofs
// use the SAME player color; group colors stay as the thin outer edge only.
const tone=(hex,ratio)=>{
  const n=parseInt(hex.slice(1),16);
  return '#'+[16,8,0].map(shift=>Math.min(255,Math.round(((n>>shift)&255)*ratio)).toString(16).padStart(2,'0')).join('');
};
function Building25D({x,y,level,color,variant=0}){
  const height=[0,18,28,39,51][level]||18;
  const width=level>=3?31:level===2?28:25;
  const half=width/2,top=12-height;
  const bright=tone(color,1.15),shadow=tone(color,.56),side=tone(color,.78);
  return <g className={'classic-building classic-building--level-'+level}
     transform={`translate(${x} ${y})`} pointerEvents="none">
    <ellipse cx="0" cy="17" rx={half+8} ry="8" fill="#131827" opacity=".42"/>
    <polygon points={`${-half},${top} 0,${top-9} ${half},${top} 0,${top+9}`} fill={bright} stroke="#fff4d0" strokeWidth="1.4" strokeLinejoin="round"/>
    <polygon points={`${-half},${top} 0,${top+9} 0,21 ${-half},12`} fill={shadow} stroke="#354052" strokeWidth="1.1"/>
    <polygon points={`0,${top+9} ${half},${top} ${half},12 0,21`} fill={color} stroke="#354052" strokeWidth="1.1"/>
    <path d={`M${-half+4} ${top+14}v7 M${-half+10} ${top+17}v7 M${half-5} ${top+9}v8 M${half-11} ${top+13}v8`} stroke="#e8f7ff" strokeWidth={level>=2?3:2} opacity=".95" />
    {level>=2&&<path d={`M${-half+4} ${top+27}v6 M${half-5} ${top+25}v7`} stroke="#c4edff" strokeWidth="3.3"/>}
    {level>=3&&<path d={`M${-half+4} ${top+39}v6 M${half-5} ${top+36}v7`} stroke="#f4fbff" strokeWidth="3"/>}
    {level===1&&<path d={`M-6 ${top-4}L0 ${top-14}L6 ${top-4}`} fill={side} stroke="#fff3bb" strokeWidth="1.5"/>}
    {level===2&&<path d={`M${-half+4} ${top-4}v-9h6v6`} fill={side} stroke="#fff3c7" strokeWidth="1.5"/>}
    {level===3&&<path d={`M0 ${top-9}v-13`} stroke="#f2e6cf" strokeWidth="3"/>}
    {level===4&&<>
      <path d={`M${-half-4} ${top+1} L0 ${top-20} L${half+4} ${top+1} Z`} fill={variant%2?'#f6cf79':'#f0e3b8'} stroke="#fff7cd" strokeWidth="2"/>
      <path d={`M0 ${top-20}v-10`} stroke="#fff1b8" strokeWidth="3"/>
      <circle cx="0" cy={top-30} r="3.5" fill="#ffe184"/>
    </>}
  </g>;
}
const linear=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
const pack=points=>points.map(p=>p.map(n=>n.toFixed(2)).join(',')).join(' ');
const geomFor=id=>{
  let ordinal=((Number(id)||0)%BOARD_LENGTH+BOARD_LENGTH)%BOARD_LENGTH;
  let side=0;
  while(ordinal>=SIDE_COUNTS[side])ordinal-=SIDE_COUNTS[side++];
  const t0=ordinal/SIDE_COUNTS[side],t1=(ordinal+1)/SIDE_COUNTS[side],tm=(t0+t1)/2;
  const o0=linear(OUTER[side],OUTER[side+1],t0),o1=linear(OUTER[side],OUTER[side+1],t1);
  const i0=linear(INNER[side],INNER[side+1],t0),i1=linear(INNER[side],INNER[side+1],t1);
  const om=linear(o0,o1,.5),im=linear(i0,i1,.5);
  const label=linear(om,im,.66),number=linear(om,im,.13),building=linear(om,im,.47),pawn=linear(om,im,.23);
  const ownerTag=linear(om,im,.91);
  const ownerBand=pack([linear(o0,i0,.81),linear(o1,i1,.81),i1,i0]);
  let angle=Math.atan2(o1[1]-o0[1],o1[0]-o0[0])*180/Math.PI;
  if(angle>90)angle-=180;
  if(angle< -90)angle+=180;
  return {
    points:pack([o0,o1,i1,i0]),
    accent:pack([o0,o1,linear(o1,i1,.19),linear(o0,i0,.19)]),
    ownerBand,ownerTag,
    label,number,building,pawn,angle,side
  };
};
const GEOMETRY=Array.from({length:BOARD_LENGTH},(_,i)=>geomFor(i));
export const positionFor=id=>{
  const g=GEOMETRY[((Number(id)||0)%BOARD_LENGTH+BOARD_LENGTH)%BOARD_LENGTH];
  return {x:g.pawn[0]*100/1600,y:g.pawn[1]*100/900,side:g.side};
};
export const buildPrice=(tile,q)=>Array.from({length:q},(_,i)=>Math.round(tile.price*(.06+(tile.level+i+1)*.04))).reduce((a,b)=>a+b,0);
const PIP_CELLS={1:[5],2:[1,9],3:[1,5,9],4:[1,3,7,9],5:[1,3,5,7,9],6:[1,3,4,6,7,9]};
const FACE_ROTATIONS={1:[0,0],2:[0,-90],3:[0,-180],4:[0,90],5:[-90,0],6:[90,0]};
function DiceCube({value=1,index=0,rolling=false}){
  const [rx,ry]=FACE_ROTATIONS[Math.max(1,Math.min(6,Number(value)||1))];
  return <div className="die-perspective" role="img" aria-label={`주사위 ${index+1} · ${value}점`}>
    <div className={`dice-cube ${rolling?'dice-cube--rolling':''}`} style={{'--dice-x':rx+'deg','--dice-y':ry+'deg','--dice-delay':(index*.08)+'s'}}>
      {[1,2,3,4,5,6].map(face=><div className={`dice-face dice-face--${face}`} key={face}>
        {Array.from({length:9},(_,i)=><i className={`dice-pip ${PIP_CELLS[face].includes(i+1)?'':'dice-pip--empty'}`} key={i}/>)}
      </div>)}
    </div>
  </div>;
}
function TileCell({tile,geom,selected,onSelect,players}){
  const owned=tile.ownerId!=null,isProperty=tile.type==='property';
  const ownerIndex=players.findIndex(p=>p.userId===tile.ownerId);
  const owner=ownerIndex>=0?players[ownerIndex]:null;
  const ownerColor=owner?(PLAYER_COLORS[owner.character]||PLAYER_COLORS.tatsung):null;
  const groupColor=isProperty?GROUP_COLORS[Math.max(0,tile.group)%GROUP_COLORS.length]:
    ({tourist:'#f9d377',chance:'#c9afe9',start:'#9cda72',jail:'#ec9da6',airport:'#96d6e8',olympics:'#f3d27f',minigame:'#a1eed7',tax:'#e8aa97'})[tile.type]||'#c8d9e2';
  const icon=!isProperty?KIND_ICONS[tile.type]||'':'';
  const full=tile.name.length>8?[tile.name.slice(0,8),tile.name.slice(8,15)+(tile.name.length>15?'…':'')]:[tile.name];
  const angle=`rotate(${geom.angle} ${geom.label[0]} ${geom.label[1]})`;
  const cx=geom.label[0],cy=geom.label[1],tag=geom.ownerTag;
  const ownerIdLabel=ownerIndex>=0?'P'+(ownerIndex+1):'소유';
  return <g className={`classic-svg-cell ${selected?'is-selected':''} ${owned?'is-owned':''}`}
      role="button" tabIndex={0} aria-label={`${tile.id}번 ${tile.name}${owned?' · '+(owner?.nickname||'소유 중')+' 소유':''}`}
      onClick={()=>onSelect(tile.id)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(tile.id);}}}>
    <title>{`${tile.id}번 · ${tile.name}${owned?' · '+(owner?.nickname||'소유 중')+' 소유':''}`}</title>
    <polygon points={geom.points} fill={ownerColor||'#f6f5ec'} fillOpacity={owned?.72:1}
      stroke={ownerColor||'#655954'} strokeWidth={owned?5:selected?4:2.3} strokeLinejoin="round"/>
    <polygon points={geom.accent} fill={groupColor}/>
    {owned&&<polygon className="classic-owner-band" points={geom.ownerBand} fill={ownerColor||'#a7a7a7'} stroke="#252432" strokeWidth="1.6"/>}
    <text className="classic-cell-number" x={geom.number[0]} y={geom.number[1]}
       textAnchor="middle" dominantBaseline="middle"
       transform={`rotate(${geom.angle} ${geom.number[0]} ${geom.number[1]})`}>{String(tile.id).padStart(2,'0')}</text>
    {isProperty&&owned&&tile.level>0&&<Building25D x={geom.building[0]} y={geom.building[1]} level={tile.level} color={ownerColor||'#b6b6b6'} variant={tile.id}/>}
    {icon&&<text className="classic-cell-icon" x={geom.building[0]} y={geom.building[1]} textAnchor="middle" dominantBaseline="middle">{icon}</text>}
    <text className="classic-cell-name" x={cx} y={cy} transform={angle} textAnchor="middle" dominantBaseline="middle">
      {full.length===1?full[0]:<><tspan x={cx} dy="-8">{full[0]}</tspan><tspan x={cx} dy="18">{full[1]}</tspan></>}
    </text>
    {owned&&<text className="classic-cell-owner-id" x={tag[0]} y={tag[1]} textAnchor="middle"
         dominantBaseline="middle" transform={`rotate(${geom.angle} ${tag[0]} ${tag[1]})`}>{ownerIdLabel}</text>}
  </g>;
}
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function Board25D({tiles=[],players=[],selected=null,onSelect=()=>{},lastRoll=null,onMotionChange=()=>{},lastTravel=null,onRoll=()=>{},onEnd=()=>{},canEnd=false,rollReady=false,remaining=0,activeName='',myTurn=false}){
  const [visual,setVisual]=useState({});
  const [motion,setMotion]=useState(false);
  const [traveling,setTraveling]=useState(false);
  const [faces,setFaces]=useState([1,1]);
  const runId=useRef(null),travelId=useRef(null),onMotion=useRef(onMotionChange);
  useEffect(()=>{onMotion.current=onMotionChange},[onMotionChange]);
  useEffect(()=>{
    if(!lastRoll?.at||lastRoll.at===runId.current)return;
    runId.current=lastRoll.at;
    if(!Number.isInteger(lastRoll.from)||Date.now()-lastRoll.at>6000){setFaces(lastRoll.dice||[1,1]);return;}
    let cancelled=false,tick;
    const steps=lastRoll.steps||lastRoll.dice?.reduce((a,b)=>a+b,0)||0;
    async function animate(){
      setVisual(v=>({...v,[lastRoll.userId]:lastRoll.from}));setMotion(true);onMotion.current(true);
      tick=setInterval(()=>setFaces([1+Math.floor(Math.random()*6),1+Math.floor(Math.random()*6)]),90);
      await wait(820);
      clearInterval(tick);
      if(cancelled)return;
      setFaces(lastRoll.dice);
      for(let n=1;n<=steps;n++){
        await wait(150);
        if(cancelled)return;
        setVisual(v=>({...v,[lastRoll.userId]:(lastRoll.from+n)%BOARD_LENGTH}));
      }
      await wait(270);
      if(!cancelled){
        setVisual(v=>{const out={...v};delete out[lastRoll.userId];return out;});
        setMotion(false);onMotion.current(false);
      }
    }
    animate();
    return ()=>{cancelled=true;clearInterval(tick);onMotion.current(false)};
  },[lastRoll?.at]);
  useEffect(()=>{
    if(!lastTravel?.at||lastTravel.at===travelId.current)return;
    travelId.current=lastTravel.at;
    if(!Number.isInteger(lastTravel.from)||Date.now()-lastTravel.at>7000)return;
    let cancelled=false;
    const steps=Math.max(0,Math.min(BOARD_LENGTH*2,Number(lastTravel.steps)||0));
    const tick=Math.max(35,Math.min(105,Math.round(3200/Math.max(steps,1))));
    async function travel(){
      setVisual(v=>({...v,[lastTravel.userId]:lastTravel.from}));
      setTraveling(true);
      onMotion.current(true);
      for(let n=1;n<=steps;n++){
        await wait(tick);
        if(cancelled)return;
        setVisual(v=>({...v,[lastTravel.userId]:(lastTravel.from+n)%BOARD_LENGTH}));
      }
      await wait(350);
      if(!cancelled){
        setVisual(v=>{const out={...v};delete out[lastTravel.userId];return out;});
        setTraveling(false);
        onMotion.current(false);
      }
    }
    travel();
    return ()=>{cancelled=true;setTraveling(false);onMotion.current(false);};
  },[lastTravel?.at]);
  const occupied=players.map(p=>({p,index:visual[p.userId]??p.position}));
  const currentPlayer=players.find(p=>p.userId===lastRoll?.userId);
  return <div className="marble-scroller">
    <div className="marble-map" aria-label="탓승마블 41칸 맞물린 보드">
      <div className="marble-board-base"/>
      <div className="marble-board-plaza">
        <div className="marble-center-title">✦ 탓승마블</div>
        <div className="marble-center-subtitle">41칸 · 건설 · 독점</div>
        <div className="marble-owner-legend" aria-label="플레이어별 소유 색상">
          {players.map((p,i)=><span key={p.userId} style={{'--owner-color':PLAYER_COLORS[p.character]||PLAYER_COLORS.tatsung}}><b>P{i+1}</b> {p.nickname}</span>)}
        </div>
        <div className="marble-deck" aria-hidden="true"><div className="marble-deck-card">?</div><span>CHANCE</span></div>
        <div className={'world-dice '+(motion?'is-rolling':'')} aria-live="polite">
          <DiceCube value={faces[0]} index={0} rolling={motion}/>
          <DiceCube value={faces[1]} index={1} rolling={motion}/>
        </div>
        {lastRoll?.double&&(motion||Date.now()-lastRoll.at<4500)&&<div className="marble-double-banner">⚡ DOUBLE · 한번 더!</div>}
        <div className="marble-center-message">{motion?`${currentPlayer?.nickname||'플레이어'} 이동 중`:activeName?`${activeName}님의 차례`:'다음 차례를 기다립니다'}</div>
        <div className="marble-center-roll-wrap">
          <button type="button" className="marble-roll-main" onClick={onRoll} disabled={!rollReady}>{motion?'ROLLING':rollReady?'ROLL':'WAIT'}</button>
          {canEnd&&<button type="button" className="marble-turn-end" onClick={onEnd}>턴 종료 · 즉시 다음 턴</button>}
          <span>{myTurn?(rollReady?'주사위를 굴려주세요':canEnd?'건설하거나 턴을 종료하세요':'자동 턴 진행 중'):'상대 플레이어 턴'} · {remaining}초</span>
        </div>
      </div>
      <svg className="classic-board-svg" viewBox="0 0 1600 900" preserveAspectRatio="none" aria-label="41칸 순환 보드">
        <polygon points="800,895 20,450 800,5 1580,450" fill="#251d1c" opacity=".7"/>
        <polygon points="800,881 40,450 800,19 1560,450" fill="none" stroke="#c49b65" strokeWidth="9"/>
        {tiles.map(tile=><TileCell key={tile.id} tile={tile} geom={GEOMETRY[tile.id]} selected={selected===tile.id} onSelect={onSelect} players={players}/>)}
        <polygon points="800,717 275,450 800,183 1325,450" fill="none" stroke="#a48867" strokeWidth="6" pointerEvents="none"/>
      </svg>
      {occupied.map(({p,index})=>{
        const pos=positionFor(index),same=occupied.filter(x=>x.index===index),slot=same.findIndex(x=>x.p.userId===p.userId);
        return <div key={p.userId} className={'marble-pawn '+(motion&&p.userId===lastRoll?.userId?'marble-pawn--moving':'')+(traveling&&p.userId===lastTravel?.userId?' marble-pawn--traveling':'')} style={{left:`calc(${pos.x}% + ${slot%2*13-6}px)`,top:`calc(${pos.y}% + ${Math.floor(slot/2)*10-15}px)`,'--pawn':PLAYER_COLORS[p.character]||PLAYER_COLORS.tatsung}} title={`${p.nickname} · ${index}번`}>
          <div className="pawn-face"><span className="pawn-eyes">• •</span><span className="pawn-mouth">◡</span></div>
          <div className="pawn-label">{p.nickname}</div>
        </div>;
      })}
    </div>
  </div>;
}
export default memo(Board25D);
