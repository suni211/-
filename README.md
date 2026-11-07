# ✦ 탓승마블 (Tatsung Marble)

브라우저에서 즐기는 독자적인 **2.5D / 2~4인 실시간 온라인 보드게임**. CSS 기반 경량 2.5D 보드, 캐릭터 말, Node.js + Socket.IO 서버, MySQL 계정 저장, GCP Compute Engine Docker Compose 배포를 포함합니다.

## 구현 기능

- 회원가입 / 로그인 (`bcrypt`, `JWT` + HttpOnly 쿠키) / MySQL 사용자 및 승패 통계
- 2~4인 공개방 목록 및 6자리 초대 코드로 입장하는 비공개방
- **41칸** 2.5D 순환 보드 (0~40, 40 → 0), 지정된 지역명, 첫 건설 자동 소유 / 관광지 소유 / 통행료
- 건물 **빈 땅 → 소도시 → 마을 → 국가 → 랜드마크** 업그레이드 (관광지는 별도 소유 자산)
- 서버 측 `crypto.randomInt()`로 결정하는 주사위 2개, 턴 상태 강제, 게임머니 **1,000,000 G**부터 시작
- 찬스카드 **14종**, 홀짝 미니게임, 감옥, 공항, 올림픽, 국세청
- 승리: **트리플 독점 ×2**, **다른 모든 플레이어 파산 ×2.5**, **라운드 종료 ×1**, **관광지 독점 ×4**
- 저사양에도 가벼운 2.5D 보드 및 단계별/지역별 건물 아이콘, 제공된 캐릭터 그림을 참고한 캐릭터 말 4색, 공유 주사위 및 1칸씩 보이는 이동 연출.
- Socket.IO 재접속 시 기존 게임방 복귀 (서버 프로세스가 살아 있는 동안)

> **MVP 및 규칙 가정:** 사용자가 정하지 않은 시작 칸 통과 보너스는 **100,000 G**, 최대 게임 길이는 **25라운드**, 일반 지역은 **첫 건설로 자동 소유(첫 단계 대략 30,000~90,000 G)**, 관광지 소유 가격은 **120,000 G**, 건물 업그레이드 비용은 매입가 기준 단계별 계산값으로 임시 적용했습니다. 홀짝은 정답 +300,000 / 오답 -150,000 G, 국세청은 보유 골드 10%, 감옥은 2회 대기, 올림픽은 8턴 동안 소유 도시 통행료 2배입니다. 확정된 사용자의 숫자와 규칙으로 변경 가능합니다.
>
> **승리 배수**는 결과 화면과 승패 기록에 표시됩니다. 별도의 영구 보상 재화/계정 지갑 지급은 기본 보상액이 아직 미정이므로 구현하지 않았습니다.

## 로컬 개발

Node.js 22+, MySQL 8.4가 필요합니다.

```bash
npm install
npm --prefix web install
# MySQL에 database/user 생성 후 환경 변수 설정
export MYSQL_HOST=127.0.0.1
export MYSQL_USER=tatsung
export MYSQL_PASSWORD='your-local-mysql-password'
export MYSQL_DATABASE=tatsung_marble
export JWT_SECRET="$(openssl rand -hex 32)"
npm run dev:server
# 다른 터미널
npm run dev:web
```

웹 `http://localhost:5173`, API `http://localhost:3000`, 게임 상태는 서버 메모리, 계정/통계는 MySQL에 저장됩니다. `npm test`로 규칙 엔진 테스트를 실행합니다.

## GCP Compute Engine VM 배포 (Ubuntu 24.04)

1. **Compute Engine**에서 Ubuntu 24.04 VM 생성. 2 vCPU / 8 GB RAM 이상 권장, 적절한 영구 디스크, **고정 외부 IP** 설정. **HTTP(80), HTTPS(443) 허용**. SSH(22)는 가능한 본인 IP 또는 IAP로 제한.
2. VM에 SSH로 접속 후 Git 및 Docker 설치. 예시:

```bash
sudo apt-get update && sudo apt-get install -y git
sudo git clone 'https://github.com/suni211/-.git' /opt/tatsung-marble
sudo chown -R "$USER":"$USER" /opt/tatsung-marble
cd /opt/tatsung-marble
sudo bash scripts/setup-vm.sh
# 그룹 변경 사항이 적용되도록 로그아웃 후 재접속
```

3. DB/JWT 비밀번호를 VM 내부에서만 지정 (`.env` Git 커밋 금지):

