# AWS + GitHub Actions CI/CD 배포 가이드

> Lordhill Church SNS 프로젝트 배포 과정을 정리한 문서 (2026-05-05)

---

## 전체 아키텍처

```
사용자 (iOS/Android WebView)
  ↓
CloudFront (CDN) → S3 (프론트 빌드 파일)
  ↓ API 호출
EC2 (Express 서버) → RDS MySQL (데이터베이스)
                   → S3 (이미지/동영상 저장소)
```

```
GitHub push → GitHub Actions
  ├─ 서버 코드 변경 → EC2에 SSH 배포 + PM2 재시작
  └─ 프론트 코드 변경 → 빌드 → S3 업로드 → CloudFront 캐시 갱신
```

---

## 1. AWS 계정 + CLI 설정

### 개념
- **AWS 계정**: 루트 사용자(집 주인)와 IAM 사용자(열쇠 받은 사람)가 있음
- **AWS CLI**: 터미널에서 AWS 서비스를 조작하는 도구
- **Access Key**: CLI가 AWS에 접속할 때 사용하는 인증 키

### 절차
1. https://aws.amazon.com 에서 계정 생성 (Basic 무료 플랜)
2. 콘솔 로그인 → MFA 설정 (보안 강화)
3. 보안 자격 증명 → 액세스 키 만들기 (CLI용)
4. 로컬에서 AWS CLI 설치 + 설정

```bash
brew install awscli
aws configure
# → Access Key ID, Secret Access Key, Region(ap-northeast-2), Format(json) 입력
```

### 확인
```bash
aws sts get-caller-identity  # 계정 정보 출력되면 성공
```

---

## 2. RDS MySQL (데이터베이스)

### 개념
- **RDS**: Relational Database Service — 클라우드의 관리형 MySQL
- 로컬 Docker MySQL을 RDS로 옮기는 것. 코드 변경 없이 접속 주소만 바꾸면 됨
- **프리 티어**: db.t4g.micro, 750시간/월, 20GB 무료 (12개월)

### 절차 (콘솔에서)
1. 콘솔 검색 → **Aurora and RDS** → 데이터베이스 생성
2. 설정값:
   - 엔진: **MySQL 8.0** (로컬과 동일 버전 맞추기)
   - 템플릿: **프리 티어**
   - 인스턴스: **db.t4g.micro**
   - 스토리지: **20GB, gp2, 자동 조정 OFF** (비용 방지)
   - 자격 증명: **자체 관리 + 암호 인증**
   - 퍼블릭 액세스: **예** (로컬 테스트용)
   - 보안 그룹: **새로 생성** (예: `lordhill-db-sg`)
   - RDS 프록시: **OFF** (별도 비용)

### 생성 후 할 일
- 엔드포인트 주소 확인 (예: `lordhill-sns-db.xxxxx.ap-northeast-2.rds.amazonaws.com`)
- DB가 아직 비어있으므로 데이터베이스 생성 필요:
  ```bash
  mysql -h <엔드포인트> -u admin -p
  CREATE DATABASE lordhill_sns CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  ```

### 핵심 용어
| 용어 | 의미 |
|-----|------|
| **AZ (Availability Zone)** | AWS 데이터센터 위치. 단일 AZ = 한 곳에만 DB |
| **보안 그룹 (SG)** | 방화벽. 어떤 IP/포트에서 접속 허용할지 규칙 |
| **퍼블릭 액세스** | 외부(로컬 PC 등)에서 접속 가능 여부 |

---

## 3. EC2 (서버 컴퓨터)

### 개념
- **EC2**: 클라우드의 가상 컴퓨터. Express 서버를 여기서 실행
- **프리 티어**: t2.micro, 750시간/월 무료 (12개월)
- **키 페어 (.pem)**: SSH 접속용 열쇠 파일. 분실 시 재발급 불가

### 절차 (콘솔에서)
1. 콘솔 검색 → **EC2** → 인스턴스 시작
2. 설정값:
   - 이름: `lordhill-sns-server`
   - AMI: **Amazon Linux 2023**
   - 인스턴스 유형: **t2.micro** (프리 티어)
   - 키 페어: **새로 생성** (RSA, .pem) → 다운로드 필수!
   - 보안 그룹: SSH(22), HTTP(80), HTTPS(443) 허용

### 생성 후 할 일

#### 1) SSH 접속 테스트
```bash
chmod 400 lordhill-key.pem
ssh -i lordhill-key.pem ec2-user@<퍼블릭IP>
```

