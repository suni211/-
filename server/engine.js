import {randomInt} from 'node:crypto';
import {BUILD_LEVELS, CHANCE_CARDS, GROUPS, MAX_ROUNDS, START_BONUS, START_GOLD, TILES, TOURIST_IDS, WIN_MULTIPLIERS} from './data.js';

const now = () => Date.now();
export const sample = (n) => randomInt(n);
export const rollDie = (rand=sample) => rand(6)+1;
// Match the client price preview; 40% discount from original building costs.
export const buildCost = (tile,level) => Math.round(tile.price * (0.06 + level * 0.04));
export const tollAmount = (room,t) => Math.floor(t.toll * (t.type==='tourist'?3:Math.pow(2,t.level)) * (room.olympics?.userId===t.ownerId?2:1));
// Paid takeover value scales with construction already invested; landmarks cannot be acquired.
export const takeoverCost = t => Math.round(t.price*0.12 + Array.from({length:t.level},(_,i)=>buildCost(t,i+1)).reduce((a,b)=>a+b,0)*2);
export const netWorth = (room,p) => p.gold + room.tiles.reduce((sum,t) => t.ownerId === p.userId ? sum+t.price+Array.from({length:t.level},(_,i)=>buildCost(t,i+1)).reduce((a,b)=>a+b,0) : sum,0);
const error = text => {throw new Error(text);};
const requirePlayer = (room,userId) => room.players.find(p=>p.userId === userId) || error('게임방에 참가하지 않았습니다.');
const log = (room,text) => {room.logs = [{id:now()+Math.random(),text},...room.logs].slice(0,26);};
const recordMoney=(room,p,amount,reason)=>{
  if(!amount)return;
  room.moneyEvents=[{id:now()+Math.random(),at:now(),userId:p.userId,nickname:p.nickname,amount,reason},...(room.moneyEvents||[])].slice(0,50);
};
const randTarget = (arr,rand) => arr[rand(arr.length)];
const tileAt = (room,id) => room.tiles[id];
const nextActive = (room,index) => {for(let i=1;i<=room.players.length;i++){const j=(index+i)%room.players.length;if(!room.players[j].bankrupt)return j;}return index;};
const current = room => room.players[room.turnIndex];
const assertTurn = (room,userId) => {
  if(room.status!=='playing')error('현재 진행 중인 게임이 아닙니다.');
  const p=requirePlayer(room,userId);
  if(current(room).userId!==userId)error('현재 본인의 턴이 아닙니다.');
  if(p.bankrupt)error('파산한 플레이어입니다.');
  return p;
};
const assertPhase = (room,phase) => {if(room.phase!==phase)error(`현재 가능한 행동이 아닙니다. (${phase})`);};
const checkWinner=(room) => {
  if(room.status !== 'playing')return;
  const alive=room.players.filter(p=>!p.bankrupt);
  for(const p of alive){
    if(TOURIST_IDS.every(i=>room.tiles[i].ownerId===p.userId))return finish(room,p,'tourist');
    if(GROUPS.filter(g=>g.every(i=>room.tiles[i].ownerId===p.userId)).length>=3)return finish(room,p,'triple');
  }
  if(alive.length===1)return finish(room,alive[0],'bankruptcy');
};
const finish=(room,p,reason) => {
  room.status='finished'; room.phase='finished';
  room.winner={userId:p.userId,nickname:p.nickname,reason,multiplier:WIN_MULTIPLIERS[reason],netWorth:netWorth(room,p)};
  log(room,`${p.nickname}님 승리! ${reason==='tourist'?'관광지 독점':reason==='triple'?'트리플 독점':reason==='bankruptcy'?'ALL 파산':'턴 종료'} · ${room.winner.multiplier}배`);
};
const addGold=(room,p,amount,reason='') => {const before=p.gold;p.gold +=amount;if(p.gold<0)p.gold=0;recordMoney(room,p,p.gold-before,reason||'게임 머니 변경'); if(before+amount<0){p.gold=0;p.bankrupt=true;room.tiles.forEach(t=>{if(t.ownerId===p.userId){t.ownerId=null;t.level=0;}});log(room,`${p.nickname}님 파산!`);}checkWinner(room);};
const moveTo=(room,p,position,{passStart=false,forceLap=false}={})=>{
  // A completed circuit is credited immediately, before the landing interaction.
  if(forceLap||(passStart&&position<p.position)){
    p.laps=(p.laps||0)+1;
    p.gold+=START_BONUS;recordMoney(room,p,START_BONUS,'스타트 완주 보너스');
    log(room,`${p.nickname}님 ${p.laps}바퀴 완주! 스타트 통과 +${START_BONUS.toLocaleString()}G`);
  }
  p.position=position;
};
const onLanding=(room,p,rand=sample)=>{
  const t=tileAt(room,p.position);
  if(t.type==='jail') {p.jailTurns=2;log(room,`${p.nickname}님 감옥 도착 · 2턴 대기`);}
  else if(t.type==='chance') {
    const card=randTarget(CHANCE_CARDS,rand);
    room.lastChance=card;
    log(room,`${p.nickname}님 찬스카드: ${card.name}`);
    applyChance(room,p,card.id,rand);
  }
  else if(t.type==='tax'){
    const tax=Math.floor(p.gold*.10);log(room,`${p.nickname}님 국세청 세금 ${tax.toLocaleString()}G`);addGold(room,p,-tax,'국세청 세금');
  }
  else if(t.type==='olympics'){
    room.olympics={userId:p.userId,turnsLeft:8};log(room,`${p.nickname}님 올림픽 개최! 8턴 동안 소유 도시 통행료 2배`);
  }
  else if(t.type==='minigame')room.pending={type:'odd_even'};
  else if(t.type==='airport')room.pending={type:'airport',options:room.tiles.filter(t=>t.id!==27).map(t=>t.id)};
  else if(t.type==='property'||t.type==='tourist'){
    if(t.ownerId && t.ownerId!==p.userId){
      const owner=room.players.find(q=>q.userId===t.ownerId);
      const toll=tollAmount(room,t);
      if(p.guardianActive){p.guardianActive--;log(room,`${p.nickname}님 수호천사 보호막 발동 · 통행료 면제`);}
      else if(owner && !owner.bankrupt){const paid=Math.min(p.gold,toll);owner.gold+=paid;recordMoney(room,owner,paid,`${t.name} 통행료 수령`);log(room,`${p.nickname}님 → ${owner.nickname}님 통행료 ${paid.toLocaleString()}G`);addGold(room,p,-toll,`${t.name} 통행료 지불`);}
    }
  }
};
const applyChance=(room,p,id,rand=sample)=>{
  switch(id){
    case 'city_swap': {
      const own=room.tiles.filter(t=>t.type==='property'&&t.ownerId===p.userId&&t.level<4);
      const other=room.tiles.filter(t=>t.type==='property'&&t.ownerId&&t.ownerId!==p.userId&&t.level<4);
      if(own.length&&other.length)room.pending={type:id,own:own.map(t=>t.id),other:other.map(t=>t.id)};
      else log(room,'교환 가능한 도시가 없어 효과가 사라졌습니다.');break;
    }
    case 'forced_sale':{
      const options=room.tiles.filter(t=>t.type==='property'&&t.ownerId&&t.ownerId!==p.userId&&t.level<4).map(t=>t.id);
      if(options.length)room.pending={type:id,options};else log(room,'매각할 수 있는 도시가 없습니다.');break;
    }
    case 'free_build':{
      const options=room.tiles.filter(t=>t.ownerId===p.userId&&t.level<4&&t.type==='property').map(t=>t.id);
      if(options.length)room.pending={type:id,options};else log(room,'업그레이드할 건물이 없습니다.');break;
    }
    case 'guardian':room.pending={type:'guardian_choice'};break;
    case 'free_acquire':p.freeAcquire++;break;
    case 'escape':p.escapeTickets++;break;
    case 'extra_roll':p.extraRoll++;break;
    case 'airport':moveTo(room,p,27);room.pending={type:'airport',options:room.tiles.filter(t=>t.id!==27).map(t=>t.id)};break;
    case 'jail':moveTo(room,p,9);p.jailTurns=2;break;
    case 'tax':moveTo(room,p,36);addGold(room,p,-Math.floor(p.gold*.10),'찬스 국세청 세금');break;
    case 'olympics':moveTo(room,p,18);room.olympics={userId:p.userId,turnsLeft:8};break;
    case 'start':moveTo(room,p,0);p.gold+=START_BONUS;recordMoney(room,p,START_BONUS,'찬스 스타트 보너스');break;
    case 'random_me_to_them':{
      const rivals=room.players.filter(q=>q.userId!==p.userId&&!q.bankrupt);if(rivals.length)moveTo(room,p,randTarget(rivals,rand).position);break;
    }
    case 'random_them_to_me':{
      const rivals=room.players.filter(q=>q.userId!==p.userId&&!q.bankrupt);if(rivals.length)moveTo(room,randTarget(rivals,rand),p.position);break;
    }
  }
  checkWinner(room);
};
const key = () => Array.from({length:6},()=> 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[sample(32)]).join('');
export function createRoom(owner,{name='새 게임방',isPrivate=false}={}){
  return {id:key(),name:String(name).slice(0,28)||'새 게임방',isPrivate:!!isPrivate,hostId:owner.id,status:'waiting',phase:'waiting',turnIndex:0,turnCount:0,createdAt:now(),updatedAt:now(),lastRoll:null,lastChance:null,pending:null,winner:null,olympics:null,lastTravel:null,moneyEvents:[],visualLockUntil:0,decisionDeadline:0,rollDeadline:0,tiles:TILES.map(t=>({...t,ownerId:null,level:0})),logs:[],players:[newPlayer(owner)]};
}
export function newPlayer(user){return {userId:user.id,nickname:user.nickname,username:user.username,character:'tatsung',connected:true,ready:false,position:0,gold:START_GOLD,bankrupt:false,laps:0,builtThisLanding:false,jailTurns:0,escapeTickets:0,guardian:0,guardianActive:0,freeAcquire:0,extraRoll:0};}
export function joinRoom(room,user){
  if(room.status!=='waiting')error('이미 진행 중인 게임방입니다.');
  if(room.players.some(p=>p.userId===user.id))return;
  if(room.players.length>=4)error('최대 4명까지 참가할 수 있습니다.');
  const p=newPlayer(user);p.character=['tatsung','mint','berry','sky'].find(c=>!room.players.some(q=>q.character===c))||'sky';room.players.push(p);log(room,`${p.nickname}님 입장`);
}
export function leaveRoom(room,userId){const i=room.players.findIndex(p=>p.userId===userId);if(i<0)return;
  if(room.status==='playing'){room.players[i].connected=false;return;}
  room.players.splice(i,1);if(room.hostId===userId && room.players.length)room.hostId=room.players[0].userId;
}
export function startGame(room,userId){if(room.status!=='waiting'||room.hostId!==userId)error('방장만 게임을 시작할 수 있습니다.');
  if(room.players.length<2||room.players.length>4)error('게임 시작은 2~4명이 필요합니다.');
  if(room.players.some(p=>p.userId!==userId&&!p.ready))error('모든 참가자가 준비해야 합니다.');
  room.status='playing';room.phase='roll';room.turnIndex=0;room.turnCount=0;room.pending=null;room.lastTravel=null;room.rollDeadline=now()+30_000;
  for(const p of room.players){p.gold=START_GOLD;p.laps=0;p.builtThisLanding=false;p.position=0;p.extraRoll=0;}
  log(room,'게임 시작! 첫 플레이어가 주사위를 굴리세요.');
}
export function roll(room,userId,rand=sample){const p=assertTurn(room,userId);assertPhase(room,'roll');room.pending=null;room.lastChance=null;
  if(p.jailTurns>0){if(p.escapeTickets>0){p.escapeTickets--;p.jailTurns=0;log(room,`${p.nickname}님 탈옥권 사용`);}else{p.jailTurns--;room.phase='decide';room.decisionDeadline=now()+1500;log(room,`${p.nickname}님 감옥 대기 · ${p.jailTurns}턴 남음`);return;}}
  const dice=[rollDie(rand),rollDie(rand)];const from=p.position,to=(from+dice[0]+dice[1])%room.tiles.length;
  room.lastRoll={dice,userId,at:now(),from,to,steps:dice[0]+dice[1],double:dice[0]===dice[1]};
  room.visualLockUntil=now()+3000;room.decisionDeadline=now()+15500;
  p.builtThisLanding=false;moveTo(room,p,to,{passStart:true});
  room.phase='decide';log(room,`${p.nickname}님 ${dice[0]} + ${dice[1]} = ${dice[0]+dice[1]}칸 이동 → ${room.tiles[p.position].name}`);
  onLanding(room,p,rand);
  if(room.status==='playing' && !p.bankrupt && room.lastRoll.double){p.extraRoll++;log(room,`${p.nickname}님 DOUBLE! 같은 턴에 추가 주사위`);}
  if(room.status==='playing' && p.bankrupt){room.turnCount++;room.turnIndex=nextActive(room,room.turnIndex);room.phase='roll';room.pending=null;}
  else if(room.status==='playing')room.phase='decide';
}
// Tourist destinations are purchased; ordinary regions are claimed by constructing level one.
export function buy(room,userId){
  const p=assertTurn(room,userId);assertPhase(room,'decide');
  if(room.pending)error('카드/미니게임을 먼저 완료하세요.');
  const t=tileAt(room,p.position);
  if(!t||t.type!=='tourist'||t.ownerId!=null)error('관광지만 별도로 소유할 수 있습니다. 일반 지역은 건설하세요.');
  if(p.gold<t.price)error('게임머니가 부족합니다.');
  p.gold-=t.price;t.ownerId=p.userId;recordMoney(room,p,-t.price,`${t.name} 관광지 확보`);
  log(room,`${p.nickname}님 관광지 ${t.name} 확보 · ${t.price.toLocaleString()}G`);
  checkWinner(room);
}
export function build(room,userId,tileId,quantity=1){
  const p=assertTurn(room,userId);assertPhase(room,'decide');
  if(room.pending)error('카드/미니게임을 먼저 완료하세요.');
  const t=tileAt(room,Number(tileId));
  if(!t||t.id!==p.position||t.type!=='property'||(t.ownerId!=null&&t.ownerId!==userId)||t.level>=4)error('빈 땅 또는 본인 지역에서만 건설할 수 있습니다.');
  if(p.builtThisLanding)error('이 지역에서는 이미 건설했습니다. 다음 방문을 기다려주세요.');
  const q=Number(quantity);
  if(!Number.isInteger(q)||q<1||q>3)error('건설 수량이 올바르지 않습니다.');
  if(q===3&&p.laps<3)error('스타트를 3바퀴 돌아야 한 번에 3단계 건설할 수 있습니다.');
  if(q===2&&p.laps<1)error('스타트를 1바퀴 돌아야 한 번에 2단계 건설할 수 있습니다.');
  if(t.level+q>4)error('랜드마크 이상 건설할 수 없습니다.');
  const total=Array.from({length:q},(_,i)=>buildCost(t,t.level+i+1)).reduce((a,b)=>a+b,0);
  if(p.gold<total)error('게임머니가 부족합니다.');
  p.gold-=total;recordMoney(room,p,-total,`${t.name} ${q}단계 건설`);if(t.ownerId==null)t.ownerId=userId;t.level+=q;p.builtThisLanding=true;
  checkWinner(room);
  log(room,`${p.nickname}님 ${t.name} → ${BUILD_LEVELS[t.level]} (${q}단계)`);
}
export function acquire(room,userId){const p=assertTurn(room,userId);assertPhase(room,'decide');if(room.pending)error('미해결 카드가 있습니다.');
  const t=tileAt(room,p.position);if(!t?.ownerId||t.ownerId===userId||t.level===4||p.freeAcquire<=0)error('무료 인수를 할 수 없습니다.');
  p.freeAcquire--;t.ownerId=userId;log(room,`${p.nickname}님 무료 인수! ${t.name}`);checkWinner(room);
}
export function acquirePaid(room,userId){
  const p=assertTurn(room,userId);assertPhase(room,'decide');
  if(room.pending)error('카드/미니게임을 먼저 완료하세요.');
  const t=tileAt(room,p.position);
  if(!t||t.type!=='property'||t.ownerId==null||t.ownerId===userId||t.level>=4)error('인수할 수 없는 지역입니다. 랜드마크는 인수할 수 없습니다.');
  const seller=room.players.find(q=>q.userId===t.ownerId);
  if(!seller||seller.bankrupt)error('인수 가능한 소유자가 없습니다.');
  const cost=takeoverCost(t);
  if(p.gold<cost)error('인수 비용이 부족합니다.');
  p.gold-=cost;seller.gold+=cost;t.ownerId=userId;
  recordMoney(room,p,-cost,`${t.name} 유료 인수`);
  recordMoney(room,seller,cost,`${t.name} 인수 보상 수령`);
  log(room,`${p.nickname}님이 ${seller.nickname}님의 ${t.name}을(를) ${cost.toLocaleString()}G에 인수했습니다.`);
  checkWinner(room);
}
export function resolve(room,userId,option={},rand=sample){const p=assertTurn(room,userId);assertPhase(room,'decide');const pending=room.pending;if(!pending)error('선택 대기 중인 효과가 없습니다.');
  // Validate first: malformed client choices must not silently discard a pending card.
  if(pending.type==='guardian_choice' && !['hold','use'].includes(option.value))error('보관 또는 즉시 사용을 선택하세요.');
  if(pending.type==='odd_even' && !['odd','even'].includes(option.value))error('홀 또는 짝을 선택하세요.');
  if(['airport','forced_sale','free_build'].includes(pending.type)){
    if(!pending.options.includes(Number(option.tileId)))error('올바른 목적지/도시를 선택하세요.');
  }
  if(pending.type==='city_swap' && (!pending.own.includes(Number(option.ownId)) || !pending.other.includes(Number(option.otherId))))error('교환할 도시를 올바르게 선택하세요.');
  // Clear only after input validation; airport landings may create a second pending action.
  room.pending=null;
  switch(pending.type){
    case 'guardian_choice':{
      if(!['hold','use'].includes(option.value))error('보관 또는 즉시 사용을 선택하세요.');
      if(option.value==='hold')p.guardian++;else p.guardianActive++;
      log(room,`${p.nickname}님 수호천사 ${option.value==='hold'?'보관':'즉시 사용 (보호막 활성화)'}`);break;
    }
    case 'airport':{
      const dest=Number(option.tileId);
      if(!pending.options.includes(dest))error('올바른 공항 목적지를 선택하세요.');
      // Airport route travels forward through START once, then to the selected destination.
      // One complete lap and +100k are credited immediately on choosing the destination.
      const from=p.position,steps=room.tiles.length-from+dest,travelAt=now();
      moveTo(room,p,dest,{forceLap:true});
      room.lastTravel={kind:'airport',userId:p.userId,from,to:dest,steps,at:travelAt};
      room.visualLockUntil=Math.max(room.visualLockUntil||0,travelAt+4600);
      log(room,`${p.nickname}님 공항 비행 · 1바퀴 완주 → ${room.tiles[dest].name}`);
      onLanding(room,p,rand);
      break;
    }
    case 'odd_even': {
      if(!['odd','even'].includes(option.value))error('홀 또는 짝을 선택하세요.');
      const die=rollDie(rand);const won=(die%2===0?'even':'odd')===option.value;addGold(room,p,won?300_000:-150_000,won?'홀짝 미니게임 당첨':'홀짝 미니게임 패배');
      log(room,`홀짝 주사위 ${die} · ${won?'승리 +300,000G':'패배 -150,000G'}`);break;
    }
    case 'city_swap': {
      const own=Number(option.ownId),other=Number(option.otherId);
      if(!pending.own.includes(own)||!pending.other.includes(other))error('교환할 도시를 올바르게 선택하세요.');
      const a=tileAt(room,own),b=tileAt(room,other);if(a.level>=4||b.level>=4||a.ownerId!==p.userId||!b.ownerId||b.ownerId===p.userId)error('교환 대상이 변경되었습니다.');
      [a.ownerId,b.ownerId]=[b.ownerId,a.ownerId];log(room,`${p.nickname}님 ${a.name} ↔ ${b.name} 교환`);break;
    }
    case 'forced_sale':{
      const id=Number(option.tileId);if(!pending.options.includes(id))error('선택할 수 없는 도시입니다.');
      const t=tileAt(room,id);if(!t.ownerId||t.ownerId===p.userId||t.level>=4)error('매각할 수 없습니다.');
      const owner=room.players.find(q=>q.userId===t.ownerId);const refund=Math.floor((t.price+t.level*t.price*.30)*.5);
      if(owner){owner.gold+=refund;recordMoney(room,owner,refund,`${t.name} 강제 매각 보상`);}t.ownerId=null;t.level=0;log(room,`${t.name} 강제 매각 · 소유자에게 ${refund.toLocaleString()}G 지급`);break;
    }
    case 'free_build':{
      const id=Number(option.tileId);if(!pending.options.includes(id))error('선택할 수 없는 도시입니다.');
      const t=tileAt(room,id);if(t.ownerId!==p.userId||t.level>=4)error('건설할 수 없습니다.');
      t.level++;log(room,`${t.name} 무료 업그레이드 → ${BUILD_LEVELS[t.level]}`);break;
    }
    default:error('알 수 없는 선택입니다.');
  }
  checkWinner(room);
  if(room.status==='playing'&&p.bankrupt){room.turnCount++;room.turnIndex=nextActive(room,room.turnIndex);room.phase='roll';}
}

