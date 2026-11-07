import React, {memo, useEffect, useRef, useState} from 'react';

const COLOR_GROUPS=['#f0a94f','#fd80a0','#64b4fa','#55e5be','#9d8dfb','#fad07e','#d977f7','#76d9eb','#8edd75'];
const PLAYER_COLORS={tatsung:'#ffe177',mint:'#75efc3',berry:'#ff8cac',sky:'#8dbafc'};
const KIND_ICONS={start:'🏁',jail:'🔒',chance:'❔',tourist:'★',minigame:'🎲',olympics:'🏆',airport:'✈',tax:'🏦'};
const STAGE_VARIANTS={
  1:['🏠','🏡','🛖','🏘','🏚','🏕','🏠','🏡'],
  2:['🏘','🏡','🏫','🏪','🏩','🏬','🏤','🏣'],
  3:['🏙','🏢','🏬','🏨','🏦','🏥','🏤','🏛']
};
const LANDMARK_VARIANTS=['🏰','🗼','🏯','🏛','🏟','🏢','🕌','🗽','🏔','🏜','🛕','⛩','🌉','🗿','🎡','🏭'];
// A 41-space diamond loop: START is at the bottom tip, then left/top/right.
const BOARD_LENGTH=41;
export function positionFor(id){
  const d=((Number(id)||0)%BOARD_LENGTH+BOARD_LENGTH)%BOARD_LENGTH*4/BOARD_LENGTH;
  let u,v,side;
  if(d<1){u=1-d;v=1;side='bottom';}
  else if(d<2){u=0;v=2-d;side='left';}
  else if(d<3){u=d-2;v=0;side='top';}
  else {u=1;v=d-3;side='right';}
  return {x:50+43*(u-v),y:50+44*(u+v-1),side};
}
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export const buildPrice=(tile,q)=>Array.from({length:q},(_,i)=>Math.round(tile.price*(.06+(tile.level+i+1)*.04))).reduce((a,b)=>a+b,0);