```bash
cd /opt/tatsung-marble
cp .env.example .env
# MYSQL_ROOT_PASSWORD, MYSQL_PASSWORD, JWT_SECRET을 서로 다른 충분히 긴 난수로 교체
openssl rand -hex 32  # 난수 생성 예시 (한 번에 하나씩 생성해 .env 수정)
chmod 600 .env
```

4. 도메인의 A 레코드를 VM 고정 IP에 연결하고 `.env`의 `SITE_ADDRESS=game.yourdomain.com` 형태로 변경하면 **Caddy가 TLS 인증서를 자동 발급**합니다. 도메인이 아직 없다면 `SITE_ADDRESS=:80`으로 HTTP 테스트는 가능하지만 비밀번호를 쓰는 공개 운영에는 HTTPS를 권장합니다.
5. 실행:

```bash
cd /opt/tatsung-marble
docker compose --env-file .env up -d --build
docker compose ps
docker compose logs -f --tail=100 app
curl http://127.0.0.1/api/health
```

## GitHub Actions 자동 배포

`.github/workflows/deploy.yml`은 `main`에 push될 때 Node 22에서 테스트·웹 빌드 검증을 수행합니다. 실제 VM 자동 배포는 GitHub 저장소 **Settings → Secrets and variables → Actions**에서 아래를 설정한 다음 `GCE_DEPLOY_ENABLED=true` 변수를 등록해야만 활성화됩니다.

| 이름 | 타입 | 설명 |
|---|---|---|
| `GCE_HOST` | Secret | VM 고정 외부 IP/도메인 |
| `GCE_USER` | Secret | SSH 가능한 Ubuntu 사용자 |
| `GCE_SSH_KEY` | Secret | 이 VM에 등록된 **배포 전용** 비밀 SSH 키 |
| `GCE_SSH_KNOWN_HOSTS` | Secret | **신뢰할 수 있는 경로에서 검증한** 해당 VM의 SSH 호스트 키 정보 |
| `GCE_DEPLOY_ENABLED` | Variable | `true` 설정 시 자동 배포 수행 |

VM에는 `/opt/tatsung-marble` 디렉터리가 Git clone 상태여야 하고, 배포 사용자가 Docker Compose를 실행할 권한이 있어야 합니다. 서버 `.env` 값은 GitHub 저장소/Actions 로그에 기록하지 않습니다.

## 소스 구조

```text
server/data.js          지역 41칸, 그룹, 카드 14종, 설정
server/engine.js        서버 권한형 턴/경제/게임 승리 규칙
server/index.js         MySQL 인증 + Express API + Socket.IO
server/engine.test.js   규칙 단위 테스트
web/src/Board25D.jsx     경량 2.5D 보드/건물/캐릭터
web/src/App.jsx         로그인·로비·게임방·게임 UI
web/src/styles.css      반응형 UI 스타일
compose.yaml            MySQL + Node 웹앱 + Caddy
Dockerfile              웹 빌드, 서버 런타임
Caddyfile               HTTPS 역방향 프록시
.github/workflows/      검증과 SSH 자동 배포
```

## 운영상 주의

- **현재 게임방 정보는 Node 서버 메모리에 있습니다.** VM 재시작 또는 컨테이너 재배포 시 진행 중인 게임은 사라집니다. MySQL에 계정과 결과 통계만 영속 저장합니다. 안정적인 장기 서비스는 Redis나 DB에 경기 상태 저장, 멀티 인스턴스 룸 동기화, AFK 정책 및 복구 로직 강화가 필요합니다.
- 도메인 기반 HTTPS 활성화 전에는 실계정 비밀번호를 사용한 공개 서비스 운영을 피하세요.
- 도메인, GCP VM 주소/SSH 자격 증명이 제공되지 않으면 GitHub에 코드를 올릴 수는 있지만 **Compute Engine 실제 서버 실행은 별도 절차**입니다.
- 원작 로고나 원작 게임 자산을 복사하지 않은 독립적 프로토타입입니다.

## 2026-11-07 업데이트: 경량 2.5D HUD와 참가 판돈

