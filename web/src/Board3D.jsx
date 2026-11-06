import React, {Suspense, useMemo, useState} from 'react';
import {Canvas} from '@react-three/fiber';
import {Html, OrbitControls, RoundedBox, ContactShadows, Float} from '@react-three/drei';
import * as THREE from 'three';

const GROUP_COLORS=['#f9a46b','#ed87ad','#8cbbff','#6cddc6','#bb9cff','#f4c96c','#e69dff','#a0d7f2'];
const SPECIAL={start:'#ffd366',chance:'#ae9afa',jail:'#f5a3ad',minigame:'#68dcca',airport:'#8ec6f9',olympics:'#ffc46d',tax:'#f098ab',tourist:'#f4d77f'};
const SIDE_X=8.1,SIDE_Z=6.2,L=4*(SIDE_X+SIDE_Z);
export function tilePosition(index){
  let d=((index%37)+37)%37*L/37;
  if(d<=SIDE_X*2)return {x:-SIDE_X+d,z:SIDE_Z,side:0};d-=SIDE_X*2;
  if(d<=SIDE_Z*2)return {x:SIDE_X,z:SIDE_Z-d,side:1};d-=SIDE_Z*2;
  if(d<=SIDE_X*2)return {x:SIDE_X-d,z:-SIDE_Z,side:2};d-=SIDE_X*2;
  return {x:-SIDE_X,z:-SIDE_Z+d,side:3};
}
function MatBox({position,args,color,rotation=[0,0,0],...props}){return <mesh position={position} rotation={rotation} castShadow receiveShadow {...props}><boxGeometry args={args}/><meshStandardMaterial color={color} roughness={0.72}/></mesh>}
function Building({level,accent}){
  if(level===0)return null;
  const walls=accent||'#e9f3ff';
  if(level===1)return <group position={[0,0.5,0]}><MatBox position={[0,0.23,0]} args={[.49,.46,.46]} color="#fff2d7"/><mesh position={[0,.54,0]} castShadow rotation={[0,Math.PI/4,0]}><coneGeometry args={[.42,.36,4]}/><meshStandardMaterial color={walls}/></mesh><MatBox position={[0,.15,.237]} args={[.13,.25,.03]} color="#645677"/></group>;
  if(level===2)return <group position={[0,0.45,0]}>{[[-.28,-.15],[.28,.08],[-.03,.29]].map(([x,z],i)=><group key={i} position={[x,0,z]} scale={i===1?.77:.65}><MatBox position={[0,.29,0]} args={[.49,.56,.46]} color={i===1?'#ffe5c8':'#dceef6'}/><mesh position={[0,.67,0]} castShadow rotation={[0,Math.PI/4,0]}><coneGeometry args={[.42,.32,4]}/><meshStandardMaterial color={walls}/></mesh></group>)}</group>;
  if(level===3)return <group position={[0,.34,0]}>{[[-.21,.15,.95],[.2,-.12,1.32]].map(([x,z,h],i)=><group key={i} position={[x,0,z]}><MatBox position={[0,h/2,0]} args={[.4,h,.4]} color={i?'#d9edf9':'#eff6ff'}/>{[.3,.52,.74].filter(v=>v<h).map(v=><MatBox key={v} position={[0,v,.205]} args={[.33,.07,.015]} color={walls}/>)}</group>)}</group>;
  return <group position={[0,.42,0]}><MatBox position={[0,.16,0]} args={[.82,.3,.75]} color="#f8e2ac"/><mesh position={[0,.89,0]} castShadow><cylinderGeometry args={[.19,.31,1.25,8]}/><meshStandardMaterial color={walls} metalness={0.32} roughness={.28}/></mesh><mesh position={[0,1.62,0]} castShadow><coneGeometry args={[.28,.33,8]}/><meshStandardMaterial color="#fff0aa" metalness={.4}/></mesh><mesh position={[0,1.83,0]}><sphereGeometry args={[.13,12,10]}/><meshStandardMaterial color="#ffe4a2" emissive="#ffd76c" emissiveIntensity={1}/></mesh></group>;
}
function Landmark({type}){
  if(type==='chance')return <mesh position={[0,.63,0]} rotation={[0,.45,0]} castShadow><octahedronGeometry args={[.37,0]}/><meshStandardMaterial color="#cbbaff" emissive="#6a50ff" emissiveIntensity={.3} metalness={.22}/></mesh>;
  if(type==='jail')return <group position={[0,.48,0]}><MatBox position={[0,.1,0]} args={[.75,.7,.56]} color="#534a66"/>{[-.25,0,.25].map(x=><MatBox key={x} position={[x,.1,.29]} args={[.065,.65,.06]} color="#e8c3ca"/>)}</group>;
  if(type==='airport')return <group position={[0,.53,0]}><MatBox position={[0,0,0]} args={[.18,.6,.18]} color="#eaf6fc"/><MatBox position={[0,.27,0]} args={[.9,.08,.3]} color="#a8d4ff"/><MatBox position={[0,.02,.1]} args={[.12,.09,.75]} color="#a8d4ff"/></group>;
  if(type==='olympics')return <group position={[0,.43,0]}>{[-.3,0,.3].map((x,i)=><mesh key={i} position={[x,.33,0]} rotation={[0,0,i===0?-.3:i===2?.3:0]}><torusGeometry args={[.22,.055,10,24]}/><meshStandardMaterial color={['#ffe078','#b4c6fc','#ffc2c2'][i]}/></mesh>)}</group>;
  if(type==='tax')return <group position={[0,.5,0]}><MatBox position={[0,.23,0]} args={[.63,.64,.52]} color="#f5c6cd"/><mesh position={[0,.67,0]}><coneGeometry args={[.42,.38,4]}/><meshStandardMaterial color="#e888aa"/></mesh></group>;
  if(type==='minigame')return <group position={[0,.54,0]}><mesh rotation={[.25,.3,.15]} castShadow><boxGeometry args={[.5,.5,.5]}/><meshStandardMaterial color="#e9fff1"/></mesh></group>;
  if(type==='tourist')return <group position={[0,.55,0]}><MatBox position={[0,.14,0]} args={[.72,.19,.62]} color="#e6b95d"/><mesh position={[0,.61,0]} castShadow><cylinderGeometry args={[.16,.27,.76,8]}/><meshStandardMaterial color="#ffe8a4" metalness={.3}/></mesh><mesh position={[0,1.04,0]}><sphereGeometry args={[.22,12,12]}/><meshStandardMaterial color="#ffedb5"/></mesh></group>;
  if(type==='start')return <group position={[0,.44,0]}><mesh rotation={[-Math.PI/2,0,0]}><torusGeometry args={[.4,.07,12,28]}/><meshStandardMaterial color="#fff3c0"/></mesh><mesh position={[0,.45,0]}><coneGeometry args={[.3,.6,5]}/><meshStandardMaterial color="#ffc773"/></mesh></group>;
  return null;
}
function ShapeHead({color='#b97e62'}){
  const geometry=useMemo(()=>{
    const s=new THREE.Shape();s.moveTo(-.46,.33);s.quadraticCurveTo(-.56,.63,-.16,.65);s.quadraticCurveTo(.24,.65,.62,.53);s.quadraticCurveTo(.84,.37,.53,.03);s.quadraticCurveTo(.12,-.38,-.38,-.60);s.lineTo(-.46,.33);
    return new THREE.ExtrudeGeometry(s,{depth:.18,bevelEnabled:true,bevelSize:.065,bevelThickness:.065,bevelSegments:2,steps:1,curveSegments:9});
  },[]);
  return <group><mesh geometry={geometry} castShadow><meshStandardMaterial color={color} flatShading/></mesh>
    {[-.24,.33].map((x,i)=><group key={i} position={[x,.34,.27]} rotation={[0,0,i===1?-.26:.18]}><mesh scale={[.15,.11,.052]}><sphereGeometry args={[1,16,10]}/><meshStandardMaterial color="#fff8ed"/></mesh><mesh position={[i===1?-.025:.035,-.015,.055]} scale={[.047,.078,.032]}><sphereGeometry args={[1,12,8]}/><meshStandardMaterial color="#181d30"/></mesh></group>)}
    <mesh position={[.03,-.12,.30]} rotation={[0,0,-.12]} scale={[.09,.15,.07]}><sphereGeometry args={[1,12,10]}/><meshStandardMaterial color="#9a5a47"/></mesh>
    <mesh position={[-.04,-.36,.28]} rotation={[0,0,-.16]} scale={[.20,.09,.065]}><sphereGeometry args={[1,14,10]}/><meshStandardMaterial color="#f14958"/></mesh>
  </group>;
}
export function CharacterPawn({character='tatsung',small=false}){
  const colors={tatsung:'#ffe600',mint:'#76e7bd',berry:'#fb76a4',sky:'#83baff'};
  const shirt=colors[character]||colors.tatsung;
  return <group scale={small?.8:1}>
    <mesh position={[0,.47,0]} castShadow><cylinderGeometry args={[.34,.49,.86,7]}/><meshStandardMaterial color={shirt} roughness={.8}/></mesh>
    <mesh position={[-.45,.7,0]} rotation={[0,0,-.95]} castShadow><cylinderGeometry args={[.12,.16,.65,7]}/><meshStandardMaterial color={shirt}/></mesh>
    <mesh position={[.40,.65,0]} rotation={[0,0,.90]} castShadow><cylinderGeometry args={[.12,.16,.56,7]}/><meshStandardMaterial color={shirt}/></mesh>
    <group position={[0,1.47,.03]} scale={[.83,.85,.83]}><ShapeHead/></group>
    {[-.19,.19].map(x=><mesh key={x} position={[x,.08,.07]} castShadow><sphereGeometry args={[.23,10,8]}/><meshStandardMaterial color="#52475a"/></mesh>)}
  </group>;
}
function Tile({tile,isSelected,onSelect,occupants=[]}){
  const {x,z,side}=tilePosition(tile.id),wide=side%2===0;
  const accent=tile.type==='property'?GROUP_COLORS[tile.group]||'#a0c4fb':SPECIAL[tile.type]||'#a6a3b9';
  return <group position={[x,0,z]}>
    <mesh receiveShadow castShadow onClick={e=>{e.stopPropagation();onSelect(tile.id)}}>
      <boxGeometry args={[wide?1.44:1.12,.35,wide?1.12:1.44]}/>
      <meshStandardMaterial color={isSelected?'#e6d0ff':tile.ownerId?'#49536f':'#32394d'} roughness={.7}/>
    </mesh>
    <mesh position={[0,.19,0]} onClick={e=>{e.stopPropagation();onSelect(tile.id)}}><boxGeometry args={[wide?1.33:1.02,.04,wide?1.00:1.33]}/><meshStandardMaterial color={accent} roughness={.65}/></mesh>
    <mesh position={[0,.22,0]}><boxGeometry args={[wide?1.27:.96,.015,wide?.93:1.26]}/><meshStandardMaterial color={tile.ownerId?'#1a283c':'#263249'} roughness={.92}/></mesh>
    {tile.level>0 && <Building level={tile.level} accent={accent}/>}
    {tile.type!=='property' && tile.type!=='tourist' && <Landmark type={tile.type}/>}
    {tile.type==='tourist' && <Landmark type="tourist"/>}
    {tile.ownerId && <mesh position={[wide?-.57:-.43,.26,wide?-.40:-.57]}><sphereGeometry args={[.10,10,8]}/><meshStandardMaterial color="#fff6c5" emissive="#e7b855" emissiveIntensity={.42}/></mesh>}
    <Html position={[0,.30,wide? .64:.77]} center distanceFactor={13} zIndexRange={[30,0]} style={{pointerEvents:'none'}}>
      <div className={`board-label ${isSelected?'selected':''}`}><span className="board-number">{String(tile.id).padStart(2,'0')}</span><span className="board-label-name">{tile.name}</span></div>
    </Html>
    {occupants.map((p,i)=><group key={p.userId} position={[(i%2? .27:-.24),.24+(i>=2?.16:0),wide?-.25:-.24]} scale={[.32,.32,.32]}><CharacterPawn character={p.character}/></group>)}
  </group>;
}
function Scene({tiles,players,selected,onSelect}){
  return <>
    <color attach="background" args={['#141a2a']}/><fog attach="fog" args={['#141a2a',26,58]}/>
    <ambientLight intensity={1.2}/><hemisphereLight intensity={1.3} groundColor="#475064"/>
    <directionalLight castShadow position={[7,18,9]} intensity={2.2} shadow-mapSize={[2048,2048]} shadow-camera-left={-18} shadow-camera-right={18} shadow-camera-top={18} shadow-camera-bottom={-18}/>
    <pointLight color="#9e8cf5" position={[-8,7,-6]} intensity={35} distance={25}/>
    <RoundedBox args={[19.8,.48,15.7]} radius={.16} smoothness={4} position={[0,-.37,0]} receiveShadow castShadow><meshStandardMaterial color="#252b42" roughness={.85}/></RoundedBox>
    <RoundedBox args={[17.7,.15,13.6]} radius={.06} smoothness={4} position={[0,-.07,0]} receiveShadow><meshStandardMaterial color="#141a2d" roughness={.8}/></RoundedBox>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.68,0]} receiveShadow><planeGeometry args={[180,180]}/><meshStandardMaterial color="#111627"/></mesh>
    <ContactShadows position={[0,-.60,0]} opacity={.48} scale={27} blur={2.3} far={8}/>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,.035,0]}><ringGeometry args={[4.3,4.38,80]}/><meshBasicMaterial color="#6656a4" transparent opacity={.5}/></mesh>
    <Html position={[0,.26,0]} center transform sprite distanceFactor={13} style={{pointerEvents:'none'}}><div className="board-center"><div className="board-center-icon">✦</div><div className="board-center-title">탓승마블</div><div className="board-center-sub">ROLL · BUILD · CONQUER</div><div className="board-center-line"/></div></Html>
    {tiles.map(tile=><Tile key={tile.id} tile={tile} isSelected={selected===tile.id} onSelect={onSelect} occupants={players.filter(p=>p.position===tile.id&&!p.bankrupt)}/>)}
    <OrbitControls enablePan={false} minDistance={16} maxDistance={36} maxPolarAngle={Math.PI/2.6} minPolarAngle={.50} target={[0,.45,0]}/>
  </>;
}
export default function Board3D({tiles=[],players=[],selected,onSelect=()=>{}}){
  return <div className="three-board"><Canvas shadows dpr={[1,1.65]} camera={{position:[19,23,21],fov:42,near:.1,far:100}} gl={{antialias:true}}><Suspense fallback={null}><Scene tiles={tiles} players={players} selected={selected} onSelect={onSelect}/></Suspense></Canvas><div className="camera-hint">↻ 드래그로 회전 · 스크롤로 확대</div></div>
}
