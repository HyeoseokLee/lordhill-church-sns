# Oracle Cloud 이전 플랜

> AWS EC2 + RDS → Oracle Cloud Always Free (Compute + MySQL HeatWave)
> 프론트(S3+CloudFront), 이미지(S3)는 AWS 유지

---

## 접근방식

서비스 다운타임을 최소화하기 위해 **Oracle에 먼저 전체 세팅 완료 → DNS 전환 → AWS 종료** 순서로 진행.
DNS TTL을 미리 낮춰두면 전환 시 전파 시간을 줄일 수 있음.

---

## 단계별 플랜

### Phase 1: Oracle Cloud 계정 + 인프라 생성

#### 1-1. OCI 계정 생성
- https://signup.oraclecloud.com 가입
- 홈 리전: **ap-chuncheon-1 (춘천)** 또는 **ap-seoul-1 (서울)** 선택
- 신용카드 등록 필요 (과금 안 됨)
- 가입 후 **PAYG(종량제)로 전환** 권장 (Idle 인스턴스 회수 방지)

#### 1-2. VCN (Virtual Cloud Network) 생성
- 이름: `lordhill-vcn`
- CIDR: `10.0.0.0/16`
- 퍼블릭 서브넷: `10.0.0.0/24` (Compute용)
- 프라이빗 서브넷: `10.0.1.0/24` (MySQL용)
- Internet Gateway + NAT Gateway + Route Table 설정

#### 1-3. Security List 설정
**퍼블릭 서브넷 Security List (Ingress):**

| Source | Protocol | Port | 용도 |
|--------|----------|------|------|
| 0.0.0.0/0 | TCP | 22 | SSH |
| 0.0.0.0/0 | TCP | 80 | HTTP |
| 0.0.0.0/0 | TCP | 443 | HTTPS |

**프라이빗 서브넷 Security List (Ingress):**

| Source | Protocol | Port | 용도 |
|--------|----------|------|------|
| 10.0.0.0/24 | TCP | 3306,33060 | MySQL (Compute에서만) |

#### 1-4. MySQL HeatWave Always Free 생성
- Shape: MySQL.Free
- 서브넷: 프라이빗 서브넷
- Admin 계정/비밀번호 설정
- 생성 후 **프라이빗 IP 메모**

#### 1-5. Compute ARM VM 생성
- Shape: VM.Standard.A1.Flex
- OCPU: 2, 메모리: 12GB (나머지는 여유분으로 남김)
- OS: Ubuntu 24.04 aarch64
- 서브넷: 퍼블릭 서브넷
- SSH 키 등록
- 생성 후 **퍼블릭 IP 메모**

### Phase 2: 서버 환경 세팅

#### 2-1. OS 방화벽 설정 (iptables)
```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

#### 2-2. 서버 소프트웨어 설치
```bash
# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2, nginx, MySQL 클라이언트, Git
sudo npm install -g pm2
sudo apt-get install -y nginx mysql-client git
```

#### 2-3. nginx + certbot SSL
```bash
sudo apt-get install -y certbot python3-certbot-nginx

