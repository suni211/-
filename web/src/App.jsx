import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {io} from 'socket.io-client';
import {ArrowRight, Bell, Check, ChevronRight, CircleHelp, Clock3, Coins, Copy, Crown, Dice5, DoorOpen, Eye, EyeOff, Flag, Gamepad2, Globe2, LockKeyhole, LogOut, Menu, Plus, RefreshCw, RotateCcw, Shield, Sparkles, Trophy, Users, X} from 'lucide-react';
import Board25D,{buildPrice} from './Board25D.jsx';
import {PREVIEW_TILES, CHARACTERS, BUILD_LEVELS} from './data.js';

const gold=n=>(Math.max(0,n)||0).toLocaleString('ko-KR')+' G';
const colors={tatsung:'#ffd84f',mint:'#76e7bd',berry:'#fb76a4',sky:'#83baff'};
const niceError=e=>e?.message||String(e||'요청을 처리할 수 없습니다.');
async function api(path,options={}){
  const resp=await fetch('/api/'+path,{credentials:'include',...options,headers:{'Content-Type':'application/json',...(options.headers||{})}});
  const data=await resp.json().catch(()=>({}));if(!resp.ok)throw Error(data.error||'서버에 연결하지 못했습니다.');return data;
}
function Mascot({character='tatsung',size=58}){
  return <svg width={size} height={size} viewBox="0 0 86 90" role="img" aria-label="탓승 캐릭터"><path d="M21 57 7 48 1 50 14 71 24 67 13 85 61 85 70 71 82 64 73 55 64 64 59 54" fill={colors[character]} stroke="#211e2d" strokeWidth="2.2" strokeLinejoin="round"/><path d="M18 5Q39 0 64 9Q81 14 73 31Q58 57 22 64L9 13Q12 5 18 5Z" fill="#b47e5e" stroke="#241d27" strokeWidth="2.5" strokeLinejoin="round"/><ellipse cx="28" cy="20" rx="9" ry="5" fill="#fff" stroke="#241d27" strokeWidth="1.8" transform="rotate(-7 28 20)"/><ellipse cx="56" cy="24" rx="8" ry="5" fill="#fff" stroke="#241d27" strokeWidth="1.8" transform="rotate(16 56 24)"/><circle cx="30" cy="20" r="3" fill="#191722"/><circle cx="55" cy="24" r="3" fill="#191722"/><path d="M34 17 35 41 45 43 51 36" fill="none" stroke="#241d27" strokeWidth="2.5"/><path d="M26 51 33 47 37 53 45 50 42 60 31 60Z" fill="#f14858" stroke="#241d27" strokeWidth="1.8"/></svg>
}
function Toast({message,onClose}){return message&&<div className="toast" role="alert"><CircleHelp size={18}/><span>{message}</span><button className="bare" onClick={onClose} aria-label="알림 닫기"><X size={17}/></button></div>}
function Auth({onSuccess}){
  const [mode,setMode]=useState('login'),[username,setUsername]=useState(''),[nickname,setNickname]=useState(''),[password,setPassword]=useState(''),[visible,setVisible]=useState(false),[loading,setLoading]=useState(false),[error,setError]=useState('');
  const submit=async e=>{e.preventDefault();setError('');setLoading(true);try{const data=await api(mode,{method:'POST',body:JSON.stringify({username,nickname,password})});onSuccess(data.user);}catch(e){setError(niceError(e))}finally{setLoading(false)}};
  return <div className="auth-page"><div className="auth-ambient"/><div className="auth-layout">
    <section className="auth-brand"><div className="brand-logo"><span className="brand-symbol">✦</span> TATSUNG<span className="brand-accent">MARBLE</span></div><div className="eyebrow">THE ULTIMATE 3D BOARD GAME</div><h1>굴리고,<br/>짓고,<br/><em>독점하라.</em></h1><p>주사위 하나에 바뀌는 운명.<br/>친구들과 함께 만드는 나만의 3D 마블 월드.</p><div className="auth-features"><span><Users size={15}/> 2–4인 실시간 대전</span><span><Coins size={15}/> 참가 판돈 500만 골드</span><span><Trophy size={15}/> 4가지 승리 조건</span></div><div className="auth-illustration"><div className="auth-circle c1"/><div className="auth-circle c2"/><div className="auth-mascot"><Mascot size={250}/></div><div className="auth-chip"><Dice5 size={18}/> READY TO ROLL?</div></div></section>
    <section className="auth-card"><div className="auth-card-top"><span className="pill"><Sparkles size={13}/> WELCOME TO THE GAME</span><h2>{mode==='login'?'다시 만나서 반가워요!':'탓승마블에 오신 걸 환영해요'}</h2><p>{mode==='login'?'계정에 로그인하고 게임을 시작하세요.':'계정을 만들고 첫 승리를 향해 달려보세요.'}</p></div><div className="auth-tabs"><button className={mode==='login'?'active':''} onClick={()=>{setMode('login');setError('')}}>로그인</button><button className={mode==='register'?'active':''} onClick={()=>{setMode('register');setError('')}}>회원가입</button></div>
      <form onSubmit={submit} className="auth-form"><label>아이디 <input placeholder="영문/숫자 3~20자" autoComplete="username" value={username} onChange={e=>setUsername(e.target.value)} required minLength={3}/></label>{mode==='register'&&<label>닉네임 <input placeholder="게임에서 사용할 이름" value={nickname} onChange={e=>setNickname(e.target.value)} required minLength={2} maxLength={16}/></label>}<label>비밀번호 <div className="password-field"><input placeholder="8자 이상 입력하세요" type={visible?'text':'password'} autoComplete={mode==='register'?'new-password':'current-password'} value={password} onChange={e=>setPassword(e.target.value)} required minLength={8}/><button type="button" className="password-eye" onClick={()=>setVisible(v=>!v)}>{visible?<EyeOff size={17}/>:<Eye size={17}/>}</button></div></label>{error&&<div className="form-error">{error}</div>}<button className="btn btn-primary auth-submit" disabled={loading}>{loading?'처리 중...':mode==='login'?'게임에 입장하기':'계정 만들기'} <ArrowRight size={19}/></button></form><div className="auth-card-foot">© 2026 TATSUNG MARBLE <span>·</span> PLAY YOUR WAY</div>
    </section></div></div>;
}
function Header({user,onLogout,inGame=false}){return <header className="topbar"><div className="topbar-logo"><span>✦</span> 탓승<span>마블</span></div><div className="topbar-right"><span className="live-pill"><span/> ONLINE</span><div className="profile-mini"><span className="profile-avatar">{user.nickname?.[0]||'T'}</span><div><strong>{user.nickname}</strong><small>{user.wins||0}승 · {user.games||0}게임</small></div></div><button title="로그아웃" className="icon-button" onClick={onLogout}><LogOut size={19}/></button></div></header>}
function Lobby({user,socket,onCall,onLogout,rooms}){
  const [newName,setNewName]=useState('탓승의 마블 파티'),[isPrivate,setPrivate]=useState(false),[code,setCode]=useState(''),[showCreate,setShowCreate]=useState(false);
  return <div className="app-shell"><Header user={user} onLogout={onLogout}/><div className="lobby-wrap"><div className="lobby-heading"><div><div className="section-eyebrow"><span className="status-dot"/> MULTIPLAYER LOBBY</div><h1>오늘도 한 판, <span>탓승마블!</span></h1><p>같이 할 친구를 찾거나 나만의 게임방을 만들어 보세요.</p></div><div className="lobby-stat"><Coins size={24}/><div><strong>{gold(user.wallet||0)}</strong><span>계정 판돈 잔액 · 참가비 5,000,000 G</span></div></div></div>
  <div className="lobby-actions"><div className="lobby-create"><div className="lobby-action-icon"><Plus size={24}/></div><h3>새 게임방 만들기</h3><p>내가 방장이 되어 친구들을 초대해보세요.</p><button className="btn btn-primary" onClick={()=>setShowCreate(true)}>게임방 만들기 <ArrowRight size={18}/></button><span className="decoration deco-1">✦</span><span className="decoration deco-2">◆</span></div>
  <div className="lobby-join"><div className="lobby-action-icon alt"><LockKeyhole size={23}/></div><h3>초대 코드로 참가</h3><p>친구에게 받은 6자리 코드를 입력하세요.</p><form className="join-form" onSubmit={e=>{e.preventDefault();onCall('room:join',{code:code.trim()})}}><input aria-label="게임방 코드" placeholder="예: AB2C3D" value={code} onChange={e=>setCode(e.target.value.toUpperCase().slice(0,6))} maxLength={6} required/><button className="btn btn-secondary" disabled={code.length!==6}>참가 <ChevronRight size={18}/></button></form></div></div>
  <div className="lobby-table-heading"><div><h2>공개 게임방 <span className="counter">{rooms.length}</span></h2><p>지금 참가할 수 있는 게임방</p></div><button className="btn btn-ghost" onClick={()=>onCall('lobby:list')}><RefreshCw size={16}/> 새로고침</button></div>
  <div className="room-table">{rooms.length===0?<div className="room-empty"><DoorOpen size={28}/><strong>아직 공개 게임방이 없어요</strong><span>첫 번째 게임방을 만들어 친구들을 초대해 보세요!</span></div>:rooms.map(r=><div className="room-row" key={r.id}><span className="room-type"><Globe2 size={20}/></span><div className="room-row-info"><strong>{r.name}</strong><small>방장 {r.host} · 코드 {r.id}</small></div><div className="room-player-count"><Users size={16}/> {r.playerCount} / 4</div><span className={`room-badge ${r.status==='playing'?'busy':''}`}>{r.status==='playing'?'진행 중':'대기 중'}</span><button className="btn btn-small" onClick={()=>onCall('room:join',{code:r.id})} disabled={r.status!=='waiting'||r.playerCount>=4}>참가하기 <ArrowRight size={15}/></button></div>)}</div>
  <div className="footer-note"><Shield size={15}/> 주사위와 게임 진행은 서버에서 공정하게 처리됩니다.</div>
  </div>{showCreate&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setShowCreate(false)}}><div className="modal"><div className="modal-head"><div><span className="section-eyebrow">CREATE ROOM</span><h2>게임방 만들기</h2></div><button className="icon-button" onClick={()=>setShowCreate(false)}><X size={20}/></button></div><form onSubmit={e=>{e.preventDefault();onCall('room:create',{name:newName,isPrivate});setShowCreate(false)}}><label className="field">게임방 이름<input value={newName} onChange={e=>setNewName(e.target.value)} maxLength={28} required/></label><div className="toggle-row"><div className="toggle-label">{isPrivate?<LockKeyhole size={18}/>:<Globe2 size={18}/>} <div><strong>{isPrivate?'비공개 게임방':'공개 게임방'}</strong><small>{isPrivate?'초대 코드로만 참가할 수 있어요.':'로비 목록에 게임방이 표시됩니다.'}</small></div></div><button className={`toggle ${isPrivate?'on':''}`} type="button" onClick={()=>setPrivate(v=>!v)} aria-label="비공개 설정"><span/></button></div><button className="btn btn-primary btn-wide" type="submit">게임방 생성 <ArrowRight size={18}/></button></form></div></div>}</div>;
}
function Waiting({room,user,onCall}){
  const me=room.players.find(p=>p.userId===user.id);const isHost=room.hostId===user.id;
  return <div className="room-screen"><div className="room-backdrop"/><div className="waiting-wrap"><div className="waiting-top"><div><span className="section-eyebrow">GAME ROOM / {room.id}</span><h1>{room.name}</h1><p><span className="status-dot"/> 상대를 기다리고 있어요 · {room.players.length}/4명</p></div><button className="btn btn-ghost" onClick={()=>onCall('room:leave')}><X size={16}/> 나가기</button></div>
    <div className="waiting-grid"><section className="waiting-main"><div className="panel-title"><h3><Users size={19}/> 플레이어</h3><span>2~4명</span></div><div className="waiting-players">{Array.from({length:4},(_,i)=>{const p=room.players[i];return <div className={`waiting-player ${p?'filled':''}`} key={i}>{p?<><div className="waiting-player-avatar"><Mascot character={p.character} size={54}/></div><div className="waiting-player-name"><strong>{p.nickname} {p.userId===user.id&&<span className="you-tag">나</span>}</strong><small>{p.userId===room.hostId?'방장':p.ready?'준비 완료':'준비 중'}</small></div><span className={`waiting-ready ${p.userId===room.hostId||p.ready?'ok':''}`}>{p.userId===room.hostId?<Crown size={16}/>:p.ready?<Check size={17}/>:<Clock3 size={16}/>}</span></>:<><div className="waiting-empty-icon"><Plus size={22}/></div><span className="waiting-empty-text">빈 자리</span><span className="waiting-empty-status">WAITING</span></>}</div>})}</div><div className="character-picker"><h3>캐릭터 선택</h3><p>원하는 캐릭터 말을 선택하세요.</p><div className="character-list">{CHARACTERS.map(c=>{const used=room.players.some(p=>p.userId!==user.id&&p.character===c.id);return <button key={c.id} disabled={used} className={`character-option ${me?.character===c.id?'chosen':''}`} onClick={()=>onCall('room:character',{character:c.id})}><Mascot character={c.id} size={61}/><span>{c.name}</span>{used&&<small>선택됨</small>}</button>})}</div></div></section>
    <aside className="waiting-side"><div className="waiting-side-card"><span className="section-eyebrow">INVITE CODE</span><h3>친구 초대하기</h3><p>아래 코드를 친구에게 알려주세요.</p><button className="code-copy" onClick={()=>navigator.clipboard?.writeText(room.id)}><strong>{room.id}</strong><Copy size={19}/></button><div className="note-text">{room.isPrivate?'비공개방 · 코드가 있는 사람만 입장 가능':'공개방 · 로비에서도 참가 가능'}</div></div><div className="waiting-info"><div><Dice5 size={18}/><span>서버 랜덤 주사위 2개</span></div><div><Coins size={18}/><span>게임 시작 1,000,000 G</span></div><div><Trophy size={18}/><span>관광지 독점 최대 4배</span></div></div>{isHost?<button className="btn btn-primary btn-wide start-btn" disabled={room.players.length<2||room.players.some(p=>p.userId!==user.id&&!p.ready)} onClick={()=>onCall('room:start')}>게임 시작하기 <ArrowRight size={18}/></button>:<button className={`btn btn-wide ${me?.ready?'btn-secondary':'btn-primary'} start-btn`} onClick={()=>onCall('room:ready')}>{me?.ready?'준비 취소':'준비 완료'} {me?.ready?<RotateCcw size={18}/>:<Check size={18}/>}</button>}<p className="start-foot">{isHost?'모든 플레이어가 준비하면 시작할 수 있습니다.':'준비를 완료하면 방장이 게임을 시작합니다.'}</p></aside></div></div></div>;
}
function OptionSelect({label,options,value,onChange,tiles}){return <label className="select-field">{label}<select value={value??''} onChange={e=>onChange(e.target.value)}><option value="">선택하기</option>{options.map(id=><option value={id} key={id}>{tiles[id]?.name||id}</option>)}</select></label>}
function PendingChoice({room,onCall}){
  const p=room.pending;
  const [one,setOne]=useState('');
  const [two,setTwo]=useState('');
  useEffect(()=>{setOne('');setTwo('')},[p?.type,room.lastChance?.id]);
  if(!p)return null;
  const pick=options=><select className="hud-choice-select" value={one} onChange={e=>setOne(e.target.value)}><option value="">목적지 / 도시 선택</option>{options.map(id=><option key={id} value={id}>{String(id).padStart(2,'0')} · {room.tiles[id]?.name}</option>)}</select>;
  if(p.type==='guardian_choice')return <><h3>🪽 수호천사 카드</h3><p>지금 바로 통행료 보호막을 활성화하거나, 카드를 보유해 나중에 사용하세요.</p><div className="hud-choice-buttons"><button onClick={()=>onCall('game:resolve',{value:'use'})}>⚡ 즉시 사용</button><button onClick={()=>onCall('game:resolve',{value:'hold'})}>🎴 보관하기</button></div></>;
  if(p.type==='odd_even')return <><h3>🎲 홀 · 짝 미니게임</h3><p>맞히면 300,000 G 획득, 틀리면 150,000 G 차감</p><div className="hud-choice-buttons"><button onClick={()=>onCall('game:resolve',{value:'odd'})}>홀 (ODD)</button><button onClick={()=>onCall('game:resolve',{value:'even'})}>짝 (EVEN)</button></div></>;
  if(p.type==='airport')return <><h3>✈ 공항 이동</h3><p>37칸 중 원하는 목적지를 선택하면 즉시 비행합니다. 해당 칸의 효과도 적용됩니다.</p>{pick(p.options)}<button className="btn btn-primary" disabled={one===''} onClick={()=>onCall('game:resolve',{tileId:Number(one)})}>이 지역으로 비행</button></>;
  if(p.type==='city_swap')return <><h3>🔄 도시 교환</h3><p>랜드마크가 아닌 내 도시와 상대 도시를 선택하세요.</p><select className="hud-choice-select" value={one} onChange={e=>setOne(e.target.value)}><option value="">내 도시 선택</option>{p.own.map(id=><option key={id} value={id}>{room.tiles[id]?.name}</option>)}</select><select className="hud-choice-select" value={two} onChange={e=>setTwo(e.target.value)}><option value="">상대 도시 선택</option>{p.other.map(id=><option key={id} value={id}>{room.tiles[id]?.name}</option>)}</select><button className="btn btn-primary" disabled={!one||!two} onClick={()=>onCall('game:resolve',{ownId:Number(one),otherId:Number(two)})}>도시 교환</button></>;
  if(p.type==='forced_sale'||p.type==='free_build')return <><h3>{p.type==='forced_sale'?'💸 도시 강제매각':'🏗 무료 건설'}</h3><p>{p.type==='forced_sale'?'상대 소유의 랜드마크가 아닌 도시를 매각합니다.':'내 도시 한 곳을 무료로 한 단계 업그레이드합니다.'}</p>{pick(p.options)}<button className="btn btn-primary" disabled={one===''} onClick={()=>onCall('game:resolve',{tileId:Number(one)})}>적용하기</button></>;
  return <p>효과 처리 중...</p>;
}
const TYPE_LABEL={property:'일반 도시',tourist:'관광지',start:'스타트',jail:'감옥',chance:'찬스카드',minigame:'홀짝 게임',olympics:'올림픽',airport:'공항',tax:'국세청'};
const pawnColor={tatsung:'#ffe177',mint:'#75efc3',berry:'#ff8cac',sky:'#8dbafc'};
function PlayerFace({character}){return <div className="pawn-face" style={{'--pawn':pawnColor[character]||pawnColor.tatsung}}><span className="pawn-eyes">• •</span><span className="pawn-mouth">◡</span></div>}
function Game({room,user,onCall}){
  const [selected,setSelected]=useState(null);
  const [dialog,setDialog]=useState(null);
  const [dismissedLand,setDismissedLand]=useState('');
  const [moving,setMoving]=useState(false);
  const [clock,setClock]=useState(Date.now());
  useEffect(()=>{const i=setInterval(()=>setClock(Date.now()),250);return ()=>clearInterval(i)},[]);
  const me=room.players.find(p=>p.userId===user.id);
  const active=room.players[room.turnIndex];
  const myTurn=active?.userId===user.id&&room.status==='playing';
  const landed=room.tiles[me?.position||0];
  const shown=room.tiles[selected??me?.position??0]||room.tiles[0];
  const owner=room.players.find(p=>p.userId===shown.ownerId);
  const animationLocked=moving || (clock<(room.visualLockUntil||0));
  const canAct=myTurn&&room.phase==='decide'&&!room.pending&&!animationLocked;
  const canBuy=canAct&&!landed.ownerId&&['property','tourist'].includes(landed.type)&&me.gold>=landed.price;
  const canBuild=canAct&&landed.ownerId===user.id&&landed.type==='property'&&landed.level<4&&!me.builtThisLanding;
  const canAcquire=canAct&&landed.ownerId&&landed.ownerId!==user.id&&landed.level<4&&me.freeAcquire>0;
  const remaining=Math.max(0,Math.ceil((((room.phase==='roll'?room.rollDeadline:room.decisionDeadline)||0)-clock)/1000));
  const round=Math.min(25,Math.floor((room.turnCount||0)/room.players.length)+1);
  const rollReady=myTurn&&room.phase==='roll'&&!moving;
  const ownedTourists=room.tiles.filter(t=>t.type==='tourist'&&t.ownerId===user.id).length;
  const showBuild=q=>{const total=buildPrice(landed,q);return <button className="btn btn-buy" disabled={!canBuild||(q>1&&me.laps<3)||landed.level+q>4||me.gold<total} onClick={()=>onCall('game:build',{tileId:landed.id,quantity:q}).then(ok=>{if(ok)setDialog(null)})}>🏗 {q}단계 건설 · {gold(total)}</button>};
  const landingKey=`${room.id}:${room.lastRoll?.at||0}:${me?.position||0}`;
  useEffect(()=>{
    if(!myTurn){setDialog(null);return;}
    if((canBuy||canBuild||canAcquire)&&dismissedLand!==landingKey)setDialog('land');
    else if(!canBuy&&!canBuild&&!canAcquire)setDialog(d=>d==='land'?null:d);
  },[myTurn,canBuy,canBuild,canAcquire,dismissedLand,landingKey]);
  return <div className="marble-arena">
    <header className="marble-hud-top">
      <div className="marble-hud-logo">✦ 탓승마블<small>TATSUNG MARBLE</small></div>
      <div className="marble-hud-chip"><span>판돈 500만 · 시작 100만</span><b>게임머니 {gold(me?.gold||0)}</b></div>
      <div className="marble-hud-chip rounds"><span>게임 라운드</span><b>{round} / 25</b></div>
      <div className="marble-hud-chip countdown"><span>{room.phase==='roll'?'주사위 제한':'자동 턴 종료'}</span><b>{remaining}초</b></div>
      <div className="marble-hud-spacer"/>
      <div className="marble-hud-tag">{room.status==='finished'?'🏆 경기 종료':'● LIVE · '+room.id}</div>
    </header>
    <div className="marble-arena-layout">
      <aside className="marble-player-panel">
        <div className="marble-section-title">👑 플레이어 현황 <small>{room.players.length} / 4명</small></div>
        {room.players.map((p,i)=><div key={p.userId} className={'marble-player-card'+(active?.userId===p.userId?' is-active':'')+(p.userId===user.id?' is-self':'')+(p.bankrupt?' is-bankrupt':'')}>
          <div className="marble-player-avatar" style={{'--player-color':pawnColor[p.character]||'#f7d78e'}}><PlayerFace character={p.character}/></div>
          <div className="marble-player-data"><strong>{p.nickname}</strong><small>{p.bankrupt?'💥 파산':active?.userId===p.userId?'🎲 현재 턴':p.connected?'● 접속 중':'○ 재접속 중'} · {p.laps||0}바퀴</small><b>{gold(p.gold)}</b></div>
        </div>)}
        <div className="marble-info-card"><span className="marble-section-title">💎 내 경기 자산</span><strong>{gold(me?.gold||0)}</strong><p>소유 부동산 <b>{room.tiles.filter(t=>t.ownerId===user.id).length}곳</b></p><p>관광지 독점 <b>{ownedTourists} / 4</b></p><p>3바퀴 건설 해제 <b>{(me?.laps||0)>=3?'가능':'아직 '+(3-(me?.laps||0))+'바퀴 남음'}</b></p><p>수호천사 보호막 <b>{me?.guardianActive||0}회</b></p></div>

      </aside>
      <main className="marble-board-zone">
        <Board25D tiles={room.tiles} players={room.players} selected={selected??me?.position??0} onSelect={setSelected} lastRoll={room.lastRoll} onMotionChange={setMoving}/>
      </main>
      <aside className="marble-action-panel">
        <section className="hud-action-box"><div className="hud-action-label">🎲 현재 차례</div><div className="hud-active-person"><div className="avatar-mini">{active?.nickname?.slice(0,1)||'T'}</div><div><strong>{active?.nickname}</strong><small>{room.status==='finished'?'게임 종료':myTurn?'내 차례입니다':'다른 플레이어 진행 중'}</small></div></div>
          {room.status==='finished'?<><div className="hud-alert">🏆 {room.winner?.nickname} 우승 · {room.winner?.reason==='tourist'?'관광지 독점':room.winner?.reason==='triple'?'트리플 독점':room.winner?.reason==='bankruptcy'?'ALL 파산':'턴 종료'} ×{room.winner?.multiplier}</div><p>우승 판돈 지급: {gold(room.winner?.payout??(5000000*(room.winner?.multiplier||1)))}</p><button className="btn btn-secondary" onClick={()=>onCall('room:leave')}>로비로 돌아가기</button></>:
          <>{myTurn&&room.pending?<div className="hud-alert">선택해야 할 효과가 있습니다 ↓</div>:null}<button className="btn hud-primary-roll" onClick={()=>onCall('game:roll')} disabled={!rollReady}><span>🎲</span> {moving?'굴러가는 중...':rollReady?'주사위 굴리기':'주사위 대기'}</button><div className="hud-auto-turn">⏱ 턴은 자동으로 종료됩니다 · {remaining}초</div></>}
        </section>
        {room.status==='playing'&&myTurn&&!room.pending&&(canBuy||canBuild||canAcquire)&&<section className="hud-action-box"><button className="btn btn-buy" onClick={()=>setDialog('land')}>🏗 지역 구매 · 건설</button></section>}
        {room.status==='playing'&&<section className="hud-action-box"><button className="btn btn-secondary btn-wide" onClick={()=>setDialog('cards')}>🎴 보유 아이템 보기 · 수호천사 {me?.guardian||0}장</button></section>}
        <section className="hud-action-box"><div className="hud-action-label">📍 지역 정보 · #{shown.id}</div><h3>{shown.name}</h3><p>{TYPE_LABEL[shown.type]||shown.type}</p>{['property','tourist'].includes(shown.type)&&<><div className="hud-line"><span>소유자</span><b>{owner?.nickname||'없음'}</b></div><div className="hud-line"><span>땅값</span><b>{gold(shown.price)}</b></div><div className="hud-line"><span>건설 단계</span><b>{shown.type==='tourist'?'관광지':BUILD_LEVELS[shown.level]}</b></div></>}<p style={{marginTop:9}}>보드 위 지역을 클릭하면 이 정보가 바뀝니다.</p></section>
        {room.logs?.[0]&&<div className="hud-last-log" role="status">{room.logs[0].text}</div>}
      </aside>
    </div>
    {room.status==='playing'&&((myTurn&&room.pending&&!animationLocked)||(dialog==='land'&&myTurn&&(canBuy||canBuild||canAcquire))||dialog==='cards')&&
      <div className="marble-popup-cover">
        <div className="marble-popup" role="dialog" aria-modal="true" aria-label={room.pending?'이벤트 선택':dialog==='land'?'부동산 거래':'보유 아이템'}>
          {myTurn&&room.pending&&!animationLocked?<><div className="marble-popup-kicker">🎴 이벤트 · 선택형 아이템</div><PendingChoice room={room} onCall={onCall}/></>:
           dialog==='land'?<>
             <div className="marble-popup-kicker">🏗 지역 행동 · 현재 도착 지역</div>
             <h2>{landed.name}</h2>
             <p>보유 게임머니 <b>{gold(me?.gold||0)}</b> · 건설비 40% 인하 적용</p>
             <div className="marble-popup-actions">
               {canBuy&&<button className="btn btn-buy" onClick={()=>onCall('game:buy').then(ok=>{if(ok)setDialog(null)})}>💰 {landed.type==='tourist'?'관광지':'지역'} 매입 · {gold(landed.price)}</button>}
               {canBuild&&<><p>건물을 건설할 단계를 선택하세요.</p><div className="hud-build-buttons">{showBuild(1)}{showBuild(3)}</div></>}
               {canAcquire&&<button className="btn btn-buy" onClick={()=>onCall('game:acquire').then(ok=>{if(ok)setDialog(null)})}>✨ 무료 인수권 사용</button>}
             </div>
             <div className="marble-popup-footer"><button className="marble-popup-dismiss" onClick={()=>{setDismissedLand(landingKey);setDialog(null)}}>건너뛰기 · 자동 턴 종료</button></div>
           </>:<>
             <div className="marble-popup-kicker">🎴 보유 아이템</div>
             <h2>내 아이템</h2>
             <p>수호천사 {me?.guardian||0}장 · 탈옥권 {me?.escapeTickets||0}장 · 무료 인수권 {me?.freeAcquire||0}장</p>
             <div className="marble-popup-actions">
               <button className="btn btn-secondary" disabled={!myTurn||!(me?.guardian>0)||animationLocked||!!room.pending} onClick={()=>onCall('game:card',{card:'guardian'}).then(ok=>{if(ok)setDialog(null)})}>🪽 수호천사 사용 · 통행료 보호막</button>
             </div>
             <div className="marble-popup-footer"><button className="marble-popup-dismiss" onClick={()=>setDialog(null)}>닫기</button></div>
           </>}
        </div>
      </div>}
  </div>;
}
export default function App(){
  const [user,setUser]=useState(null),[boot,setBoot]=useState(true),[socket,setSocket]=useState(null),[room,setRoom]=useState(null),[rooms,setRooms]=useState([]),[toast,setToast]=useState('');
  useEffect(()=>{api('me').then(d=>setUser(d.user)).catch(()=>{}).finally(()=>setBoot(false))},[]);
  useEffect(()=>{if(!user)return;const s=io({withCredentials:true,reconnection:true,reconnectionAttempts:Infinity});setSocket(s);
    s.on('lobby:rooms',setRooms);s.on('account:updated',setUser);s.on('room:state',setRoom);s.on('room:left',()=>setRoom(null));s.on('connect_error',err=>setToast('연결 오류: '+niceError(err)));
    return ()=>{s.disconnect();setSocket(null)};
  },[user?.id]);
  const onCall=useCallback((event,data={})=>new Promise(done=>{
    if(!socket?.connected){setToast('서버 연결 중입니다. 잠시 후 다시 시도해주세요.');return done(false);}
    socket.timeout(12000).emit(event,data,(err,response)=>{if(err){setToast('응답 시간이 초과되었습니다.');return done(false);}if(!response?.ok){setToast(response?.error||'요청에 실패했습니다.');return done(false);}done(true);});
  }),[socket]);
  const logout=async()=>{await api('logout',{method:'POST'}).catch(()=>{});setSocket(null);setRoom(null);setUser(null);};
  if(boot)return <div className="loading-screen"><span>✦</span><h2>탓승마블</h2><p>로딩 중...</p></div>;
  return <>{!user?<Auth onSuccess={setUser}/>:!room?<Lobby user={user} socket={socket} rooms={rooms} onCall={onCall} onLogout={logout}/>:room.status==='waiting'?<><Header user={user} onLogout={logout}/><Waiting room={room} user={user} onCall={onCall}/></>:<Game room={room} user={user} onCall={onCall}/>}<Toast message={toast} onClose={()=>setToast('')}/></>;
}
