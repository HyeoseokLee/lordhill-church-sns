# 프로젝트 세팅 가이드 (처음부터 배포까지)

> healthcare 참조 프로젝트 기반으로 새 프로젝트를 세팅하는 전체 절차.
> lordhill-church-sns 구축 과정에서의 시행착오를 모두 반영.

---

## 전체 프로세스 요약

```
1.  GitHub 레포 생성 + 로컬 Git 연결
2.  모노레포 구조 세팅 (npm workspaces)
3.  서버 초기 세팅 (Express + Sequelize)
4.  프론트 초기 세팅 (React + Vite + Tailwind)
5.  DB 세팅 (Docker + MySQL + Adminer)
6.  AWS 인프라 세팅 (EC2 + RDS + S3 + CloudFront)
7.  도메인 + HTTPS 세팅
8.  CI/CD 세팅 (GitHub Actions)
9.  Google OAuth 세팅 (웹)
9-1. Kakao OAuth 세팅
9-2. Naver OAuth 세팅
10. EC2 서버 .env 세팅
11. 디자인 시스템 세팅
12. 프론트 레이아웃 패턴
13. 네이티브 앱 (iOS/Android WebView)
13-1. iOS 네이티브 Google 로그인
13-2. iOS 네이티브 Kakao/Naver 로그인
13-3. Android 네이티브 Google/Kakao/Naver 로그인
14. 어드민 프론트 배포
15. 어드민 계정 생성 (아이디/비밀번호 로그인)
16. 회원 상태 관리 (잠금/삭제/복구)
17. 푸시 알림 (FCM)
18. 푸시 탭 시 페이지 이동
19. 이미지 업로드 (Presigned URL + 네이티브 리사이징)
```

### ⚠️ 순서 중요!
- 6~7번(AWS + 도메인)을 먼저 해야 9번(OAuth) 가능 — Google은 IP 주소를 리디렉션 URI로 허용 안 함
- 7번(HTTPS)을 해야 라이브에서 OAuth 동작 — Mixed Content 차단
- 8번(CI/CD)은 6번 이후에 설정
- 13-1번(iOS 네이티브 Google)은 9번(웹 OAuth) + 13번(네이티브 앱) 이후에 진행

---

## 1. GitHub 레포 생성 + 로컬 Git 연결

### 절차
```bash
# GitHub에서 private 레포 생성 (웹 또는 CLI)
gh repo create <유저명>/<프로젝트명> --private

# 로컬에서 클론
git clone https://github.com/<유저명>/<프로젝트명>.git
cd <프로젝트명>
```

### 또는 로컬 먼저 만들고 연결
```bash
mkdir <프로젝트명> && cd <프로젝트명>
git init
gh repo create <유저명>/<프로젝트명> --private --source . --push
```

---

## 2. 모노레포 구조 세팅

### 루트 package.json
```json
{
  "name": "<프로젝트명>",
  "private": true,
  "workspaces": ["packages/*"],
  "scripts": {
    "dev:server": "npm run dev --workspace=packages/server",
    "dev:app": "npm run dev --workspace=packages/app-front",
    "build:app": "npm run build --workspace=packages/app-front",
    "lint": "npm run lint --workspace=packages/app-front && npm run lint --workspace=packages/server",
    "prettier": "npm run prettier --workspace=packages/app-front && npm run prettier --workspace=packages/server",
    "format": "npm run format --workspace=packages/app-front && npm run format --workspace=packages/server",
    "check": "npm run lint && npm run prettier && npm run type-check --workspace=packages/app-front && npm run build:app"
  },
  "devDependencies": {
    "concurrently": "^9.1.0"
  }
}
```

### 폴더 구조
```
<프로젝트명>/
├── packages/
│   ├── app-front/     # React 프론트엔드
│   ├── admin-front/   # 관리자 (선택)
│   └── server/        # Express 서버
├── docker-compose.yml
├── package.json
├── CLAUDE.md
└── DESIGN.md
```

---

## 3. 서버 초기 세팅 (Express + Sequelize)

### 참고 프로젝트
`~/Documents/cheeze/healthcare/healthcare-api-server`

### 핵심 구조
```
packages/server/
├── src/
│   ├── index.js          # 진입점 (dotenv, DB 연결, 서버 시작)
│   ├── app.js            # Express 미들웨어 체인
│   ├── db.js             # Sequelize 인스턴스, 모델 등록
│   ├── err.js            # 에러 정의 + 글로벌 핸들러
│   ├── define.js         # 상수 (userRole, userStatus 등)
│   ├── middlewares.js    # 인증 미들웨어
│   ├── logger.js         # Winston 로거
│   ├── passport/         # JWT + OAuth 전략
│   ├── uploader/         # multer-s3 + Sharp
│   ├── validator/        # Zod 요청 검증
│   └── <도메인>/         # models/ controllers/ routes/ 각각
├── config/
│   └── default.cjs       # config 패키지 설정
├── migrations/           # Sequelize 마이그레이션 (CJS)
├── .env
├── .sequelizerc
├── dbconfig.cjs
└── package.json
```

### 주요 의존성
```bash
npm install express sequelize mysql2 cors helmet jsonwebtoken passport passport-google-oauth20 passport-jwt cookie-parser dotenv config multer multer-s3 sharp @aws-sdk/client-s3 @aws-sdk/s3-request-presigner zod winston winston-daily-rotate-file express-async-handler express-rate-limit uuid
npm install -D eslint prettier eslint-config-prettier nodemon sequelize-cli
```

### ESLint + Prettier (healthcare 패턴)
```json
// .prettierrc
{
  "singleQuote": true,
  "semi": true,
  "useTabs": false,
  "tabWidth": 2,
  "trailingComma": "all",
  "printWidth": 80
}
```

### 마이그레이션 명령
```bash
npm run migration -- <이름>    # 마이그레이션 파일 생성
npm run mig-all                # 마이그레이션 실행
npm run undo-migration         # 마지막 마이그레이션 롤백
```

### ⚠️ 시행착오
- Sequelize dbconfig.cjs에서 development/production 포트가 다를 수 있음 (로컬 3307, RDS 3306)
- `"type": "module"` 사용 시 config 파일은 `.cjs` 확장자 필요
- 마이그레이션 파일도 `.cjs`

---

## 4. 프론트 초기 세팅 (React + Vite + Tailwind)

### 참고 프로젝트
`~/Documents/cheeze/healthcare/healthcare-front`

### 생성
```bash
cd packages
npm create vite@latest app-front -- --template react-ts
cd app-front && npm install
```

### 핵심 의존성
```bash
npm install @mui/material @emotion/react @emotion/styled zustand swr axios react-router-dom lucide-react
npm install -D @tailwindcss/vite @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-plugin-react-hooks eslint-plugin-react-refresh prettier
```

### 폴더 구조
```
src/
├── api/           # axiosInstance + 도메인별 API 모듈
├── assets/        # 이미지, SVG
├── components/
│   ├── atoms/     # 기본 컴포넌트
│   ├── common/    # FullHeightBox, BottomNavigation
│   └── frame/     # MainLayout, ThemeProvider
├── config/        # define.ts (상수, API_BASE_URL)
├── hooks/
│   └── api/       # SWR 훅 (useFeed, usePost 등)
├── pages/         # 페이지별 폴더
├── router/        # Router.tsx
├── stores/        # Zustand (authStore, uiStore)
├── types/         # 타입 정의
├── util/          # 유틸 함수
├── index.css      # Tailwind + 디자인 토큰
└── main.tsx       # 진입점
```

### vite.config.js 핵심 설정
```js
export default defineConfig({
  plugins: [react(), tailwindcss(), svgr()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  server: {
    host: true,
    port: 5173,
    proxy: { '/api': { target: 'http://127.0.0.1:3001', changeOrigin: true } },
  },
});
```

### ESLint (flat config)
```js
// eslint.config.js 핵심
rules: {
  'no-unused-vars': 'off',
  '@typescript-eslint/no-unused-vars': ['warn', { varsIgnorePattern: '^[A-Z_]' }],
  '@typescript-eslint/no-explicit-any': 'off',
  'no-undef': 'off',  // TypeScript가 처리
}
globalIgnores(['dist', 'build', 'node_modules', '**/*.d.ts'])
```

### Prettier (healthcare 패턴)
```json
{
  "singleQuote": true,
  "semi": true,
  "tabWidth": 2,
  "trailingComma": "all",
  "printWidth": 80,
  "arrowParens": "avoid"
}
```

### ⚠️ 시행착오
- ESLint flat config에서 `.d.ts` 파일을 globalIgnores로 제외해야 함
- `no-undef`를 off — TypeScript가 타입 체크하므로 불필요
- MUI v9에서 `PaperProps` → `slotProps.paper`로 변경됨

---

## 5. DB 세팅 (Docker)

### docker-compose.yml
```yaml
services:
  mysql:
    image: mysql:8.0
    container_name: <프로젝트>-mysql
    ports:
      - "3307:3306"
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: <db명>
    volumes:
      - mysql_data:/var/lib/mysql
    command: --default-authentication-plugin=mysql_native_password

  adminer:
    image: adminer
    container_name: <프로젝트>-adminer
    ports:
      - "8081:8080"
    depends_on:
      - mysql

volumes:
  mysql_data:
```

### Adminer 접속
- 브라우저: `http://localhost:8081`
- 서버: `mysql` (Docker 컨테이너 이름, localhost 아님!)
- 사용자: `root`, 비밀번호: `rootpassword`

### ⚠️ 시행착오
- Adminer에서 로컬 DB 접속 시 서버를 `127.0.0.1:3307`이 아닌 `mysql` (컨테이너 이름)로 입력해야 함
- Docker 네트워크 내부에서는 컨테이너 이름이 호스트명

---

## 6. 인프라 세팅

서버와 DB를 호스팅하는 인프라. 두 가지 옵션 중 택 1.
프론트 배포(S3 + CloudFront)와 이미지 저장(S3)은 어느 옵션이든 AWS를 사용한다.

- **옵션 1: 저가 인프라** — Fly.io (서버) + TiDB Cloud (DB). 월 ~$5. 영구 사용 가능
- **옵션 2: 비즈니스 인프라** — AWS EC2 (서버) + RDS (DB). 프리 티어 12개월 무료, 이후 월 ~$47

---

### 옵션 1: 저가 인프라 (Fly.io + TiDB Cloud)

Fly.io에 Express 서버를 Docker 컨테이너로 배포하고, TiDB Cloud Serverless를 MySQL 호환 DB로 사용.
nginx, certbot, PM2 불필요 — Fly.io가 SSL, 프로세스 관리, 배포를 모두 처리.

**아키텍처:**
```
사용자 → CloudFront → api.<도메인> → Fly.io (Docker 컨테이너, Express)
                                       ↓
                                    TiDB Cloud Serverless (MySQL 호환, SSL)

이미지 업로드: Fly.io → AWS S3 (기존 그대로)
```

**비용:**
| 항목 | 월 비용 |
|------|---------|
| Fly.io VM (shared-cpu-1x, 512MB) | ~$3.30 |
| Fly.io 전용 IPv4 | $2.00 |
| TiDB Cloud Serverless (5GB) | $0 |
| **합계** | **~$5.30** |

#### 6-1-1. TiDB Cloud 가입 + 클러스터 생성

**A. 가입**
1. https://tidbcloud.com 접속
2. GitHub 또는 Google 계정으로 가입 (카드 등록 불필요)
3. 가입 시 질문들:
   - Database: **MySQL** 선택
   - Programming language: **JavaScript** 선택
   - Company: 아무거나 (개인이면 본인 이름)

**B. 클러스터(DB) 생성**
1. **Create Resource** 클릭
2. Plan: **Starter** (무료)
3. Instance Name: `<프로젝트명>` (예: `lordhill-sns`)
4. Cloud Provider: **AWS**
5. Region: **ap-northeast-1 (Tokyo)** — 한국과 가장 가까운 리전
6. Capacity (Monthly Spending Limit): **$0** 그대로
7. **Create** 클릭

**C. DB 생성**
- 클러스터 대시보드 → SQL Editor에서 실행:
```sql
CREATE DATABASE <db명>;
```

**D. Connection 정보 확인**
- 클러스터 클릭 → **Connect** 버튼
- Host, Port(4000), User, Password 메모
- ⚠️ **비밀번호는 이 시점에 따로 저장!** 나중에 안 보임. 분실 시 Reset 필요

#### 6-1-2. Fly.io 가입 + CLI 설치

**A. CLI 설치**
```bash
brew install flyctl
```

**B. 가입**
- https://fly.io 에서 회원가입 (Google 로그인 가능)
- **신용카드 등록 필수** — 등록 안 하면 5분 후 머신 자동 종료됨
  - 카드 등록: `fly billing add` 또는 https://fly.io/trial

**C. CLI 로그인**
```bash
fly auth login
```

#### 6-1-3. 코드 변경 (서버)

**A. Dockerfile 생성 (`packages/server/Dockerfile`)**
```dockerfile
FROM node:20-slim

WORKDIR /app

# package.json 복사 + 의존성 설치
COPY package.json ./
RUN npm install --omit=dev

# 소스 복사
COPY . .

EXPOSE 3001
ENV NODE_CONFIG_DIR=./config
CMD ["node", "src/index.js"]
```

**B. fly.toml 생성 (`packages/server/fly.toml`)**
```toml
app = '<앱이름>'
primary_region = 'nrt'  # Tokyo

[build]

[env]
  NODE_CONFIG_DIR = './config'
  NODE_ENV = 'production'
  PORT = '3001'

[http_service]
  internal_port = 3001
  force_https = true
  auto_stop_machines = 'stop'
  auto_start_machines = true
  min_machines_running = 1  # 최소 1대 유지 (cold start 방지)

[[vm]]
  size = 'shared-cpu-1x'
  memory = '512mb'
```

**C. config/default.cjs — TiDB SSL 지원 추가**

`dialectOptions` 안에 SSL 설정 추가. TiDB Cloud Serverless는 SSL 필수.

```js
dialectOptions: {
  charset: 'utf8mb4_general_ci',
  // TiDB Cloud Serverless는 SSL 필수 (공식 샘플 기준)
  ssl:
    process.env.DB_SSL === 'true'
      ? { minVersion: 'TLSv1.2', rejectUnauthorized: true }
      : null,
},
```

⚠️ **공식 TiDB 샘플 (tidb-samples/tidb-nodejs-sequelize-quickstart) 기준:**
- `rejectUnauthorized: true` 사용 (Node.js 내장 Mozilla CA가 TiDB Cloud를 신뢰)
- SSL 비활성화 시 `null` 반환 (`undefined`가 아님!)
- `ssl: true` (boolean) 사용 불가 — "SSL profile must be an object" 에러

**D. config/default.cjs — DB 포트 정수 변환**

환경변수는 문자열이므로 parseInt 필수:
```js
port: parseInt(process.env.DB_PORT, 10) || 3307,
```

**E. dbconfig.cjs — 동일하게 SSL 추가**
```js
dialectOptions: {
  charset: 'utf8mb4_general_ci',
  ssl:
    process.env.DB_SSL === 'true'
      ? { minVersion: 'TLSv1.2', rejectUnauthorized: true }
      : null,
},
```

**F. db.js — config 객체 deep clone**

⚠️ **핵심 시행착오:** `config` 패키지는 **immutable(읽기 전용) 객체**를 반환한다. Sequelize가 내부적으로 config 객체를 수정하려고 할 때, frozen 객체라서 **에러 없이 무한 대기(hanging)**된다.

```js
// ❌ 이렇게 하면 Sequelize가 hanging
const dbconfig = config.sequelize;

// ✅ deep clone으로 mutable 객체 전달
const dbconfig = JSON.parse(JSON.stringify(config.sequelize));
```

**G. firebase.js — 환경변수 fallback 추가**

Fly.io는 파일 시스템이 ephemeral이라 `firebase-service-account.json` 직접 배치 불가.
환경변수 `FIREBASE_SERVICE_ACCOUNT`로 JSON을 전달하는 fallback 추가:

```js
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  : JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
```

#### 6-1-4. Fly.io 앱 생성 + 배포

**A. 앱 생성**
```bash
cd packages/server
fly launch --no-deploy
```
- 기존 fly.toml 설정 사용할지 물으면 **Yes**
- Tigris 약관 동의 물으면 **No** (사용 안 함)

**B. 환경변수 설정**
```bash
fly secrets set \
  DB_HOST="<TiDB Host>" \
  DB_PORT="4000" \
  DB_USERNAME="<TiDB User>" \
  DB_PASSWORD='<TiDB 비밀번호>' \
  DB_DATABASE="<db명>" \
  DB_SSL="true" \
  JWT_SECRET="<기존과 동일>" \
  JWT_REFRESH_SECRET="<기존과 동일>" \
  GOOGLE_CLIENT_ID="<기존>" \
  GOOGLE_CLIENT_SECRET="<기존>" \
  GOOGLE_CALLBACK_URL="https://api.<도메인>/api/auth/google/callback" \
  KAKAO_CLIENT_ID="<기존>" \
  KAKAO_CLIENT_SECRET="<기존>" \
  KAKAO_CALLBACK_URL="https://api.<도메인>/api/auth/kakao/callback" \
  NAVER_CLIENT_ID="<기존>" \
  NAVER_CLIENT_SECRET="<기존>" \
  NAVER_CALLBACK_URL="https://api.<도메인>/api/auth/naver/callback" \
  AWS_ACCESS_KEY_ID="<기존>" \
  AWS_SECRET_ACCESS_KEY="<기존>" \
  AWS_REGION="ap-northeast-2" \
  AWS_S3_BUCKET="<이미지 버킷명>" \
  CLIENT_URL="https://www.<도메인>" \
  ADMIN_URL="https://admin.<도메인>"
```

⚠️ **비밀번호에 특수문자가 있으면 작은따옴표로 감싸기:** `DB_PASSWORD='abc!@#'`

Firebase 푸시를 사용하면:
```bash
fly secrets set FIREBASE_SERVICE_ACCOUNT='<firebase-service-account.json 전체 내용>'
```

**C. fly.toml에 자동 마이그레이션 설정**

`fly deploy` 시 마이그레이션이 자동 실행되도록 `[deploy]` 섹션을 추가한다.
이 설정이 없으면 새 테이블/컬럼 추가 시 수동으로 `flyctl ssh console -a <앱이름> -C "npx sequelize-cli db:migrate"`를 실행해야 한다.

```toml
# fly.toml
[deploy]
  release_command = "npx sequelize-cli db:migrate"
```

- `release_command`는 새 버전이 배포되기 **전에** 별도 임시 VM에서 실행됨
- 마이그레이션 실패 시 배포가 중단되므로 안전
- 시더(`db:seed:all`)는 여기에 넣지 않는다 — 중복 방지 로직이 없으면 매 배포마다 중복 삽입됨

**D. 배포**
```bash
fly deploy
```

**D. 머신 2대 생성 시 1대로 줄이기**
```bash
fly status  # 머신 목록 확인
fly machine destroy <불필요한 머신 ID>
```

**E. 배포 확인**
```bash
# 로그 확인
fly logs

# 상태 확인
fly status

# 브라우저에서 확인
# https://<앱이름>.fly.dev/api/auth/me → {"message":"unauthorized","code":3} 나오면 성공
```

#### 6-1-5. DB 마이그레이션 + 데이터 이전 (기존 RDS → TiDB)

기존 AWS RDS에 데이터가 있는 경우, 테이블 생성(마이그레이션) 후 데이터를 이전한다.

**A. Fly.io에서 마이그레이션 + 시더 실행**

> fly.toml에 `release_command = "npx sequelize-cli db:migrate"` 설정이 있으면 `fly deploy` 시 마이그레이션이 자동 실행된다 (6-1-4-C 참조). 아래는 수동 실행이 필요한 경우.

```bash
# 원격에서 직접 실행 (SSH 접속 없이)
flyctl ssh console -a <앱이름> -C "npx sequelize-cli db:migrate"
flyctl ssh console -a <앱이름> -C "npx sequelize-cli db:seed:all"

# 또는 SSH 접속 후 실행
fly ssh console
npx sequelize-cli db:migrate
npx sequelize-cli db:seed:all
exit
```

**B. RDS에서 데이터 덤프 (EC2 경유)**
```bash
ssh -i <키>.pem ec2-user@<EC2-IP> "mysqldump -h <RDS엔드포인트> -u admin -p'<RDS암호>' <db명> --no-create-info --complete-insert > ~/dump.sql && echo DONE"
```
- `--no-create-info`: 테이블 생성문 제외 (마이그레이션으로 이미 생성)
- `--complete-insert`: 전체 컬럼명 포함 (TiDB 호환)

**C. 로컬로 가져오기**
```bash
scp -i <키>.pem ec2-user@<EC2-IP>:~/dump.sql ~/dump.sql
```

**D. TiDB 기존 데이터 정리 + 복원**

덤프 파일에 SequelizeMeta(마이그레이션 기록)와 users(시더 데이터)가 포함되어 충돌하므로 먼저 삭제:
```bash
# 로컬 mysql 클라이언트 설치: brew install mysql-client
/opt/homebrew/opt/mysql-client/bin/mysql -h <TiDB-Host> -P 4000 -u <TiDB-User> -p'<TiDB암호>' --ssl-mode=REQUIRED <db명> -e "DELETE FROM users;"
/opt/homebrew/opt/mysql-client/bin/mysql -h <TiDB-Host> -P 4000 -u <TiDB-User> -p'<TiDB암호>' --ssl-mode=REQUIRED <db명> -e "DELETE FROM SequelizeMeta;"
/opt/homebrew/opt/mysql-client/bin/mysql -h <TiDB-Host> -P 4000 -u <TiDB-User> -p'<TiDB암호>' --ssl-mode=REQUIRED <db명> < ~/dump.sql
```

### ⚠️ 시행착오 (마이그레이션)

1. **TiDB는 `addColumn` + `UNIQUE` 동시 불가** — MySQL에서는 `addColumn({ unique: true })`가 동작하지만, TiDB는 "unsupported add column constraint UNIQUE KEY" 에러. 해결: 컬럼 추가 후 `addIndex`로 분리
2. **TiDB는 `addColumn` + `references`(외래키) 동시 불가** — "Key column doesn't exist in table" 에러. 해결: 컬럼 추가 후 `addIndex`로 분리 (외래키 제약은 생략)
3. **덤프 파일에 SequelizeMeta 포함** — `--no-create-info`만으로는 SequelizeMeta 데이터가 포함됨. 마이그레이션으로 이미 기록이 있으므로 복원 시 "Duplicate entry" 에러. 복원 전 `DELETE FROM SequelizeMeta` 필요
4. **TiDB 로컬 접속 시 `--ssl-mode=VERIFY_IDENTITY` 불가** — CA 인증서 필요 에러. `--ssl-mode=REQUIRED`로 사용
5. **로컬에 mysql 클라이언트 없음** — `brew install mysql-client` 설치 후 `/opt/homebrew/opt/mysql-client/bin/mysql`로 실행

---

#### ⚠️ 시행착오 (Fly.io + TiDB)

1. **Fly.io 신용카드 미등록 시 5분 후 머신 자동 종료** — "Trial machine stopping. To run for longer than 5m0s, add a credit card" 경고. `fly billing add`로 카드 등록 필수. 종량제이므로 사용한 만큼만 과금
2. **TiDB Cloud 비밀번호 분실** — 생성 시 한 번만 표시됨. 분실 시 대시보드 → Connect → **Reset Password**로 재설정
3. **`ssl: true` (boolean) 사용 불가** — Sequelize/mysql2에서 "SSL profile must be an object, instead it's a boolean" 에러. 반드시 객체(`{ minVersion: 'TLSv1.2', rejectUnauthorized: true }`)를 사용
4. **`ssl: {}` 빈 객체도 hanging 발생** — 유효한 SSL 옵션 없이 빈 객체를 전달하면 연결이 무한 대기. 반드시 `minVersion`과 `rejectUnauthorized`를 명시
5. **`config` 패키지 immutable 객체 문제 (가장 삽질한 부분)** — `config.sequelize`가 반환하는 객체는 frozen. Sequelize가 내부적으로 수정하려다 조용히 실패하여 `authenticate()`가 무한 대기. **`JSON.parse(JSON.stringify(config.sequelize))`로 deep clone 필수.** 이 문제는 에러 메시지 없이 hanging만 발생해서 디버깅이 매우 어려움
6. **DB 연결 hanging 디버깅 방법** — 에러 없이 무한 대기 시 단계별로 격리 테스트:
   - TCP 연결: `fly ssh console -C "node -e ...net.connect..."` → CONNECTED 확인
   - mysql2 직접: `fly ssh console -C "node -e ...mysql2/promise..."` → SUCCESS 확인
   - Sequelize 직접: `fly ssh console -C "node -e ...Sequelize..."` → DB_CONNECTED 확인
   - 전체 앱: `fly ssh console` → `node src/index.js` → 실제 에러 확인
