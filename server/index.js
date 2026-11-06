import 'node:process';
import express from 'express';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mysql from 'mysql2/promise';
import {Server} from 'socket.io';
import {createServer} from 'node:http';
import {randomUUID} from 'node:crypto';
import {existsSync} from 'node:fs';
import {join, resolve as resolvePath} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRoom, joinRoom, leaveRoom, startGame, roll, buy, build, acquire, resolve as resolveEffect, endTurn, lobbySummary, publicState} from './engine.js';
import {CHARACTERS} from './data.js';

const PORT=Number(process.env.PORT||3000);
const JWT_SECRET=process.env.JWT_SECRET;
if(!JWT_SECRET || JWT_SECRET.length<32)throw new Error('JWT_SECRET must be a random string of at least 32 characters');
const pool=mysql.createPool({
  host:process.env.MYSQL_HOST||'127.0.0.1',port:Number(process.env.MYSQL_PORT||3306),
  user:process.env.MYSQL_USER||'tatsung',password:process.env.MYSQL_PASSWORD,
  database:process.env.MYSQL_DATABASE||'tatsung_marble',waitForConnections:true,
  connectionLimit:8,charset:'utf8mb4'
});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function initDb(){for(let i=0;i<30;i++)try{
  await pool.query(`CREATE TABLE IF NOT EXISTS accounts (
    id VARCHAR(36) PRIMARY KEY, username VARCHAR(32) NOT NULL UNIQUE,
    nickname VARCHAR(32) NOT NULL, password_hash VARCHAR(100) NOT NULL,
    wins INT NOT NULL DEFAULT 0, games INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  return;
}catch(e){if(i===29)throw e;console.error('MySQL connection pending:',e.message);await sleep(2000);}}
await initDb();
const app=express();app.set('trust proxy',1);app.disable('x-powered-by');
app.use(express.json({limit:'16kb'}));app.use(cookieParser());
app.use((req,res,next)=>{res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');next();});
const attempts=new Map();
function rateLimit(req,res,next){const key=req.ip||'unknown', now=Date.now(), v=attempts.get(key)||[];
  const active=v.filter(t=>now-t<15*60*1000);if(active.length>=15)return res.status(429).json({error:'요청이 너무 많습니다. 15분 후 다시 시도하세요.'});
  active.push(now);attempts.set(key,active);next();
}
setInterval(()=>{const t=Date.now();for(const [k,v] of attempts)if(v.every(n=>t-n>15*60*1000))attempts.delete(k);},60_000).unref();
const publicUser=u=>({id:u.id,username:u.username,nickname:u.nickname,wins:u.wins,games:u.games});
async function loadUser(id){const [rows]=await pool.query('SELECT id,username,nickname,wins,games FROM accounts WHERE id=?',[id]);return rows[0]||null;}
function authToken(req){return req.cookies?.tatsung_token || null;}
function tokenUser(token){try{const d=jwt.verify(token,JWT_SECRET,{algorithms:['HS256']});return d.sub;}catch{return null;}}
const setCookie=(res,u,req)=>{const token=jwt.sign({sub:u.id},JWT_SECRET,{expiresIn:'7d',algorithm:'HS256'});
  res.cookie('tatsung_token',token,{httpOnly:true,sameSite:'lax',secure:req.secure,maxAge:7*86400_000,path:'/'});
};
const wrap=fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
app.post('/api/register',rateLimit,wrap(async(req,res)=>{
  const username=String(req.body.username||'').trim().toLowerCase();const nickname=String(req.body.nickname||'').trim();const password=String(req.body.password||'');
  if(!/^[a-z0-9_]{3,20}$/.test(username))return res.status(400).json({error:'아이디는 영문 소문자, 숫자, 밑줄 3~20자입니다.'});
  if(nickname.length<2||nickname.length>16)return res.status(400).json({error:'닉네임은 2~16자입니다.'});
  if(password.length<8||password.length>72)return res.status(400).json({error:'비밀번호는 8~72자입니다.'});
  const id=randomUUID(),hash=await bcrypt.hash(password,12);
  try{await pool.query('INSERT INTO accounts (id,username,nickname,password_hash) VALUES (?,?,?,?)',[id,username,nickname,hash]);}
  catch(e){if(e.code==='ER_DUP_ENTRY')return res.status(409).json({error:'이미 사용 중인 아이디입니다.'});throw e;}
  const u=await loadUser(id);setCookie(res,u,req);res.status(201).json({user:publicUser(u)});
}));
app.post('/api/login',rateLimit,wrap(async(req,res)=>{
  const username=String(req.body.username||'').trim().toLowerCase();const password=String(req.body.password||'');
  const [rows]=await pool.query('SELECT * FROM accounts WHERE username=?',[username]);const u=rows[0];
  if(!u||!(await bcrypt.compare(password,u.password_hash)))return res.status(401).json({error:'아이디 또는 비밀번호를 확인하세요.'});
  setCookie(res,u,req);res.json({user:publicUser(u)});
}));
app.post('/api/logout',(_req,res)=>{res.clearCookie('tatsung_token',{path:'/'});res.json({ok:true});});
app.get('/api/me',wrap(async(req,res)=>{
  const id=tokenUser(authToken(req));const u=id?await loadUser(id):null;
  if(!u)return res.status(401).json({error:'로그인이 필요합니다.'});res.json({user:publicUser(u)});
}));
app.get('/api/health',async(_req,res)=>{try{await pool.query('SELECT 1');res.json({ok:true});}catch{res.status(503).json({ok:false});}});
const httpServer=createServer(app);
const io=new Server(httpServer,{transports:['websocket','polling'],maxHttpBufferSize:1e5,pingTimeout:20000});
const rooms=new Map(),userRoom=new Map();
const summary=()=>[...rooms.values()].filter(r=>!r.isPrivate&&r.status!=='finished').map(lobbySummary);
const notifyLobby=()=>io.emit('lobby:rooms',summary());
async function persistWinner(room){
  if(room.status!=='finished'||room.statsWritten)return;room.statsWritten=true;
  for(const p of room.players){await pool.query('UPDATE accounts SET games=games+1, wins=wins+? WHERE id=?',[(p.userId===room.winner?.userId)?1:0,p.userId]).catch(e=>console.error('stat write failed:',e));}
}
function publish(room){room.updatedAt=Date.now();io.to('room:'+room.id).emit('room:state',publicState(room));if(room.status==='finished')void persistWinner(room);notifyLobby();}
io.use(async(socket,next)=>{try{
  const cookieHeader=socket.handshake.headers.cookie||'';
  const token=cookieHeader.split(';').map(s=>s.trim()).find(s=>s.startsWith('tatsung_token='))?.split('=').slice(1).join('=');
  const id=tokenUser(token);if(!id)return next(new Error('로그인이 필요합니다.'));
  const u=await loadUser(id);if(!u)return next(new Error('유효하지 않은 계정입니다.'));
  socket.data.user=u;next();
}catch(e){next(new Error('인증에 실패했습니다.'));}});
io.on('connection',socket=>{
  const u=socket.data.user;
  socket.join('user:'+u.id);
  socket.emit('lobby:rooms',summary());
  const oldId=userRoom.get(u.id),old=rooms.get(oldId);
  if(old){const p=old.players.find(p=>p.userId===u.id);if(p){p.connected=true;socket.join('room:'+old.id);socket.emit('room:state',publicState(old));publish(old);}}
  const guarded=fn=>async(data={},ack=()=>{})=>{try{
    if(typeof ack!=='function')ack=()=>{};
    const value=await fn(data||{});ack({ok:true,...(value||{})});
  }catch(e){ack({ok:false,error:e.message||'요청 처리 실패'});}};
  const inRoom=()=>{const room=rooms.get(userRoom.get(u.id));if(!room||!room.players.some(p=>p.userId===u.id))throw new Error('게임방에 들어가 주세요.');return room;};
  socket.on('lobby:list',guarded(()=>{socket.emit('lobby:rooms',summary());}));
  socket.on('room:create',guarded(({name,isPrivate})=>{
    if(rooms.has(userRoom.get(u.id)))throw Error('먼저 현재 게임방을 나가세요.');
    const room=createRoom(u,{name,isPrivate});while(rooms.has(room.id))room.id=createRoom(u,{}).id;
    rooms.set(room.id,room);userRoom.set(u.id,room.id);socket.join('room:'+room.id);publish(room);return {code:room.id};
  }));
  socket.on('room:join',guarded(({code})=>{
    if(rooms.has(userRoom.get(u.id)))throw Error('먼저 현재 게임방을 나가세요.');
    const id=String(code||'').trim().toUpperCase();const room=rooms.get(id);if(!room)throw Error('게임방 코드를 찾을 수 없습니다.');
    joinRoom(room,u);userRoom.set(u.id,id);socket.join('room:'+id);publish(room);return {code:id};
  }));
  socket.on('room:leave',guarded(()=>{
    const room=inRoom();if(room.status==='playing')throw Error('게임 중에는 퇴장할 수 없습니다. 연결이 끊겨도 복귀할 수 있습니다.');
    leaveRoom(room,u.id);userRoom.delete(u.id);socket.leave('room:'+room.id);
    if(!room.players.length)rooms.delete(room.id);else publish(room);socket.emit('room:left');notifyLobby();
  }));
  socket.on('room:character',guarded(({character})=>{
    const room=inRoom();if(room.status!=='waiting')throw Error('대기 중에만 캐릭터를 바꿀 수 있습니다.');
    if(!CHARACTERS.some(c=>c.id===character))throw Error('존재하지 않는 캐릭터입니다.');
    if(room.players.some(p=>p.userId!==u.id&&p.character===character))throw Error('다른 플레이어가 사용 중인 캐릭터입니다.');
    room.players.find(p=>p.userId===u.id).character=character;publish(room);
  }));
  socket.on('room:ready',guarded(()=>{
    const room=inRoom();if(room.status!=='waiting')throw Error('이미 게임이 시작됐습니다.');
    const p=room.players.find(p=>p.userId===u.id);p.ready=!p.ready;publish(room);
  }));
  socket.on('room:start',guarded(()=>{const room=inRoom();startGame(room,u.id);publish(room);}));
  const actions={
    'game:roll':()=>roll(inRoom(),u.id),
    'game:buy':()=>buy(inRoom(),u.id),
    'game:build':({tileId})=>build(inRoom(),u.id,tileId),
    'game:acquire':()=>acquire(inRoom(),u.id),
    'game:resolve':(value)=>resolveEffect(inRoom(),u.id,value),
    'game:end':()=>endTurn(inRoom(),u.id)
  };
  for(const [event,fn] of Object.entries(actions))socket.on(event,guarded(data=>{fn(data);publish(inRoom());}));
  socket.on('disconnect',()=>{
    const room=rooms.get(userRoom.get(u.id));if(!room)return;
    const p=room.players.find(p=>p.userId===u.id);if(!p)return;
    const stillConnected=io.sockets.adapter.rooms.get('user:'+u.id)?.size>0;
    if(!stillConnected){p.connected=false;p.disconnectedAt=Date.now();publish(room);}
  });
});
// Recover stalled turns after disconnect (single VM instance, in-memory match state).
setInterval(()=>{
  for(const room of rooms.values()){
    if(room.status!=='playing')continue;
    const p=room.players[room.turnIndex];if(!p||p.connected||!p.disconnectedAt||Date.now()-p.disconnectedAt<90_000)continue;
    try{
      if(room.phase==='roll')roll(room,p.userId);
      if(room.pending){const v=room.pending.type==='odd_even'?{value:'odd'}:room.pending.type==='city_swap'?{ownId:room.pending.own[0],otherId:room.pending.other[0]}:{tileId:room.pending.options[0]};resolveEffect(room,p.userId,v);}
      if(room.status==='playing'&&room.phase!=='roll')endTurn(room,p.userId);
      p.disconnectedAt=Date.now();publish(room);
    }catch(e){console.error('Disconnected player skip failed:',e.message);}
  }
  for(const [id,room] of rooms)if(Date.now()-room.updatedAt>12*3600_000){rooms.delete(id);for(const p of room.players)if(userRoom.get(p.userId)===id)userRoom.delete(p.userId);}
},5000).unref();
const clientDist=resolvePath(fileURLToPath(new URL('../web/dist/',import.meta.url)));
if(existsSync(clientDist)){
  app.use(express.static(clientDist,{maxAge:'30m',index:false}));
  app.get('*',(req,res,next)=>{if(req.path.startsWith('/api/')||req.path.startsWith('/socket.io/'))return next();res.sendFile(join(clientDist,'index.html'));});
}
app.use((e,_req,res,_next)=>{console.error(e);res.status(500).json({error:'서버 오류가 발생했습니다.'});});
httpServer.listen(PORT,'0.0.0.0',()=>console.log(`Tatsung Marble :${PORT}`));
