import test from 'node:test';
import assert from 'node:assert/strict';
import {TILES, CHANCE_CARDS, START_GOLD, GROUPS, TOURIST_IDS} from './data.js';
import {createRoom, joinRoom, startGame, roll, buy, build, endTurn, resolve as resolveEffect} from './engine.js';
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
  assert.equal(r.tiles[2].level,1);assert.ok(r.players[0].gold<START_GOLD-price);
  build(r,'a',2);assert.equal(r.tiles[2].level,2);assert.throws(()=>roll(r,'b',()=>0));
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
