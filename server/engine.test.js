import test from 'node:test';
import assert from 'node:assert/strict';
import {TILES, CHANCE_CARDS, START_GOLD, START_BONUS, ACCOUNT_START_WALLET, MATCH_STAKE, GROUPS, TOURIST_IDS} from './data.js';
import {createRoom, joinRoom, startGame, roll, buy, build, buildCost, endTurn, resolve as resolveEffect, useHeldCard} from './engine.js';
const a={id:'a',nickname:'A',username:'a'};const b={id:'b',nickname:'B',username:'b'};
function setup(){const r=createRoom(a,{name:'test'});joinRoom(r,b);r.players[1].ready=true;startGame(r,'a');return r;}
test('board exactly 41 positions, names, tourism and chance',()=>{
  assert.equal(TILES.length,41);assert.equal(TILES[0].name,'스타트');assert.equal(TILES[36].name,'국세청');assert.equal(TILES[40].name,'황금섬');
  assert.deepEqual(TOURIST_IDS,[5,17,22,31]);assert.equal(CHANCE_CARDS.length,14);assert.equal(GROUPS.length,9);
});
test('2-4 players, start gold and server-authoritative dice',()=>{
  const r=setup();assert.equal(r.players.length,2);assert.equal(r.players[0].gold,START_GOLD);
  roll(r,'a',()=>0);assert.deepEqual(r.lastRoll.dice,[1,1]);assert.equal(r.players[0].position,2);
  assert.equal(r.phase,'decide');assert.throws(()=>roll(r,'a',()=>0));
});
test('first construction automatically claims the land and charges only the building cost',()=>{
  const r=setup();roll(r,'a',()=>0);
  const t=r.tiles[2],cost=buildCost(t,1);
  assert.throws(()=>buy(r,'a'),/관광지만/);
  assert.throws(()=>build(r,'a',2,3),/3바퀴/);
  build(r,'a',2);assert.equal(t.ownerId,'a');assert.equal(t.level,1);
  assert.equal(r.players[0].gold,START_GOLD-cost);
  assert.throws(()=>build(r,'a',2),/이미 건설/);
  r.players[0].extraRoll=0;endTurn(r,'a');assert.equal(r.turnIndex,1);
  const beforeToll=r.players[0].gold;roll(r,'b',()=>0);
  assert.equal(r.players[1].position,2);
  assert.ok(r.players[1].gold<START_GOLD);assert.ok(r.players[0].gold>beforeToll);
});
test('odd-even minigame is server-determined',()=>{
  const r=setup();r.players[0].position=1;roll(r,'a',()=>0);
  assert.equal(r.players[0].position,3);assert.equal(r.pending.type,'odd_even');
  resolveEffect(r,'a',{value:'odd'},()=>0);assert.equal(r.pending,null);assert.equal(r.players[0].gold,START_GOLD+300_000);
});
test('cannot start with one player or duplicate character',()=>{
  const r=createRoom(a);assert.throws(()=>startGame(r,'a'));
  joinRoom(r,b);joinRoom(r,{id:'c',nickname:'C',username:'c'});joinRoom(r,{id:'d',nickname:'D',username:'d'});
  assert.equal(r.players.length,4);assert.throws(()=>joinRoom(r,{id:'e',nickname:'E'}));
});