export function useHeldCard(room,userId,card){
  const p=assertTurn(room,userId);
  if(card!=='guardian'||p.guardian<=0)error('보유 중인 수호천사 카드가 없습니다.');
  if(!['roll','decide'].includes(room.phase)||room.pending)error('지금은 카드를 사용할 수 없습니다.');
  p.guardian--;p.guardianActive++;
  log(room,`${p.nickname}님 수호천사 카드 사용 · 다음 통행료 보호`);
}
export function endTurn(room,userId){const p=assertTurn(room,userId);if(room.phase==='roll')error('주사위를 먼저 굴리세요.');
  if(room.pending)error('카드/미니게임 효과를 먼저 처리하세요.');
  if(p.extraRoll>0){p.extraRoll--;room.phase='roll';room.rollDeadline=now()+30_000;log(room,`${p.nickname}님 추가 주사위!`);return;}
  room.turnCount++;
  if(room.olympics){room.olympics.turnsLeft--;if(room.olympics.turnsLeft<=0)room.olympics=null;}
  if(room.turnCount>=MAX_ROUNDS*room.players.length){const alive=room.players.filter(q=>!q.bankrupt);alive.sort((a,b)=>netWorth(room,b)-netWorth(room,a));return finish(room,alive[0]||p,'turn_end');}
  room.turnIndex=nextActive(room,room.turnIndex);room.phase='roll';room.rollDeadline=now()+30_000;room.lastChance=null;room.pending=null;
}
export function publicState(room){return {
  ...room,players:room.players.map(p=>({...p,username:undefined})),
  lastRoll:room.lastRoll,createdAt:room.createdAt
};}
export function lobbySummary(room){return {id:room.id,name:room.name,status:room.status,playerCount:room.players.length,maxPlayers:4,isPrivate:room.isPrivate,host:room.players[0]?.nickname};}