7. **`fly deploy` WARNING "app is not listening"은 무시 가능한 경우 있음** — DB 연결에 시간이 걸리면 Fly.io 헬스체크 시점에 서버가 아직 안 뜸. 실제로는 몇 초 후 정상 시작됨. `fly ssh console`에서 `node src/index.js` → EADDRINUSE 에러가 나면 이미 정상 실행 중이라는 뜻
8. **`fly ssh console`에서 `cd`나 환경변수 설정 안 됨** — `fly ssh console -C "cd /app && ..."` 불가. `fly ssh console -C "printenv KEY"`로 개별 확인. shell 경유 시 `sh -c '...'` 사용
9. **Oracle Cloud 가입 실패 (포기 사유)** — 한국에서 가입 시 "계정을 생성하는 중 오류 발생" 빈번. 원인: 카드 DCC 설정, 반복 시도로 IP/카드 블랙리스트, 주소 불일치 등. 8회 이상 시도 + Oracle 지원 문의해도 해결 불가하여 Fly.io로 전환

#### 6-1-6. 커스텀 도메인 + SSL

Fly.io는 SSL 인증서를 자동 발급 (Let's Encrypt). nginx/certbot 불필요.

**A. Fly.io에 도메인 추가**
```bash
fly certs add api.<도메인>
```

**B. DNS 설정 옵션 확인**
```bash
fly certs setup api.<도메인>
```
→ A/AAAA, CNAME, TXT 등 여러 옵션이 표시됨

**C. 가비아 DNS 설정**

가비아에 AAAA 타입이 없으므로 **CNAME + TXT** 방식 사용:

| 타입 | 호스트 | 값 |
|------|--------|-----|
| CNAME | `api` | `<코드>.lordhill-sns-api.fly.dev.` |
| TXT | `_fly-ownership.api` | `app-<코드>` |

⚠️ 기존 `api` A 레코드가 있으면 **삭제 후** CNAME 생성 (A와 CNAME 공존 불가)

**D. 인증서 확인**
```bash
fly certs check api.<도메인>
# Status = Issued, Certificate Authority = Let's Encrypt 나오면 성공
```

#### 6-1-7. CI/CD (GitHub Actions → Fly.io)

SSH 배포 대신 `fly deploy`로 배포. nginx, PM2, git pull 불필요.

**A. deploy-server.yml**
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
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Install dependencies
        run: npm install --workspace=packages/server
      - name: Lint
        run: cd packages/server && npm run lint
      - name: Prettier check
        run: cd packages/server && npm run prettier
      - uses: superfly/flyctl-actions/setup-flyctl@master
      - name: Deploy to Fly.io
        run: flyctl deploy --remote-only
        working-directory: packages/server
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

**B. Fly.io deploy token 생성 + GitHub Secret 등록**
```bash
# 토큰 생성
fly tokens create deploy -x 999999h

# GitHub Secret에 등록
gh secret set FLY_API_TOKEN
# → 토큰 붙여넣기 → Enter → Ctrl+D
```

**C. 기존 AWS용 GitHub Secrets 정리**

| Secret | 변경 |
|--------|------|
| EC2_HOST | 삭제 가능 |
| EC2_SSH_KEY | 삭제 가능 |
| FLY_API_TOKEN | 신규 추가 |
| AWS_ACCESS_KEY_ID | 유지 (S3/CloudFront 배포용) |
| AWS_SECRET_ACCESS_KEY | 유지 |
| CLOUDFRONT_DISTRIBUTION_ID | 유지 |

#### 6-1-8. Firebase 푸시 설정

Fly.io는 파일 시스템이 ephemeral이라 `firebase-service-account.json` 직접 배치 불가.
환경변수로 JSON 전체를 전달:

```bash
# packages/server 디렉토리에서
fly secrets set FIREBASE_SERVICE_ACCOUNT="$(cat firebase-service-account.json)"
```

코드에서는 환경변수 우선, 없으면 파일에서 읽기 (firebase.js에 이미 반영):
```js
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  : JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
```

#### 6-1-9. AWS EC2/RDS 정리

Fly.io + TiDB로 완전 이전 후, 검증이 끝나면 AWS 서버/DB 리소스를 삭제.
⚠️ **S3 버킷, CloudFront는 삭제하지 않음** (프론트 배포 + 이미지 저장 계속 사용)

```
삭제 대상:
1. EC2 인스턴스 종료 (중지 → 종료)
2. RDS 인스턴스 삭제 (최종 스냅샷 생성 권장)
3. 불필요한 Security Group 삭제
4. Elastic IP 해제 (있으면)

유지 대상:
- S3 버킷 (프론트 + 이미지)
- CloudFront 배포 (프론트 CDN)
- ACM 인증서
- 가비아 DNS의 www, admin CNAME (CloudFront 유지)
```

---

### 옵션 2: 비즈니스 인프라 (AWS EC2 + RDS)

### 사전 준비
```bash
brew install awscli
aws configure  # Access Key, Secret Key, ap-northeast-2, json
```

### 6-1. RDS MySQL (프리 티어)

콘솔 → Aurora and RDS → 데이터베이스 생성

| 설정 | 값 |
|-----|---|
| 엔진 | MySQL 8.0 (로컬과 동일 버전) |
| 템플릿 | 프리 티어 |
| 인스턴스 | db.t4g.micro |
| 스토리지 | 20GB, gp2, 자동 조정 OFF |
| 자격 증명 | 자체 관리, 암호 인증 |
| 퍼블릭 액세스 | 예 (로컬 테스트용) |
| 보안 그룹 | 새로 생성 |

생성 후:
```bash
# EC2에서 MySQL 클라이언트로 RDS 접속 후 데이터베이스 생성
mysql -h <RDS엔드포인트> -u admin --password='<마스터암호>'
CREATE DATABASE <db명> CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 마이그레이션 실행 (EC2에서)
cd ~/app/packages/server && npx sequelize-cli db:migrate
```

### ⚠️ 시행착오
- RDS 생성 시 초기 데이터베이스 이름을 안 넣으면 수동으로 CREATE DATABASE 필요
- mysql 명령에서 비밀번호에 `!` 등 특수문자가 있으면 `--password='xxx'` 작은따옴표로 감싸기
- EC2에서 RDS 접속하려면 RDS 보안 그룹에 EC2 보안 그룹 허용 필요:
  ```bash
  aws ec2 authorize-security-group-ingress --group-id <RDS-SG> --protocol tcp --port 3306 --source-group <EC2-SG>
  ```

### 6-2. EC2 (프리 티어)

콘솔 → EC2 → 인스턴스 시작

| 설정 | 값 |
|-----|---|
| AMI | Amazon Linux 2023 |
| 인스턴스 유형 | t2.micro |
| 키 페어 | 새로 생성 (RSA, .pem) — 분실 시 재발급 불가! |
| 보안 그룹 | SSH(22), HTTP(80), HTTPS(443) 허용 |

생성 후 EC2 환경 세팅:
```bash
# SSH 접속
chmod 400 <키>.pem
ssh -i <키>.pem ec2-user@<퍼블릭IP>

# Node.js 20
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs

# PM2 (프로세스 매니저)
sudo npm install -g pm2

# Git, MySQL 클라이언트, nginx
sudo yum install -y git mariadb105 nginx

# API 포트 개방
aws ec2 authorize-security-group-ingress --group-id <EC2-SG> --protocol tcp --port 3001 --cidr 0.0.0.0/0
```

### ⚠️ 시행착오
- PM2 포트 충돌 (EADDRINUSE): `pm2 delete all` 후 재시작
- PM2 자동 시작 설정: `pm2 save && pm2 startup` → 출력되는 sudo 명령어 실행

### 6-3. S3 버킷

두 개 생성:
1. **이미지 저장소** (예: `<프로젝트>-media`)
2. **프론트 배포용** (예: `<프로젝트>-front`)
   - 퍼블릭 액세스 차단 (CloudFront를 통해서만 접근)
   - ACL 비활성화, 버전 관리 비활성화

### ⚠️ 시행착오
- 계정 리전 네임스페이스 선택 시 버킷 이름이 매우 길어짐 → `aws s3 ls`로 실제 이름 확인

### 6-4. CloudFront (CDN)

콘솔 → CloudFront → 배포 생성

| 설정 | 값 |
|-----|---|
| Origin | 프론트용 S3 버킷 |
| Origin access | OAC (Origin Access Control) |
| WAF | 비활성화 (비용) |

생성 후 필수 설정:

**1) S3 버킷 정책 추가 (AccessDenied 방지)**
```bash
aws s3api put-bucket-policy --bucket <버킷명> --policy '{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"Service": "cloudfront.amazonaws.com"},
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::<버킷명>/*",
    "Condition": {"StringEquals": {"AWS:SourceArn": "arn:aws:cloudfront::<계정ID>:distribution/<배포ID>"}}
  }]
}'
```

**2) SPA 에러 페이지 (React Router 지원)**
- Error pages: 403 → `/index.html` (200)
- Default root object: `index.html`

### ⚠️ 시행착오
- OAC 사용 시 S3 버킷 정책을 수동으로 추가해야 함. 안 하면 AccessDenied
- React SPA는 에러 페이지 설정 필수. 안 하면 새로고침 시 AccessDenied

---

## 7. 도메인 + HTTPS 세팅

### 7-1. 도메인 구매
- **가비아 (gabia.com)** 추천 — 한국 서비스, 결제 편리
- AWS Route 53에서도 가능하나 신규 계정은 등록 실패할 수 있음

### 7-2. ACM 인증서 (필수: us-east-1 리전!)
```
콘솔 리전을 us-east-1 (버지니아 북부)로 변경
→ Certificate Manager → 인증서 요청
→ 퍼블릭, 도메인: <도메인>, *.<도메인>
→ DNS 검증 → CNAME 레코드를 가비아에 추가
```

### 7-3. 가비아 DNS 설정

| 타입 | 호스트 | 값 |
|-----|-------|---|
| CNAME | `_xxx` (ACM 검증용) | `_xxx.acm-validations.aws.` |
| CNAME | `www` | `<CloudFront도메인>.` (끝에 점!) |
| A | `api` | `<EC2 IP>` |
| 포워딩 | `@` (루트) | `https://www.<도메인>` |

### 7-4. CloudFront 커스텀 도메인 연결
```bash
# CloudFront 배포에 커스텀 도메인 + ACM 인증서 연결
aws cloudfront update-distribution ...
```

### 7-5. EC2 nginx + SSL (API 서버 HTTPS)
```bash
# nginx 설치 + certbot SSL
sudo yum install -y nginx
sudo yum install -y certbot python3-certbot-nginx

# nginx 설정
sudo tee /etc/nginx/conf.d/api.conf << 'EOF'
server {
    listen 80;
    server_name api.<도메인>;
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# SSL 인증서 발급 + 자동 설정
sudo certbot --nginx -d api.<도메인> --non-interactive --agree-tos --email <이메일>
sudo systemctl enable nginx
```

### ⚠️ 시행착오
- CNAME 값 끝에 점(`.`) 필요 — 가비아가 요구
- 가비아에서 루트 도메인은 CNAME 불가 → 포워딩 기능 사용
- ACM 인증서는 반드시 `us-east-1`에서 생성 (CloudFront 요구사항)
- Mixed Content: 프론트가 HTTPS면 API도 반드시 HTTPS. nginx + certbot으로 해결
- certbot SSL은 90일마다 자동 갱신됨

---

## 8. CI/CD 세팅 (GitHub Actions)

### 8-1. GitHub Secrets 등록

레포 → Settings → Secrets and variables → Actions

| Name | 값 |
|------|---|
| `AWS_ACCESS_KEY_ID` | AWS Access Key |
| `AWS_SECRET_ACCESS_KEY` | AWS Secret Key |
| `EC2_HOST` | EC2 퍼블릭 IP |
| `EC2_SSH_KEY` | .pem 파일 전체 내용 |
| `CLOUDFRONT_DISTRIBUTION_ID` | CloudFront ID |

### 8-2. 서버 배포 (.github/workflows/deploy-server.yml)
```
트리거: main 푸시 + packages/server/** 변경
1. 코드 체크아웃 + Node.js 설치
2. 의존성 설치
3. Lint + Prettier 검사 (실패 시 배포 중단)
4. SSH로 EC2 접속
5. git pull + npm install
6. DB 마이그레이션 (npx sequelize-cli db:migrate)
7. PM2 재시작
```

### 8-3. 프론트 배포 (.github/workflows/deploy-front.yml)
```
트리거: main 푸시 + packages/app-front/** 변경
1. 코드 체크아웃 + Node.js 설치
2. 의존성 설치
3. Lint + Prettier + Type check (실패 시 배포 중단)
4. 빌드 (VITE_API_URL=https://api.<도메인>)
5. S3에 업로드
6. CloudFront 캐시 무효화
```

### ⚠️ 시행착오
- GitHub Actions의 paths 필터: 워크플로우 파일만 변경하면 트리거 안 됨 → 해당 패키지 파일도 변경 필요
- 수동 트리거하려면 `workflow_dispatch` 트리거 추가 필요
- EC2 .env는 CI/CD로 관리 안 함 — SSH로 수동 설정 (보안)

---

## 9. Google OAuth 세팅

### 9-1. Google Cloud Console
1. https://console.cloud.google.com → 새 프로젝트 생성
2. 좌측 메뉴 → **API 및 서비스** → **OAuth 동의 화면** → 외부 선택 → 앱 이름/이메일 입력
3. **사용자 인증 정보** → **OAuth 클라이언트 ID 만들기** → 애플리케이션 유형: **웹 애플리케이션**
4. 승인된 JavaScript 원본: `https://www.<도메인>`, `http://localhost:5173`
5. 승인된 리디렉션 URI (HTTP/HTTPS, 포트까지 정확히!):
   - `https://api.<도메인>/api/auth/google/callback` (라이브)
   - `http://localhost:3001/api/auth/google/callback` (로컬)
6. **클라이언트 ID**와 **클라이언트 보안 비밀번호** 복사 → 서버 .env에 설정

### 9-2. 서버 구현 (Passport)
```
src/passport/googleStrategy.js  — Google OAuth 전략
src/passport/index.js           — 전략 등록
src/user/routes/auth.js         — GET /auth/google, GET /auth/google/callback
src/user/controllers/auth.js    — oauthCallback (유저 생성/조회 → JWT → 리다이렉트)
```

### 9-3. 프론트 구현
```
config/define.ts     — API_BASE_URL (로컬: 빈 문자열, 라이브: VITE_API_URL)
LoginPage.tsx        — API_BASE_URL + /api/auth/google 리다이렉트
OAuthCallbackPage.tsx — URL에서 token 추출 → localStorage 저장 → /auth/me → 홈 이동
hooks/useAuth.ts     — localStorage 토큰 있을 때만 /auth/me 호출
```

### 9-4. OAuth 인증 흐름
```
1. 프론트: Google 버튼 → window.location.href = API_BASE_URL + /api/auth/google
2. 서버: Passport가 Google로 리다이렉트
3. Google: 인증 후 /api/auth/google/callback으로 콜백
4. 서버: 유저 생성/조회 → JWT 생성 → 쿠키 설정 → /auth/callback?token=xxx 리다이렉트
5. 프론트: OAuthCallbackPage에서 토큰을 localStorage 저장 → /auth/me → 홈
```

### ⚠️ 시행착오 (많음!)
1. **IP 주소 OAuth 불가**: Google은 리디렉션 URI에 IP 주소 허용 안 함 → 도메인 필수
2. **redirect_uri_mismatch**: HTTP/HTTPS, 포트 유무가 정확히 일치해야 함. 한 글자라도 다르면 에러
3. **Mixed Content**: 프론트 HTTPS + API HTTP → 브라우저가 차단. API도 HTTPS 필수
4. **응답 데이터 구조**: 서버가 `res.json(user)` → 프론트에서 `res.data` (res.data.user 아님)
5. **useAuth 무한 루프**: 토큰 없이 /auth/me 호출 → 401 → 리프레시 시도 → 실패 → 리다이렉트 → 무한반복. 해결: localStorage 토큰이 있을 때만 호출
6. **새 유저 status**: 처음에 `pending`으로 만들면 로그인해도 서비스 이용 불가. 테스트 시에는 `approved`로
7. **Google Console 반영 지연**: 리디렉션 URI 추가 후 반영에 5~10분 소요

---

## 9-1. Kakao OAuth 세팅

Google과 동일한 Passport 패턴. WebView에서도 차단 없이 동작하므로 **네이티브 SDK 불필요**.

### 9-1-1. Kakao Developers 앱 등록

1. https://developers.kakao.com → 로그인 → **내 애플리케이션** → **애플리케이션 추가하기**
2. 앱 이름 입력 후 저장

### 9-1-2. 카카오 로그인 활성화

좌측 메뉴 → **카카오 로그인** → **일반** 탭 → **사용 설정** ON

### 9-1-3. Redirect URI 등록

⚠️ **주의: Redirect URI는 "카카오 로그인" 메뉴가 아니라 "플랫폼 키" 메뉴에 있음!**

1. 좌측 메뉴 → **앱 설정** → **플랫폼 키**
2. **REST API 키 추가** 클릭
3. 설정:

| 항목 | 값 |
|-----|---|
| **키 이름** | `<프로젝트>-server` |
| **호출 허용 IP 주소** | 비워두기 (제한 없음) |
| **카카오 로그인 리다이렉트 URI** | `https://api.<도메인>/api/auth/kakao/callback`, `http://localhost:3001/api/auth/kakao/callback` |
| **비즈니스 인증 리다이렉트 URI** | 비워두기 |

4. 저장 후 **REST API 키**와 **Client Secret (카카오 로그인 코드)** 복사

### 9-1-4. 동의항목 설정

좌측 메뉴 → **카카오 로그인** → **동의항목** 탭

| 항목 | 설정 |
|-----|------|
| 닉네임 | 필수 동의 |
| 프로필 사진 | 선택 동의 |
| 카카오계정(이메일) | 비즈 앱 전환 후 가능 — 지금은 건너뛰기 |

### 9-1-5. 플랫폼 등록

좌측 메뉴 → **앱 설정** → **플랫폼** → **Web** 추가:
- 사이트 도메인: `https://www.<도메인>`

### 9-1-6. 서버 .env 설정

```bash
KAKAO_CLIENT_ID=<REST API 키>
KAKAO_CLIENT_SECRET=<카카오 로그인 코드>
KAKAO_CALLBACK_URL=https://api.<도메인>/api/auth/kakao/callback
```

### 9-1-7. 서버 구현 (Google과 동일 패턴)

```
src/passport/kakaoStrategy.js  — passport-kakao 전략 (oauthProfile 변환, email optional)
src/passport/index.js           — kakaoStrategy 등록
src/user/routes/auth.js         — GET /auth/kakao, GET /auth/kakao/callback, POST /auth/kakao/native
src/user/controllers/auth.js    — kakaoNativeLogin (kapi.kakao.com/v2/user/me로 프로필 조회)
```

oauthCallback 컨트롤러는 Google과 재사용.

### 9-1-8. iOS WebView 동작

카카오는 Google과 달리 **WebView 내 OAuth를 차단하지 않음**. 네이티브 SDK 없이 웹 OAuth가 그대로 동작.

### ⚠️ 시행착오

1. **Redirect URI 위치를 찾기 어려움** — "카카오 로그인" 메뉴가 아니라 **"앱 설정 → 플랫폼 키 → REST API 키 추가"** 안에 있음. 카카오 로그인 → 일반 탭에는 없음
2. **사용 설정을 먼저 켜야 함** — ON 안 하면 KOE004 에러
3. **이메일 미제공** — 비즈 앱이 아니면 이메일을 못 가져옴. email은 optional로 처리 (빈 문자열 허용)
4. **Client Secret ≠ REST API 키** — REST API 키가 Client ID, 카카오 로그인 코드가 Client Secret. 헷갈리지 말 것
5. **WebView 차단 없음** — Google과 달리 카카오는 WebView에서 OAuth 허용. 네이티브 SDK 불필요 (하지만 native 엔드포인트는 만들어두면 좋음)

---

## 9-2. Naver OAuth 세팅

Google/Kakao와 동일한 Passport 패턴. 카카오와 마찬가지로 WebView에서 차단 없음.

### 9-2-1. Naver Developers 앱 등록

1. https://developers.naver.com → 로그인 → **Application** → **애플리케이션 등록**
2. 앱 이름 입력
3. **사용 API**: `네이버 로그인` 선택
4. 권한 설정:

| 항목 | 설정 |
|-----|------|
| 이름 | 필수 |
| 이메일 | 필수 |
| 프로필 사진 | 추가 (선택) |
| 나머지 | 체크 안 함 |

5. **로그인 오픈 API 서비스 환경**: `PC 웹` 선택
6. 설정:

| 항목 | 값 |
|-----|---|
| **서비스 URL** | `https://www.<도메인>` |
| **Callback URL** | `https://api.<도메인>/api/auth/naver/callback` (줄바꿈) `http://localhost:3001/api/auth/naver/callback` |

7. 등록 후 **Client ID**와 **Client Secret** 복사

### 9-2-2. 개발 상태 참고

- 앱 상태가 **"개발중"**이어도 로그인 동작함 (본인 계정만 테스트 가능)
- **"네이버 로그인 검수요청"**은 다른 사용자도 로그인하게 하려면 필요 — 서비스 오픈 전에 신청

### 9-2-3. 서버 .env 설정

```bash
NAVER_CLIENT_ID=<Client ID>
NAVER_CLIENT_SECRET=<Client Secret>
NAVER_CALLBACK_URL=https://api.<도메인>/api/auth/naver/callback
```

### 9-2-4. 서버 구현 (Google/Kakao와 동일 패턴)

```
src/passport/naverStrategy.js  — passport-naver-v2 전략 (oauthProfile 변환)
src/passport/index.js           — naverStrategy 등록
src/user/routes/auth.js         — GET /auth/naver, GET /auth/naver/callback, POST /auth/naver/native
src/user/controllers/auth.js    — naverNativeLogin (openapi.naver.com/v1/nid/me로 프로필 조회)
```

네이버 API 응답 구조: `{ response: { id, email, nickname, profile_image } }` — `response` 안에 프로필이 있음.

### 9-2-5. iOS WebView 동작

카카오와 마찬가지로 **WebView 내 OAuth 차단 없음**. 네이티브 SDK 불필요.

### ⚠️ 시행착오

1. **nickname unique 제약 충돌** — 같은 이름으로 Google/Kakao/Naver 각각 가입하면 nickname unique 인덱스 때문에 `중복된 값이 존재합니다` 에러 발생. **해결: User 모델에서 nickname unique 제거 + 마이그레이션으로 DB 인덱스 삭제**
2. **마이그레이션 인덱스 이름** — Sequelize가 생성한 인덱스 이름이 `users_nickname`이 아니라 `nickname`일 수 있음. `SHOW INDEX FROM users WHERE Column_name = 'nickname'`으로 실제 이름 확인 필수
3. **개발중 상태** — 검수 전에는 앱에 등록된 네이버 계정(본인)만 테스트 가능. 다른 사람 테스트는 검수 승인 후
4. **네이버 API 응답 구조 주의** — 다른 OAuth와 달리 `{ response: { ... } }` 형태. profile 데이터가 `response` 필드 안에 있음

---

## 10. EC2 서버 .env 세팅

CI/CD로 관리하지 않음 (보안). SSH로 수동 설정.

```bash
ssh -i <키>.pem ec2-user@<IP>
cat > ~/app/packages/server/.env << 'EOF'
DB_HOST=<RDS 엔드포인트>
DB_PORT=3306
DB_USERNAME=admin
DB_PASSWORD=<RDS 마스터 암호>
DB_DATABASE=<db명>

JWT_SECRET=<랜덤문자열>
JWT_REFRESH_SECRET=<랜덤문자열>

GOOGLE_CLIENT_ID=<웹용 Google Client ID>
GOOGLE_CLIENT_SECRET=<웹용 Google Client Secret>
GOOGLE_CALLBACK_URL=https://api.<도메인>/api/auth/google/callback

KAKAO_CLIENT_ID=<REST API 키>
KAKAO_CLIENT_SECRET=<카카오 로그인 코드>
KAKAO_CALLBACK_URL=https://api.<도메인>/api/auth/kakao/callback

NAVER_CLIENT_ID=<Client ID>
NAVER_CLIENT_SECRET=<Client Secret>
NAVER_CALLBACK_URL=https://api.<도메인>/api/auth/naver/callback

AWS_ACCESS_KEY_ID=<AWS키>
AWS_SECRET_ACCESS_KEY=<AWS시크릿>
AWS_REGION=ap-northeast-2
AWS_S3_BUCKET=<이미지 버킷명>

CLIENT_URL=https://www.<도메인>
ADMIN_URL=https://admin.<도메인>
PORT=3001
EOF
```

설정 후 PM2 재시작:
```bash
pm2 restart lordhill-server
```

### ⚠️ 시행착오
- 비밀번호에 `!` 등 특수문자가 있으면 쉘에서 해석됨 → heredoc(`<< 'EOF'`)이나 작은따옴표로 감싸기
- .env는 git에 올리면 안 됨 (.gitignore에 포함 확인)

---

## 11. 디자인 시스템 세팅

### 프로세스
1. 디자인 방향 결정 (aesthetic, 컬러, 폰트)
2. `DESIGN.md` 작성 (프로젝트 루트)
3. `index.css`에 `@theme`으로 컬러 토큰 정의
4. 아이콘 라이브러리 선택

