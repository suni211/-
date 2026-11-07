import test from 'node:test';
import assert from 'node:assert/strict';
import {TILES, CHANCE_CARDS, START_GOLD, ACCOUNT_START_WALLET, MATCH_STAKE, GROUPS, TOURIST_IDS} from './data.js';
import {createRoom, joinRoom, startGame, roll, buy, build, endTurn, resolve as resolveEffect, useHeldCard} from './engine.js';
const a={id:'a',nickname:'A',username:'a'};const b={id:'b',nickname:'B',username:'b'};
function setup(){const r=createRoom(a,{name:'test'});joinRoom(r,b);r.players[1].ready=true;startGame(r,'a');return r;}
test('board exactly 37 positions, names, tourism and chance',()=>{
  assert.equal(TILES.length,37);assert.equal(TILES[0].name,'스타트');assert.equal(TILES[36].name,'국세청');
  assert.deepEqual(TOURIST_IDS,[5,17,22,31]);assert.equal(CHANCE_CARDS.length,14);assert.equal(GROUPS.length,8);
});
test('2-4 players, start gold and server-authoritative dice',()=>{
  const r=setup();assert.equal(r.players.length,2);assert.equal(r.players[0].gold,START_GOLD);
  roll(r,'a',()=>0);assert.deepEqual(r.lastRoll.dice,[1,1]);assert.equal(r.players[0].position,2);
  assert.equal(r.phase,'decide');assert.throws(()=>roll(r,'a',()=>0));
});
test('purchase, build, end turn and turn protection',()=>{
  const r=setup();roll(r,'a',()=>0);const price=r.tiles[2].price;buy(r,'a');assert.equal(r.tiles[2].ownerId,'a');
  assert.equal(r.tiles[2].level,0);assert.ok(r.players[0].gold<START_GOLD);
  assert.throws(()=>build(r,'a',2,3),/3바퀴/);
  build(r,'a',2);assert.equal(r.tiles[2].level,1);
  assert.throws(()=>build(r,'a',2),/이미 건설/);
  assert.throws(()=>roll(r,'b',()=>0));
  endTurn(r,'a');assert.equal(r.turnIndex,1);const beforeToll=r.players[0].gold;roll(r,'b',()=>0);assert.equal(r.players[1].position,2);
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
  assert.equal(MATCH_STAKE,5_000_000);
  assert.equal(START_GOLD,1_000_000);
});
test('building restriction opens at three completed laps',()=>{
  const r=setup();roll(r,'a',()=>0);buy(r,'a');
  r.players[0].laps=3;
  r.players[0].gold=3_000_000;
  build(r,'a',2,3);assert.equal(r.tiles[2].level,3);
  assert.equal(r.players[0].builtThisLanding,true);
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
  const r=setup();roll(r,'a',()=>0);buy(r,'a');
  r.pending={type:'free_build',options:[2]};
  resolveEffect(r,'a',{tileId:2});
  assert.equal(r.tiles[2].level,1);
});
test('free acquire ticket is not consumed when buying unowned land',()=>{
  const r=setup();roll(r,'a',()=>0);
  r.players[0].freeAcquire=1;
  buy(r,'a');assert.equal(r.players[0].freeAcquire,1);
  assert.equal(r.players[0].gold, START_GOLD-r.tiles[2].price);
});