#### 2) 서버 환경 소프트웨어 설치
```bash
# Node.js 20
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs

# PM2 (프로세스 매니저 — 서버 꺼지면 자동 재시작)
sudo npm install -g pm2

# Git
sudo yum install -y git

# MySQL 클라이언트 (DB 접속 테스트용)
sudo yum install -y mariadb105
```

#### 3) API 포트 열기
```bash
# 보안 그룹에 포트 3001 추가 (외부에서 API 접속 가능하게)
aws ec2 authorize-security-group-ingress \
  --group-id <EC2보안그룹ID> \
  --protocol tcp --port 3001 --cidr 0.0.0.0/0
```

#### 4) RDS 보안 그룹에 EC2 허용 추가
EC2에서 RDS에 접속하려면 RDS 보안 그룹에 EC2 보안 그룹을 허용해야 함:
```bash
aws ec2 authorize-security-group-ingress \
  --group-id <RDS보안그룹ID> \
  --protocol tcp --port 3306 \
  --source-group <EC2보안그룹ID>
```

#### 5) 서버 .env 설정
```bash
# EC2에 .env 파일 생성 (~/app/packages/server/.env)
DB_HOST=<RDS 엔드포인트>
DB_PORT=3306
DB_USERNAME=admin
DB_PASSWORD=<RDS 마스터 암호>
DB_DATABASE=lordhill_sns

JWT_SECRET=<랜덤문자열>
JWT_REFRESH_SECRET=<랜덤문자열>

AWS_ACCESS_KEY_ID=<AWS키>
AWS_SECRET_ACCESS_KEY=<AWS시크릿>
AWS_REGION=ap-northeast-2
AWS_S3_BUCKET=lordhill-sns-media

CLIENT_URL=https://<CloudFront도메인>
PORT=3001
```

#### 6) PM2로 서버 실행
```bash
cd ~/app/packages/server
pm2 start 'NODE_CONFIG_DIR=./config node src/index.js' --name lordhill-server
pm2 save                    # 현재 프로세스 목록 저장
pm2 startup                 # EC2 재부팅 시 자동 시작 등록
# → 출력되는 sudo 명령어를 복사해서 실행
```

### PM2 주요 명령어
```bash
pm2 list          # 실행 중인 프로세스 목록
pm2 logs          # 실시간 로그 확인
pm2 restart all   # 전체 재시작
pm2 stop all      # 전체 중지
```

---

## 4. S3 (파일 저장소)

### 개념
- **S3**: Simple Storage Service — 파일(이미지, HTML, JS 등)을 저장하는 클라우드 저장소
- 두 가지 용도로 사용:
  - **이미지 저장소** (`lordhill-sns-media`): 게시글 이미지/동영상
  - **프론트 배포용** (`lordhill-sns-front-*`): React 빌드 결과물

### 절차 (콘솔에서)
1. 콘솔 검색 → **S3** → 버킷 만들기
2. 이미지 저장소: `lordhill-sns-media`
3. 프론트 배포용: `lordhill-sns-front`
   - 네임스페이스: 계정 리전 네임스페이스 (권장) → 이름이 길어짐
   - 퍼블릭 액세스 차단: **모두 체크** (CloudFront를 통해서만 접근)
   - ACL: **비활성화** (권장)
   - 버전 관리: **비활성화**

### 핵심 용어
| 용어 | 의미 |
|-----|------|
| **버킷** | S3의 최상위 폴더 (파일을 담는 그릇) |
| **객체** | 버킷 안의 파일 하나하나 |
| **ACL** | 파일 소유권 관리. 본인만 쓰면 비활성화 |

---

## 5. CloudFront (CDN)

### 개념
- **CDN (Content Delivery Network)**: 파일 복사본을 전 세계 서버에 퍼뜨려 빠르게 전달
- **CloudFront**: AWS의 CDN 서비스. S3 앞에 서서 캐싱 + HTTPS 제공
- 비유: S3 = 창고, CloudFront = 가까운 편의점

```
사용자 → CloudFront (캐싱, 빠름) → S3 (원본 저장)
```

### 절차 (콘솔에서)
1. 콘솔 검색 → **CloudFront** → 배포 생성
2. 설정값:
   - Origin type: **Amazon S3** → 프론트 배포용 버킷 선택
   - Origin access: **OAC (Origin Access Control)** 권장
   - WAF: **비활성화** (비용 발생)
3. 생성 후 **배포 도메인 이름** 확인 (예: `d3r7fh2kgsbnqt.cloudfront.net`)

### 프리 티어
- 매월 1TB 전송 + 1,000만 요청 무료 (12개월)

---

## 6. GitHub Actions CI/CD