### 컬러 토큰 (index.css)
```css
@theme {
  --color-accent: #40C057;
  --color-accent-light: #EBFBEE;
  --color-accent-dark: #2F9E44;
  --color-bg: #FFFFFF;
  --color-bg-alt: #F8F9FA;
  --color-surface: #F1F3F5;
  --color-surface-strong: #E9ECEF;
  --color-text: #212529;
  --color-text-muted: #868E96;
  --color-error: #E03131;
  --color-success: #2F9E44;
}
```

### 스타일링 규칙
- **Tailwind CSS 기본** — 모든 레이아웃, 색상, 타이포, 간격
- **MUI는 복잡 컴포넌트만** — Drawer, Dialog, DatePicker 등
- **MUI의 Button, Typography, Box 등 단순 컴포넌트는 사용 안 함**
- 아이콘: **Lucide React** 추천 (깔끔, 모던, 얇은 선)

### ⚠️ 시행착오
- MUI v9에서 `PaperProps` → `slotProps.paper`로 변경됨
- Material Symbols는 전형적이고 촌스러울 수 있음 → Lucide React로 전환
- 폰트: 한국어 앱이면 Pretendard 단일 통일이 가장 깔끔 (외국 폰트 혼용 비추)

---

## 12. 프론트 레이아웃 패턴

### MainLayout (인증 가드 + 스크롤 관리)
```tsx
<FullHeightBox>
  <main className="scrollInner">
    <Outlet />         {/* 하위 페이지 콘텐츠 */}
  </main>
  <BottomNavigation />
  <WriteDrawer />      {/* 글쓰기 드로어 — 전역에서 접근 */}
</FullHeightBox>
```
- `FullHeightBox`: visualViewport 높이 관리 (모바일 키보드 대응)
- `scrollInner`: flex-grow + overflow-y 스크롤 (패딩 0 20px 40px)
- 하위 페이지는 패딩/스크롤 설정 불필요 — MainLayout이 관리

### BottomNavigation
- 아이콘만 (텍스트 없음), Lucide React
- 4탭 구성: 홈(`Home`), 돌고래/재활용(`Recycle`), 기도(`HandHeart`), 마이페이지(`User`)
- 활성 상태: accent 색상 + 굵은 strokeWidth

### 탭 페이지 기본 포맷

BottomNavigation의 각 탭 페이지는 동일한 포맷을 사용해야 한다. MainLayout의 `scrollInner`가 좌우 패딩(0 20px 40px)을 관리하므로, 페이지 자체에 패딩을 주면 이중 적용됨.

```tsx
// 탭 페이지 기본 구조
export default function SomePage() {
  return (
    <>
      {/* 상단 헤더 */}
      <header className="w-full flex items-center justify-between py-4">
        <h1 className="text-[22px] font-extrabold tracking-tight text-text">
          페이지 제목
        </h1>
        {/* 우측 액션 버튼 (선택) */}
      </header>

      {/* 콘텐츠 영역 */}
      <div className="w-full">
        {/* 페이지 콘텐츠 */}
      </div>
    </>
  );
}
```

**규칙:**
- 래퍼: `<>` (Fragment) — `<div className="p-4">` 등 자체 패딩 금지
- 제목: `text-[22px] font-extrabold tracking-tight text-text` (모든 탭 동일)
- 헤더: `w-full flex items-center justify-between py-4`
- 콘텐츠가 가로로 꽉 차야 하면 `w-full` 명시
- MUI의 `Typography`, `Button` 등 단순 컴포넌트 대신 Tailwind로 작성

### 페이지 구조 (메인 탭 + 자식 페이지)

4개 메인 탭(feed, recycle, prayer, my)은 BottomNavigation 포함. 자식 페이지는 WithOutlet 오버레이로 표시되며 BottomNavigation 없음.

**폴더 구조 규칙** — 부모 폴더 아래 자식 폴더로 점층적 구성:
```
pages/
├── feed/                    # 메인 탭
│   ├── FeedWithOutlet.tsx   # WithOutlet 래퍼
│   ├── index.tsx            # 메인 페이지
│   └── post/
│       └── index.tsx        # 자식 페이지 (게시글 상세)
├── recycle/
│   ├── RecycleWithOutlet.tsx
│   ├── index.tsx
│   └── write/
│       └── index.tsx        # 자식 페이지 (글쓰기)
```

**라우터 구성** — children으로 중첩, WithOutlet이 outlet을 오버레이로 표시:
```tsx
{
  path: '/',
  element: <MainLayout />,
  children: [
    { index: true, element: <Navigate to="/feed" replace /> },
    {
      path: 'feed',
      element: <FeedWithOutlet />,
      children: [
        { path: 'post/:postId', element: <PostDetailPage /> },
      ],
    },
    // recycle, prayer, my 동일 패턴
  ],
}
```

**MainLayout** — 인증 가드 + FullHeightBox만 담당. BottomNavigation은 각 WithOutlet에서 렌더링.

### WithOutlet 네이티브 푸시 트랜지션

자식 페이지 진입/퇴장 시 iOS 네이티브 push 애니메이션을 구현한다. `useOutletTransition` 훅(`hooks/useOutletTransition.ts`)이 상태를 관리.

**트랜지션 흐름:**
```
[진입] 자식 페이지로 이동
0. 버튼 클릭 → delayNavigate로 150ms 딜레이 후 실제 navigate 실행 (네이티브 앱 느낌)
1. 부모 콘텐츠가 translateX(-30%)로 살짝 왼쪽 밀림 (250ms ease-out)
2. 자식 페이지가 오른쪽에서 슬라이드 인 (slideInFromRight, 250ms)
3. 슬라이드 완료 후 부모가 transition:none으로 몰래 원위치 (오버레이 뒤라 안 보임)

[퇴장] 뒤로가기
1. 부모는 이미 원위치 — 흔들림 없음 (iOS 엣지 제스처 호환)
2. 자식 페이지가 오른쪽으로 슬라이드 아웃 (slideOutToRight, 250ms)
3. 애니메이션 완료 후 오버레이 언마운트
```

**페이지 이동 딜레이 (`util/navigateUtil.ts`):**

자식 페이지로 이동하는 모든 곳에서 `navigate()` 대신 `delayNavigate()`를 사용한다. 버튼 클릭 후 150ms 지연 후 실제 라우트 이동이 발생하여, iOS 네이티브 앱처럼 살짝 인터벌을 두고 화면 전환이 시작된다.

```tsx
import { delayNavigate } from '@/util/navigateUtil';

// ❌ 바로 이동 (네이티브 느낌 없음)
onClick={() => navigate('/feed/detail/123')}

// ✅ 150ms 딜레이 후 이동 (네이티브 느낌)
onClick={() => delayNavigate(navigate, '/feed/detail/123')}
```

**주의:** `delayNavigate`는 자식 페이지 **진입** 시에만 사용. 뒤로가기(`navigate(-1)`)나 `replace: true` 이동에는 사용하지 않음.

**CSS 애니메이션 (index.css):**
```css
@keyframes slideInFromRight {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}
@keyframes slideOutToRight {
  from { transform: translateX(0); }
  to { transform: translateX(100%); }
}
```

**WithOutlet 래퍼 기본 구조:**
```tsx
import useOutletTransition from '@/hooks/useOutletTransition';
import SomePage from './index';
import BottomNavigation from '@/components/common/BottomNavigation';

export default function SomeWithOutlet() {
  const { hasOutlet, displayOutlet, isExiting, isSettled, showOverlay, transitionMs } =
    useOutletTransition();

  const parentShifted = hasOutlet && !isSettled;

  return (
    <>
      <div
        className="w-full"
        style={{
          transform: parentShifted ? 'translateX(-30%)' : 'translateX(0)',
          transition: isSettled ? 'none' : `transform ${transitionMs}ms ease-out`,
        }}
      >
        <SomePage />
      </div>
      <BottomNavigation />
      {showOverlay && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 1200, backgroundColor: '#FFFFFF',
          animation: `${isExiting ? 'slideOutToRight' : 'slideInFromRight'} ${transitionMs}ms ease-out forwards`,
        }}>
          {displayOutlet}
        </div>
      )}
    </>
  );
}
```

**자식 페이지 기본 구조** — 자체 FullHeightBox + scrollInner + 뒤로가기 헤더:
```tsx
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import FullHeightBox from '@/components/common/FullHeightBox';

export default function ChildPage() {
  const navigate = useNavigate();
  return (
    <FullHeightBox className="mx-auto max-w-[480px] bg-bg">
      <div className="scrollInner">
        <header className="w-full flex items-center gap-3 py-4">
          <button onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-full text-text-muted hover:bg-surface transition-colors duration-150">
            <ArrowLeft size={22} strokeWidth={1.5} />
          </button>
          <h1 className="text-[18px] font-bold text-text">페이지 제목</h1>
        </header>
        <div className="w-full">{/* 콘텐츠 */}</div>
      </div>
    </FullHeightBox>
  );
}
```

### 중첩 WithOutlet 패턴 (자식이 자체 자식을 가지는 경우)

자식 페이지가 다시 자신의 자식 페이지를 가져야 하는 경우, 해당 자식도 **WithOutlet 래퍼**로 만든다. 모든 계층에서 슬라이드 인/아웃이 동작한다.

**예: 알림 페이지** — 피드의 자식이면서 자체적으로 상세 페이지(게시글, 돌고래 등)를 자식으로 가짐.

```
feed (FeedWithOutlet)
├── post (글쓰기)
├── detail/:postId (피드에서 직접)
└── notifications (NotificationsWithOutlet) ← 자체 WithOutlet을 가진 자식
    ├── feed/:postId (알림→게시글 상세)
    └── recycle/:recycleId (알림→돌고래 상세)
```

**트랜지션 흐름:**
```
피드 → 알림: 슬라이드 인 (feed의 자식)
알림 → 상세: 슬라이드 인 (notifications의 자식)
상세 → 알림: 슬라이드 아웃 (notifications의 자식 퇴장)
알림 → 피드: 슬라이드 아웃 (feed의 자식 퇴장)
```

**라우터 구성:**
```tsx
{
  path: 'feed',
  element: <FeedWithOutlet />,
  children: [
    { path: 'post', element: <FeedWritePage /> },
    { path: 'detail/:postId', element: <PostDetailPage /> },
    {
      path: 'notifications',
      element: <NotificationsWithOutlet />,  // 자체 WithOutlet
      children: [
        { path: 'feed/:postId', element: <PostDetailPage /> },
        { path: 'recycle/:recycleId', element: <RecycleDetailPage /> },
      ],
    },
  ],
}
```

**NotificationsWithOutlet 래퍼 (BottomNavigation 없음 — 부모 FeedWithOutlet이 관리):**
```tsx
import useOutletTransition from '@/hooks/useOutletTransition';
import NotificationsPage from './index';

export default function NotificationsWithOutlet() {
  const { hasOutlet, displayOutlet, isExiting, isSettled, showOverlay, skipAnimation, transitionMs } =
    useOutletTransition();

  const parentShifted = hasOutlet && !isSettled;

  return (
    <>
      <div
        className="w-full flex-1 flex flex-col overflow-hidden"
        style={{
          transform: parentShifted ? 'translateX(-30%)' : 'translateX(0)',
          transition: isSettled ? 'none' : `transform ${transitionMs}ms ease-out`,
        }}
      >
        <NotificationsPage />
      </div>
      {showOverlay && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 1300, backgroundColor: '#FFFFFF',
          animation: skipAnimation ? 'none'
            : `${isExiting ? 'slideOutToRight' : 'slideInFromRight'} ${transitionMs}ms ease-out forwards`,
        }}>
          {displayOutlet}
        </div>
      )}
    </>
  );
}
```

**핵심 포인트:**
- 중첩 WithOutlet의 오버레이 `zIndex`는 부모보다 높아야 함 (부모 1200 → 자식 1300)
- 중첩 WithOutlet에는 BottomNavigation을 넣지 않음 — 최상위 WithOutlet(FeedWithOutlet 등)이 관리
- 알림처럼 다양한 부모의 상세 페이지로 이동하는 경우, 절대경로를 상대경로로 변환:
  ```tsx
  // /feed/detail/123 → feed/123 (알림의 자식 라우트)
  const feedMatch = item.path.match(/^\/feed\/detail\/(.+)$/);
  if (feedMatch) {
    delayNavigate(navigate, `feed/${feedMatch[1]}`);
  }
  ```
- `useOutletTransition`의 `skipAnimation`: 자식→자식 전환(같은 레벨의 outlet이 교체될 때) 시 애니메이션 스킵. 중첩 구조에서는 각 계층이 독립적인 부모→자식 관계이므로 이 문제가 발생하지 않음

### ⚠️ 시행착오 (페이지 트랜지션)
- **부모 translateX 복구 타이밍** — 자식 진입 시 부모를 왼쪽으로 밀었다가 퇴장 시 원위치하면, iOS 엣지 제스처 뒤로가기 시 부모가 왼쪽갔다 오른쪽으로 흔들림. 해결: 슬라이드 인 완료 후 `transition: none`으로 즉시 원위치 (오버레이 뒤라 안 보임)
- **exit 애니메이션** — `{outlet && ...}`로 렌더링하면 outlet이 null이 되는 즉시 언마운트되어 퇴장 애니메이션 불가. `useOutletTransition` 훅이 이전 outlet을 `displayOutlet`으로 유지하며 타이머로 애니메이션 후 언마운트
- **React Router index 라우트에 element 없으면 흰 화면** — `{ index: true }` (element 미지정)는 빈 Outlet을 렌더링. WithOutlet이 직접 메인 페이지를 렌더링하므로 index route 불필요, children에 자식 페이지만 등록
- **자식→자식 전환 시 부모 흔들림** — 같은 WithOutlet 아래에서 자식이 다른 자식으로 교체되면(알림→상세→알림), outlet 변경을 새 진입으로 인식하여 부모가 translateX(-30%) 후 복구됨. 해결: `useOutletTransition`에서 이전 outlet도 truthy이면 `skipAnimation=true`로 설정. **더 나은 해결**: 해당 자식을 자체 WithOutlet으로 만들어 중첩 구조로 변경하면 각 전환이 독립적인 부모→자식 관계가 되어 문제 없음

### WithOutlet 자식→부모 데이터 갱신 (커스텀 이벤트 패턴)

WithOutlet 구조에서 자식 페이지(상세)에서 조치(차단, 삭제, 글쓰기 등)를 하면 부모 페이지(리스트)의 데이터도 갱신되어야 한다. 그러나 WithOutlet은 부모를 리마운트하지 않으므로, `navigate(-1)`로 돌아가도 **SWR 캐시가 유지**되어 리스트가 갱신되지 않는다.

**해결: `window` 커스텀 이벤트로 부모에 갱신 신호 전달**

**1단계 — 부모 페이지에서 이벤트 리스너 등록:**

```tsx
// src/pages/feed/index.tsx (부모 리스트)
const { mutate } = useFeed();
const mutateRef = useRef(mutate);
useEffect(() => {
  mutateRef.current = mutate;
}, [mutate]);

useEffect(() => {
  const handler = () => mutateRef.current();
  window.addEventListener('feed-refresh', handler);
  return () => window.removeEventListener('feed-refresh', handler);
}, []);
```

**2단계 — 자식 페이지에서 이벤트 발생:**

```tsx
// src/pages/feed/detail/index.tsx (자식 상세)
onBlock={() => {
  window.dispatchEvent(new Event('feed-refresh'));
  navigate(-1);
}}
```

**이벤트 네이밍 규칙:** `{탭이름}-refresh` (예: `feed-refresh`, `recycle-refresh`)

**주의사항:**
- `mutate`를 `useRef`에 저장하는 이유: `mutate` 함수가 리렌더링마다 바뀔 수 있어서 이벤트 리스너에 직접 넣으면 stale closure 문제 발생
- SWR의 글로벌 `mutate(() => true)`는 `useSWRInfinite`(무한스크롤)의 내부 캐시 키 구조와 호환되지 않아 동작하지 않음 → 커스텀 이벤트 방식이 더 확실함
- 이 패턴은 글쓰기 완료, 사용자 차단, 게시글 삭제 등 부모 리스트에 영향을 주는 모든 자식 액션에 동일하게 적용

### 독립 페이지 (MainLayout 밖)의 전체 높이 처리

LoginPage 등 MainLayout을 거치지 않는 독립 페이지에서 뷰포트 전체를 채우려면:

**1. index.css에서 html/body/#root 높이 체인:**
```css
html, body, #root {
  height: 100%;
  margin: 0;
}
```

**2. 페이지 루트에 `fixed inset-0` 사용:**
```tsx
<div className="bg-bg fixed inset-0 flex items-center justify-center overflow-y-auto">
  {/* 페이지 콘텐츠 */}
</div>
```

⚠️ `min-h-screen`, `100vh`, `100dvh`는 Android WebView에서 정확히 동작하지 않을 수 있음. `position: fixed; inset: 0`이 **iOS/Android WebView 모두에서 가장 확실한 방법**.

### Android WebView 설정 주의

```kotlin
// 모바일 전용 SPA에서는 false로 설정
settings.loadWithOverviewMode = false
settings.useWideViewPort = false
```

`true`로 설정하면 데스크톱 페이지를 축소해서 보여주는 모드가 되어 뷰포트 높이 계산이 틀어질 수 있음.

### ⚠️ 시행착오
- 글쓰기 Drawer를 특정 페이지에 두면, 다른 페이지에서 열었을 때 이전 페이지에 남아있음 → MainLayout으로 이동
- scrollInner 안의 콘텐츠에 px-5를 중복으로 주면 패딩이 이중 적용됨
- **Android WebView에서 `min-h-screen`/`100dvh`가 안 먹힘** — `html, body, #root`에 `height: 100%` 체인을 걸어도 Android WebView에서 높이가 3/5만 채워지는 현상. `position: fixed; inset: 0`으로 해결. iOS에서는 문제없음
- **Android `Scaffold` 하단 회색 영역** — `enableEdgeToEdge()` 사용 시 Scaffold 기본 배경색이 네비게이션 바 뒤에 노출됨. `containerColor = Color.White`로 설정

---

## 13. 네이티브 앱 (iOS/Android WebView)

웹 + AWS + CI/CD + OAuth가 모두 완료된 후에 네이티브 앱을 세팅한다.
네이티브 앱은 WebView로 웹앱을 래핑하는 구조. OAuth는 네이티브 SDK를 사용.

### iOS (SwiftUI + WKWebView) — Xcode 프로젝트 기본 세팅

참고: `~/Documents/cheeze/healthcare/healthcare-ios`

#### 프로젝트 생성
1. Xcode → New Project → App → SwiftUI
2. Bundle ID: `com.<프로젝트>.<앱>`
3. Git 레포 별도 생성: `gh repo create <유저명>/<앱명> --private --source <경로> --push`

#### 핵심 파일 구조
```
<앱>/
├── App/
│   ├── <앱>App.swift        # @main, OAuth SDK 초기화, onOpenURL 딥링크 처리
│   └── AppDelegate.swift    # URL Scheme 처리 (Google/Kakao/Naver)
├── View/
│   ├── ContentView.swift    # 스플래시 → 웹뷰 전환
│   └── <앱>WebView.swift    # WKWebView 래퍼, OAuth URL 인터셉트, JS 브릿지
├── Model/
│   └── Constants.swift      # 환경별 URL (.local/.dev/.live)
├── Util/
│   ├── DeepLinkUtil.swift   # OAuth URL 판별 (Google/Kakao/Naver)
│   └── NaverLoginHandler.swift  # Naver SDK delegate → 클로저 변환
├── Assets.xcassets/
└── Info.plist               # URL Schemes, ATS, 권한
```

#### Constants.swift — 환경 URL 설정
```swift
struct WEB {
    enum Environment: String {
        case local = "http://192.168.x.x:5173/"   // 실기기용 (Mac IP)
        case dev = "http://localhost:5173/"         // 시뮬레이터용
        case live = "https://www.<도메인>/"         // 운영 (www 포함 필수!)
    }
    static let environment: Environment = .live
    static var baseUrl: String { environment.rawValue }
}
```

#### Info.plist 필수 설정
- `NSAllowsArbitraryLoads: true` + `NSAllowsLocalNetworking: true` (개발용)
- URL Schemes: lordhill (딥링크), Google/Kakao/Naver 각 SDK용
- `LSApplicationQueriesSchemes`: 카카오톡/네이버 앱 연동용

#### WKWebView 핵심 설정 (WebView 래퍼)
- JS 브릿지: `getToken` (토큰 전달), `jsLog` (로그)
- `window.isIOSApp = true` 플래그 주입
- OAuth URL 인터셉트 → 네이티브 SDK 실행 → accessToken/idToken → 서버 → JWT → 웹뷰 콜백
- 비디오 인라인 재생, 핀치줌 비활성화, 컨텍스트 메뉴 비활성화

#### Xcode Signing (무료)
1. Xcode → Settings → Accounts → Apple ID 추가
2. 프로젝트 → Signing & Capabilities → Team: Personal Team 선택
3. Bundle Identifier를 고유하게 변경

#### 실기기 테스트
1. USB 연결 → Xcode에서 디바이스 선택 → Run
2. 첫 실행 시: 아이폰 **설정 → 일반 → VPN 및 기기 관리 → 개발자 신뢰** (최초 1회)

### Android (Kotlin + Compose + WebView) — 상세 세팅

참고: `~/Documents/cheeze/healthcare/healthcare-android`

#### 프로젝트 구조 (iOS 대비)

```
lordhill-android/
├── build.gradle.kts          ← 프로젝트 레벨 빌드 (iOS에는 없는 개념)
├── settings.gradle.kts       ← 모듈 등록
├── gradle/libs.versions.toml ← 의존성 버전 관리 (= iOS Package.resolved)
├── gradlew                   ← Gradle 실행 스크립트
└── app/                      ← 실제 앱 모듈
    ├── build.gradle.kts      ← 앱 레벨 빌드 (= iOS xcodeproj 설정)
    └── src/
        ├── main/
        │   ├── AndroidManifest.xml           ← 앱 설정 (= iOS Info.plist)
        │   ├── assets/offline.html           ← 오프라인 에러 페이지
        │   ├── java/com/<패키지>/
        │   │   ├── LordhillApplication.kt    ← 앱 진입점 (= iOS App.swift)
        │   │   ├── MainActivity.kt           ← WebView 호스트 (= iOS ContentView)
        │   │   ├── MainViewModel.kt          ← 상태 관리
        │   │   ├── CustomWebViewClient.kt    ← URL 처리 (= iOS LordhillWebView)
        │   │   ├── CustomWebChromeClient.kt  ← WebView 크롬 클라이언트
        │   │   ├── AndroidBridge.kt          ← JS 브릿지 (= iOS WKScriptMessageHandler)
        │   │   ├── EnvManager.kt             ← 환경 URL 인터페이스
        │   │   ├── CommonDefine.kt           ← 상수
        │   │   ├── LordhillSharedPref.kt     ← 토큰 저장 (= iOS UserDefaults)
        │   │   ├── Logger.kt                 ← 로깅
        │   │   ├── common/
        │   │   │   └── GoogleSignInHelper.kt ← Google 로그인
        │   │   ├── splash/
        │   │   │   ├── StartActivity.kt      ← 스플래시 시작
        │   │   │   └── SplashScreen.kt       ← 스플래시 UI
        │   │   └── ui/theme/                 ← Compose 테마
        │   └── res/                          ← 리소스 (= iOS Assets.xcassets)
        │       ├── drawable/                 ← 아이콘, 이미지
        │       ├── mipmap-*/                 ← 앱 아이콘
        │       ├── values/                   ← 색상, 문자열, 테마
        │       └── xml/                      ← 백업 규칙
        ├── debug/
        │   └── java/.../EnvManagerImpl.kt    ← 디버그 URL (로컬 Mac IP)
        └── release/
            └── java/.../EnvManagerImpl.kt    ← 릴리즈 URL (운영 도메인)
```

#### iOS와 1:1 대응

| 역할 | iOS | Android |
|-----|-----|---------|
| 앱 진입점 | `App.swift` (@main) | `LordhillApplication.kt` (@HiltAndroidApp) |
| 메인 화면 | `ContentView.swift` | `MainActivity.kt` |
| WebView | `LordhillWebView.swift` | `CustomWebViewClient.kt` |
| JS 브릿지 | WKScriptMessageHandler | `AndroidBridge.kt` (@JavascriptInterface) |
| 환경 URL | `Constants.swift` (수동 전환) | `EnvManagerImpl.kt` (debug/release 자동) |
| 앱 설정 | `Info.plist` | `AndroidManifest.xml` |
| 토큰 저장 | UserDefaults | SharedPreferences |
| 빌드 도구 | Xcode Build System | Gradle |
| 의존성 | SPM | Gradle (libs.versions.toml) |

#### 환경 URL 설정 — `app/build.gradle.kts`

iOS는 Constants.swift에서 수동 전환, Android는 **빌드 타입으로 자동 분리**:

