import React, {memo, useEffect, useRef, useState} from 'react';

const COLOR_GROUPS=['#f0b36e','#fa859d','#80baf8','#5fe0c3','#b6a0fb','#eebf78','#d48cf1','#81cde8'];
const PLAYER_COLORS={tatsung:'#ffe177',mint:'#75efc3',berry:'#ff8cac',sky:'#8dbafc'};
const KIND_ICONS={start:'🏁',jail:'🔒',chance:'❔',tourist:'★',minigame:'🎲',olympics:'🏆',airport:'✈',tax:'🏦'};
const STAGE_VARIANTS={
  1:['🏠','🏡','🛖','🏘','🏚','🏕','🏠','🏡'],
  2:['🏘','🏡','🏫','🏪','🏩','🏬','🏤','🏣'],
  3:['🏙','🏢','🏬','🏨','🏦','🏥','🏤','🏛']
};
const LANDMARK_VARIANTS=['🏰','🗼','🏯','🏛','🏟','🏢','🕌','🗽','🏔','🏜','🛕','⛩','🌉','🗿','🎡','🏭'];
const sides=[
  ...Array.from({length:11},(_,i)=>({x:8+i*8.4,y:91,side:'bottom'})),
  ...Array.from({length:9},(_,i)=>({x:94,y:81-i*8.8,side:'right'})),
  ...Array.from({length:10},(_,i)=>({x:87-i*8.5,y:6,side:'top'})),
  ...Array.from({length:7},(_,i)=>({x:6,y:15+i*10.3,side:'left'}))
];
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export const positionFor=id=>sides[((Number(id)||0)%37+37)%37];
export const buildPrice=(tile,q)=>Array.from({length:q},(_,i)=>Math.round(tile.price*(.45+(tile.level+i+1)*.30))).reduce((a,b)=>a+b,0);
function Board25D({tiles=[],players=[],selected=null,onSelect=()=>{},lastRoll=null,onMotionChange=()=>{}}){
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
        setVisual(v=>({...v,[userId]:(from+n)%37}));
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
    <div className="marble-map" aria-label="탓승마블 37칸 게임 보드">
      <div className="marble-board-base"/>
      <div className="marble-board-plaza">
        <div className="marble-center-ornament">✦</div>
        <div className="marble-center-title">탓승마블</div>
        <div className="marble-center-subtitle">TATSUNG MARBLE</div>
        <div className="marble-center-rule">굴리고 · 건설하고 · 독점하라</div>
        <div className={'world-dice '+(motion?'is-rolling':'')} aria-live="polite">
          <span className="world-die" aria-label="첫 번째 주사위">{['⚀','⚁','⚂','⚃','⚄','⚅'][Math.max(1,faces[0])-1]}</span>
          <span className="world-die" aria-label="두 번째 주사위">{['⚀','⚁','⚂','⚃','⚄','⚅'][Math.max(1,faces[1])-1]}</span>
        </div>
        <div className="marble-center-message">{motion?`${currentPlayer?.nickname||'플레이어'} 이동 중 · 모두 함께 보는 주사위`:lastRoll?.dice?`최근 주사위 ${lastRoll.dice[0]} + ${lastRoll.dice[1]} = ${lastRoll.dice[0]+lastRoll.dice[1]}`:'주사위를 굴려 여행을 시작하세요!'}</div>
        <div className="marble-center-legend"><span>🏠 소도시</span><span>🏘 마을</span><span>🏙 국가</span><span>✨ 랜드마크</span></div>
      </div>
      {tiles.map(tile=>{
        const pos=positionFor(tile.id);const isProperty=tile.type==='property';
        const owned=tile.ownerId!=null;
        const accent=isProperty?COLOR_GROUPS[Math.max(0,tile.group)%COLOR_GROUPS.length]:tile.type==='tourist'?'#ffe078':'#a8b9d8';
        return <button key={tile.id} type="button" className={'marble-tile marble-tile--'+tile.type+' marble-tile--'+pos.side+(selected===tile.id?' is-selected':'')+(owned?' is-owned':'')} style={{left:`${pos.x}%`,top:`${pos.y}%`,'--tile-accent':accent}} onClick={()=>onSelect(tile.id)} title={`${tile.id}번 ${tile.name}${owned?' · 소유 중':''}`}>
          <span className="marble-tile-top"><span>{String(tile.id).padStart(2,'0')}</span><span>{isProperty?'도시':tile.type==='tourist'?'관광지':'스페셜'}</span></span>
          <span className="marble-tile-icon">{tile.level>0?(tile.level===4?LANDMARK_VARIANTS[(tile.id*7+Math.max(0,tile.group))%LANDMARK_VARIANTS.length]:STAGE_VARIANTS[tile.level][(tile.id+Math.max(0,tile.group)*3)%8]):KIND_ICONS[tile.type]||'◆'}</span>
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
