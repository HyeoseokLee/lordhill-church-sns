# Fly.io + TiDB Cloud 이전 플랜

> AWS EC2 + RDS → Fly.io (서버) + TiDB Cloud Serverless (DB)
> 프론트(S3+CloudFront), 이미지(S3)는 AWS 유지

---

## 접근방식

Fly.io에 Express 서버를 Docker 컨테이너로 배포하고, TiDB Cloud Serverless를 MySQL 호환 DB로 사용.
DNS 전환으로 다운타임 최소화. 문제 시 DNS 복구로 즉시 롤백.

---

## 아키텍처

```
사용자 (iOS/Android WebView)
  |
CloudFront (HTTPS + CDN) → S3 (프론트 빌드) ← AWS 유지
  | API 호출
  v
Fly.io (api.lordhill-sns.kr)
  ├── Express 서버 (Docker 컨테이너)
  ├── SSL 자동 (Fly.io 내장)
  └── 환경변수 (fly secrets)
        |
        v
TiDB Cloud Serverless (MySQL 호환, SSL)
  └── 5GB 무료, 포트 4000

이미지: S3 (lordhill-sns-media) ← AWS 유지
```

**기존 대비 변경:**
- EC2 + nginx + certbot + PM2 → **Fly.io** (Docker + 자동 SSL + 자동 프로세스 관리)
- RDS MySQL → **TiDB Cloud** (MySQL 호환, SSL 필수, 포트 4000)
- S3, CloudFront → 그대로
- 도메인: `api` CNAME을 Fly.io 앱 주소로 변경

---

## 단계별 플랜

### Phase 1: TiDB Cloud 세팅

#### 1-1. TiDB Cloud 가입
- https://tidbcloud.com 가입 (GitHub/Google 계정 가능)
- 카드 등록 불필요

#### 1-2. Serverless 클러스터 생성
- Cluster Tier: **Serverless** (Starter)
- Region: **ap-northeast-1 (Tokyo)** — 한국과 가장 가까운 리전
- Cluster Name: `lordhill-sns`
- 생성 후 **Connection 정보 메모:**
  - Host: `gateway01.ap-northeast-1.prod.aws.tidbcloud.com` (예시)
  - Port: `4000`
  - User: `xxxxxxxx.root`
  - Password: (자동 생성)

#### 1-3. DB 생성
- TiDB 콘솔의 SQL Editor에서:
```sql
CREATE DATABASE lordhill_sns;
```

### Phase 2: Fly.io 세팅

#### 2-1. Fly.io 가입 + CLI 설치
```bash
# CLI 설치
brew install flyctl

# 가입 또는 로그인
fly auth signup
# 또는
fly auth login
```
- 신용카드 등록 필요 (종량제)

#### 2-2. 프로젝트에 Fly.io 설정 추가

**Dockerfile 생성 (packages/server/Dockerfile):**
```dockerfile
FROM node:20-slim

WORKDIR /app

# 루트 package.json + workspace 구조 복사
COPY package.json package-lock.json ./
COPY packages/server/package.json packages/server/

# 의존성 설치
RUN npm install --workspace=packages/server

# 서버 소스 복사
COPY packages/server/ packages/server/

# firebase 키 (fly secrets로 대체 가능)
# COPY packages/server/firebase-service-account.json packages/server/

WORKDIR /app/packages/server
EXPOSE 3001
CMD ["node", "src/index.js"]
```

**fly.toml 생성 (packages/server/fly.toml):**
```toml
app = "lordhill-sns-api"
primary_region = "nrt"  # Tokyo (한국 가까운 리전)

[build]
  dockerfile = "Dockerfile"

[env]
  PORT = "3001"
  NODE_ENV = "production"

[http_service]
  internal_port = 3001
  force_https = true
  auto_stop_machines = "stop"
  auto_start_machines = true
  min_machines_running = 1  # 최소 1대 항상 유지 (cold start 방지)

[[vm]]
  size = "shared-cpu-1x"
  memory = "512mb"
```

#### 2-3. Fly.io 앱 생성 + 배포
```bash
cd packages/server
fly launch --no-deploy  # 앱 생성만
fly deploy              # 첫 배포
```

#### 2-4. 환경변수 설정 (fly secrets)
```bash
fly secrets set \
  DB_HOST="gateway01.ap-northeast-1.prod.aws.tidbcloud.com" \
  DB_PORT="4000" \
  DB_USERNAME="xxxxxxxx.root" \
  DB_PASSWORD="<TiDB 비밀번호>" \
  DB_DATABASE="lordhill_sns" \
  DB_SSL="true" \
  JWT_SECRET="<기존과 동일>" \
  JWT_REFRESH_SECRET="<기존과 동일>" \
  GOOGLE_CLIENT_ID="<기존>" \
  GOOGLE_CLIENT_SECRET="<기존>" \
  GOOGLE_CALLBACK_URL="https://api.lordhill-sns.kr/api/auth/google/callback" \
  KAKAO_CLIENT_ID="<기존>" \
  KAKAO_CLIENT_SECRET="<기존>" \
  KAKAO_CALLBACK_URL="https://api.lordhill-sns.kr/api/auth/kakao/callback" \
  NAVER_CLIENT_ID="<기존>" \
  NAVER_CLIENT_SECRET="<기존>" \
  NAVER_CALLBACK_URL="https://api.lordhill-sns.kr/api/auth/naver/callback" \
  AWS_ACCESS_KEY_ID="<기존>" \
  AWS_SECRET_ACCESS_KEY="<기존>" \
  AWS_REGION="ap-northeast-2" \
  AWS_S3_BUCKET="lordhill-sns-media" \
  CLIENT_URL="https://www.lordhill-sns.kr" \
  ADMIN_URL="https://admin.lordhill-sns.kr"
```

