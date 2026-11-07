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
const STAGE_VARIANTS={
  1:['🏠','🏡','🛖','🏘','🏚','🏕','🏠','🏡'],
  2:['🏘','🏡','🏫','🏪','🏩','🏬','🏤','🏣'],
  3:['🏙','🏢','🏬','🏨','🏦','🏥','🏤','🏛']
};
const LANDMARK_VARIANTS=['🏰','🗼','🏯','🏛','🏟','🏢','🕌','🗽','🏔','🏜','🛕','⛩','🌉','🗿','🎡','🏭'];
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
  const label=linear(om,im,.71),number=linear(om,im,.14),building=linear(om,im,.43),pawn=linear(om,im,.24);
  let angle=Math.atan2(o1[1]-o0[1],o1[0]-o0[0])*180/Math.PI;
  if(angle>90)angle-=180;
  if(angle< -90)angle+=180;
  return {
    points:pack([o0,o1,i1,i0]),
    accent:pack([o0,o1,linear(o1,i1,.34),linear(o0,i0,.34)]),
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
function TileCell({tile,geom,selected,onSelect}){
  const owned=tile.ownerId!=null,isProperty=tile.type==='property';
  const color=isProperty?GROUP_COLORS[Math.max(0,tile.group)%GROUP_COLORS.length]:
    ({tourist:'#f9d377',chance:'#c9afe9',start:'#9cda72',jail:'#ec9da6',airport:'#96d6e8',olympics:'#f3d27f',minigame:'#a1eed7',tax:'#e8aa97'})[tile.type]||'#c8d9e2';
  const icon=tile.level>0?(tile.level===4?LANDMARK_VARIANTS[(tile.id*7+Math.max(0,tile.group))%LANDMARK_VARIANTS.length]:
    STAGE_VARIANTS[tile.level][(tile.id+Math.max(0,tile.group)*3)%8]):KIND_ICONS[tile.type]||'';
  const full=tile.name.length>8?[tile.name.slice(0,8),tile.name.slice(8,15)+(tile.name.length>15?'…':'')]:[tile.name];
  const angle=`rotate(${geom.angle} ${geom.label[0]} ${geom.label[1]})`;
  const cx=geom.label[0],cy=geom.label[1];
  return <g className={`classic-svg-cell ${selected?'is-selected':''} ${owned?'is-owned':''}`}
      role="button" tabIndex={0} aria-label={`${tile.id}번 ${tile.name}${owned?' · 소유 중':''}`}
      onClick={()=>onSelect(tile.id)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(tile.id);}}}>
    <title>{`${tile.id}번 · ${tile.name}`}</title>
    <polygon points={geom.points} fill="#f6f5ec" stroke={selected?'#ffe17d':'#655954'} strokeWidth={selected?5:2.3} strokeLinejoin="round"/>
    <polygon points={geom.accent} fill={color} opacity="1"/>
    <text className="classic-cell-number" x={geom.number[0]} y={geom.number[1]} textAnchor="middle" dominantBaseline="middle" transform={`rotate(${geom.angle} ${geom.number[0]} ${geom.number[1]})`}>{String(tile.id).padStart(2,'0')}</text>
    {icon&&<text className="classic-cell-icon" x={geom.building[0]} y={geom.building[1]} textAnchor="middle" dominantBaseline="middle">{icon}</text>}
    <text className="classic-cell-name" x={cx} y={cy} transform={angle} textAnchor="middle" dominantBaseline="middle">
      {full.length===1?full[0]:<><tspan x={cx} dy="-8">{full[0]}</tspan><tspan x={cx} dy="18">{full[1]}</tspan></>}
    </text>
    {owned&&<circle cx={geom.number[0]+12} cy={geom.number[1]-6} r="6" stroke="#fff0ac" strokeWidth="2" fill="#7653a2"/>}
  </g>;
}
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function Board25D({tiles=[],players=[],selected=null,onSelect=()=>{},lastRoll=null,onMotionChange=()=>{},onRoll=()=>{},onEnd=()=>{},canEnd=false,rollReady=false,remaining=0,activeName='',myTurn=false}){
  const [visual,setVisual]=useState({});
  const [motion,setMotion]=useState(false);
  const [faces,setFaces]=useState([1,1]);
  const runId=useRef(null),onMotion=useRef(onMotionChange);
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
  const occupied=players.map(p=>({p,index:visual[p.userId]??p.position}));
  const currentPlayer=players.find(p=>p.userId===lastRoll?.userId);
  return <div className="marble-scroller">
    <div className="marble-map" aria-label="탓승마블 41칸 맞물린 보드">
      <div className="marble-board-base"/>
      <div className="marble-board-plaza">
        <div className="marble-center-title">✦ 탓승마블</div>
        <div className="marble-center-subtitle">41칸 · 건설 · 독점</div>
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
        {tiles.map(tile=><TileCell key={tile.id} tile={tile} geom={GEOMETRY[tile.id]} selected={selected===tile.id} onSelect={onSelect}/>)}
        <polygon points="800,717 275,450 800,183 1325,450" fill="none" stroke="#a48867" strokeWidth="6" pointerEvents="none"/>
      </svg>
      {occupied.map(({p,index})=>{
        const pos=positionFor(index),same=occupied.filter(x=>x.index===index),slot=same.findIndex(x=>x.p.userId===p.userId);
        return <div key={p.userId} className={'marble-pawn '+(motion&&p.userId===lastRoll?.userId?'marble-pawn--moving':'')} style={{left:`calc(${pos.x}% + ${slot%2*13-6}px)`,top:`calc(${pos.y}% + ${Math.floor(slot/2)*10-15}px)`,'--pawn':PLAYER_COLORS[p.character]||PLAYER_COLORS.tatsung}} title={`${p.nickname} · ${index}번`}>
          <div className="pawn-face"><span className="pawn-eyes">• •</span><span className="pawn-mouth">◡</span></div>
          <div className="pawn-label">{p.nickname}</div>
        </div>;
      })}
    </div>
  </div>;
}
export default memo(Board25D);