```kotlin
buildTypes {
    release {
        buildConfigField("String", "BASE_URL", "\"https://www.<도메인>\"")
    }
    debug {
        buildConfigField("String", "BASE_URL", "\"http://<Mac IP>:5173\"")
    }
}
```

- ▶ Run → debug 빌드 → 로컬 서버 URL 자동 적용
- APK 릴리즈 → release 빌드 → 운영 URL 자동 적용
- **build.gradle.kts 수정 후 반드시 Gradle Sync** (상단 코끼리 아이콘 또는 "Sync Now" 배너)

#### Gradle이란?

Android의 빌드 도구. iOS의 Xcode Build System에 해당.

| | iOS | Android |
|---|---|---|
| 빌드 설정 | `.xcodeproj` | `build.gradle.kts` |
| 의존성 추가 | SPM (Xcode GUI) | `build.gradle.kts`에 코드로 추가 |
| 설정 반영 | Xcode가 자동 | **Gradle Sync 수동 필요** |

#### Android Studio 기본 사용법

1. **프로젝트 열기**: Open → 폴더 선택 → Gradle Sync 대기 (첫 실행 1~3분)
2. **"Trust this project?" 팝업** → Trust Project 선택
3. **Sync 완료** 확인: 하단 Build 탭에 `BUILD SUCCESSFUL`
4. **AGP 업그레이드 제안** → 수락해도 됨

#### 실물기기 연결 (USB)

1. Android 폰 → **설정** → **휴대전화 정보** → **빌드번호 7번 탭** → 개발자 모드 활성화
2. **설정** → **개발자 옵션** → **USB 디버깅** ON
3. USB 케이블로 Mac에 연결
4. "USB 디버깅을 허용하시겠습니까?" → **허용** (항상 허용 체크)
5. Android Studio 상단 디바이스 드롭다운에서 실기기 선택 → **▶ Run**

iOS와 차이: 별도 인증서 신뢰 불필요. USB 디버깅만 켜면 바로 됨.

#### 무선 디버깅

1. 먼저 USB로 한번 연결
2. 폰 **설정** → **개발자 옵션** → **무선 디버깅** ON
3. **페어링 코드로 기기 페어링** → 코드 확인
4. Android Studio → Tools → Device Manager → Pair using Wi-Fi → 코드 입력
5. 이후 USB 없이 같은 Wi-Fi에서 ▶ Run 가능

#### 에뮬레이터 (AVD)

1. Android Studio 상단 디바이스 드롭다운 → Device Manager → Create Device
2. Pixel 7 추천 → API 레벨 선택 → Finish
3. 디바이스 선택 후 ▶ Run
4. ⚠️ 에뮬레이터에서 로컬 서버: `localhost` 아니라 `10.0.2.2` 사용

#### AndroidManifest.xml 필수 권한

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

`ACCESS_NETWORK_STATE` 빠지면 앱 크래시! (`SecurityException`)

#### 핵심 단축키 (Mac)

| 동작 | 단축키 |
|-----|--------|
| Run | `Ctrl + R` |
| Stop | `Cmd + F2` |
| Rebuild | `Cmd + F9` |
| Gradle Sync | 코끼리 아이콘 |

### ⚠️ 시행착오 (iOS + Android)

**iOS:**
- Signing: Apple ID를 Xcode에 추가하면 무료 Personal Team으로 개발 가능 ($99 불필요)
- 실기기: "신뢰하지 않는 개발자" → 설정에서 수동 신뢰 필요 (최초 1회)
- Constants.swift의 live URL은 `https://www.<도메인>/` (www 포함 필수)

**Android:**
- `ACCESS_NETWORK_STATE` 권한 누락 → 앱 크래시 (`SecurityException`). AndroidManifest.xml에 반드시 추가
- build.gradle.kts 수정 후 **Gradle Sync 필수** — 안 하면 변경 안 반영
- AGP 자동 업그레이드 제안 → 수락해도 됨
- 에뮬레이터에서 로컬 서버: `10.0.2.2` 사용 (localhost는 에뮬레이터 자기 자신)
- "Live Edit" 에러 (`IllegalFormatConversionException`) → 무시해도 됨, 앱 실행과 무관
- debug/release URL 분리: build.gradle.kts의 `buildConfigField`로 자동. iOS처럼 수동 전환 불필요

---

## 13-1. iOS 네이티브 Google 로그인 (WebView 앱용)

WebView 앱에서 Google OAuth는 특수한 처리가 필요하다.
- Google은 임베디드 WebView 내 OAuth를 **정책적으로 차단** (403 에러)
- Safari로 열면 로그인 후 앱으로 돌아오지 않음
- → **네이티브 Google SDK**를 써야 함

### 13-1-1. Google Cloud Console에서 iOS용 Client ID 발급

웹용 Client ID와 **별도로** iOS용을 만들어야 함.

| 항목 | 값 |
|-----|---|
| 애플리케이션 유형 | **iOS** (웹 아님!) |
| 이름 | `<프로젝트>-ios` |
| 번들 ID | `com.<프로젝트>.<앱>` (Xcode와 동일) |

→ iOS용 Client ID가 발급됨. GoogleService-Info.plist 다운로드는 선택 (코드에서 직접 설정 가능).

### 13-1-2. iOS 앱 설정

**LordhillChurchApp.swift — 코드에서 직접 Client ID 설정 (plist 불필요)**
```swift
import GoogleSignIn

init() {
    let config = GIDConfiguration(clientID: "<iOS용 Client ID>")
    GIDSignIn.sharedInstance.configuration = config
}
```

**Info.plist — Reversed Client ID URL Scheme 등록**
```xml
<dict>
    <key>CFBundleURLName</key>
    <string>GoogleSignIn</string>
    <key>CFBundleURLSchemes</key>
    <array>
        <string>com.googleusercontent.apps.<iOS Client ID 앞부분></string>
    </array>
</dict>
```

**LordhillWebView.swift — Google OAuth URL 인터셉트 → 네이티브 SDK**
```swift
// WebView에서 Google OAuth URL 감지 시
if DeepLinkUtil.isGoogleOAuthURL(url) {
    performNativeGoogleSignIn()  // 네이티브 SDK 팝업
    decisionHandler(.cancel)     // WebView 네비게이션 차단
    return
}
```

**네이티브 로그인 성공 후 흐름:**
```
GIDSignIn 성공 → idToken 획득
→ POST /api/auth/google/native (서버에 idToken 전송)
→ 서버가 Google에 토큰 검증 → JWT 발급 → { accessToken } 응답
→ 웹뷰에서 /auth/callback?token=xxx 로드
→ OAuthCallbackPage → localStorage 저장 → 홈 이동
```

### 13-1-3. 서버 엔드포인트 추가

`POST /api/auth/google/native` — 네이티브 앱에서 idToken으로 로그인

```js
// controllers/auth.js
export const googleNativeLogin = async (req, res) => {
  const { idToken } = req.body;
  // Google tokeninfo API로 검증
  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`
  );
  const { sub: providerId, email, name, picture } = await response.json();
  // 유저 생성/조회 → JWT 발급
  const tokens = generateTokens(user);
  res.json({ accessToken: tokens.accessToken });
};
```

라우트 등록:
```js
router.post('/google/native', asyncHandler(googleNativeLogin));
```

### ⚠️ 시행착오 (많음!)

1. **GoogleService-Info.plist 없이 실행 가능** — 코드에서 `GIDConfiguration(clientID:)`로 직접 설정하면 plist 불필요
2. **웹용 Client ID ≠ iOS용 Client ID** — 웹용 Client ID를 iOS에서 쓰면 `Custom scheme URIs are not allowed for 'WEB' client type` 에러. 반드시 iOS 유형으로 별도 발급
3. **Info.plist URL Scheme 필수** — `com.googleusercontent.apps.<Client ID>` 등록 안 하면 앱 크래시 (`NSInvalidArgumentException`)
4. **WebView 내 Google OAuth 차단** — Google 정책상 임베디드 WebView에서 OAuth 금지. `access blocked` 403 에러 발생
5. **Safari로 열면 앱으로 안 돌아옴** — Safari에서 로그인 완료 후 웹 페이지에서 머무름. 딥링크/Universal Link 추가 설정 없이는 앱으로 복귀 불가
6. **서버 응답 파싱 실패** — 라이브 서버에 코드 배포 + PM2 재시작 잊지 말 것
7. **PM2 프로세스 중복** — 배포 시 프로세스가 여러 개 생기면 포트 충돌. `pm2 delete all` 후 재시작

---

## 13-2. iOS 네이티브 Kakao/Naver 로그인

Google SDK와 동일한 패턴. WebView에서 OAuth URL 인터셉트 → 네이티브 SDK 로그인 → accessToken → 서버 native 엔드포인트 → JWT → 웹뷰 콜백.

카카오/네이버는 WebView에서도 웹 OAuth가 동작하지만, **네이티브 SDK를 쓰면 UX가 훨씬 좋음** (카카오톡 앱 로그인, 네이버 앱 로그인).

### 13-2-1. SDK 설치 (Xcode SPM) — ⚠️ 코드 작성 전에 반드시 먼저!

SDK 패키지를 먼저 추가하지 않으면 `No such module` 빌드 에러 발생.
**코드를 작성하기 전에 Xcode에서 패키지부터 추가할 것.**

Xcode → **File → Add Package Dependencies** → URL 입력 → Add Package → 모듈 선택:

| SDK | URL | 선택할 모듈 |
|-----|-----|----------|
| **Kakao SDK** | `https://github.com/kakao/kakao-ios-sdk` | `KakaoSDKCommon`, `KakaoSDKAuth`, `KakaoSDKUser` |
| **Naver SDK** | `https://github.com/naver/naveridlogin-sdk-ios-swift` | `NidThirdPartyLogin` |

패키지 추가 후 한번 빌드해서 import가 정상인지 확인한 뒤 코드 작업 진행.

### 13-2-1-1. 각 개발자 콘솔에서 iOS 플랫폼 등록 (SDK 사용 전 필수!)

네이티브 SDK를 쓰려면 각 개발자 콘솔에 **iOS 플랫폼을 별도 등록**해야 함. 안 하면 `KOE008 잘못된 요청` 등 에러 발생.

**카카오:**
1. https://developers.kakao.com → 내 애플리케이션 → 앱 선택
2. **앱 설정** → **플랫폼 키** → **네이티브 앱 키 추가**
3. 키 이름: `<프로젝트>-ios`, iOS 앱 정보의 번들 ID: `com.<프로젝트>.<앱>` (Xcode와 동일)
4. 나머지 (안드로이드, 스토어 URL 등)는 비워두기

**네이버:**
1. https://developers.naver.com → Application → 앱 선택 → **수정**
2. 로그인 오픈 API 서비스 환경에 **iOS** 추가
3. 설정:

| 항목 | 값 |
|-----|---|
| 다운로드 URL | 임시로 `https://www.<도메인>` (필수값, 앱스토어 등록 후 교체) |
| URL Scheme | `<프로젝트>-naver` |

### 13-2-2. Info.plist 설정

URL Schemes 추가:
```xml
<!-- Kakao -->
<dict>
    <key>CFBundleURLName</key>
    <string>KakaoLogin</string>
    <key>CFBundleURLSchemes</key>
    <array>
        <string>kakao<REST API 키></string>
    </array>
</dict>

<!-- Naver -->
<dict>
    <key>CFBundleURLName</key>
    <string>NaverLogin</string>
    <key>CFBundleURLSchemes</key>
    <array>
        <string><프로젝트>-naver</string>
    </array>
</dict>
```

카카오톡/네이버 앱 연동용:
```xml
<key>LSApplicationQueriesSchemes</key>
<array>
    <string>kakaokompassauth</string>
    <string>storykompassauth</string>
    <string>kakaolink</string>
    <string>naversearchapp</string>
    <string>naversearchthirdlogin</string>
</array>
```

### 13-2-3. SDK 초기화 (App.swift)

```swift
import KakaoSDKCommon
import KakaoSDKAuth
import NidThirdPartyLogin

init() {
    // Kakao (⚠️ 네이티브 앱 키! REST API 키 아님!)
    KakaoSDK.initSDK(appKey: "<네이티브 앱 키>")

    // Naver (새 SDK: NidOAuth)
    NidOAuth.shared.initialize(
        appName: "<앱 이름>",
        clientId: "<Client ID>",
        clientSecret: "<Client Secret>",
        urlScheme: "<프로젝트>-naver"
    )
}
```

### 13-2-4. URL 처리 (onOpenURL + AppDelegate)

```swift
// onOpenURL
if AuthApi.isKakaoTalkLoginUrl(url) {
    _ = AuthController.handleOpenUrl(url: url)
    return
}
if NidOAuth.shared.handleURL(url) {
    return
}

// AppDelegate application(_:open:options:) 에도 동일 처리
```

### 13-2-5. OAuth URL 인터셉트 (WebView)

DeepLinkUtil에 판별 함수 추가:
```swift
static func isKakaoOAuthURL(_ url: URL) -> Bool {
    // kauth.kakao.com 또는 /api/auth/kakao 감지
}
static func isNaverOAuthURL(_ url: URL) -> Bool {
    // nid.naver.com 또는 /api/auth/naver 감지
}
```

WebView decidePolicyFor에서:
```swift
if DeepLinkUtil.isKakaoOAuthURL(url) {
    performNativeKakaoSignIn()   // 카카오톡 앱 또는 웹 로그인
    decisionHandler(.cancel)
    return
}
if DeepLinkUtil.isNaverOAuthURL(url) {
    performNativeNaverSignIn()   // 네이버 앱 로그인
    decisionHandler(.cancel)
    return
}
```

### 13-2-6. 네이티브 로그인 → 서버 토큰 전송

**Kakao:**
```swift
// 카카오톡 설치 여부에 따라 앱/웹 분기
if UserApi.isKakaoTalkLoginAvailable() {
    UserApi.shared.loginWithKakaoTalk { oauthToken, error in ... }
} else {
    UserApi.shared.loginWithKakaoAccount { oauthToken, error in ... }
}
// accessToken → POST /api/auth/kakao/native
```

**Naver:** (새 SDK — 콜백 방식, delegate 불필요)
```swift
NidOAuth.shared.requestLogin { result in
    switch result {
    case .success(let loginResult):
        let accessToken = loginResult.accessToken.tokenString
        self.sendNaverTokenToServer(accessToken: accessToken)
    case .failure(let error):
        print("[OAuth] Naver 로그인 실패: \(error)")
    }
}
// accessToken → POST /api/auth/naver/native
```

NaverLoginHandler 헬퍼 불필요 — 새 SDK가 콜백 방식이라 delegate 변환 없이 바로 사용.

### 13-2-7. 공통 토큰 전송 헬퍼

Google/Kakao/Naver 모두 서버에 토큰을 보내고 JWT를 받아 웹뷰 콜백을 로드하는 패턴이 동일. 공통 헬퍼로 중복 제거:
```swift
private func sendTokenRequest(request: URLRequest) {
    URLSession.shared.dataTask(with: request) { data, _, error in
        // JSON 파싱 → accessToken 추출 → 웹뷰에서 /auth/callback?token=xxx 로드
    }.resume()
}
```

### ⚠️ 시행착오

1. **Kakao SDK의 appKey = 네이티브 앱 키** (REST API 키 아님!) — 카카오 개발자 콘솔에서 네이티브 앱 키를 발급받아 사용. REST API 키를 넣으면 `KOE008 잘못된 요청` 에러
2. **Kakao URL Scheme 형식** — `kakao` + 네이티브 앱 키 (공백 없이 붙임). 예: `kakaoef9d45e16f2863ae9b5f5ddd7e3da2ed`
3. **Naver 새 SDK는 콜백 방식** — 구 SDK(NaverThirdPartyLogin)는 delegate 패턴이었지만, 새 SDK(NidThirdPartyLogin)는 콜백 방식. NaverLoginHandler 헬퍼 불필요
4. **Naver urlScheme** — Info.plist의 URL Scheme과 `NidOAuth.shared.initialize(urlScheme:)`이 정확히 일치해야 함
5. **네이버 다운로드 URL 필수** — iOS 환경 등록 시 다운로드 URL이 필수값. 앱스토어 미등록이면 임시로 웹 도메인 입력
5. **LSApplicationQueriesSchemes 필수** — 카카오톡/네이버 앱 설치 여부 확인에 필요. 없으면 앱 로그인 불가
6. **SPM 패키지는 CLI로 추가 불가** — Xcode에서 수동으로 File → Add Package Dependencies. **코드 작성 전에 먼저 추가해야 함!** 안 하면 `No such module 'KakaoSDKCommon'` 등 빌드 에러
7. **NaverLoginHandler.swift 파일** — 파일 생성 후 .xcodeproj에 자동 등록 안 될 수 있음. Xcode에서 수동으로 드래그 추가
8. **작업 순서 중요** — ① SPM 패키지 추가 → ② 빌드 확인 → ③ 코드 작성. 순서가 바뀌면 빌드 에러 해결에 시간 낭비
9. **개발자 콘솔에 iOS 플랫폼 등록 필수** — 카카오: 앱 설정 → 플랫폼 키 → 네이티브 앱 키 추가 (번들 ID). 네이버: 앱 수정 → 서비스 환경에 iOS 추가 (URL Scheme + 다운로드 URL). 안 하면 `KOE008 잘못된 요청` 에러
10. **카카오 키 구분 (웹 vs 네이티브)** — 서버(Passport): REST API 키 + 카카오 로그인 코드. iOS SDK: 네이티브 앱 키. 네이버는 웹/네이티브 같은 키 사용
11. **Naver SDK 버전 주의** — 구버전(`NaverThirdPartyLogin`, nicemak 레포)과 새 버전(`NidThirdPartyLogin`, naver 공식 레포)이 있음. 새 버전은 `NidOAuth.shared`를 사용하고 API가 완전히 다름. 반드시 `https://github.com/naver/naveridlogin-sdk-ios-swift` (공식 새 버전) 사용

---

## 13-3. Android 네이티브 Google/Kakao/Naver 로그인

iOS와 동일한 패턴. WebView에서 OAuth URL 인터셉트 → 네이티브 SDK 로그인 → 토큰 → 서버 native 엔드포인트 → JWT → 웹뷰 콜백.

서버 엔드포인트(`/api/auth/{provider}/native`)는 iOS와 공유 — 추가 작업 없음.

### 13-3-1. SDK 의존성 추가 (build.gradle.kts)

`gradle/libs.versions.toml`에 버전 추가:
```toml
[versions]
kakaoSdk = "2.20.6"
naverLogin = "5.10.0"

[libraries]
kakao-user = { module = "com.kakao.sdk:v2-user", version.ref = "kakaoSdk" }
naver-login = { module = "com.navercorp.nid:oauth-jdk8", version.ref = "naverLogin" }
```

`app/build.gradle.kts`에 의존성 추가:
```kotlin
// Kakao SDK
implementation(libs.kakao.user)
// Naver Login SDK
implementation(libs.naver.login)
```

`settings.gradle.kts`에 Kakao Maven 저장소 추가:
```kotlin
dependencyResolutionManagement {
    repositories {
        // ... 기존 저장소
        maven { url = uri("https://devrepo.kakao.com/nexus/content/groups/public/") }
    }
}
```

Google은 Credential Manager 의존성이 이미 있으므로 추가 불필요.

### 13-3-2. 각 개발자 콘솔에서 Android 등록

⚠️ **SDK 사용 전 반드시 등록!**

**Google:**
1. Google Cloud Console → 사용자 인증 정보 → OAuth 클라이언트 ID 만들기
2. 애플리케이션 유형: **Android**
3. 패키지 이름: `com.<프로젝트>.<앱>`
4. SHA-1 인증서 지문:
   ```bash
   keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android | grep "SHA1:"
   ```

**카카오:**

⚠️ **카카오는 iOS/Android를 같은 페이지에서 설정한다!** 네이티브 앱 키는 하나이고, 그 안에 iOS 앱정보 섹션과 Android 앱정보 섹션이 함께 있다. iOS 설정 시 만든 키를 **새로 만들지 말고**, 같은 키의 Android 앱정보 섹션에 추가해야 한다.

1. 카카오 개발자 콘솔 → 앱 설정 → 플랫폼 키 → (iOS 때 만든) 네이티브 앱 키 수정
2. **Android 앱정보** 섹션에 입력:
   - 패키지명: `com.<프로젝트>.<앱>`
   - 키 해시: **런타임에서 추출한 값** (아래 참고)
3. ⚠️ keytool로 추출한 키 해시와 런타임 값이 다를 수 있음!

키 해시 런타임 추출 코드 (Application.onCreate에 추가):
```kotlin
import com.kakao.sdk.common.util.Utility
val keyHash = Utility.getKeyHash(this)
Log.d("keyhash", "Kakao KeyHash: $keyHash")
```
→ Logcat에서 확인 후 카카오 콘솔에 등록. **이 값이 정확한 값.**

**네이버:**
1. 네이버 개발자 콘솔 → Application → 앱 수정
2. 서비스 환경에 **Android** 추가:
   - 다운로드 URL: `https://www.<도메인>` (필수값, 임시)
   - 패키지 이름: `com.<프로젝트>.<앱>`

### 13-3-3. SDK 초기화 (Application.kt)

```kotlin
import com.kakao.sdk.common.KakaoSdk
import com.navercorp.nid.NaverIdLoginSDK

override fun onCreate() {
    super.onCreate()
    // Kakao (네이티브 앱 키!)
    KakaoSdk.init(this, "<네이티브 앱 키>")
    // Naver
    NaverIdLoginSDK.initialize(this, "<Client ID>", "<Client Secret>", "<앱 이름>")
}
```

키 값은 `res/values/strings.xml`에 저장하고 `getString(R.string.xxx)`으로 참조하는 것이 좋음.

### 13-3-4. AndroidManifest.xml 설정

```xml
<!-- 카카오톡 앱 감지 (Android 11+) -->
<queries>
    <package android:name="com.kakao.talk" />
</queries>

<!-- Kakao SDK 로그인 리다이렉트 Activity -->
<activity
    android:name="com.kakao.sdk.auth.AuthCodeHandlerActivity"
    android:exported="true">
    <intent-filter>
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data
            android:host="oauth"
            android:scheme="kakao<네이티브 앱 키>" />
    </intent-filter>
</activity>
```

### 13-3-5. WebView OAuth URL 인터셉트 (CustomWebViewClient.kt)

```kotlin
// shouldOverrideUrlLoading에서
// Google OAuth URL → Credential Manager로 로그인
// Kakao OAuth URL → UserApiClient (카카오톡 앱 우선, 없으면 웹 폴백)
// Naver OAuth URL → NaverIdLoginSDK.authenticate() 콜백
// → 토큰 → POST /api/auth/{provider}/native → JWT → 웹뷰 콜백
```

### 13-3-6. 공통 서버 토큰 전송 (NativeAuthHelper.kt)

iOS의 `sendTokenRequest`와 동일 역할. 서버에 토큰 POST → JWT 응답 → 웹뷰에서 `/auth/callback?token=xxx` 로드.

### 13-3-7. ProGuard 규칙 (app/proguard-rules.pro)

릴리즈 빌드 시 SDK 코드 난독화 방지:
```
# Kakao SDK
-keep class com.kakao.sdk.** { *; }
# Naver SDK
-keep class com.navercorp.nid.** { *; }
```

### ⚠️ 시행착오

1. **카카오 iOS/Android는 같은 네이티브 앱 키에서 설정!** — 카카오 개발자 콘솔의 "네이티브 앱 키 수정" 페이지 안에 iOS 앱정보 섹션과 Android 앱정보 섹션이 **함께** 있다. iOS 때 키를 만들었으면 Android 용으로 **새 키를 만들지 말고**, 같은 키의 Android 앱정보 섹션에 패키지명 + 키 해시를 추가해야 함. 별도로 만들면 `Android keyHash validation failed` 에러 발생
2. **카카오 키 해시 — keytool vs 런타임 값이 다름!** keytool로 추출(`openssl dgst -sha256`)한 값과 `Utility.getKeyHash()`로 추출한 값이 다를 수 있음. **반드시 런타임 값을 카카오 콘솔에 등록**. 이걸로 `Android keyHash validation failed` 에러 해결
3. **카카오 콘솔 패키지명 오타 주의** — 패키지명이 한 글자라도 다르면 `keyHash validation failed`. 실제로 `church`를 `chucrh`로 오타 내서 하루 넘게 삽질한 사례 있음
4. **카카오 콘솔 반영 지연** — 키 해시 등록 후 반영에 시간 소요될 수 있음. 안 되면 키 해시 삭제 후 재등록
5. **카카오 네이티브 앱 키 ≠ REST API 키** — iOS와 마찬가지로 Android SDK도 네이티브 앱 키 사용
4. **AndroidManifest.xml에 AuthCodeHandlerActivity 필수** — 카카오 SDK 리다이렉트 처리용. 없으면 로그인 후 앱으로 안 돌아옴
5. **Kakao Maven 저장소 추가 필수** — settings.gradle.kts에 `devrepo.kakao.com` 안 넣으면 의존성 다운로드 실패
6. **ACCESS_NETWORK_STATE 권한** — AndroidManifest.xml에 없으면 앱 크래시 (`SecurityException`)
7. **Google Android용 Client ID** — Google Cloud Console에서 Android 유형으로 별도 발급 (SHA-1 + 패키지명). 코드에 넣을 필요 없이 콘솔 등록만 하면 자동 인증
8. **네이버 다운로드 URL 필수** — Android 환경 등록 시에도 필수값. 임시로 웹 도메인 입력

