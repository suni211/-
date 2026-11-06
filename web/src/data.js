export const NAMES=['스타트','NDK 영구동토','나크시','홀 짝 미니게임','노벨피아','병건이네 집','한양','경성','매화','감옥','신안','광주','여수','찬스카드','오하이오','디트로이트','플로리다','독도','올림픽 개최','망고 하이닉스','망고 삼성전자','망고 샌디스크','망고네집','찬스카드','노보로시스크','이라크','헤자즈','공항','뉴욕에 온 나','니게니게 (프랑스)','잠깐 피라미드좀 짓고 (이집트)','지하실','찬스카드','곰돌이왕국','서리곰마을','스텔라이브','국세청'];
export const PREVIEW_TILES=NAMES.map((name,id)=>({id,name,group:Math.floor(id/5)%8,type:[5,17,22,31].includes(id)?'tourist':[13,23,32].includes(id)?'chance':id===0?'start':id===9?'jail':id===3?'minigame':id===18?'olympics':id===27?'airport':id===36?'tax':'property',ownerId:null,level:0}));
export const CHARACTERS=[{id:'tatsung',name:'탓승'},{id:'mint',name:'민트'},{id:'berry',name:'베리'},{id:'sky',name:'하늘'}];
export const BUILD_LEVELS=['빈 땅','소도시','마을','국가','랜드마크'];
