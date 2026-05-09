# 프로젝트 세팅 가이드 (처음부터 배포까지)

> healthcare 참조 프로젝트 기반으로 새 프로젝트를 세팅하는 전체 절차.
> lordhill-church-sns 구축 과정에서의 시행착오를 모두 반영.

---

## 전체 프로세스 요약

```
1. GitHub 레포 생성 + 로컬 Git 연결
2. 모노레포 구조 세팅 (npm workspaces)
3. 서버 초기 세팅 (Express + Sequelize)
4. 프론트 초기 세팅 (React + Vite + Tailwind)
5. DB 세팅 (Docker + MySQL + Adminer)
6. AWS 인프라 세팅 (EC2 + RDS + S3 + CloudFront)
7. 도메인 + HTTPS 세팅
8. CI/CD 세팅 (GitHub Actions)
9. Google OAuth 세팅
```

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

## 6. AWS 인프라 세팅

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
# 데이터베이스 생성 (EC2에서)
mysql -h <RDS엔드포인트> -u admin -p
CREATE DATABASE <db명> CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### ⚠️ 시행착오
- RDS 생성 시 초기 데이터베이스 이름을 안 넣으면 수동으로 CREATE DATABASE 필요
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
1. https://console.cloud.google.com → 새 프로젝트
2. OAuth 동의 화면 → 외부
3. 사용자 인증 정보 → OAuth 클라이언트 ID (웹)
4. 승인된 JavaScript 원본: `https://www.<도메인>`, `http://localhost:5173`
5. 승인된 리디렉션 URI:
   - `https://api.<도메인>/api/auth/google/callback`
   - `http://localhost:3001/api/auth/google/callback`

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

GOOGLE_CLIENT_ID=<Google Client ID>
GOOGLE_CLIENT_SECRET=<Google Client Secret>
GOOGLE_CALLBACK_URL=https://api.<도메인>/api/auth/google/callback

AWS_ACCESS_KEY_ID=<AWS키>
AWS_SECRET_ACCESS_KEY=<AWS시크릿>
AWS_REGION=ap-northeast-2
AWS_S3_BUCKET=<이미지 버킷명>

CLIENT_URL=https://www.<도메인>
PORT=3001
EOF
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
- 글쓰기 버튼은 페이지 이동 아닌 Drawer 오픈 (uiStore)
- 활성 상태: accent 색상 + 굵은 strokeWidth

### WriteDrawer
- MUI Drawer (anchor="right")
- MainLayout에서 렌더링 → 어느 페이지에서든 열림
- 게시 완료 시 → 드로어 닫기 + 홈(`/`)으로 이동

### WithOutlet 오버레이 패턴 (리스트→상세)
```tsx
// 부모가 항상 마운트, 자식이 fixed 오버레이로 위에 덮임
// 뒤로가기 시 스크롤 위치 유지
<FeedWithOutlet>
  <FeedPage />
  {outlet && <div style={{ position: 'fixed', ... }}>{outlet}</div>}
</FeedWithOutlet>
```

### ⚠️ 시행착오
- 글쓰기 Drawer를 특정 페이지에 두면, 다른 페이지에서 열었을 때 이전 페이지에 남아있음 → MainLayout으로 이동
- scrollInner 안의 콘텐츠에 px-5를 중복으로 주면 패딩이 이중 적용됨

---

## 13. 네이티브 앱 (iOS/Android WebView)

### iOS (SwiftUI + WKWebView)
- 참고: `~/Documents/cheeze/healthcare/healthcare-ios`
- Bundle ID: `com.<프로젝트>.<앱>`
- Constants.swift에 환경별 URL (.local/.dev/.live)
- Info.plist: ATS `NSAllowsArbitraryLoads: true` (개발용)
- 실기기 테스트: 설정 → 일반 → VPN 및 기기 관리 → 개발자 신뢰

### Android (Kotlin + Compose + WebView)
- 참고: `~/Documents/cheeze/healthcare/healthcare-android`
- build.gradle.kts에 debug/release URL 분리 (EnvManagerImpl)
- Android Studio: Open → Gradle Sync → ▶ Run
- 실기기: 설정 → 개발자 옵션 → USB 디버깅

### 각 네이티브 앱 Git 레포 별도 관리
```bash
gh repo create <유저명>/<앱명> --private --source <경로> --push
```

### ⚠️ 시행착오
- iOS Signing: Apple ID를 Xcode에 추가하면 무료 Personal Team으로 개발 가능 ($99 불필요)
- iOS 실기기: "신뢰하지 않는 개발자" → 설정에서 수동 신뢰 필요 (최초 1회)
- Android: 에뮬레이터에서 로컬 서버 접속 시 `10.0.2.2`로 변경 필요할 수 있음
- Android Studio Gradle Sync 후 AGP 자동 업그레이드 제안 → 수락해도 됨

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