---

## 14. 어드민 프론트 배포

어드민용 S3 + CloudFront + DNS를 별도로 세팅. 와일드카드 인증서(`*.<도메인>`)가 이미 있으므로 서브도메인 추가 비용 없음.

### 14-1. S3 버킷 생성
```bash
aws s3 mb s3://<프로젝트>-admin --region ap-northeast-2
```

### 14-2. CloudFront 배포 생성
콘솔 또는 CLI로 생성. 프론트용과 동일 패턴:
- Origin: 어드민 S3 버킷
- OAC 설정 → S3 버킷 정책 추가 (CloudFront 서비스 프린시펄 허용)
- SPA 에러 페이지: 403 → /index.html (200)
- 커스텀 도메인: `admin.<도메인>` + 기존 와일드카드 ACM 인증서 연결

### 14-3. S3 버킷 정책
```bash
aws s3api put-bucket-policy --bucket <프로젝트>-admin --policy '{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"Service": "cloudfront.amazonaws.com"},
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::<프로젝트>-admin/*",
    "Condition": {"StringEquals": {"AWS:SourceArn": "arn:aws:cloudfront::<계정ID>:distribution/<배포ID>"}}
  }]
}'
```

### 14-4. 가비아 DNS 추가

| 타입 | 호스트 | 값 |
|-----|-------|---|
| CNAME | `admin` | `<CloudFront도메인>.` |

### 14-5. GitHub Secrets 추가
```bash
gh secret set ADMIN_CLOUDFRONT_DISTRIBUTION_ID --body "<배포ID>"
```

### 14-6. GitHub Actions 워크플로우
`.github/workflows/deploy-admin.yml` — 프론트와 동일 패턴:
```
트리거: main 푸시 + packages/admin-front/** 변경
빌드 (VITE_API_URL=https://api.<도메인>) → S3 업로드 → CloudFront 캐시 무효화
```

### 14-7. 어드민 API URL 설정
```js
// admin-front/src/lib/api.js
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api`
    : '/api',
  withCredentials: true,
});
```

### 14-8. 서버 CORS + ADMIN_URL
```bash
# EC2 .env에 추가
ADMIN_URL=https://admin.<도메인>
```
서버 config의 `cors.origins`에 `ADMIN_URL` 포함 확인. PM2 재시작.

### ⚠️ 시행착오
- CLI로 CloudFront 생성 시 CustomOriginConfig로 만들어질 수 있음 → S3OriginConfig + OAC로 수정 필요
- 프론트용 CloudFront와 별개 배포이므로 별도의 S3 버킷 정책, OAC, GitHub Secret 필요
- admin-front의 vite 프록시에서 path rewrite 주의 — 서버가 `/api` prefix를 쓰면 rewrite 하면 안 됨

---

## 15. 어드민 계정 생성 (아이디/비밀번호 로그인)

어드민은 소셜 로그인이 불필요. 아이디/비밀번호 계정을 하나 생성하고, 별도 로그인 엔드포인트를 만든다.

### 15-1. DB 마이그레이션 — username/password 컬럼 추가

기존 `users` 테이블에 어드민 전용 컬럼 추가. 일반 유저는 OAuth라 이 컬럼들이 `null`.

```bash
cd packages/server && npm run migration -- add-username-password-to-users
```

```js
// migrations/xxxxxxxx-add-username-password-to-users.cjs
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'username', {
      type: Sequelize.STRING(50),
      allowNull: true,
      unique: true,
    });
    await queryInterface.addColumn('users', 'password', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'password');
    await queryInterface.removeColumn('users', 'username');
  },
};
```

User 모델에도 `username`, `password` 필드 추가:
```js
// User.init 안에 추가
username: { type: DataTypes.STRING(50), allowNull: true, unique: true },
password: { type: DataTypes.STRING(255), allowNull: true },
```

### 15-2. 시더 — 슈퍼 어드민 계정 생성

```bash
cd packages/server && npm run migration -- create-super-admin  # 시더 파일 생성 (seeders/ 디렉토리에 수동 이동)
```

```js
// seeders/xxxxxxxx-create-super-admin.cjs
const bcrypt = require('bcryptjs');

module.exports = {
  async up(queryInterface) {
    const hashedPassword = await bcrypt.hash('<초기 비밀번호>', 10);
    await queryInterface.bulkInsert('users', [{
      email: 'admin@<도메인>',
      nickname: '관리자',
      provider: 'dev',
      provider_id: 'super-admin',
      role: 'admin',
      status: 'approved',
      username: 'admin',
      password: hashedPassword,
      created_at: new Date(),
      updated_at: new Date(),
    }]);
  },
  async down(queryInterface) {
    await queryInterface.bulkDelete('users', { username: 'admin' });
  },
};
```

실행:
```bash
cd packages/server && npm run mig-all    # 마이그레이션 실행
cd packages/server && npm run db:seed    # 시더 실행
```

### 15-3. 서버 — 어드민 로그인 엔드포인트

**에러 정의 (err.js):**
```js
InvalidCredentials: {
  statusCode: 401,
  code: 12,
  message: '아이디 또는 비밀번호가 올바르지 않습니다.',
  logLevel: 'warn',
},
```

**컨트롤러 (`admin/controllers/auth.js`):**
```js
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import config from 'config';
import models from '../../db.js';
import { ErrClass, ErrInfo } from '../../err.js';
import { userRole } from '../../define.js';

// 어드민 아이디/비밀번호 로그인
export const adminLogin = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) throw new ErrClass(ErrInfo.BadRequest);

  const user = await models.User.findOne({
    where: { username, role: userRole.admin },
  });
  if (!user) throw new ErrClass(ErrInfo.InvalidCredentials);

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new ErrClass(ErrInfo.InvalidCredentials);

  const accessToken = jwt.sign(
    { id: user.id, role: user.role },
    config.JWT.JWT_SECRET,
    { expiresIn: config.JWT.EXPIRE_TIME },
  );
  res.json({ accessToken });
};
```

**라우트 (`admin/routes/auth.js`):**
```js
import express from 'express';
import asyncHandler from 'express-async-handler';
import { adminLogin } from '../controllers/auth.js';

const router = express.Router();
router.post('/login', asyncHandler(adminLogin));
export default router;
```

### 15-4. 서버 — app.js 라우트 마운트

```js
import adminAuthRouter from './admin/routes/auth.js';

// 어드민 (로그인은 인증 불필요, 나머지는 admin 권한 필요)
apiRouter.use('/admin', adminAuthRouter);
apiRouter.use('/admin', onlyLoginUser, onlyAdmin, adminRouter);
```

⚠️ **`use('/')` 라우터보다 반드시 위에 배치할 것!** (아래 시행착오 1번 참고)

### 15-5. 어드민 프론트 — 로그인 페이지

`LoginPage.jsx`: 아이디/비밀번호 폼 → `POST /api/admin/login` → `accessToken`을 `localStorage`에 저장 → 홈으로 이동.

`api.js`: 요청 인터셉터에서 Bearer 토큰 첨부, 401 응답 시 localStorage 토큰 삭제 + `/login`으로 리다이렉트.

`App.jsx`의 `AdminRoute` 가드:
```js
api.get('/auth/me').then(({ data }) => {
  setState({
    loading: false,
    isAdmin: data.role === 'admin' && data.status === 'approved',
  });
});
```

### ⚠️ 시행착오

1. **`apiRouter.use('/')` 순서 문제** — comment 라우터를 `use('/')`로 마운트하면 prefix `/`가 **모든 경로에 매칭**됨. `POST /admin/login`도 `/`로 시작하므로 comment 라우터의 `onlyLoginUser` 미들웨어가 먼저 실행되어 401 에러 발생. **`use('/')` 라우터는 반드시 다른 모든 라우터보다 마지막에 배치해야 함**
2. **role/status 대소문자 불일치** — DB enum은 소문자(`admin`, `approved`)인데 프론트에서 대문자(`ADMIN`, `APPROVED`)로 비교하면 항상 `false`. 서버가 내려주는 값과 정확히 일치시켜야 함
3. **포트 충돌 (EADDRINUSE)** — nodemon 재시작 시 이전 프로세스가 남아 포트 충돌 발생. `kill $(lsof -t -i :3001)` 후 재시작. 여러 터미널에서 서버를 중복 실행하지 않도록 주의
4. **CI/CD에 시더 실행 누락** — `db:migrate`만 있고 `db:seed:all`이 없으면 라이브 DB에 초기 데이터(admin 계정)가 없음. deploy-server.yml에 마이그레이션 다음 줄에 `npx sequelize-cli db:seed:all` 추가 필수
5. **시더 중복 실행 방지** — `db:seed:all`은 매 배포마다 실행되므로 시더 내부에서 `SELECT`로 기존 데이터 존재 여부를 확인하고 있으면 스킵하는 로직 필요. 안 하면 배포할 때마다 중복 삽입 시도 → unique 제약 에러
6. **PM2 프로세스 중복 (라이브 배포 후 로그인 실패 원인)** — `pm2 startOrRestart`가 기존 프로세스를 교체하지 못하고 새 프로세스를 추가 생성할 수 있음. 구 코드 프로세스(6일 전)가 요청을 처리하여 최신 코드가 반영 안 됨. `pm2 list`로 프로세스 개수를 확인하고, 여러 개면 `pm2 delete all` 후 단일 프로세스로 재시작. 배포 스크립트에서도 `pm2 delete lordhill-server` 후 `pm2 start`하는 것이 안전

---

## 16. 회원 상태 관리 (잠금/삭제/복구)

어드민에서 회원을 잠금(로그인 차단)/삭제(소프트 딜리트)/복구할 수 있게 한다. 소셜 로그인 시 상태에 따라 로그인을 차단하고 프론트에서 안내 모달을 띄운다.

### 회원 상태 정리

| 상태 | DB 값 | 소셜 로그인 시도 시 |
|------|--------|-------------------|
| 활성 | `status: approved` | 정상 로그인 |
| 잠금 | `status: deactivated` | 차단 + "계정이 잠겨있습니다" 모달 |
| 삭제 | `deletedAt` 존재 (soft delete) | 차단 + "삭제된 계정입니다" 모달 |

### 16-1. User 모델에 paranoid 추가 (soft delete)

마이그레이션으로 `deleted_at` 컬럼 추가:
```js
// migrations/xxxxxxxx-add-deleted-at-to-users.cjs
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'deleted_at', {
      type: Sequelize.DATE,
      allowNull: true,
      defaultValue: null,
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'deleted_at');
  },
};
```

User 모델에 `paranoid: true` 추가:
```js
User.init({ ... }, {
  sequelize,
  tableName: 'users',
  timestamps: true,
  paranoid: true,  // destroy() 시 deleted_at만 설정, 행은 유지
});
```

### 16-2. 서버 — 소셜 로그인 시 상태 체크

OAuth 콜백 + 네이티브 로그인에서 공통 헬퍼 사용:
```js
const findOrRestoreUser = async ({ provider, providerId, email, nickname, profileImageUrl }) => {
  // soft-deleted 유저도 포함하여 조회
  let user = await models.User.findOne({
    where: { provider, providerId },
    paranoid: false,
  });

  // 잠금 계정
  if (user && user.status === userStatus.deactivated) {
    return { user: null, error: 'account_locked' };
  }
  // 삭제된 계정
  if (user && user.deletedAt) {
    return { user: null, error: 'account_deleted' };
  }
  // 신규 가입
  if (!user) {
    user = await models.User.create({ ... });
  }
  return { user, error: null };
};
```

**웹 OAuth** — 에러 시 쿼리 파라미터로 리다이렉트:
```js
if (error) {
  return res.redirect(`${clientUrl}/login?error=${error}`);
}
```

**네이티브 로그인** — 에러 시 JSON 에러 throw:
```js
if (error === 'account_locked') throw new ErrClass(ErrInfo.UserDeactivated);
if (error === 'account_deleted') throw new ErrClass(ErrInfo.UserDeleted);
```

### 16-3. 서버 — 어드민 API

```js
// 계정잠금/해제 토글
router.patch('/users/:id/deactivate', asyncHandler(deactivateUser));
// 회원 삭제 (soft delete — paranoid가 자동 처리)
router.delete('/users/:id', asyncHandler(deleteUser));
// 삭제된 회원 복구
router.patch('/users/:id/restore', asyncHandler(restoreUser));
```

**회원 목록**에서 삭제된 유저도 포함하려면 `paranoid: false` + `deletedAt` 필드 포함:
```js
const users = await models.User.findAll({
  where,
  paranoid: false,
  attributes: [..., 'deletedAt'],
});
```

`?status=deleted` 필터는 `deletedAt`이 null이 아닌 유저만 조회:
```js
if (status === 'deleted') {
  where.deletedAt = { [Op.ne]: null };
}
```

### 16-4. 앱 프론트 — 잠금/삭제 안내 모달

`LoginPage`에서 URL 쿼리 `?error=account_locked` 또는 `?error=account_deleted`를 감지하여 MUI Dialog로 안내:
```tsx
const ERROR_MESSAGES: Record<string, string> = {
  account_locked: '계정이 잠겨있습니다. 관리자에게 문의하세요.',
  account_deleted: '삭제된 계정입니다. 관리자에게 문의하세요.',
  oauth_failed: '소셜 로그인에 실패했습니다. 다시 시도해주세요.',
};
```

⚠️ `useEffect` 안에서 `setState`를 호출하면 React lint 에러 (`react-hooks/set-state-in-effect`). 대신 `useState`의 초기값으로 처리:
```tsx
const errorParam = searchParams.get('error');
const [errorMessage, setErrorMessage] = useState(
  errorParam ? ERROR_MESSAGES[errorParam] || '' : ''
);
```

### 16-5. 어드민 프론트 — 회원 관리 UI

- 상태 표시: 활성/잠금/삭제됨/대기/거절됨
- 삭제된 유저: 행 반투명(`opacity-50`) + "삭제복구" 버튼만 표시
- 잠금: "잠금해제"/"계정잠금" 토글 버튼
- 삭제: MUI Dialog로 확인 후 soft delete
- 필터 탭: 전체/대기/활성/잠금/삭제됨/거절됨

### 16-6. 네이티브 앱 (iOS/Android) — 잠금/삭제 계정 처리

웹 OAuth는 서버가 `/login?error=account_locked`로 리다이렉트하면 끝이지만, **네이티브 SDK 로그인은 흐름이 다르다**:

```
네이티브 SDK 로그인 성공 → POST /api/auth/{provider}/native → 403 JSON 에러
→ 앱에서 에러 코드를 읽고 → 웹뷰에서 /login?error=account_locked 로드
→ LoginPage의 MUI Dialog 모달 표시
```

서버는 이미 403 + `{ code: 23 }` (잠금) / `{ code: 26 }` (삭제)을 반환하므로, 앱 쪽에서 HTTP 응답 코드를 체크하고 웹뷰 에러 페이지를 로드하면 된다.

**iOS (`LordhillWebView.swift` — `sendTokenRequest` 수정):**

기존 `sendTokenRequest`는 서버 응답에서 `accessToken`만 파싱. 403 에러 시 조용히 실패.

```swift
// 403 에러 응답 처리 추가
URLSession.shared.dataTask(with: request) { data, response, error in
    // ... 기존 에러/파싱 체크 ...

    // HTTP 403 → 잠금/삭제 계정
    if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 403 {
        let code = json["code"] as? Int ?? 0
        // code 23: 잠금, code 26: 삭제
        let errorParam = code == 26 ? "account_deleted" : "account_locked"
        let errorUrl = "\(baseUrl)/login?error=\(errorParam)"
        DispatchQueue.main.async {
            self.webView?.load(URLRequest(url: URL(string: errorUrl)!))
        }
        return
    }

    // 정상: accessToken 파싱 → 콜백 로드 (기존 코드)
}
```

핵심: `URLSession.shared.dataTask`의 두 번째 파라미터를 `_`에서 `response`로 변경하여 HTTP 상태 코드 접근.

**Android (`NativeAuthHelper.kt` + `CustomWebViewClient.kt` 수정):**

`AuthResult`를 sealed class로 변경하여 성공/차단을 구분:

```kotlin
// NativeAuthHelper.kt
sealed class AuthResult {
    data class Success(val accessToken: String) : AuthResult()
    data class AccountBlocked(val errorParam: String) : AuthResult()
}

// sendTokenToServer에서 403 처리 추가
} else if (responseCode == HttpURLConnection.HTTP_FORBIDDEN) {
    val code = try { JSONObject(errorBody).optInt("code", 0) } catch (_: Exception) { 0 }
    val errorParam = if (code == 26) "account_deleted" else "account_locked"
    AuthResult.AccountBlocked(errorParam = errorParam)
}
```

`CustomWebViewClient.kt`에서 `loadCallbackUrl`을 `handleAuthResult`로 교체:

```kotlin
// 공통 응답 처리
private fun handleAuthResult(view: WebView, result: NativeAuthHelper.AuthResult?) {
    val baseUrl = EnvManager.getBaseUrl().trimEnd('/')
    when (result) {
        is NativeAuthHelper.AuthResult.Success -> {
            view.post { view.loadUrl("$baseUrl/auth/callback?token=${result.accessToken}") }
        }
        is NativeAuthHelper.AuthResult.AccountBlocked -> {
            view.post { view.loadUrl("$baseUrl/login?error=${result.errorParam}") }
        }
        null -> { Logger.e("[OAuth] 서버 응답 처리 실패") }
    }
}
```

3개 로그인 핸들러(Google/Kakao/Naver)에서 `loadCallbackUrl(view, result.accessToken)` → `handleAuthResult(view, result)` 로 교체.

### ⚠️ 시행착오

1. **`paranoid: true`와 `findOne`** — paranoid 모델에서 `findOne()`은 기본적으로 `deletedAt IS NULL` 조건이 붙음. 삭제된 유저를 찾으려면 반드시 `paranoid: false` 옵션 필요. 빠뜨리면 삭제 유저가 신규 가입으로 처리됨
2. **웹 OAuth vs 네이티브 에러 처리 방식이 다름** — 웹 OAuth는 서버가 리다이렉트(`/login?error=xxx`)로 처리. 네이티브 SDK 로그인은 JSON 에러(403)를 반환하므로, **앱에서 HTTP 상태 코드를 확인하고 직접 웹뷰에서 에러 URL을 로드**해야 함. 이 처리가 없으면 잠금/삭제 계정이 소셜로그인 시 모달 없이 그냥 로그인 실패만 됨
3. **React `useEffect` 내 `setState` lint 에러** — `react-hooks/set-state-in-effect` 규칙. URL 파라미터에서 초기 에러를 읽을 때 `useEffect` 대신 `useState` 초기값으로 처리해야 함
4. **어드민 회원 목록에서 삭제 유저 필터** — `status` 컬럼에 'deleted' 값이 없으므로 쿼리 파라미터 `?status=deleted`를 서버에서 `deletedAt IS NOT NULL` 조건으로 변환해야 함. 일반 status 필터와 분기 처리 필요
5. **iOS `sendTokenRequest`의 response 파라미터** — 기존 코드가 `data, _, error`로 response를 무시하고 있었음. `data, response, error`로 변경해야 HTTP 상태 코드 접근 가능
6. **네이티브 앱에서 모달이 안 닫힘** — `window.location.assign`으로 OAuth URL 이동 시, 네이티브 앱은 URL을 인터셉트하여 SDK로 처리하므로 실제 페이지 이동이 안 됨. 모달 state를 먼저 닫고(`setPendingProvider(null)`) 그 다음 `window.location.assign` 호출해야 함

### 16-7. 복수 소셜 로그인 중복 계정 방지 UX

같은 사람이 Google/Kakao/Naver로 각각 로그인하면 별도 계정이 생성되는 문제. 전화번호 기반 매칭은 Google에서 전화번호를 제공하지 않아 불가. 대신 **UX로 방지**:

**전략:**
1. 로그인 성공 시 `localStorage`에 `lastProvider` 저장 (예: `google`)
2. 로그인 페이지 진입 시 해당 버튼에 **"최근 로그인" 뱃지** 표시
3. 다른 소셜 버튼 클릭 시 **경고 모달**: "이미 Google으로 가입한 계정이 있습니다. Kakao로 로그인하면 새로운 계정이 생성됩니다."
4. 사용자가 "계속하기"를 누르면 진행, "취소"면 취소

**OAuthCallbackPage — provider 저장:**
```tsx
authApi.getMe().then(res => {
  setUser(res.data);
  if (res.data.provider) {
    localStorage.setItem('lastProvider', res.data.provider);
  }
  navigate('/', { replace: true });
});
```

**LoginPage — 최근 로그인 뱃지 + 경고 모달:**
```tsx
const lastProvider = localStorage.getItem('lastProvider') || '';

// 버튼 클릭 시
const handleLogin = (provider) => {
  if (lastProvider && lastProvider !== provider.key) {
    setPendingProvider(provider);  // 경고 모달 오픈
    return;
  }
  window.location.assign(`${API_BASE_URL}${provider.url}`);
};

// 경고 확인 후 진행 — 모달을 먼저 닫고 로그인 진행
const handleConfirmDifferentLogin = () => {
  const url = pendingProvider.url;
  setPendingProvider(null);  // 모달 먼저 닫기 (네이티브 앱 대응)
  window.location.assign(`${API_BASE_URL}${url}`);
};
```

뱃지 스타일 (secondary — 흰 배경 + 초록 테두리 + 초록 글씨):
```tsx
<span className="absolute -top-2 right-3 bg-white text-accent text-[10px] font-bold px-2 py-0.5 rounded-full border border-accent">
  최근 로그인
</span>
```

모달 버튼은 DESIGN.md의 **Primary/Secondary 버튼 스타일** 적용 (MUI Button 대신 커스텀 `<button>` + Tailwind).

---

## 16-1. 콘텐츠 신고 기능

앱 심사(Google Play UGC 정책, App Store Guideline 1.2)를 위해 부적절한 콘텐츠 신고 기능이 필수.

### DB — reports 테이블

```sql
-- 통합 신고 테이블 (게시글/댓글/재활용/재활용댓글)
reports: id, user_id, target_type(ENUM), target_id, reason(ENUM), detail, status(ENUM), timestamps
-- 유니크 인덱스: user_id + target_type + target_id (중복 신고 방지)
```

- `target_type`: `post`, `comment`, `recycle`, `recycle_comment`
- `reason`: `spam`, `abuse`, `inappropriate`, `other`
- `status`: `pending`, `resolved`, `dismissed`

### 서버

- `POST /api/reports` — 신고 생성 (자기 콘텐츠 신고 불가, 중복 방지, 기각 후 재신고 가능)
- `GET /api/reports/mine?targetType=post&targetIds=1,2,3` — 내 신고 내역 조회 (pending만)
- `PATCH /api/admin/reports/:id/dismiss` — 어드민 신고 기각

**핵심 로직 — 기각 후 재신고:**
```javascript
const existing = await models.Report.findOne({
  where: { userId, targetType, targetId },
});
if (existing) {
  if (existing.status === 'pending') throw new ErrClass(ErrInfo.DuplicateReport);
  // 기각된 신고 → 기존 레코드 업데이트로 재신고
  await existing.update({ reason, detail, status: 'pending' });
} else {
  await models.Report.create({ userId, targetType, targetId, reason, detail });
}
```

### 프론트 — 신고 모달 (ReportModal)

- 신고 사유 3개는 **원탭 완료** (스팸/광고, 욕설/비방, 부적절한 콘텐츠)
- "기타"는 텍스트 입력 후 신고
- 신고 성공/에러 시 `react-hot-toast` 사용 (`alert()` 아님)
- 이미 신고한 콘텐츠: Flag 아이콘이 빨간색(`text-error fill-error`) + 클릭 시 토스트

### 프론트 — 신고 아이콘 (Flag)

- 자기 글/댓글에는 안 보임, 타인 콘텐츠에만 표시
- Lucide `Flag` 아이콘 사용 (게시글 16px, 댓글 12px)
- 미신고: 회색 → 신고 완료: 빨간색 fill
- 상세 페이지 진입 시 `GET /reports/mine`으로 신고 여부 조회

### 어드민 — 신고 관리

- 게시글/재활용 테이블에 **"신고" 컬럼** 추가 (pending 건수만 카운트)
- 아코디언 상세: 게시글/댓글 흰색 영역 안에 신고 내역 표시
- 각 신고에 신고자, 사유, 기타 상세, 기각 버튼
- 기각 시 신고 건수에서 제외 + 앱에서 빨간 깃발 해제

---

## 16-2. 사용자 차단 기능

앱 심사(App Store Guideline 1.2)에서 "사용자 차단 메커니즘" 필수.

### DB — user_blocks 테이블

```sql
user_blocks: id, blocker_id, blocked_id, timestamps
-- 유니크 인덱스: blocker_id + blocked_id
```

### 서버

- `POST /api/blocks/:userId` — 사용자 차단
- `DELETE /api/blocks/:userId` — 차단 해제
- `GET /api/blocks` — 차단 유저 목록 (프로필 포함)
- `GET /api/blocks/ids` — 차단 유저 ID 목록

**피드/댓글 필터링 — 차단 유저 콘텐츠 제외:**
```javascript
const blocks = await models.UserBlock.findAll({
  where: { blockerId: req.user.id },
  attributes: ['blockedId'],
  raw: true,
});
const blockedIds = blocks.map(b => b.blockedId);