# nginx 설정 (AWS와 동일)
sudo tee /etc/nginx/sites-available/api.conf << 'EOF'
server {
    listen 80;
    server_name api.lordhill-sns.kr;
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/api.conf /etc/nginx/sites-enabled/
sudo certbot --nginx -d api.lordhill-sns.kr --non-interactive --agree-tos --email <이메일>
sudo systemctl enable nginx
```

#### 2-4. MySQL 접속 확인
```bash
mysql -h <MySQL 프라이빗 IP> -u admin -p
CREATE DATABASE lordhill_sns CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Phase 3: 데이터 마이그레이션

#### 3-1. RDS에서 덤프
```bash
# EC2에서 실행 (RDS 접근 가능)
mysqldump -h <RDS엔드포인트> -u admin -p lordhill_sns > lordhill_sns_dump.sql

# 로컬로 가져오기
scp -i lordhill-key.pem ec2-user@15.164.129.119:~/lordhill_sns_dump.sql ./
```

#### 3-2. OCI MySQL에 복원
```bash
# OCI Compute에 업로드
scp -i <oci-key> lordhill_sns_dump.sql ubuntu@<OCI-IP>:~/

# OCI Compute에서 MySQL에 복원
ssh -i <oci-key> ubuntu@<OCI-IP>
mysql -h <MySQL 프라이빗 IP> -u admin -p lordhill_sns < lordhill_sns_dump.sql
```

### Phase 4: 앱 배포

#### 4-1. 코드 클론 + 의존성 설치
```bash
ssh -i <oci-key> ubuntu@<OCI-IP>
git clone https://github.com/<유저명>/lordhill-church-sns.git ~/app
cd ~/app && npm install
cd packages/server && npm install
```

#### 4-2. .env 설정
```bash
cat > ~/app/packages/server/.env << 'EOF'
DB_HOST=<MySQL 프라이빗 IP>
DB_PORT=3306
DB_USERNAME=admin
DB_PASSWORD=<MySQL 비밀번호>
DB_DATABASE=lordhill_sns

JWT_SECRET=<기존과 동일>
JWT_REFRESH_SECRET=<기존과 동일>

GOOGLE_CLIENT_ID=<기존과 동일>
GOOGLE_CLIENT_SECRET=<기존과 동일>
GOOGLE_CALLBACK_URL=https://api.lordhill-sns.kr/api/auth/google/callback

KAKAO_CLIENT_ID=<기존과 동일>
KAKAO_CLIENT_SECRET=<기존과 동일>
KAKAO_CALLBACK_URL=https://api.lordhill-sns.kr/api/auth/kakao/callback

NAVER_CLIENT_ID=<기존과 동일>
NAVER_CLIENT_SECRET=<기존과 동일>
NAVER_CALLBACK_URL=https://api.lordhill-sns.kr/api/auth/naver/callback

AWS_ACCESS_KEY_ID=<기존과 동일>
AWS_SECRET_ACCESS_KEY=<기존과 동일>
AWS_REGION=ap-northeast-2
AWS_S3_BUCKET=lordhill-sns-media

CLIENT_URL=https://www.lordhill-sns.kr
ADMIN_URL=https://admin.lordhill-sns.kr
PORT=3001
EOF
```

주의: S3 관련 환경변수는 **AWS 키 그대로 사용** (이미지 저장소는 AWS S3 유지)

#### 4-3. firebase-service-account.json 복사
```bash
scp -i <oci-key> packages/server/firebase-service-account.json ubuntu@<OCI-IP>:~/app/packages/server/
```

#### 4-4. PM2 시작
```bash
cd ~/app/packages/server
pm2 start 'node src/index.js' --name lordhill-server
pm2 save && pm2 startup
```

### Phase 5: DNS 전환

#### 5-1. (선행) 가비아에서 api TTL 낮추기
- api A 레코드 TTL을 300초(5분)로 변경
- 변경 후 기존 TTL 시간만큼 대기

#### 5-2. DNS 변경
- 가비아: `api` A 레코드 → **OCI 퍼블릭 IP**로 변경
- 기존: `15.164.129.119` (EC2)
- 변경: `<OCI IP>`

#### 5-3. 검증
- `https://api.lordhill-sns.kr/api/health` 확인
- 앱에서 로그인 테스트
- 게시글 작성/이미지 업로드 테스트
- 푸시 알림 테스트

### Phase 6: CI/CD 업데이트

#### 6-1. GitHub Secrets 변경

| Secret | 기존 (AWS) | 변경 (OCI) |
|--------|-----------|------------|
| EC2_HOST | 15.164.129.119 | <OCI IP> |
| EC2_SSH_KEY | lordhill-key.pem 내용 | OCI SSH 키 내용 |

#### 6-2. deploy-server.yml 수정
- SSH 사용자: `ec2-user` → `ubuntu`
- 나머지 동일 (git pull, npm install, migrate, pm2 restart)

### Phase 7: AWS 정리

#### 7-1. 검증 기간
- DNS 전환 후 **3일간** AWS EC2/RDS를 유지하며 모니터링
- 문제 시 DNS를 다시 EC2 IP로 복구 가능

#### 7-2. AWS 리소스 삭제 (검증 완료 후)
```
1. EC2 인스턴스 종료 (중지 → 종료)
2. RDS 인스턴스 삭제 (최종 스냅샷 생성 후)
3. 불필요한 Security Group 삭제
4. Elastic IP 해제 (있으면)
```

주의: **S3 버킷, CloudFront는 삭제하지 않음!**

---

## 파일 변경 목록

| 파일 | 변경 내용 |
|------|----------|
| `.github/workflows/deploy-server.yml` | SSH 사용자 ec2-user → ubuntu |
| `packages/server/.env` (OCI) | DB_HOST를 OCI MySQL IP로 |
| 가비아 DNS | api A 레코드 IP 변경 |
| GitHub Secrets | EC2_HOST, EC2_SSH_KEY 변경 |
| `.claude/docs/project-setup-guide.md` | 섹션 6 구조 개편 |

---

## 예상 소요 시간

| 단계 | 시간 |
|------|------|
| Phase 1: 인프라 생성 | 30~60분 |
| Phase 2: 서버 환경 | 20~30분 |
| Phase 3: DB 마이그레이션 | 10~20분 |
| Phase 4: 앱 배포 | 10~20분 |
| Phase 5: DNS 전환 | 5~10분 |
| Phase 6: CI/CD | 5~10분 |
| Phase 7: AWS 정리 | 3일 후 |

---

## 롤백 계획

DNS만 변경하므로, 문제 시 **가비아에서 api A 레코드를 EC2 IP로 복구**하면 즉시 롤백.
AWS EC2/RDS는 Phase 7 전까지 그대로 유지.
