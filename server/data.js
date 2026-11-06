// Canonical game content; edit region prices and balance here, not in the client.
export const START_GOLD = 5_000_000;
export const START_BONUS = 200_000; // Provisional rule until the owner chooses a value.
export const MAX_ROUNDS = 25; // Full rounds, provisional.
export const BUILD_LEVELS = ['빈 땅', '소도시', '마을', '국가', '랜드마크'];
export const GROUPS = [
  [1,2,4],[6,7,8],[10,11,12],[14,15,16],
  [19,20,21],[24,25,26],[28,29,30],[33,34,35]
];
export const TOURIST_IDS = [5,17,22,31];
const NAMES = [
  '스타트','NDK 영구동토','나크시','홀 짝 미니게임','노벨피아','병건이네 집',
  '한양','경성','매화','감옥','신안','광주','여수','찬스카드','오하이오',
  '디트로이트','플로리다','독도','올림픽 개최','망고 하이닉스','망고 삼성전자',
  '망고 샌디스크','망고네집','찬스카드','노보로시스크','이라크','헤자즈',
  '공항','뉴욕에 온 나','니게니게 (프랑스)','잠깐 피라미드좀 짓고 (이집트)',
  '지하실','찬스카드','곰돌이왕국','서리곰마을','스텔라이브','국세청'
];
export const TILES = NAMES.map((name,id) => {
  const type = id === 0 ? 'start' : id === 9 ? 'jail' : id === 3 ? 'minigame'
    : id === 18 ? 'olympics' : id === 27 ? 'airport' : id === 36 ? 'tax'
    : [13,23,32].includes(id) ? 'chance' : TOURIST_IDS.includes(id) ? 'tourist' : 'property';
  const group = GROUPS.findIndex(a=>a.includes(id));
  const price = type === 'tourist' ? 750_000 : type === 'property' ? 300_000+Math.max(group,0)*75_000 : 0;
  return {id,name,type,group,price,toll:Math.floor(price*0.10)};
});
export const CHARACTERS = [
  {id:'tatsung',name:'탓승',color:'#ffd348'},
  {id:'mint',name:'민트',color:'#75e6bc'},
  {id:'berry',name:'베리',color:'#ff79a4'},
  {id:'sky',name:'하늘',color:'#91bfff'}
];
export const CHANCE_CARDS = [
  {id:'city_swap',name:'도시 바꾸기',description:'랜드마크를 제외한 내 도시와 상대 도시를 교환합니다.'},
  {id:'forced_sale',name:'도시 강제매각',description:'상대의 랜드마크가 아닌 도시를 은행에 강제 매각합니다.'},
  {id:'guardian',name:'수호천사',description:'다음 통행료를 1회 방어합니다.'},
  {id:'free_acquire',name:'인수 무료',description:'랜드마크가 아닌 상대 도시를 만났을 때 무료 인수가 가능합니다.'},
  {id:'airport',name:'공항으로',description:'공항(27번)으로 이동합니다.'},
  {id:'jail',name:'감빵으로',description:'감옥(9번)으로 이동합니다.'},
  {id:'escape',name:'감빵 탈옥권',description:'감옥에서 사용할 탈옥권을 얻습니다.'},
  {id:'tax',name:'국세청으로',description:'국세청(36번)으로 이동하여 세금을 냅니다.'},
  {id:'olympics',name:'올림픽 개최하러',description:'올림픽 개최 칸(18번)으로 이동합니다.'},
  {id:'start',name:'스타트지점으로',description:'스타트(0번)로 이동합니다.'},
  {id:'random_me_to_them',name:'아무한테 랜덤으로',description:'다른 플레이어가 있는 칸으로 순간이동합니다.'},
  {id:'random_them_to_me',name:'아무나 나한테 랜덤으로',description:'무작위 상대를 내 칸으로 불러옵니다.'},
  {id:'extra_roll',name:'주사위 1번 더',description:'이번 턴에 주사위를 한 번 더 던집니다.'},
  {id:'free_build',name:'아무 곳이나 1개 건물 더짓기',description:'내 건물 하나를 무료로 한 단계 업그레이드합니다.'}
];
export const WIN_MULTIPLIERS = {triple:2,bankruptcy:2.5,turn_end:1,tourist:4};