const where = {};
if (blockedIds.length > 0) {
  where.userId = { [Op.notIn]: blockedIds };
}
```

적용 위치: `getFeed`, `getComments`, `getRecycles`, `getComments(recycle)`

### 프론트 — 차단 UI

- **신고 모달에 "이 사용자 차단" 버튼** 추가 (빨간 텍스트, 하단 배치)
- 차단 시: 토스트 + 커스텀 이벤트로 부모 리스트 갱신 + `navigate(-1)`
- **마이페이지 > 차단한 사용자** 페이지: 차단 목록 + 해제 버튼

**차단 후 부모 리스트 갱신 (WithOutlet 구조):**
```tsx
// 자식 상세 페이지
onBlock={() => {
  window.dispatchEvent(new Event('feed-refresh'));
  navigate(-1);
}}
```

### 어드민 — 차단 현황

- 회원 관리 테이블에 **"차단" 컬럼** (N명 뱃지, 클릭 시 차단자 목록 팝업)

---

## 16-3. 회원 탈퇴 (계정 삭제)

앱 심사(App Store Guideline 5.1.1(v))에서 계정 삭제 기능 필수.

### 서버 — `DELETE /api/users/me`

```javascript
export const deleteAccount = async (req, res) => {
  const userId = req.user.id;
  const user = await models.User.findByPk(userId);

  // 게시글/댓글 소프트 딜리트
  await models.Post.destroy({ where: { userId } });
  await models.Comment.destroy({ where: { userId } });
  await models.Recycle.destroy({ where: { userId } });
  await models.RecycleComment.destroy({ where: { userId } });

  // 유저 소프트 딜리트
  await user.destroy();

  // FCM 토큰 삭제 + 쿠키 클리어
  await models.FcmToken.destroy({ where: { userId } });
  res.clearCookie('access_token');
  res.clearCookie('refresh_token');

  res.json({ message: '회원 탈퇴가 완료되었습니다.' });
};
```

### 프론트 — 마이페이지 회원 탈퇴 UI

- 마이페이지 **맨 하단**에 작은 텍스트 (`text-[12px] text-text-muted underline`)
- 로그아웃 버튼과 충분한 여백(`mt-8`)으로 분리 → 실수로 탈퇴 방지
- 클릭 시 ConfirmModal: "정말 탈퇴하시겠습니까? 작성한 게시글과 댓글이 삭제되며, 같은 계정으로 다시 로그인할 수 없습니다."

### 탈퇴 후 재로그인 시도

- 서버의 `findOrRestoreUser`에서 `deletedAt` 존재 시 `account_deleted` 에러 반환
- 프론트에서 "삭제된 계정입니다. 관리자에게 문의하세요." 모달 표시
- 어드민에서 유저 복구(restore) 시 다시 로그인 가능

### 삭제 정책

- **즉시**: soft delete (유저 + 게시글/댓글 + FCM 토큰)
- **향후**: 30일 후 hard delete 스케줄러 추가 예정
- 어드민에서 복구 시 유저 + 게시글/댓글 모두 복구 가능

### 시행착오

1. **회원 탈퇴 버튼 위치** — 로그아웃 바로 아래에 두면 혼동 가능. 충분한 여백 + 작고 눈에 덜 띄는 스타일로 분리
2. **차단 후 피드 미갱신** — WithOutlet 구조에서 `navigate(-1)` 해도 부모 리마운트 안 됨. `window.dispatchEvent(new Event('feed-refresh'))` 커스텀 이벤트로 부모의 SWR mutate 트리거 필요. `useSWRInfinite`는 글로벌 `mutate()` 매처와 호환 안 됨
3. **기각된 신고 재신고 불가** — 유니크 인덱스(user+target) 때문에 기각 후 새 레코드 생성 불가. 기존 레코드를 `update({ reason, detail, status: 'pending' })`으로 갱신하여 해결

---

## 16-4. 비속어 필터링 (콘텐츠 필터)

앱 심사(App Store Guideline 1.2)에서 "a method for filtering objectionable content" 요구. 사용자가 작성하는 모든 콘텐츠(게시글, 댓글 등)에 비속어 필터를 적용한다.

### 서버 — 필터 모듈

```javascript
// src/filter/contentFilter.js
const badWords = [
  // 한국어 비속어
  '시발', '씨발', 'ㅅㅂ', 'ㅆㅂ', '병신', 'ㅂㅅ', '지랄', 'ㅈㄹ',
  '개새끼', '새끼', 'ㅅㄲ', '미친놈', '미친년', '좆', 'ㅈ같', '씹',
  // 영어 비속어
  'fuck', 'shit', 'damn', 'asshole', 'bitch',
  // ... 필요에 따라 추가
];

export const containsBadWord = (text) => {
  if (!text) return false;
  const lower = text.toLowerCase();
  return badWords.some((word) => lower.includes(word.toLowerCase()));
};
```

### 적용 위치

모든 UGC(사용자 생성 콘텐츠) 작성 API의 유효성 검사에 추가:

```javascript
import { containsBadWord } from '../../filter/contentFilter.js';

// 게시글/댓글 작성 시
if (containsBadWord(content)) {
  throw new ErrClass(ErrInfo.BadRequest, '부적절한 표현이 포함되어 있습니다.');
}
```

| 적용 파일 | 함수 | 검사 대상 |
|-----------|------|----------|
| `post/controllers/post.js` | `createPost` | content |
| `comment/controllers/comment.js` | `createComment` | content |
| `recycle/controllers/recycle.js` | `createRecycle` | title, content |
| `recycle/controllers/recycle.js` | `createComment` | content |

### 핵심 포인트

- 비속어 목록은 `src/filter/contentFilter.js`에서 중앙 관리 — 새 비속어 추가 시 이 파일만 수정
- 대소문자 무시(`toLowerCase()`)로 영어 비속어도 감지
- 게시글 수정(update) API에도 동일하게 적용 권장
- 향후 정규식 패턴(초성 조합, 자음 치환 등)으로 확장 가능

### 이용약관 연동

이용약관 제4조에 다음 문구를 명시:
- **"무관용(Zero Tolerance) 원칙"** 적용
- **"위반 시 콘텐츠 즉시 삭제, 계정 정지/삭제"**
- **"관리자는 신고된 콘텐츠를 24시간 이내에 검토하고 조치"**

Apple 심사에서 이 문구들을 명시적으로 요구하므로 반드시 포함해야 함.

---

## 17. 푸시 알림 (FCM)

Firebase Cloud Messaging(FCM)을 사용한 푸시 알림. iOS/Android 네이티브 앱에서 수신.

### 전체 흐름

```
[1회 세팅]
Firebase 콘솔에서 프로젝트 생성 → iOS/Android 앱 등록
→ iOS: APNs 인증 키 등록 (Apple Developer에서 발급)
→ Android: google-services.json 다운로드
→ 서버: Firebase Admin SDK + 서비스 계정 키 설정

[앱 실행 시]
앱 시작 → FCM SDK가 디바이스 토큰(FCM Token) 발급
→ 네이티브가 서버에 토큰 전송 → 서버가 DB에 userId + fcmToken 저장

[푸시 발생 시]
서버에서 이벤트 발생 (예: 새 댓글, 어드민 수동 전송)
→ 대상 userId의 fcmToken을 DB에서 조회
→ Firebase Admin SDK로 { to: fcmToken, title, body } 전송
→ Firebase가 해당 기기에 푸시 전달

[기기에서 수신]
네이티브가 푸시 수신 → 알림 표시 → 탭하면 앱 열기 + 해당 화면으로 이동
```

### 참고
- 로컬에서도 푸시 테스트 가능 — Firebase는 서버 위치와 무관하게 기기에 직접 전달
- 단, 실물 기기 필요 (iOS 에뮬레이터는 푸시 불가, Android 에뮬레이터는 Google Play Services 있으면 가능)
- 한 유저가 여러 기기 사용 가능 → fcmToken은 1:N 관계
- fcmToken은 앱 재설치, 토큰 갱신 등으로 바뀔 수 있어 갱신 처리 필수

### 17-1. Firebase 콘솔 세팅

#### A. Firebase 프로젝트 생성
1. https://console.firebase.google.com → 프로젝트 추가
2. 프로젝트 이름 입력 → Google Analytics는 비활성화해도 됨 → 프로젝트 만들기

#### B. 서버용 서비스 계정 키 발급
1. Firebase 콘솔 → **프로젝트 설정** (톱니바퀴) → **서비스 계정** 탭
2. **새 비공개 키 생성** 클릭 → JSON 파일 다운로드
3. 파일명을 `firebase-service-account.json`으로 변경
4. `packages/server/` 에 배치
5. `.gitignore`에 `firebase-service-account.json` 추가 (보안!)

#### C. iOS 앱 등록
1. Firebase 콘솔 → **Project Overview** → **+ 앱 추가** → iOS 아이콘 클릭
2. **Apple 번들 ID** 입력 (Xcode Bundle Identifier와 정확히 일치)
3. 앱 닉네임, App Store ID는 선택
4. **앱 등록** 클릭
5. **GoogleService-Info.plist** 다운로드 → Xcode 프로젝트에 추가할 예정
6. 나머지 단계(SDK 추가 등)는 "다음"으로 넘겨도 됨

#### D. APNs 인증 키 (.p8) 발급 — Apple Developer

Firebase가 Apple 푸시 시스템(APNs)에 접근하기 위한 인증 키.

1. https://developer.apple.com/account 접속
2. **Certificates, Identifiers & Profiles** → 좌측 **Keys** 메뉴
3. **+** (Add) 버튼 클릭
4. **Key Name** 입력 (예: `Lordhill Church Push`)
5. **Apple Push Notifications service (APNs)** 체크
6. **Continue** → **Configure Key** 화면:
   - **Environment**: `Sandbox & Production` 선택 (개발+배포 모두 지원)
   - **Key Restriction**: `Team Scoped` 선택 (계정 내 모든 앱에 사용 가능)
7. **Save** → **Register** → **Download** 클릭

기록할 항목:
- **Key ID**: Keys 목록에서 10자리 영숫자 확인
- **Team ID**: Apple Developer → Account → Membership에서 10자리 확인
- **.p8 파일**: 다운로드 (안전한 곳에 즉시 백업!)

#### E. Firebase 콘솔에 APNs 키 업로드

1. Firebase 콘솔 → **프로젝트 설정** → **Cloud Messaging** 탭
2. **Apple app configuration** 섹션
3. **"개발 APNs 인증 키가 없습니다. 업로드"** 클릭 → .p8 파일 + Key ID + Team ID 입력 → Upload
4. **"프로덕션 APNs 인증 키가 없습니다. 업로드"** 클릭 → 같은 .p8 파일 + Key ID + Team ID 입력 → Upload

(개발/프로덕션 둘 다 같은 .p8 키로 등록)

### ⚠️ 시행착오

1. **.p8 파일은 한 번만 다운로드 가능** — 분실하면 키를 Revoke하고 새로 만들어야 함. 즉시 1Password 등에 백업 필수
2. **APNs Key vs Certificate** — Key(.p8) 사용 권장. Certificate(.p12)는 매년 갱신 필요하고 환경별 별도 생성. Key는 만료 없음 + Sandbox/Production 자동 지원
3. **계정당 APNs 키 최대 2개** — 하나의 키로 해당 계정의 모든 앱에 푸시 가능하므로 앱별로 만들 필요 없음
4. **Bundle ID 불일치** — Firebase에 등록한 Bundle ID와 Xcode Bundle Identifier가 정확히 일치해야 함. 대소문자까지 확인
5. **Configure Key 화면** — APNs 체크 후 Continue 하면 Environment(Sandbox/Production/Both)와 Key Restriction(Team Scoped/Topic Specific) 선택 화면이 나옴. `Sandbox & Production` + `Team Scoped`가 가장 범용적
6. **Firebase Cloud Messaging 탭에서 개발/프로덕션 따로 업로드** — APNs 인증 키 섹션에 개발/프로덕션 두 행이 있음. 둘 다 같은 .p8 파일로 업로드하면 됨. 하단의 "APNs 인증서" 섹션은 무시 (레거시)

---

### 17-2. 서버 — Firebase Admin SDK + 푸시 전송

서버 구현은 완료된 상태. 구조 정리:

#### 파일 구조
```
packages/server/
├── firebase-service-account.json   # Firebase 서비스 계정 키 (gitignore!)
├── src/
│   ├── firebase.js                 # Firebase Admin SDK 초기화
│   └── push/
│       ├── models/FcmToken.js      # FCM 토큰 모델 (userId, token, platform)
│       ├── controllers/fcmToken.js # 토큰 등록/삭제 컨트롤러
│       ├── routes/fcmToken.js      # POST/DELETE /api/users/fcm-token
│       └── pushService.js          # 푸시 전송 서비스 (sendPushToUser, sendPushToTokens)
```

#### 의존성
```bash
npm install firebase-admin
```

#### firebase.js — SDK 초기화
```js
import admin from 'firebase-admin';
import { readFileSync } from 'fs';
const serviceAccount = JSON.parse(readFileSync('firebase-service-account.json', 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
```

#### FcmToken 모델
- `userId` (FK → users), `token` (UNIQUE, STRING 500), `platform` (ENUM: ios/android)
- 마이그레이션: `fcm_tokens` 테이블, token 유니크 인덱스 + user_id 인덱스

#### API 엔드포인트
- `POST /api/users/fcm-token` — 토큰 등록 (로그인 필요). body: `{ token, platform }`
- `DELETE /api/users/fcm-token` — 토큰 삭제 (로그아웃 시). body: `{ token }`
- `POST /api/admin/push/send` — 어드민 수동 푸시. body: `{ userId, title, body }`

#### pushService.js — 전송 로직
- `sendEachForMulticast`로 다중 토큰에 전송
- 만료/무효 토큰 자동 정리 (messaging/registration-token-not-registered)
- iOS용 `apns` 필드 (sound: 'default') + Android용 `android` 필드 추가 필요

### ⚠️ 시행착오

1. **firebase-service-account.json은 반드시 .gitignore에 포함** — 이 파일에 비공개 키가 포함됨. git에 올리면 보안 사고
2. **라이브 배포 시 firebase-service-account.json 수동 배치 필수** — .gitignore에 포함되어 CI/CD로 배포되지 않음. EC2에 수동으로 올려야 함. 안 하면 `The default Firebase app does not exist` 에러로 푸시 전송 실패
   ```bash
   # 로컬에서 EC2로 파일 전송
   scp -i <키>.pem packages/server/firebase-service-account.json ec2-user@<EC2-IP>:~/app/packages/server/
   # PM2 재시작
   ssh -i <키>.pem ec2-user@<EC2-IP> "pm2 restart lordhill-server"
   ```
   한번 올리면 이후 배포에도 파일이 유지됨 (CI/CD가 덮어쓰지 않음)
3. **iOS에서 무음 알림** — pushService의 message에 `apns.payload.aps.sound: 'default'`가 없으면 iOS에서 소리 없이 알림이 도착함. 반드시 추가
4. **sendEachForMulticast로 iOS/Android 통합 전송 가능** — message 객체에 `apns`와 `android` 필드를 동시에 넣으면, FCM이 토큰 플랫폼에 따라 해당 필드만 적용. 분리 전송 불필요

### 17-3. iOS — FCM SDK + 토큰 발급 + 수신 처리

#### A. Xcode 프로젝트 설정 (수동)

**1) Firebase SDK 설치 (SPM)**
1. Xcode → File → Add Package Dependencies
2. URL 직접 입력: `https://github.com/firebase/firebase-ios-sdk` (검색으로는 안 나옴!)
3. Dependency Rule: Up to Next Major Version
4. **FirebaseCore** + **FirebaseMessaging**만 체크, 나머지 해제
5. Add Package

**2) Capability 추가**
1. Xcode → 프로젝트 → Targets → 앱 타겟 → Signing & Capabilities 탭
2. + Capability → **Push Notifications** 추가
3. + Capability → **Background Modes** 추가 → **Remote notifications** 체크

⚠️ Push Notifications capability는 **무료 Personal Team으로는 추가 불가**. Apple Developer Program 멤버십($99/년) 필요.

**3) GoogleService-Info.plist 추가**
- Firebase 콘솔에서 다운로드한 파일을 Xcode 프로젝트에 드래그
- "Copy items if needed" 체크

**4) Info.plist 설정**
- `FirebaseAppDelegateProxyEnabled` = `NO` 추가 (SwiftUI 앱에서 swizzling 비활성화)

#### B. 코드 구현

**핵심 포인트:** 앱 시작 시 FCM 토큰이 먼저 발급되지만, JWT가 없으므로 서버 등록은 스킵. **로그인 완료 시점에** 웹 → 네이티브 브릿지로 JWT를 전달받고, 그때 FCM 토큰을 서버에 등록.

**1) AppDelegate.swift — Firebase 초기화 + 푸시 권한 + FCM 토큰 수신**
```swift
import FirebaseCore
import FirebaseMessaging
import UserNotifications

class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate, MessagingDelegate {

    func application(_ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: ...) -> Bool {
        FirebaseApp.configure()

        // 푸시 알림 권한 요청
        UNUserNotificationCenter.current().delegate = self
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, _ in }
        application.registerForRemoteNotifications()

        // FCM delegate
        Messaging.messaging().delegate = self
        return true
    }

    // APNs 토큰 → FCM에 전달
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        Messaging.messaging().apnsToken = deviceToken
    }

    // FCM 토큰 수신/갱신 → 로컬 저장 + 서버 등록 시도
    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        guard let token = fcmToken else { return }
        UserDefaults.standard.set(token, forKey: "fcm-token")
        FcmTokenManager.registerToken(fcmToken: token)  // JWT 없으면 내부에서 스킵
    }

    // 포그라운드에서 푸시 수신 시 알림 표시
    func userNotificationCenter(_ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: ...) {
        completionHandler([.banner, .badge, .sound])
    }

    // 푸시 탭 시 딥링크 이동
    func userNotificationCenter(_ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse, ...) {
        let userInfo = response.notification.request.content.userInfo
        if let path = userInfo["path"] as? String {
            NotificationCenter.default.post(name: .init("DeepLinkReceived"),
                userInfo: ["url": "\(WEB.baseUrl)\(path)"])
        }
        completionHandler()
    }
}
```

**2) FcmTokenManager.swift (Util/) — 서버 토큰 등록/삭제**
```swift
struct FcmTokenManager {
    private static func getApiBase() -> String {
        if WEB.environment == .live { return "https://api.<도메인>" }
        // 로컬: WEB.baseUrl에서 프론트 포트를 서버 포트로 변환
        return WEB.baseUrl.replacingOccurrences(of: ":5173", with: ":3001")
    }

    static func registerToken(fcmToken: String) {
        let authToken = UserDefaults.standard.string(forKey: "auth-token") ?? ""
        if authToken.isEmpty { return }  // JWT 없으면 스킵

        // POST /api/users/fcm-token { token, platform: "ios" }
        // Authorization: Bearer <JWT>
    }

    static func unregisterToken() {
        // DELETE /api/users/fcm-token { token }
    }
}
```

**3) LordhillWebView.swift — 로그인 시 FCM 토큰 서버 등록**

`getToken` JS 메시지 핸들러에서 JWT 저장 후 FCM 등록:
```swift
if message.name == "getToken" {
    if let token = message.body as? String {
        UserDefaults.standard.set(token, forKey: "auth-token")
        // 로그인 완료 → 로컬에 저장된 FCM 토큰으로 서버 등록
        if let fcmToken = UserDefaults.standard.string(forKey: "fcm-token"), !fcmToken.isEmpty {
            FcmTokenManager.registerToken(fcmToken: fcmToken)
        }
    }
}
```

**4) 웹 프론트 OAuthCallbackPage.tsx — 네이티브 브릿지 호출**

로그인 성공 시 JWT를 네이티브에 전달해야 FCM 등록이 트리거됨:
```tsx
// 네이티브 앱에 JWT 토큰 전달
window.webkit?.messageHandlers?.getToken?.postMessage(token);  // iOS
window.AndroidBridge?.onToken?.(token);  // Android
```

TypeScript 타입 선언 (`types/window.d.ts`):
```ts
interface Window {
  webkit?: {
    messageHandlers: {
      getToken?: { postMessage: (token: string) => void };
    };
  };
  AndroidBridge?: {
    onToken?: (token: string) => void;
  };
}
```

**5) getApiBase() — 실물 기기 로컬 테스트 대응**

⚠️ `localhost:3001`은 실물 기기에서 Mac 서버에 접근 불가! `Constants.swift`의 baseUrl에서 포트만 교체하는 패턴 사용:
```swift
// ❌ 실물 기기에서 접근 불가
"http://localhost:3001"

// ✅ Constants.swift의 IP를 그대로 활용
WEB.baseUrl.replacingOccurrences(of: ":5173", with: ":3001")
```
이 패턴을 `FcmTokenManager`와 `LordhillWebView`의 `getApiBase()` 모두에 적용.

#### 참고
- iOS 프로젝트 위치: `~/Documents/church/lordhill-ios/`
- 시뮬레이터에서 FCM 푸시 테스트 불가 → **실물 기기 필수**
- APNs 토큰 ≠ FCM 토큰: FCM 토큰만 서버에 전송 (Firebase SDK가 내부 매핑)

### ⚠️ 시행착오

1. **SPM에서 Firebase 검색 안 됨** — URL을 직접 붙여넣어야 함: `https://github.com/firebase/firebase-ios-sdk`
2. **FirebaseCore + FirebaseMessaging만 필요** — 나머지 모듈 체크 해제. 불필요한 모듈은 빌드 시간만 증가
3. **SPM 패키지는 코드 작성 전에 먼저 추가** — 안 하면 `No such module 'FirebaseCore'` 빌드 에러
4. **Push Notifications capability는 유료 개발자 계정 필수** — 무료 Personal Team으로는 불가
5. **CLI로 만든 Swift 파일은 Xcode에 자동 등록 안 됨** — Xcode 좌측 네비게이터에서 수동으로 Add Files 해야 함. 안 하면 `Cannot find 'FcmTokenManager' in scope` 에러
6. **FcmTokenManager 파일이 2개 생기지 않도록 주의** — App/, Util/ 등 다른 위치에 동명 파일이 있으면 잘못된 파일이 사용됨. 하나만 유지
7. **`localhost`는 실물 기기에서 Mac이 아닌 기기 자신** — `getApiBase()`에서 `localhost:3001` 하드코딩하면 실물 기기 테스트 불가. `WEB.baseUrl`에서 포트만 교체하는 패턴 사용. 이 수정을 `FcmTokenManager`와 `LordhillWebView` 두 곳 모두에 적용해야 함
8. **FCM 토큰이 JWT보다 먼저 발급됨** — 앱 시작 시 FCM 토큰은 바로 발급되지만, JWT는 로그인 후에 생김. 따라서 FCM 토큰 발급 시점에는 서버 등록을 스킵하고, **로그인 완료 시점(웹→네이티브 브릿지)에 FCM 등록을 재시도**해야 함. 이 브릿지 호출이 없으면 FCM 토큰이 서버에 영원히 등록되지 않음
9. **웹→네이티브 브릿지 호출 누락** — OAuthCallbackPage에서 `localStorage`에 토큰 저장만 하고 네이티브에 전달하지 않으면, 네이티브는 로그인 사실을 모름. `webkit.messageHandlers.getToken.postMessage(token)` 호출 필수
10. **Team ID 변경 시 기존 앱 삭제 필요** — Apple Developer 계정을 변경하면 Signing Team이 바뀌어 앱 설치 시 `application-identifier entitlement string does not match` 에러. iPhone에서 기존 앱을 삭제 후 재설치

### 17-4. Android — FCM SDK + 토큰 발급 + 수신 처리

#### A. 프로젝트 설정

**1) google-services.json 추가**
Firebase 콘솔에서 다운로드한 파일을 Android 프로젝트의 `app/` 디렉토리에 복사.

**2) Gradle 의존성**

`gradle/libs.versions.toml`:
```toml
[versions]
firebaseBom = "33.7.0"
googleServices = "4.4.2"

[libraries]
firebase-bom = { group = "com.google.firebase", name = "firebase-bom", version.ref = "firebaseBom" }
firebase-messaging = { group = "com.google.firebase", name = "firebase-messaging" }

[plugins]
google-services = { id = "com.google.gms.google-services", version.ref = "googleServices" }
```

프로젝트 `build.gradle.kts`:
```kotlin
plugins {
    alias(libs.plugins.google.services) apply false
}
```