test('account wager and in-game money are deliberately separate',()=>{
  assert.equal(ACCOUNT_START_WALLET,5_000_000);
  assert.equal(MATCH_STAKE,100_000);
  assert.equal(START_GOLD,1_000_000);
});
test('three normal buildings maximum and landmark requires a separate upgrade',()=>{
  const r=setup();roll(r,'a',()=>0);
  const p=r.players[0],tile=r.tiles[2];
  p.laps=3;
  p.gold=3_000_000;
  build(r,'a',2,3);
  assert.equal(tile.level,3);
  assert.equal(tile.ownerId,'a');
  assert.equal(p.builtThisLanding,true);
  p.builtThisLanding=false;
  assert.throws(()=>build(r,'a',2,2),/랜드마크|일반 건물|최대/);
  build(r,'a',2,1);
  assert.equal(tile.level,4);
  assert.throws(()=>build(r,'a',2,1),/건설할 수 없습니다/);
});
test('after one lap exactly two normal buildings may be built together',()=>{
  const r=setup();roll(r,'a',()=>0);
  const p=r.players[0],tile=r.tiles[2];
  assert.throws(()=>build(r,'a',2,2),/1바퀴/);
  p.laps=1;
  build(r,'a',2,2);
  assert.equal(tile.level,2);
  assert.equal(tile.ownerId,'a');
  p.builtThisLanding=false;
  assert.throws(()=>build(r,'a',2,2),/일반 건물은 최대 3개/);
  build(r,'a',2,1);
  assert.equal(tile.level,3);
});
test('landmark cannot be purchased by skipping from one house to fourth level',()=>{
  const r=setup();roll(r,'a',()=>0);
  const p=r.players[0],tile=r.tiles[2];
  build(r,'a',2,1);
  p.laps=3;p.builtThisLanding=false;
  assert.throws(()=>build(r,'a',2,3),/일반 건물은 최대 3개/);
  build(r,'a',2,2);assert.equal(tile.level,3);
  p.builtThisLanding=false;
  build(r,'a',2,1);assert.equal(tile.level,4);
});
test('guardian chance can be stored and activated later',()=>{
  const r=setup();r.pending={type:'guardian_choice'};r.phase='decide';
  resolveEffect(r,'a',{value:'hold'});assert.equal(r.players[0].guardian,1);
  useHeldCard(r,'a','guardian');assert.equal(r.players[0].guardian,0);
  assert.equal(r.players[0].guardianActive,1);
});
test('invalid card input never consumes pending choice',()=>{
  const r=setup();r.phase='decide';r.pending={type:'airport',options:[2,4,6]};
  assert.throws(()=>resolveEffect(r,'a',{tileId:35}),/올바른/);
  assert.deepEqual(r.pending,{type:'airport',options:[2,4,6]});
});
test('airport moves to chosen destination and applies destination effect',()=>{
  const r=setup();r.phase='decide';r.pending={type:'airport',options:[2,3]};
  resolveEffect(r,'a',{tileId:3},()=>0);
  assert.equal(r.players[0].position,3);
  assert.equal(r.pending?.type,'odd_even');
});
test('tourism monopoly ends game immediately at 4 tourist properties',()=>{
  const r=setup();r.status='playing';
  for(const id of TOURIST_IDS.slice(0,3))r.tiles[id].ownerId='a';
  r.players[0].position=TOURIST_IDS[3];r.phase='decide';r.players[0].gold=1_000_000;
  buy(r,'a');assert.equal(r.status,'finished');
  assert.equal(r.winner.reason,'tourist');assert.equal(r.winner.multiplier,4);
});

test('free build chance allows the first building on owned empty land',()=>{
  const r=setup();roll(r,'a',()=>0);build(r,'a',2);
  r.pending={type:'free_build',options:[2]};
  resolveEffect(r,'a',{tileId:2});
  assert.equal(r.tiles[2].level,2);
});
test('free acquire ticket is not consumed on a new construction',()=>{
  const r=setup();roll(r,'a',()=>0);
  r.players[0].freeAcquire=1;
  build(r,'a',2);assert.equal(r.players[0].freeAcquire,1);
  assert.equal(r.players[0].gold, START_GOLD-buildCost(r.tiles[2],1));
});

test('building price ladder is affordable and matches the displayed amounts',()=>{
  const tile={price:300_000};
  assert.equal(buildCost(tile,1),30_000);
  assert.equal(buildCost(tile,4),66_000);
});

test('START crossing awards exactly 100k on the 41-space board',()=>{
  const r=setup();r.players[0].position=40;roll(r,'a',()=>0);
  assert.equal(r.players[0].position,1);
  assert.equal(START_BONUS,100_000);assert.equal(r.players[0].gold,1_100_000);
  assert.equal(r.players[0].laps,1);
});
test('DOUBLE is synchronized and awards another roll to the same player',()=>{
  const r=setup();roll(r,'a',()=>0);
  assert.equal(r.lastRoll.double,true);assert.equal(r.players[0].extraRoll,1);
  endTurn(r,'a');
  assert.equal(r.turnIndex,0);assert.equal(r.phase,'roll');
  let i=0;roll(r,'a',()=>[0,1][i++]);
  assert.equal(r.lastRoll.double,false);
  endTurn(r,'a');assert.equal(r.turnIndex,1);
});