- **계정 판돈: 5,000,000 G** (경기 시작 시 계정 잔액에서 예약). 이 값은 게임 보드에서 사용하는 돈이 아닙니다.
- **게임 보드 시작 자금: 1,000,000 G**, 게임 중 주사위/땅값/통행료에만 사용합니다.
- 승리 시 계정 판돈 500만 G에 승리 유형 배수를 적용합니다. 규칙상 미정인 배수 간 중복 및 추가 분배는 하지 않습니다.
- 도시를 구매하면 빈 땅으로 시작. 방문당 건설 1회/1단계, **스타트 3바퀴 완료 후 방문당 한 번에 3단계 건설 선택 가능** (돈과 최대 레벨이 허용하는 경우).
- 관광지 네 곳(5, 17, 22, 31)을 한 사람이 모두 소유하면 즉시 ×4 관광지 독점 승리.
- 수호천사 카드는 보유하거나 즉시 보호막으로 활성화 가능. 보유형 수호천사는 차례에 사용합니다.
- 공항에서 목적지 지정 가능, 도착한 칸의 효과 적용. 자동 턴 종료는 서버가 처리합니다.
- 2.5D HUD 중앙에 동기화된 주사위 연출, 주사위 결과에 따라 캐릭터가 한 칸씩 이동합니다. 시각적 애니메이션은 각 브라우저가 같은 서버 결과로 재생합니다.

### Debian 12의 기존 호스트 Nginx 유지하기 (modu.berrple.com)

이 VM에는 다른 서비스를 제공하는 **호스트 Nginx**가 이미 80·443 포트를 쓰고 있습니다. Caddy를 같이 띄우지 않고 nginx 전용 Compose 추가 파일을 사용하세요.

```bash
cd /opt/tatsung-marble
# 최초 또는 업데이트 시 GitHub 최신 코드 반영 (서버 .env와 로컬 compose.override.yaml은 보존)
git pull --ff-only origin main
# 기존 로컬 compose.override.yaml이 있다면 app 포트 매핑이 중복되지 않도록 하나만 사용
sudo docker compose -f compose.yaml -f compose.nginx.yaml --env-file .env up -d --build db app
curl http://127.0.0.1:3001/api/health
```

Nginx의 `modu.berrple.com` 가상 호스트는 `proxy_pass http://127.0.0.1:3001;`로 연결합니다. HTTP 및 HTTPS 관리는 기존 Nginx와 Certbot이 담당합니다. `docker compose down -v`는 절대 실행하지 마세요.

> GitHub 소스가 아직 이전 버전이라면 이 업데이트 패키지를 먼저 GitHub 저장소에 커밋/푸시해야 합니다. 서버에서 `git pull`만 해서는 이 파일에 포함된 변경 사항이 반영되지 않습니다.

## 2026-11-07 최종 룰 및 HUD 수정

- **41칸 보드** (0~40). 이전 37칸에 푸른항구(37), 유리도시(38), 별빛마을(39), 황금섬(40) 추가. 모든 주사위 이동은 실제 배열 길이를 사용합니다.
- **스타트 통과 보너스 +100,000 G**, 시작 게임머니 1,000,000 G, 참가 판돈 5,000,000 G는 별도입니다.
- 일반 도시는 별도 땅 구매가 없으며 **빈 지역에 1단계 건설 시 자동 소유**합니다. 건설 가격은 이전보다 추가 인하해 첫 단계는 땅 기준가의 10%입니다.
- 보통 한 방문에 한 단계, 3바퀴 이후 이미 소유한 도시에서 최대 3단계까지 한 번에 건설할 수 있습니다.
- 관광지는 일반 건물과 별도로 120,000 G로 소유하며, 네 곳 모두 소유하면 즉시 승리합니다.
- **DOUBLE**: 같은 주사위 눈 두 개가 나오면 서버에서 추가 굴림을 배정하고 전원에게 동일한 주사위 결과·더블·말 이동을 전송합니다.
- 게임 UI는 다이아몬드 모양의 2.5D 41칸 보드, 뚜렷하게 색깔을 구분한 땅, 4코너 플레이어 정보, 상단 방/보상/메뉴, 중앙 ROLL 버튼으로 구성됩니다. 상시 좌우 사이드바는 없습니다.
- 건설·관광지 확보·수호천사/아이템·공항 선택·찬스카드의 필수 선택은 중앙의 **완전 불투명한 팝업**으로 열립니다.

### 기존 Debian 12 + Nginx VM 수동 배포

```bash
cd /opt/tatsung-marble
git stash push -m 'pre-41-board-backup'
git pull --ff-only origin main
sudo docker compose -f compose.yaml -f compose.nginx.yaml --env-file .env up -d --build db app
curl http://127.0.0.1:3001/api/health
```

MySQL 데이터 볼륨은 재배포해도 유지됩니다. 메모리 기반으로 진행되는 현재 게임방은 재배포 시 초기화됩니다.