앱 `app/build.gradle.kts`:
```kotlin
plugins {
    alias(libs.plugins.google.services)
}

dependencies {
    implementation(platform(libs.firebase.bom))
    implementation(libs.firebase.messaging)
}
```

**3) AndroidManifest.xml**
```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

<!-- FCM 푸시 수신 서비스 -->
<service android:name=".fcm.LordhillFirebaseMessagingService" android:exported="false">
    <intent-filter>
        <action android:name="com.google.firebase.MESSAGING_EVENT" />
    </intent-filter>
</service>

<!-- 기본 알림 채널 -->
<meta-data
    android:name="com.google.firebase.messaging.default_notification_channel_id"
    android:value="default" />
```

#### B. 코드 구현

**1) LordhillFirebaseMessagingService.kt (fcm/) — 푸시 수신 + 토큰 갱신**
```kotlin
class LordhillFirebaseMessagingService : FirebaseMessagingService() {
    override fun onNewToken(token: String) {
        // 서버에 토큰 등록 (JWT 없으면 내부에서 스킵)
        CoroutineScope(Dispatchers.IO).launch {
            FcmTokenManager.registerToken(token)
        }
    }

    override fun onMessageReceived(message: RemoteMessage) {
        // 알림 표시 (알림 채널 + PendingIntent)
        showNotification(message.notification?.title, message.notification?.body)
    }
}
```

알림 채널 생성 (Android 8+ 필수):
```kotlin
if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
    NotificationChannel("default", "손안의 교회 알림", NotificationManager.IMPORTANCE_HIGH)
}
```

**2) FcmTokenManager.kt (fcm/) — 서버 토큰 등록/삭제**
- iOS와 동일한 패턴: JWT 없으면 스킵, 있으면 `POST /api/users/fcm-token` 전송
- `getApiBase()`도 `EnvManager.getBaseUrl()`에서 포트 교체

**3) MainActivity.kt — 로그인 시 FCM 토큰 등록**
```kotlin
override fun onJavascriptToken(data: String) {
    LordhillSharedPref.saveToken(this, data)
    // 로그인 완료 → FCM 토큰 서버에 등록
    FirebaseMessaging.getInstance().token.addOnSuccessListener { fcmToken ->
        lifecycleScope.launch { FcmTokenManager.registerToken(fcmToken) }
    }
}
```

**4) LordhillSharedPref.kt — FCM 토큰 로컬 저장 메서드 추가**
```kotlin
fun saveFcmToken(context: Context, token: String)
fun getFcmToken(context: Context): String
fun clearFcmToken(context: Context)
```

### 17-5. 어드민 프론트 — 푸시 관리 페이지

`admin-front/src/pages/PushPage.jsx`:

**푸시 전송 폼 (MUI Dialog):**
- 대상 선택: "전체 회원" / "특정 유저" 토글 + 유저 드롭다운 (닉네임 + provider 표시)
- title, body 입력
- 전송 버튼 → `POST /api/admin/push/send` → 결과(성공/실패 건수) 인라인 표시

**푸시 이력 테이블:**
- 전송일시, 대상(유저명 또는 "전체"), 제목, 내용, 상태(뱃지), 성공/실패 건수
- 페이지네이션 (`GET /api/admin/push/logs?page=&limit=10`)

**라우팅/네비게이션:**
- `App.jsx`에 `/push` → `PushPage` 라우트 추가 (AdminRoute 감싸기)
- `Layout.jsx` 사이드바에 "푸시 관리" 메뉴 링크 추가

### 17-6. 알림 시스템 (pushs 테이블 통합)

푸시와 앱 내 알림을 `pushs` 테이블 하나로 통합 관리한다. 기존 `push_logs` 테이블은 더 이상 사용하지 않음.

#### 테이블 구조

```
pushs
- id (PK)
- user_id (FK → users, 받는 사람)
- sender_type (ENUM: 'system' | 'admin' | 'user')
- title (VARCHAR 200)
- body (TEXT)
- path (VARCHAR 500, nullable — 탭 시 이동 경로)
- is_read (BOOLEAN, default false)
- created_at
```

인덱스: `[user_id, is_read]` (유저별 안 읽은 알림 조회 최적화)

#### 저장 시점

모든 푸시 발송 시 `pushs`에 자동 저장. `pushService.js`의 헬퍼 함수가 FCM 전송 + DB 저장을 동시 처리:

| 헬퍼 | 용도 | DB 저장 |
|------|------|---------|
| `sendPushToUser(userId, opts)` | 특정 유저 1명 | 1건 insert |
| `sendPushToAll(opts, excludeUserId)` | 전체 approved 유저 | 유저 수만큼 bulkCreate |
| `sendPushToTokens(tokens, opts)` | FCM 발송만 (내부용) | DB 저장 안 함 |

`senderType` 구분:
- `system`: 댓글 알림, 돌고래 새 글 등 자동 발송
- `admin`: 어드민이 수동 발송
- `user`: 향후 유저 간 직접 알림용 (미사용)

#### 사용자 알림 API

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/pushs` | 내 알림 목록 (페이지네이션) |
| GET | `/api/pushs/unread-count` | 안 읽은 알림 개수 |
| PATCH | `/api/pushs/:id/read` | 알림 읽음 처리 |
| PATCH | `/api/pushs/read-all` | 전체 읽음 처리 |

#### 어드민 푸시 이력

기존 `push_logs` 대신 `pushs WHERE senderType='admin'`으로 조회. 어드민 `sendPush`에서 `senderType: 'admin'`으로 저장.

#### 앱 프론트 알림 페이지

- 경로: `/feed/notifications` (피드의 자식 페이지)
- 진입: 피드 헤더 Bell 아이콘 클릭
- Bell 아이콘에 안 읽은 개수 빨간 뱃지 표시 (30초마다 자동 갱신)
- 알림 목록: 제목, 내용 2줄, 시간, 안 읽은 건은 초록 점 + 연한 배경
- 알림 탭 → 읽음 처리 + path가 있으면 해당 페이지로 이동
- 우상단 전체 읽음 버튼

#### 파일 구조

```
서버:
- src/push/models/Push.js          — Push 모델
- src/push/controllers/push.js     — 사용자 알림 API (getMyPushs, getUnreadCount, markAsRead, markAllAsRead)
- src/push/routes/push.js          — /api/pushs 라우트
- src/push/pushService.js          — sendPushToUser (DB 저장 추가), sendPushToAll (신규)
- src/admin/controllers/push.js    — 어드민 푸시 (PushLog → Push 전환)

프론트:
- src/api/pushApi.ts               — 알림 API 모듈
- src/hooks/api/usePushs.ts        — usePushs (목록), useUnreadCount (안 읽은 수, 30초 갱신)
- src/pages/feed/notifications/    — 알림 페이지
- src/pages/feed/index.tsx         — Bell 아이콘에 unreadCount 뱃지 + 알림 페이지 이동
```

### ⚠️ 시행착오 (전체)

1. **FCM 토큰 등록 타이밍이 핵심** — 앱 시작 시 FCM 토큰은 발급되지만 JWT가 없어 서버 등록 불가. 로그인 완료 시 웹→네이티브 브릿지로 JWT를 전달하고, 그 시점에 FCM 등록을 재시도해야 함
2. **웹→네이티브 브릿지 호출은 OAuthCallbackPage에서** — `localStorage` 저장만으로는 네이티브가 로그인 사실을 모름. `webkit.messageHandlers` (iOS) / `AndroidBridge` (Android)로 토큰 전달 필수
3. **웹→네이티브 브릿지 메서드명 일치 확인** — iOS는 `webkit.messageHandlers.getToken.postMessage(token)`, Android는 `AndroidBridge.updateToken(token)`. 네이티브 코드의 실제 메서드명과 웹에서 호출하는 이름이 **정확히 일치**해야 함. 불일치하면 토큰 전달 자체가 안 돼서 FCM 등록 불가
4. **`localhost`는 실물 기기에서 접근 불가** — iOS/Android 모두 `getApiBase()`에서 `WEB.baseUrl`의 포트만 교체하는 패턴 사용. 하드코딩 금지
5. **Android debug IP 주소 변경 시 Gradle Sync 필수** — `build.gradle.kts`의 `BASE_URL`을 수정하면 반드시 Gradle Sync 후 빌드. 안 하면 이전 IP로 연결됨. Wi-Fi 환경이 바뀌면 Mac IP도 바뀌므로 주의
6. **Android `POST_NOTIFICATIONS` 권한 필수** — Android 13(API 33)부터 푸시 알림에 `POST_NOTIFICATIONS` 런타임 권한 필요. AndroidManifest.xml에 선언하면 앱 설치 시 자동 요청
7. **유저 드롭다운에 provider 표시** — 같은 이름의 유저가 Google/Kakao/Naver로 각각 가입할 수 있으므로, 드롭다운에 `닉네임 (provider)` 형식으로 표시
8. **라이브 배포 시 firebase-service-account.json** — 이 파일은 gitignore되므로 EC2에 수동으로 배치하거나, CI/CD에서 GitHub Secrets로 주입해야 함

---

## 18. 푸시 탭 시 페이지 이동

푸시 알림을 탭하면 웹뷰의 특정 페이지로 이동. 서버가 path를 포함해서 보내고, 네이티브가 앱 상태에 따라 분기 처리.

### 동작 정리

| 앱 상태 | 탭 시 동작 |
|---------|-----------|
| 종료/백그라운드 | `loadURL(baseUrl + path)` — 웹뷰 전체 로드 |
| 포그라운드 | 브릿지로 path 전달 → 웹에서 `navigate(path)` — SPA 내부 이동 |

### 18-1. 서버 — path 포함 전송

`pushService.js`의 `sendPushToUser`는 이미 `data` 파라미터를 FCM에 전달하는 구조. 호출 시 `data: { path }`를 포함하면 됨.

어드민 컨트롤러에서 path를 받아 data에 포함:
```js
// admin/controllers/push.js
const { userId, title, body, path } = req.body;
const data = path ? { path } : {};
result = await sendPushToUser(userId, { title, body, data });
```

나중에 자동 푸시(댓글, 좋아요 등)에서도 같은 패턴:
```js
await sendPushToUser(post.authorId, {
  title: '새 댓글',
  body: `${user.nickname}님이 댓글을 남겼습니다.`,
  data: { path: `/posts/${post.id}` },
});
```

### 18-2. 어드민 — path 입력 필드

`PushPage.jsx`의 푸시 전송 폼에 "이동 경로" 입력 필드 추가:
- placeholder: `예: /posts/123, /feed`
- 비워두면 앱 홈으로 이동
- formData에 `path` 필드 추가, payload에 `path.trim()` 포함

### 18-3. 네이티브 — 푸시 탭 시 이동 구현

#### 핵심 분기

| 앱 상태 | 탭 시 동작 |
|---------|-----------|
| 종료/백그라운드 | `loadURL(baseUrl + path)` — 웹뷰 전체 로드 |
| 포그라운드 | JS 브릿지 `window.__navigateTo(path)` — SPA 내부 이동 |

#### iOS

**AppDelegate.swift** — 푸시 탭 시 `fromPush: true` 플래그와 함께 딥링크 전달:
```swift
func userNotificationCenter(_ center: ..., didReceive response: ...) {
    let userInfo = response.notification.request.content.userInfo
    if let path = userInfo["path"] as? String {
        NotificationCenter.default.post(
            name: .init("DeepLinkReceived"),
            userInfo: ["url": "\(WEB.baseUrl)\(path)", "fromPush": true]
        )
    }
}
```

**LordhillWebView.swift** — `handleDeepLink`에서 분기:
```swift
@objc private func handleDeepLink(_ notification: Notification) {
    let isForPush = userInfo["fromPush"] as? Bool ?? false

    // 포그라운드: 웹뷰가 이미 로드된 상태면 JS navigate
    if isForPush, let webView = self.webView, webView.url != nil {
        let js = "window.__navigateTo && window.__navigateTo('\(fullPath)')"
        webView.evaluateJavaScript(js, completionHandler: nil)
        return
    }

    // 종료/백그라운드: 웹뷰 전체 로드
    webView?.load(URLRequest(url: finalUrl))
}
```

#### Android

**LordhillFirebaseMessagingService.kt** — 알림 탭 intent에 `deepLinkPath` 전달:
```kotlin
val intent = Intent(this, StartActivity::class.java).apply {
    data["path"]?.let { putExtra("deepLinkPath", it) }
}
```

**StartActivity.kt** — 푸시 intent extra에서 path 추출:
```kotlin
private fun extractDeepLinkPath(intent: Intent): String? {
    intent.getStringExtra("deepLinkPath")?.let { return it }
    // 기존 딥링크 스킴 처리...
}
```

**MainActivity.kt** — `onNewIntent`에서 JS navigate (포그라운드):
```kotlin
override fun onNewIntent(intent: Intent) {
    val path = intent.getStringExtra("deepLinkPath")
    if (!path.isNullOrEmpty()) {
        webView?.evaluateJavascript(
            "window.__navigateTo && window.__navigateTo('$path')", null
        )
    }
}
```

종료/백그라운드에서는 `onCreate`의 `startUrl`에 path가 포함되어 `loadUrl`로 전체 로드.

### 18-4. 앱 프론트 — 브릿지 path 수신 → navigate

**Router.tsx** — `window.__navigateTo` 전역 함수 등록:
```tsx
const router = createBrowserRouter([...]);

export default function Router() {
  useEffect(() => {
    window.__navigateTo = (path: string) => {
      router.navigate(path);
    };
    return () => { delete window.__navigateTo; };
  }, []);

  return <RouterProvider router={router} />;
}
```

**types/window.d.ts** — 타입 선언:
```ts
interface Window {
  __navigateTo?: (path: string) => void;
}
```

네이티브가 `webView.evaluateJavaScript("window.__navigateTo('/posts/123')")` 호출 → React Router가 SPA 내부 이동 처리.

### ⚠️ 시행착오

1. **FCM data 필드는 문자열만 허용** — `data: { path: '/posts/123' }`에서 value는 반드시 string. 숫자나 객체를 넣으면 FCM 전송 실패
2. **iOS `evaluateJavaScript`는 메인 스레드에서** — `DispatchQueue.main.async` 안에서 호출. 백그라운드 스레드에서 호출하면 크래시
3. **Android `evaluateJavascript`는 `webView.post {}` 안에서** — UI 스레드에서만 호출 가능
4. **포그라운드 vs 백그라운드 판별** — iOS는 `fromPush` 플래그 + `webView.url != nil`로 판별. Android는 `onNewIntent`(포그라운드/백그라운드) vs `onCreate`(종료)로 자연스럽게 분기
5. **`window.__navigateTo`가 아직 등록 안 된 시점에 호출 가능** — `window.__navigateTo && window.__navigateTo(path)` 패턴으로 안전 호출. 웹뷰 로드 중이면 무시됨 (종료 상태에서는 어차피 loadURL 사용)
6. **어드민에서 path 미입력 시** — 서버가 `data: {}`로 전송, 네이티브에서 path가 없으면 이동 안 함 (앱 홈 유지)

---

## 19. 이미지 업로드 (Presigned URL + 네이티브 리사이징)

게시글에 이미지를 첨부하는 기능. Presigned URL 방식으로 서버 부하 없이 S3에 직접 업로드하고, 네이티브에서 리사이징하여 용량을 절감한다.

### 전체 흐름

```
[사진 버튼 클릭]
1. 웹 → 네이티브 브릿지: "사진 골라줘" (최대 장수 전달)
   - iOS: window.webkit.messageHandlers.pickImages.postMessage(maxCount)
   - Android: window.AndroidBridge.pickImages(maxCount)

2. 네이티브: 사진앨범 열기 → 사용자 선택 → 리사이즈(1920px, JPEG 80%)
   → base64로 웹에 전달: window.__onImagesPicked([{ base64, filename, contentType }, ...])

3. 웹: base64를 File로 변환 → 미리보기 표시

[게시 버튼 클릭]
4. 웹 → 서버: Presigned URL 요청
   POST /api/upload/presign { files: [{ filename, contentType }, ...] }
   응답: [{ presignedUrl, key }, ...]

5. 웹 → S3: presignedUrl로 리사이즈된 이미지 직접 업로드 (PUT)
   (서버를 거치지 않음 — 서버 부하 없음)

6. 웹 → 서버: 게시글 저장
   POST /api/posts { content, mediaKeys: [key1, key2, ...] }
   서버: posts 행 생성 + post_media에 S3 key 저장
```

### To-Do 리스트

#### 서버
- [x] `POST /api/posts/presign` — Presigned URL 발급 API
  - 요청: `{ files: [{ filename, contentType }] }`
  - `uploader/index.js`에 `generatePresignedUrl()` 함수 추가 (`PutObjectCommand` + `getSignedUrl`)
  - config의 `presignedUrl.expires: 600` (10분) 사용
  - 응답: `[{ presignedUrl, key }]` (key = S3 저장 경로, 예: `images/uuid.jpg`)
- [x] `POST /api/posts` 수정 — multer 방식에서 mediaKeys 방식으로 변경
  - multer 미들웨어 제거, `{ content, mediaKeys: string[] }` JSON body로 수신
  - S3 key를 전체 URL로 변환(`baseUrl + key`)하여 post_media에 저장

#### 웹 프론트
- [x] 이미지 선택 브릿지 함수 — 네이티브에 `pickImages(maxCount)` 호출
  - iOS: `window.webkit.messageHandlers.pickImages.postMessage(remaining)`
  - Android: `window.AndroidBridge.pickImages(remaining)`
  - 웹 브라우저 폴백: `<input type="file">` (네이티브 없을 때 자동 분기)
- [x] `window.__onImagesPicked` 전역 함수 등록 — 네이티브가 이미지 전달 시 호출
  - base64 → File 변환 → 미리보기 state에 추가
  - `addImagesRef`를 useEffect 안에서 업데이트 (react-hooks/refs 규칙 준수)
- [x] 글쓰기 submit 흐름 변경
  - 1) presign API → 2) S3 PUT 병렬 업로드 → 3) posts API (content + mediaKeys)
- [x] `postApi` 수정 — `presignImages()`, `uploadToS3()`, `createPost(content, mediaKeys)`
- [x] `window.d.ts` 타입 선언 추가 — `pickImages`, `__onImagesPicked`
- [x] 피드 목록에 이미지 표시 UI (1장: 4:3, 2~4장: 2열 그리드, 5+: +N 오버레이)
- [x] 상세 페이지에 이미지 표시 UI (전체 너비 세로 나열)

#### iOS 네이티브
- [x] `ImagePickerBridge.swift` (신규) — 이미지 선택 + 리사이즈 + 웹뷰 전달 통합 클래스
- [x] `pickImages` 브릿지 핸들러 추가 (WKScriptMessageHandler) — `LordhillWebView.swift`에 등록
- [x] PHPickerViewController로 다중 이미지 선택
- [x] 포토 라이브러리 권한 체크 (`PHPhotoLibrary.authorizationStatus`)
  - `notDetermined`: 시스템 권한 팝업 (전체허용/제한허용/거부)
  - `authorized`/`limited`: PHPicker 바로 오픈
  - `denied`/`restricted`: "설정으로 이동" 안내 Alert
- [x] 이미지 리사이즈: 긴 변 1920px 기준 축소 + JPEG 80% 압축
- [x] base64 인코딩 후 웹뷰에 전달: `evaluateJavaScript("window.__onImagesPicked(...)")`
- [x] Info.plist에 `NSPhotoLibraryUsageDescription` 이미 설정 확인 완료

#### Android 네이티브
- [x] `ImagePickerBridge.kt` (신규) — URI → Bitmap → 리사이즈 → base64 → 웹뷰 전달
- [x] `AndroidBridge.kt`에 `pickImages(maxCount)` 메서드 + BridgeListener 추가
- [x] `MainActivity.kt`에 `PickMultipleVisualMedia(10)` 런처 + `pickImages` 구현
- [x] 이미지 리사이즈: 긴 변 1920px 기준 축소 + JPEG 80% 압축
- [x] base64 인코딩 후 웹뷰에 전달: `evaluateJavascript("window.__onImagesPicked(...)")`
- [ ] **Android 동작 미확인** — 빌드 후 테스트 필요 (로그 `[ImagePicker] pickImages 호출` 확인)

### 구현된 파일 목록

#### 서버
- `src/uploader/index.js` — `generatePresignedUrl()` 추가 (`PutObjectCommand` + `getSignedUrl`)
- `src/post/controllers/post.js` — `presignImages` 컨트롤러 추가, `createPost`를 mediaKeys 방식으로 변경
- `src/post/routes/post.js` — `POST /posts/presign` 라우트 추가, multer 미들웨어 제거

#### 웹 프론트
- `src/api/postApi.ts` — `presignImages()`, `uploadToS3()` 추가, `createPost()` JSON 방식으로 변경
- `src/pages/feed/post/index.tsx` — 네이티브 브릿지 호출 + `__onImagesPicked` 수신 + presign 업로드 흐름
- `src/pages/feed/index.tsx` — 피드 목록 이미지 표시 UI
- `src/pages/feed/detail/index.tsx` — 상세 페이지 이미지 표시 UI
- `src/types/window.d.ts` — `pickImages`, `__onImagesPicked` 타입 선언

#### iOS (`lordhill-ios/`)
- `LordhillChurch/Util/ImagePickerBridge.swift` (신규) — PHPicker + 권한 체크 + 리사이즈 + 웹뷰 전달
- `LordhillChurch/View/LordhillWebView.swift` — `pickImages` 메시지 핸들러 등록

#### Android (`lordhill-android/`)
- `app/.../ImagePickerBridge.kt` (신규) — Bitmap 리사이즈 + base64 + 웹뷰 전달
- `app/.../AndroidBridge.kt` — `pickImages(maxCount)` 메서드 추가
- `app/.../MainActivity.kt` — `PickMultipleVisualMedia` 런처 + `pickImages` 구현

### S3 설정

- S3Client + `@aws-sdk/s3-request-presigner` 이미 설치 완료
- 버킷: `lordhill-sns-media` (환경변수 `AWS_S3_BUCKET`)
- config: `uploader.s3.presignedUrl.expires = 600` (10분)
- **라이브 배포 전 S3 CORS 설정 필수:**
  ```bash
  aws s3api put-bucket-cors --bucket lordhill-sns-media --cors-configuration '{
    "CORSRules": [{
      "AllowedOrigins": ["https://www.lordhill-sns.kr"],
      "AllowedMethods": ["PUT", "GET"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3600
    }]
  }'
  ```

### ⚠️ 시행착오

1. **LocalStack 최신 버전 유료화** — `localstack/localstack:latest`가 라이선스 필요로 변경됨 (exit code 55). 로컬 S3 테스트가 불가하므로 이미지 업로드는 라이브 환경에서 테스트. 40명 규모 앱은 실제 AWS S3 직접 사용해도 비용 거의 없음
2. **iOS CLI로 만든 Swift 파일은 Xcode에 자동 등록 안 됨** — `ImagePickerBridge.swift` 파일 생성 후 Xcode에서 수동 Add Files 필요. 안 하면 `Cannot find type 'ImagePickerBridge' in scope` 에러
3. **iOS 포토 라이브러리 권한 체크 필수** — `PHPickerViewController`는 권한 없이도 동작하지만, `PHPhotoLibrary.authorizationStatus`로 명시적 체크 + 거부 시 설정 이동 안내 Alert이 UX상 필수. 참고: `healthcare-ios/Util/ImagePickerUtil.swift`
4. **iOS Info.plist `NSPhotoLibraryUsageDescription` 필수** — 없으면 권한 요청 시 앱 크래시. 프로젝트에 이미 설정되어 있었음
5. **Android `PickMultipleVisualMedia` maxItems는 생성자에서 지정** — `registerForActivityResult`는 Activity 생성 시 호출되므로 동적 maxCount 불가. `PickMultipleVisualMedia(10)`으로 고정
6. **Android `@JavascriptInterface` 메서드는 백그라운드 스레드에서 호출** — 갤러리 런처 실행은 `runOnUiThread`에서 해야 함
7. **웹 프론트 react-hooks/refs 규칙** — `addImagesRef.current = addImages`를 렌더 중에 하면 lint 에러. `useEffect` 안에서 업데이트해야 함
8. **S3 CORS 미설정 시 Presigned URL PUT 실패** — 프론트에서 S3에 직접 PUT 요청 시 브라우저가 CORS로 차단. 에러가 catch에서 무시되면 "게시 버튼 깜빡임만 하고 업로드 안 됨" 현상. catch에 `console.error` 추가하여 디버깅
9. **이미지 없이 텍스트만 게시는 정상 동작** — Presigned URL 흐름은 이미지가 있을 때만 실행. `mediaKeys`가 빈 배열이면 post_media 저장 스킵
10. **S3 endpoint 기본값이 LocalStack이면 Presigned URL이 localhost로 생성** — `config/default.cjs`에서 `endpoint` 기본값이 `http://localhost:4566`이면 라이브 서버에서도 localhost URL로 presign됨. 해결: `endpoint: process.env.AWS_S3_ENDPOINT || undefined`로 변경. 환경변수 미설정 시 AWS SDK가 기본 S3 엔드포인트 사용. `forcePathStyle`도 endpoint 있을 때만 `true`로 설정
11. **S3 미디어 버킷 퍼블릭 읽기 설정 필수** — 업로드된 이미지를 프론트에서 `<img src="...">로 표시하려면 S3 버킷이 퍼블릭 GET 허용이어야 함. 기본 생성 시 퍼블릭 접근이 전부 차단되어 이미지가 깨짐:
    ```bash
    # 1. 퍼블릭 접근 차단 해제
    aws s3api put-public-access-block --bucket <미디어버킷> --public-access-block-configuration '{
      "BlockPublicAcls": false, "IgnorePublicAcls": false,
      "BlockPublicPolicy": false, "RestrictPublicBuckets": false
    }'
    # 2. 퍼블릭 읽기 정책 추가
    aws s3api put-bucket-policy --bucket <미디어버킷> --policy '{
      "Version": "2012-10-17",
      "Statement": [{
        "Sid": "PublicReadGetObject",
        "Effect": "Allow",
        "Principal": "*",
        "Action": "s3:GetObject",
        "Resource": "arn:aws:s3:::<미디어버킷>/*"
      }]
    }'
    ```
12. **Android 이미지가 90도 회전되어 업로드** — Android 카메라로 찍은 사진은 EXIF orientation 메타데이터에 회전 정보가 저장됨. `BitmapFactory.decodeStream`으로 로드하면 EXIF가 적용 안 되어 이미지가 옆으로 눕는 현상. 해결: `ExifInterface`로 orientation 읽고 `Matrix.postRotate()`로 보정 후 리사이즈. `androidx.exifinterface:1.3.7` 의존성 추가 필요 (`libs.versions.toml` + `build.gradle.kts`)
13. **Android debug 빌드에서 라이브 URL 전환** — `app/src/debug/java/.../EnvManagerImpl.kt`에 `Environment` enum으로 LOCAL/DEV/LIVE 정의. `private val environment = Environment.LIVE`로 변경하면 debug 빌드에서 라이브 접속. iOS의 `Constants.swift` 패턴과 동일. 또는 `build.gradle.kts`의 debug `BASE_URL`을 직접 변경해도 됨

---

## 20. 이용약관 & 개인정보 처리방침 세팅

앱 심사(Google Play, App Store)와 법적 의무를 위해 약관 페이지, 동의 플로우, 공개 URL을 세팅한다.

### 필요한 약관

| 약관 | 필수 여부 | 용도 |
|------|----------|------|
| 개인정보 처리방침 (Privacy Policy) | 필수 | 개인정보보호법 의무 + 앱 심사 필수 제출 |
| 서비스 이용약관 (Terms of Service) | 권장 | 분쟁 방지 + UGC 앱 운영 근거 |

### 약관 콘텐츠에 반드시 포함할 내용

**개인정보 처리방침:**
- 수집항목 (소셜 로그인으로 수집하는 이메일, 이름, 프로필사진 등)
- 수집목적, 보유기간, 제3자 제공 여부
- 파기 절차, 안전성 확보 조치
- 이용자 권리 (열람/수정/삭제/탈퇴)
- 부적절 콘텐츠 신고 및 처리 (Google Play UGC 정책)
- 개인정보 보호책임자 연락처

**서비스 이용약관:**
- 서비스 내용, 가입 자격
- 이용자 의무 (금지 행위)
- 게시물 관리 (삭제/비공개 조건)
- **콘텐츠 신고 및 사용자 차단** (Google Play UGC 필수)
- 회원 탈퇴, 면책 조항

### 절차

#### 1단계: DB — 약관동의 컬럼 추가

```bash
cd packages/server
npm run migration -- add-tos-accepted-at-to-users
```

마이그레이션 파일:
```javascript
// migrations/YYYYMMDD-add-tos-accepted-at-to-users.cjs
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'tos_accepted_at', {
      type: Sequelize.DATE,
      allowNull: true,
      defaultValue: null,
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'tos_accepted_at');
  },
};
```

User 모델에 필드 추가:
```javascript
// src/user/models/User.js
tosAcceptedAt: {
  type: DataTypes.DATE,
  allowNull: true,
  field: 'tos_accepted_at',
},
```

#### 2단계: 서버 — 약관동의 API

컨트롤러 (`src/user/controllers/my.js`):
```javascript
export const acceptTerms = async (req, res) => {
  const userId = req.user.id;
  await models.User.update(
    { tosAcceptedAt: new Date() },
    { where: { id: userId } },
  );
  const user = await models.User.findByPk(userId, { attributes: [...] });
  res.json(user);
};
```

라우트 (`src/user/routes/my.js`):
```javascript
router.post('/me/accept-terms', asyncHandler(acceptTerms));
```

**주의:** `getProfile`, `updateProfile`, `getMe` 등 유저 정보를 반환하는 모든 API의 응답 attributes에 `tosAcceptedAt`을 포함해야 함.

#### 3단계: 프론트 — 약관 콘텐츠 파일

약관 전문을 TS 객체로 관리한다. 마이페이지 열람용과 바텀 모달 내 전문 보기에서 공유.

```
src/pages/my/terms/
  ├── privacyPolicyContent.ts   # 개인정보 처리방침 전문
  ├── termsOfServiceContent.ts  # 서비스 이용약관 전문
  ├── PrivacyPolicyPage.tsx     # 마이페이지 자식 열람 페이지
  └── TermsOfServicePage.tsx    # 마이페이지 자식 열람 페이지