#### 2-5. 커스텀 도메인 + SSL
```bash
# 도메인 추가
fly certs add api.lordhill-sns.kr

# 출력되는 CNAME 정보 확인 → 가비아에 등록
```

### Phase 3: 코드 변경

#### 3-1. Sequelize 설정 — TiDB SSL 지원
```js
// config/default.cjs 또는 db.js에서
// TiDB Cloud는 SSL 필수 + 포트 4000
dialectOptions: {
  ssl: process.env.DB_SSL === 'true' ? {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: true,
  } : undefined,
},
```

#### 3-2. firebase-service-account.json 처리
Fly.io는 파일 시스템이 ephemeral이라 파일 직접 배치 불가.
→ **환경변수로 JSON 전달:**
```bash
fly secrets set FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...전체 JSON...}'
```

```js
// firebase.js 수정
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  : JSON.parse(readFileSync('firebase-service-account.json', 'utf8'));
```

#### 3-3. dbconfig.cjs — TiDB 호환
```js
// production 설정
production: {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '4000'),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  dialect: 'mysql',
  dialectOptions: {
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
    supportBigNumbers: true,
    enableKeepAlive: true,
  },
},
```

### Phase 4: 데이터 마이그레이션

#### 4-1. RDS에서 덤프
```bash
# EC2에서 실행
mysqldump -h <RDS엔드포인트> -u admin -p lordhill_sns > lordhill_sns_dump.sql
scp -i lordhill-key.pem ec2-user@15.164.129.119:~/lordhill_sns_dump.sql ./
```

#### 4-2. TiDB에 복원
```bash
# TiDB Cloud 콘솔의 "Import" 기능 사용
# 또는 mysql CLI로 (로컬에서 TiDB에 직접 연결 가능 — 퍼블릭 접근)
mysql -h <TiDB-Host> -P 4000 -u <TiDB-User> -p --ssl-mode=VERIFY_IDENTITY lordhill_sns < lordhill_sns_dump.sql
```

#### 4-3. 마이그레이션 실행
```bash
# Fly.io에서 실행
fly ssh console
cd /app/packages/server
npx sequelize-cli db:migrate
npx sequelize-cli db:seed:all
```

### Phase 5: DNS 전환

#### 5-1. 가비아 DNS 변경
- 기존: `api` A 레코드 → `15.164.129.119` (EC2)
- 변경: `api` CNAME → `lordhill-sns-api.fly.dev` (Fly.io)

주의: A → CNAME 변경이므로 기존 A 레코드 **삭제 후** CNAME 생성

#### 5-2. 검증
- `https://api.lordhill-sns.kr/api/health` 확인
- 앱 로그인 테스트
- 게시글/이미지/푸시 테스트

### Phase 6: CI/CD 업데이트

#### 6-1. Fly.io Deploy Token 생성
```bash
fly tokens create deploy -x 999999h
```

#### 6-2. GitHub Secrets 변경

| Secret | 기존 (AWS) | 변경 (Fly.io) |
|--------|-----------|--------------|
| EC2_HOST | 삭제 | - |
| EC2_SSH_KEY | 삭제 | - |
| FLY_API_TOKEN | (신규) | Fly.io deploy token |

#### 6-3. deploy-server.yml 교체
```yaml
name: Deploy Server
on:
  push:
    branches: [main]
    paths: ['packages/server/**']
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: superfly/flyctl-actions/setup-flyctl@master
        with:
          version: latest

      - run: flyctl deploy --remote-only
        working-directory: packages/server
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

### Phase 7: AWS 정리

#### 7-1. 검증 기간 (3일)
- Fly.io 정상 동작 확인 후 AWS EC2/RDS 유지

#### 7-2. AWS 리소스 삭제
```
1. EC2 인스턴스 종료
2. RDS 인스턴스 삭제 (최종 스냅샷 생성)
3. 불필요한 Security Group 삭제
4. Elastic IP 해제
```
S3, CloudFront는 삭제하지 않음!

---

## 파일 변경 목록

| 파일 | 변경 내용 |
|------|----------|
| `packages/server/Dockerfile` | 신규 생성 |
| `packages/server/fly.toml` | 신규 생성 |
| `packages/server/src/firebase.js` | 환경변수 fallback 추가 |
| `packages/server/src/db.js` | SSL dialectOptions 추가 |
| `packages/server/dbconfig.cjs` | production에 SSL + 포트 4000 |
| `.github/workflows/deploy-server.yml` | Fly.io 배포로 교체 |
| 가비아 DNS | api A → CNAME 변경 |
| GitHub Secrets | EC2 삭제, FLY_API_TOKEN 추가 |
| `.claude/docs/project-setup-guide.md` | 섹션 6 구조 개편 |

---

## 비용

| 항목 | 월 비용 |
|------|---------|
| Fly.io VM (shared-cpu-1x, 512MB) | ~$3.30 |
| Fly.io 전용 IPv4 | $2.00 |
| Fly.io 대역폭 | ~$0.10 |
| TiDB Cloud Serverless | $0 (5GB 무료) |
| AWS S3 + CloudFront | ~$0 |
| **합계** | **~$5.40/월** |

기존 AWS $47/월 → **$5.40/월** (88% 절감)

---

## 롤백 계획

DNS만 변경하므로, 문제 시 **가비아에서 api CNAME 삭제 → A 레코드로 EC2 IP 복구**.
AWS EC2/RDS는 Phase 7 전까지 그대로 유지.