### 개념
- **CI/CD**: 코드 푸시 → 자동 테스트 → 자동 배포하는 파이프라인
- **GitHub Actions**: GitHub이 제공하는 CI/CD 서비스 (무료 범위 넉넉)
- `.github/workflows/` 폴더에 `.yml` 파일을 넣으면 GitHub이 자동으로 감지 + 실행

### 6-1. GitHub Secrets 등록

코드에 비밀번호를 직접 쓰면 위험 → GitHub Secrets에 안전하게 저장

1. GitHub 레포 → **Settings** → **Secrets and variables** → **Actions**
2. 등록할 시크릿:

| Name | 값 | 용도 |
|------|---|------|
| `AWS_ACCESS_KEY_ID` | AWS Access Key | AWS API 인증 |
| `AWS_SECRET_ACCESS_KEY` | AWS Secret Key | AWS API 인증 |
| `EC2_HOST` | EC2 퍼블릭 IP | SSH 접속 대상 |
| `EC2_SSH_KEY` | .pem 파일 전체 내용 | SSH 인증 |
| `CLOUDFRONT_DISTRIBUTION_ID` | CloudFront ID | 캐시 무효화용 |

```bash
# CLI로도 등록 가능
gh secret set AWS_ACCESS_KEY_ID --body "AKIA..."
gh secret set EC2_SSH_KEY < lordhill-key.pem
```

### 6-2. 서버 배포 워크플로우

**파일**: `.github/workflows/deploy-server.yml`
**트리거**: `packages/server/**` 변경 + main 푸시

```
동작 흐름:
1. SSH 키 준비
2. EC2에 SSH 접속
3. git pull (최신 코드 가져오기)
4. npm install (의존성 설치)
5. PM2 재시작 (서버 반영)
```

### 6-3. 프론트 배포 워크플로우

**파일**: `.github/workflows/deploy-front.yml`
**트리거**: `packages/app-front/**` 변경 + main 푸시

```
동작 흐름:
1. 코드 체크아웃
2. Node.js 설치
3. npm install (의존성 설치)
4. React 빌드 (HTML/JS/CSS 생성)
5. AWS 인증
6. S3에 빌드 결과물 업로드
7. CloudFront 캐시 무효화 (새 파일 즉시 반영)
```

---

## 7. 우리 프로젝트 리소스 정리

| 리소스 | 값 |
|-------|---|
| **RDS 엔드포인트** | `lordhill-sns-db.c1qaum2qg2re.ap-northeast-2.rds.amazonaws.com` |
| **EC2 퍼블릭 IP** | `15.164.129.119` |
| **S3 이미지 버킷** | `lordhill-sns-media` |
| **S3 프론트 버킷** | `lordhill-sns-front-905418091773-ap-northeast-2-an` |
| **CloudFront 도메인** | `d3r7fh2kgsbnqt.cloudfront.net` |
| **CloudFront ID** | `E3K8RTGG7AY3CV` |
| **프론트 접속 주소** | `https://d3r7fh2kgsbnqt.cloudfront.net` |
| **API 서버 주소** | `http://15.164.129.119:3001` |

---

## 8. 프리 티어 요약

| 서비스 | 무료 범위 | 기간 |
|-------|----------|------|
| EC2 t2.micro | 750시간/월 | 12개월 |
| RDS db.t4g.micro | 750시간/월 + 20GB | 12개월 |
| S3 | 5GB 저장 + 2만 GET | 12개월 |
| CloudFront | 1TB 전송 + 1,000만 요청 | 12개월 |

### 12개월 이후 예상 비용
- EC2 t3.micro: ~$8/월
- RDS db.t3.micro: ~$15/월
- S3 + CloudFront: ~$1 미만
- **합계: ~$25/월**

---

## 9. 트러블슈팅 체크리스트

### EC2에서 RDS 접속 안 될 때
→ RDS 보안 그룹에 EC2 보안 그룹이 허용되어 있는지 확인

### 외부에서 API 접속 안 될 때
→ EC2 보안 그룹에 해당 포트(3001)가 열려 있는지 확인

### S3 버킷 못 찾을 때
→ 계정 리전 네임스페이스로 만들면 이름이 길어짐. `aws s3 ls`로 실제 이름 확인

### GitHub Actions 실행 안 될 때
→ `.github/workflows/` 파일이 커밋 + 푸시되었는지 확인
→ `paths` 필터에 변경된 파일 경로가 포함되는지 확인

### CloudFront에서 이전 버전이 보일 때
→ 캐시 무효화가 필요. `aws cloudfront create-invalidation --distribution-id <ID> --paths "/*"`