```

콘텐츠 구조:
```typescript
export const privacyPolicyContent = {
  title: '개인정보 처리방침',
  lastUpdated: '2026년 6월 22일',
  sections: [
    { heading: '1. 개인정보의 수집 및 이용 목적', body: '...' },
    // ...
  ],
};
```

#### 4단계: 프론트 — authStore에 tosAcceptedAt 추가

```typescript
// stores/authStore.ts
export interface User {
  // ... 기존 필드
  tosAcceptedAt: string | null;
}

const mapUser = (data: any): User => ({
  // ... 기존 매핑
  tosAcceptedAt: data.tosAcceptedAt || null,
});
```

#### 5단계: 프론트 — 약관동의 바텀 드로어

`src/components/common/TermsConsentModal.tsx` — MUI Drawer 사용.

기능:
- 전체 동의 체크박스
- 개별 체크 (개인정보 처리방침 [필수], 서비스 이용약관 [필수])
- 각 항목 우측 `>` 버튼으로 약관 전문 보기 (모달 내 전환)
- "동의하고 시작하기" 버튼 → `POST /users/me/accept-terms` 호출

#### 6단계: 프론트 — MainLayout에서 동의 플로우

`src/components/frame/MainLayout.tsx`에서 로그인 후 `user.tosAcceptedAt`이 null이면 TermsConsentModal을 표시.

```typescript
const needsTermsConsent = user && !user.tosAcceptedAt;
// ...
<TermsConsentModal
  open={!!needsTermsConsent}
  onAccept={handleAcceptTerms}
  loading={termsLoading}
/>
```

동의 완료 시 authStore가 업데이트되면서 모달이 자동으로 닫힘.

#### 7단계: 프론트 — 마이페이지에 약관 메뉴 추가

마이페이지 메뉴 영역에 "개인정보 처리방침", "서비스 이용약관" 버튼 추가. 클릭 시 WithOutlet 슬라이드 패턴으로 자식 페이지 이동.

라우터 등록:
```typescript
// router/Router.tsx — my 하위 children
{ path: 'privacy-policy', element: <PrivacyPolicyPage /> },
{ path: 'terms-of-service', element: <TermsOfServicePage /> },
```

#### 8단계: 공개 약관 페이지 (앱 심사용)

**Google Play / App Store 모두 로그인 없이 접근 가능한 개인정보 처리방침 URL을 필수로 요구한다.**

```
src/pages/public/
  ├── PublicPrivacyPolicyPage.tsx    # FullHeightBox 래핑 독립 페이지
  └── PublicTermsOfServicePage.tsx
```

라우터에 공개 라우트 등록 (MainLayout 밖):
```typescript
{ path: '/privacy-policy', element: <PublicPrivacyPolicyPage /> },
{ path: '/terms-of-service', element: <PublicTermsOfServicePage /> },
```

앱 심사 시 입력할 URL:
- `https://<도메인>/privacy-policy`
- `https://<도메인>/terms-of-service`

### 전체 동작 플로우

```
최초 로그인 → getMe 응답 (tosAcceptedAt: null)
  → MainLayout에서 TermsConsentModal 바텀 드로어 표시
  → 전체 동의 체크 + "동의하고 시작하기" 클릭
  → POST /users/me/accept-terms → authStore 업데이트
  → 모달 닫힘 → 피드 정상 이용

이후 로그인 → getMe 응답 (tosAcceptedAt: "2026-06-22T...")
  → 모달 표시 안 함 → 바로 피드 진입

마이페이지 → 약관 메뉴 클릭 → 슬라이드 전환으로 약관 전문 열람
```

### 시행착오

1. **WithOutlet 오버레이가 뷰포트 전체로 슬라이드** — `position: fixed; left:0; right:0`이 max-width 컨테이너를 무시함. 해결: 외부 wrapper(`fixed inset-0 flex justify-center`)로 중앙 정렬 + 내부 div에 `max-w-[480px]` 적용. 단, `slideInFromRight` 애니메이션이 `transform: translateX`를 사용하므로 `left:50%; transform:translateX(-50%)` 방식은 충돌함
2. **약관동의 철회 기능 불필요** — 약관 동의 철회 = 서비스 이용 불가 = 회원탈퇴와 동일. 마이페이지에서는 약관 열람만 제공하면 충분
3. **기존 유저 처리** — 약관동의 기능 추가 전에 가입한 기존 유저는 `tos_accepted_at`이 null이므로, 다음 로그인 시 자동으로 동의 모달이 표시됨. 별도 데이터 마이그레이션 불필요

### 핵심 포인트

- 약관 콘텐츠는 TS 객체로 관리하여 마이페이지 열람, 바텀 모달, 공개 페이지에서 **단일 소스**로 공유
- Google Play UGC 앱은 **콘텐츠 신고/차단 기능**이 필수이며, 약관에도 해당 조항을 명시해야 함
- 공개 약관 URL은 CloudFront SPA 설정(403→index.html)이 적용되어 있으므로 별도 서버 설정 불필요

---

## 21. 앱 스토어 배포 (iOS App Store + Google Play)

앱 심사에 필요한 사전 준비, 제출 절차, 거절 대응 경험을 정리한다.

### 앱 심사 전 필수 기능 체크리스트

앱 심사 제출 전에 다음이 모두 구현되어 있어야 한다. 하나라도 빠지면 거절됨.

| 기능 | iOS (App Store) | Android (Google Play) | 구현 위치 |
|------|-----------------|----------------------|----------|
| **이용약관 동의** | 필수 (1.2) | 필수 (UGC 정책) | 로그인 후 바텀 드로어 |
| **개인정보 처리방침** | 필수 (공개 URL) | 필수 (공개 URL) | `/privacy-policy` (로그인 불필요) |
| **콘텐츠 신고** | 필수 (1.2) | 필수 (UGC) | 게시글/댓글 Flag 아이콘 |
| **비속어 필터링** | 필수 (1.2) | 필수 (UGC) | 서버 `contentFilter.js` |
| **사용자 차단** | 필수 (1.2) | 필수 (UGC) | 신고 모달 내 차단 버튼 |
| **계정 삭제 (회원 탈퇴)** | 필수 (5.1.1) | 필수 | 마이페이지 하단 |
| **Sign in with Apple** | 필수 (4.8) | 불필요 | iOS 네이티브만 |
| **심사용 로그인** | 필수 (데모 계정) | 필수 (데모 계정) | 로그인 화면 하단 필드 |

### 심사용 로그인 구현

소셜 로그인만 있는 앱은 심사팀이 로그인할 수 없으므로, 심사 전용 로그인을 제공해야 한다.

**서버** — `POST /api/auth/review-login`:
```javascript
export const reviewLogin = async (req, res) => {
  const { email, password } = req.body;
  if (email !== 'review@lordhill.church' || password !== 'lordhill2026!') {
    throw new ErrClass(ErrInfo.UnAuthorized);
  }
  const [user] = await models.User.findOrCreate({
    where: { provider: 'dev', providerId: 'review-user' },
    defaults: {
      email: 'review@lordhill.church',
      nickname: '심사계정',
      provider: 'dev',
      providerId: 'review-user',
      status: userStatus.approved,
      tosAcceptedAt: new Date(),  // 약관 동의 처리
    },
  });
  const tokens = generateTokens(user);
  res.json({ accessToken: tokens.accessToken });
};
```

**프론트** — 로그인 화면 하단에 이메일/비밀번호 입력 필드 + 로그인 버튼 추가. 심사 통과 후 제거 가능.

### 21-1. iOS App Store 배포

#### 사전 준비

1. **Apple Developer Program** 가입 ($99/년)
2. Xcode에서 **Apple Developer 계정**으로 로그인 (일반 Apple ID가 아님)
3. Bundle ID 등록: [Apple Developer Identifiers](https://developer.apple.com/account/resources/identifiers)
4. **Sign in with Apple** capability 추가 (Signing & Capabilities)
5. Constants.swift 환경을 `.live`로 변경

#### 앱 아이콘

- iOS: `Assets.xcassets/AppIcon.appiconset/` — **1024x1024 단일 이미지**만 넣으면 됨 (Xcode 15+에서 자동 리사이즈)
- 원형 로고를 정사각형 흰색 배경에 배치 (원형 그대로 넣으면 둥근 사각형 마스킹에서 어색)

#### Archive + 업로드

1. Xcode → 빌드 대상을 **Any iOS Device**로 선택
2. **Product > Archive**
3. Organizer → **Distribute App > App Store Connect** → 업로드

#### App Store Connect 설정

1. [appstoreconnect.apple.com](https://appstoreconnect.apple.com) 접속
2. 앱 생성: 이름, Bundle ID, SKU(`com.lordhill.church.sns`), 기본 언어
3. 필수 입력:
   - **카테고리**: 소셜 네트워킹
   - **개인정보 처리방침 URL**: `https://<도메인>/privacy-policy`
   - **연령 등급**: 설문 작성 (UGC 앱 → "예")
   - **스크린샷**: 6.5인치 (1242x2688 또는 1284x2778) 최소 1장
   - **앱 설명, 키워드, 지원 URL**
   - **가격**: 무료
   - **앱 개인정보**: 수집 데이터 유형 선택 후 "게시"
4. **심사 정보**:
   - 로그인 필요 → 예
   - 데모 계정: `review@lordhill.church` / `lordhill2026!`
   - 메모: 심사용 로그인 위치 안내
5. **심사 영상**: 거절 후 Reply에서 직접 영상 파일 첨부 (S3 URL은 심사팀이 못 볼 수 있음)

#### iOS 심사 거절 사유 및 대응 (실제 경험)

**1차 거절 — 3가지 사유:**

| 사유 | Guideline | 문제 | 해결 |
|------|-----------|------|------|
| Sign in with Apple 없음 | 4.8 | 소셜 로그인 제공 시 Apple 로그인 필수 | iOS 네이티브 Apple Sign In 구현 |
| UGC 사용자 차단 없음 | 1.2 | 신고는 있지만 차단 기능 없음 | 사용자 차단 + 피드 필터링 구현 |
| 계정 삭제 없음 | 5.1.1(v) | 가입은 되지만 탈퇴가 없음 | 마이페이지 회원 탈퇴 구현 |

**2차 거절 — 1가지 사유:**

| 사유 | Guideline | 문제 | 해결 |
|------|-----------|------|------|
| 콘텐츠 필터링 없음 | 1.2 | "a method for filtering objectionable content" 요구 | 비속어 필터(`contentFilter.js`) 구현 |
| 이용약관 무관용 문구 부족 | 1.2 | "no tolerance for objectionable content" 명시 필요 | 제4조에 Zero Tolerance + 24시간 조치 문구 추가 |
| 심사 영상 미확인 | 1.2 | S3 URL로 영상 제공했으나 확인 안 됨 | Reply에서 직접 영상 파일 첨부로 변경 |

**심사 영상 제출 방법:**
- iPhone 화면 녹화: 제어센터 → 녹화 버튼 (⏺)
- 녹화 내용: 약관 동의 → 콘텐츠 신고 → 사용자 차단 → 회원 탈퇴
- 첨부: App Store Connect에서 거절 메시지에 **Reply** → 영상 파일 직접 첨부

### 21-2. Google Play Store 배포

#### 사전 준비

1. **Google Play Console** 개발자 등록 ($25 일회성)
2. 개발자 본인 확인 + 전화번호 인증 완료
3. 앱의 `usesCleartextTraffic`을 `false`로 설정 + `network_security_config.xml` 추가

#### 앱 아이콘 (Android)

- 각 해상도별 PNG: `mipmap-mdpi`(48) ~ `mipmap-xxxhdpi`(192)
- adaptive icon 사용 시 foreground는 safe zone(바깥 18dp 잘림) 고려
- Play Store용: `512x512` 별도 준비
- Feature Graphic(배너): `1024x500`

#### AAB 파일 생성

1. Android Studio → **Build > Generate Signed Bundle / APK**
2. **Android App Bundle** 선택
3. Keystore 생성 (최초 1회):
   - Key store path: 안전한 위치에 `.jks` 파일
   - Alias, Password 설정
   - Validity: 25년
   - ⚠️ **Keystore 파일 + 비밀번호 절대 분실 금지** — 앱 업데이트 시 동일 키 필요
4. Release 빌드 타입 선택 → Create
5. 생성 위치: `app/release/app-release.aab`

#### Google Play Console 앱 설정

**앱 콘텐츠 설정 (모두 완료해야 심사 가능):**

| 항목 | 설정 값 |
|------|---------|
| 개인정보처리방침 | `https://<도메인>/privacy-policy` |
| 로그인 세부정보 | 예 → `review@lordhill.church` / `lordhill2026!` |
| 광고 | 아니요 |
| 콘텐츠 등급 | 설문 작성 (UGC 차단 기능 → 예) |
| 타겟층 | 해당 연령대 선택 |
| 데이터 보안 | 수집: 이름, 이메일, 사진 / 암호화 전송: 예 / 삭제 요청: 개인정보처리방침 URL |
| 정부 앱 / 금융 / 건강 | 아니요 |
| 앱 카테고리 | 소셜 |
| 아동 안전 표준 | 소셜 카테고리 필수 — 안전 표준 URL + 연락처 제공 |
| 스토어 등록정보 | 앱 이름, 설명, 스크린샷, 아이콘, Feature Graphic |

**데이터 보안 상세 설정:**

| 질문 | 답변 |
|------|------|
| 필수 사용자 데이터 수집/공유 | 예 |
| 암호화 전송 | 예 (HTTPS) |
| 계정 생성 방법 | OAuth |
| 계정 삭제 링크 | `https://<도메인>/privacy-policy` |
| 데이터 유형 (이름) | 수집됨, 필수, 앱 기능 + 계정 관리 |
| 데이터 유형 (이메일) | 수집됨, 필수, 앱 기능 + 계정 관리 |
| 데이터 유형 (사진) | 수집됨, 선택, 앱 기능 |

**아동 안전 표준 (소셜 카테고리 필수):**
- 소셜 또는 데이트 카테고리의 앱은 Google 아동 안전 표준 정책 준수 선언 필수
- 안전 표준 URL: 이용약관 URL 입력 (`https://<도메인>/terms-of-service`)
- 연락처 정보: 개발자 이메일

**스토어 등록정보:**
- 앱 이름: `손안의 교회`
- 간단한 설명 (80자): `교회 멤버 전용 비공개 커뮤니티. 피드, 기도, 나눔을 함께.`
- 스크린샷: 최소 2장, 9:16 비율 (1080x1920 권장)
- 앱 아이콘: 512x512 PNG
- Feature Graphic(배너): 1024x500 PNG (로고 중앙 배치)

#### 신규 개발자 필수: 비공개 테스트 (Closed Testing)

Google Play는 신규 개발자 계정에 대해 **프로덕션 출시 전 비공개 테스트를 필수**로 요구한다.

- **테스터 최소 12명**이 "테스터 참여"를 수락해야 함 (등록만으로는 불충분)
- **14일 이상** 비공개 테스트 실행

**절차:**
1. Google Play Console → 테스트 및 출시 → 비공개 테스트
2. 트랙 만들기 (이름이 중복되면 `Church Beta` 등으로 변경)
3. 새 버전 만들기 → AAB 업로드
4. 국가/지역 → 한국 추가
5. 테스터 → 이메일 목록 만들기 → 테스터 Gmail 추가
6. 변경사항 검토 → 제출 (Google 검토 소요: 수 시간~1~2일)
7. 검토 승인 → 테스터에게 설치 링크 공유
8. 테스터들이 링크 접속 → "테스터 참여" 수락 → Play Store에서 앱 설치
9. 14일 대기 후 → 프로덕션 출시 가능

**테스터 참여 방법:**
- 비공개 테스트 출시 후 생성되는 전용 링크를 테스터에게 공유
- 테스터가 링크 접속 → "테스터 참여" 수락 → Play Store에서 앱 설치
- 일반 사용자에게는 앱이 검색되지 않음
- 교회 멤버 Gmail 활용하면 자연스러움

#### 프로덕션 출시

비공개 테스트 14일 경과 후:
1. Google Play Console → 테스트 및 출시 → 프로덕션
2. 새 버전 만들기 → 비공개 테스트와 동일한 AAB 사용 가능
3. 출시 → Google 검토 → 승인 시 Play Store에 공개

### ⚠️ 시행착오 (앱 스토어 배포)

1. **Xcode Provisioning Profile 에러** — Apple Developer Program 계정으로 Xcode에 로그인해야 함. 일반 Apple ID로는 불가. Team 선택 시 "(Personal Team)"이 아닌 Developer Program 계정 선택
2. **App Store Connect 앱 생성 불필요** — Archive 업로드하면 앱이 자동 생성됨. 별도로 "신규 앱 등록"할 필요 없음
3. **심사 영상 S3 URL 실패** — App Store Connect 파일 첨부는 이미지만 지원. 영상은 거절 메시지 Reply에서 직접 첨부
4. **Android AAB 빌드 R8 에러** — `Missing classes detected while running R8` 에러 발생. `app/build/outputs/mapping/release/missing_rules.txt`에 나온 `-dontwarn` 규칙을 `proguard-rules.pro`에 추가하면 해결
5. **Android Keystore 분실 = 앱 업데이트 불가** — Keystore 파일(`.jks`)과 비밀번호를 안전한 곳에 백업 필수. 분실하면 같은 패키지명으로 업데이트 올릴 수 없음
6. **Google Play 비공개 테스트 트랙 이름 중복** — 기본 이름(`Beta` 등)이 이미 존재하면 에러. `Church Beta` 등 고유한 이름 사용
7. **Google Play 아동 안전 표준 선언** — 소셜 카테고리 앱은 아동 안전 표준 URL + 연락처 제공 필수. 이용약관 URL 활용
8. **앱 아이콘 원형 로고 문제** — 원형 로고를 그대로 넣으면 iOS 둥근 사각형 / Android adaptive icon에서 어색. 정사각형 배경 위에 로고 배치 필요. Android adaptive icon은 foreground safe zone(바깥 18dp) 고려
9. **Android `usesCleartextTraffic` 보안** — `AndroidManifest.xml`에서 `usesCleartextTraffic="false"` 설정 + `network_security_config.xml` 추가 필수. `true`로 두면 Play Store 거절 가능

---

## 부록: 프리 티어 요약

| 서비스 | 무료 범위 | 기간 |
|-------|----------|------|
| EC2 t2.micro | 750시간/월 | 12개월 |
| RDS db.t4g.micro | 750시간/월 + 20GB | 12개월 |
| S3 | 5GB + 2만 GET | 12개월 |
| CloudFront | 1TB 전송 + 1,000만 요청 | 12개월 |

12개월 이후 예상: ~$25/월

## 부록: SSH 기본

```bash
# EC2 접속
ssh -i <키>.pem ec2-user@<IP>

# 파일 복사 (로컬 → EC2)
scp -i <키>.pem <파일> ec2-user@<IP>:~/

# pem 파일 = EC2 접속 열쇠. 절대 유출 금지!
```

## 부록: PM2 기본

```bash
pm2 start '<명령어>' --name <이름>  # 시작
pm2 restart <이름>                   # 재시작
pm2 delete all                       # 전체 삭제
pm2 logs <이름> --lines 30           # 로그 확인
pm2 save                             # 프로세스 목록 저장
pm2 startup                          # 재부팅 시 자동 시작
```

## 부록: 참고 프로젝트 (healthcare)

| 프로젝트 | 경로 | 역할 |
|---------|------|------|
| healthcare-front | ~/Documents/cheeze/healthcare/healthcare-front | 프론트 패턴 참조 |
| healthcare-api-server | ~/Documents/cheeze/healthcare/healthcare-api-server | 서버 패턴 참조 |
| healthcare-ios | ~/Documents/cheeze/healthcare/healthcare-ios | iOS 웹뷰 패턴 참조 |
| healthcare-android | ~/Documents/cheeze/healthcare/healthcare-android | Android 웹뷰 패턴 참조 |