const PIP_CELLS={1:[5],2:[1,9],3:[1,5,9],4:[1,3,7,9],5:[1,3,5,7,9],6:[1,3,4,6,7,9]};
const FACE_ROTATIONS={1:[0,0],2:[0,-90],3:[0,-180],4:[0,90],5:[-90,0],6:[90,0]};
function DiceCube({value=1,index=0,rolling=false}){
  const [rx,ry]=FACE_ROTATIONS[Math.max(1,Math.min(6,Number(value)||1))];
  return <div className="die-perspective" aria-label={`주사위 ${index+1}: ${value}점`} role="img">
    <div className={`dice-cube ${rolling?'dice-cube--rolling':''}`} style={{'--dice-x':rx+'deg','--dice-y':ry+'deg','--dice-delay':(index*.08)+'s'}}>
      {[1,2,3,4,5,6].map(face=><div className={`dice-face dice-face--${face}`} key={face}>
        {Array.from({length:9},(_,i)=><i className={`dice-pip ${PIP_CELLS[face].includes(i+1)?'':'dice-pip--empty'}`} key={i}/>)}
      </div>)}
    </div>
  </div>;
}
function Board25D({tiles=[],players=[],selected=null,onSelect=()=>{},lastRoll=null,onMotionChange=()=>{},onRoll=()=>{},rollReady=false,remaining=0,activeName='',myTurn=false}){
  const [visual,setVisual]=useState({});
  const [motion,setMotion]=useState(false);
  const [faces,setFaces]=useState([1,1]);
  const runId=useRef(null);
  const onMotion=useRef(onMotionChange);
  useEffect(()=>{onMotion.current=onMotionChange},[onMotionChange]);
  useEffect(()=>{
    if(!lastRoll?.at||lastRoll.at===runId.current)return;
    runId.current=lastRoll.at;
    if(!Number.isInteger(lastRoll.from)||Date.now()-lastRoll.at>6000)return;
    let cancelled=false;
    const userId=lastRoll.userId;
    const from=lastRoll.from;
    const steps=lastRoll.steps||lastRoll.dice?.reduce((a,b)=>a+b,0)||0;
    async function animate(){
      setVisual(v=>({...v,[userId]:from}));setMotion(true);onMotion.current(true);
      const tick=setInterval(()=>{setFaces([1+Math.floor(Math.random()*6),1+Math.floor(Math.random()*6)])},90);
      await wait(820);clearInterval(tick);
      if(cancelled)return;
      setFaces(lastRoll.dice);
      for(let n=1;n<=steps;n++){
        await wait(150);
        if(cancelled)return;
        setVisual(v=>({...v,[userId]:(from+n)%tiles.length}));
      }
      await wait(280);
      if(!cancelled){setVisual(v=>{const out={...v};delete out[userId];return out;});setMotion(false);onMotion.current(false);}
    }
    animate();
    return ()=>{cancelled=true;setMotion(false);onMotion.current(false)};
  },[lastRoll?.at]);
  const position=players.map(p=>({p,index:visual[p.userId]??p.position}));
  const currentPlayer=players.find(p=>p.userId===lastRoll?.userId);
  return <div className="marble-scroller">
    <div className="marble-map" aria-label="탓승마블 41칸 게임 보드">
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
          <span>{myTurn?(rollReady?'버튼을 눌러 주사위를 굴리세요':'자동 턴 종료 대기'):'다른 플레이어의 턴'} · {remaining}초</span>
        </div>
      </div>
      {tiles.map(tile=>{
        const pos=positionFor(tile.id);const isProperty=tile.type==='property';
        const owned=tile.ownerId!=null;
        const accent=isProperty?COLOR_GROUPS[Math.max(0,tile.group)%COLOR_GROUPS.length]:tile.type==='tourist'?'#ffe078':'#a8b9d8';
        return <button key={tile.id} type="button" className={'marble-tile marble-tile--'+tile.type+' marble-tile--'+pos.side+(selected===tile.id?' is-selected':'')+(owned?' is-owned':'')} style={{left:`${pos.x}%`,top:`${pos.y}%`,'--tile-accent':accent,'--tile-rot':(['bottom','top'].includes(pos.side)?'45deg':'-45deg')}} onClick={()=>onSelect(tile.id)} title={`${tile.id}번 ${tile.name}${owned?' · 소유 중':''}`}>
          <span className="marble-tile-top"><span>{String(tile.id).padStart(2,'0')}</span><span>{isProperty?'도시':tile.type==='tourist'?'관광지':'스페셜'}</span></span>
          <span className="marble-tile-icon">{tile.level>0?(tile.level===4?LANDMARK_VARIANTS[(tile.id*7+Math.max(0,tile.group))%LANDMARK_VARIANTS.length]:STAGE_VARIANTS[tile.level][(tile.id+Math.max(0,tile.group)*3)%8]):KIND_ICONS[tile.type]||''}</span>
          <span className="marble-tile-name">{tile.name}</span>
          {owned&&<span className="marble-tile-owner">{tile.type==='tourist'?'★ 소유':'LV '+tile.level}</span>}
        </button>
      })}
      {position.map(({p,index})=>{
        const pos=positionFor(index); const same=position.filter(a=>a.index===index);const slot=same.findIndex(a=>a.p.userId===p.userId);
        return <div key={p.userId} className={'marble-pawn '+(motion&&p.userId===lastRoll?.userId?'marble-pawn--moving':'')} style={{left:`calc(${pos.x}% + ${slot%2*12-4}px)`,top:`calc(${pos.y}% + ${Math.floor(slot/2)*10-12}px)`,'--pawn':PLAYER_COLORS[p.character]||PLAYER_COLORS.tatsung}} title={`${p.nickname} · ${index}번`}>
          <div className="pawn-face"><span className="pawn-eyes">• •</span><span className="pawn-mouth">◡</span></div>
          <div className="pawn-label">{p.nickname}</div>
        </div>
      })}
    </div>
  </div>;
}

export default memo(Board25D);
