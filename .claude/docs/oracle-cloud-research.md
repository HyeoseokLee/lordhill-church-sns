# Oracle Cloud Always Free 인프라 이전 리서치

> AWS EC2 + RDS → Oracle Cloud VM + MySQL HeatWave 이전을 위한 리서치.
> 프론트(S3+CloudFront)와 이미지(S3)는 AWS 유지.

---

## 1. Oracle Cloud Always Free 스펙 정리

### Compute — VM.Standard.A1.Flex (ARM)

| 항목 | 스펙 |
|------|------|
| CPU | 4 OCPU (Ampere A1 ARM) |
| 메모리 | 24 GB |
| 부트 볼륨 | 50~200 GB (전체 블록 스토리지 200GB 한도) |
| 아웃바운드 | 10 TB/월 |
| OS | Ubuntu 24.04 aarch64, Oracle Linux |
| 인스턴스 수 | 최대 4개 (OCPU/메모리를 나눠서) |
| 리전 | 홈 리전에서만 생성 가능 |

**vs AWS t2.micro**: 1 vCPU / 1GB → **4 OCPU / 24GB**. 성능 24배 업그레이드.

### MySQL HeatWave — MySQL.Free

| 항목 | 스펙 |
|------|------|
| Shape | MySQL.Free (고정) |
| 스토리지 | 50 GB (데이터 + 로그) |
| 백업 | 50 GB, 1일 보관 |
| HA | 불가 (Standalone만) |
| PITR | 비활성화 |
| 위치 | 프라이빗 서브넷 (퍼블릭 IP 없음) |
| 접속 | 같은 VCN의 컴퓨트에서만 접속 가능 |
| 포트 | 3306 (MySQL), 33060 (X-Protocol) |

**vs RDS**: 동일 MySQL 8.0, Sequelize 호환. 코드 변경 없음.

### 네트워킹

| 항목 | 한도 |
|------|------|
| VCN | 2개 |
| 로드밸런서 | Flexible 10Mbps |
| 아웃바운드 | 10 TB/월 |
| IPv6 | 지원 |

---

## 2. 핵심 아키텍처

```
사용자 (iOS/Android WebView)
  ↓
CloudFront (HTTPS + CDN) → S3 (프론트 빌드) ← AWS 유지
  ↓ API 호출
nginx (HTTPS, certbot) → OCI Compute:3001 (Express)
                         ↓ 같은 VCN 내부
                         OCI MySQL HeatWave (프라이빗 서브넷)

이미지: S3 (lordhill-sns-media) ← AWS 유지
```

**변경 사항:**
- EC2 → OCI Compute (ARM VM)
- RDS → OCI MySQL HeatWave
- S3, CloudFront → **그대로**
- 도메인: `api` A 레코드만 OCI 공인 IP로 변경

---

## 3. OCI 특유의 핵심 주의사항

### 3-1. 이중 방화벽 (AWS와 가장 큰 차이!)

AWS는 Security Group 하나만 관리하면 되지만, OCI는 **두 겹**:

```
인터넷 → [1] OCI Security List (콘솔) → [2] OS iptables (인스턴스 내부) → nginx
```

**둘 다 열어야** 외부에서 접속 가능. 하나라도 빠지면 연결 불가.

**OCI Security List (콘솔):**
- Ingress Rules 추가: 0.0.0.0/0 → TCP 22, 80, 443

**OS iptables (SSH 접속 후):**
```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

nftables 백엔드 에러 시:
```bash
sudo iptables-legacy -I INPUT -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables-legacy -I INPUT -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo iptables-legacy-save | sudo tee /etc/iptables/rules.v4
```

### 3-2. MySQL HeatWave는 퍼블릭 IP 없음

- 반드시 **프라이빗 서브넷**에 배치
- 컴퓨트 인스턴스(퍼블릭 서브넷)에서 **내부 IP**로 접속
- 외부(로컬 PC)에서 직접 접속 불가 → SSH 터널 필요
- 보안상 장점 (RDS는 퍼블릭 접근 가능했음)

**VCN 서브넷 구성:**
```
VCN (10.0.0.0/16)
├── 퍼블릭 서브넷 (10.0.0.0/24) → Compute VM (공인 IP)
└── 프라이빗 서브넷 (10.0.1.0/24) → MySQL HeatWave (내부 IP만)
```

**프라이빗 서브넷 Security List:**
- Ingress: 10.0.0.0/24 → TCP 3306,33060 (컴퓨트에서 MySQL 접근)

### 3-3. Idle 인스턴스 회수 정책

7일간 아래 **모두** 충족 시 Oracle이 인스턴스를 **중지**(삭제 아님):
- CPU 사용률 (95th percentile) < 20%
- 네트워크 사용률 < 20%
- 메모리 사용률 < 20% (A1 shape만)

**대응 방법:**
1. **PAYG(Pay As You Go)로 전환** — 무료 범위 내에서는 과금 없음. 회수 대상에서 제외됨. **가장 안전한 방법**
2. Express 서버가 돌고 있으면 네트워크/CPU 활동이 있으므로 40명이 사용하는 앱이면 회수 위험 낮음
3. 인스턴스 크기를 작게 잡으면 (1 OCPU, 6GB) 상대적 사용률이 높아져 안전

### 3-4. Out of Capacity 문제

ARM 인스턴스 생성 시 "Out of Capacity" 에러가 자주 발생.
- 해결: 다른 Availability Domain 시도, 또는 시간대 바꿔서 재시도
- 심하면 자동 생성 스크립트 사용 (GitHub에 다수 존재)

### 3-5. ARM 아키텍처 호환성

- Node.js: ARM64(aarch64) 공식 지원. 문제 없음
- npm 패키지: native addon (sharp, bcrypt 등)도 ARM 지원
- Ubuntu 24.04 aarch64 이미지 사용

---

## 4. 이전 시 코드 변경 범위

### 변경 필요

| 항목 | 변경 내용 |
|------|----------|
| 서버 `.env` | DB_HOST를 OCI MySQL 내부 IP로 변경 |
| 서버 `.env` | DB_PORT = 3306 (동일) |
| 가비아 DNS | `api` A 레코드를 OCI 공인 IP로 변경 |
| GitHub Secrets | EC2_HOST → OCI IP, EC2_SSH_KEY → OCI SSH 키 |
| CI/CD 워크플로우 | SSH 접속 사용자명 변경 (ec2-user → ubuntu) |
| nginx 설정 | 새 서버에 동일하게 설정 |

### 변경 불필요

| 항목 | 이유 |
|------|------|
| Express 코드 | DB가 MySQL 8.0으로 동일 |
| Sequelize 모델/마이그레이션 | MySQL 호환 |
| 프론트 코드 | API URL 동일 (api.lordhill-sns.kr) |
| S3 업로드 | AWS S3 그대로 유지 |
| CloudFront | 그대로 유지 |
| iOS/Android | API 도메인 동일 |

---

## 5. 이전 절차 요약

```
1. OCI 계정 생성 (oracle.com/cloud/free)
2. VCN 생성 (퍼블릭 + 프라이빗 서브넷)
3. MySQL HeatWave Always Free 생성 (프라이빗 서브넷)
4. Compute ARM VM 생성 (퍼블릭 서브넷, Ubuntu 24.04)
5. 방화벽 설정 (Security List + iptables)
6. 서버 환경 세팅 (Node.js, PM2, nginx, certbot)
7. DB 마이그레이션 (RDS → OCI MySQL)
8. 코드 배포 + .env 설정
9. DNS 변경 (api → OCI IP)
10. CI/CD 업데이트 (GitHub Secrets + 워크플로우)
11. 검증 (API 동작, 푸시, 이미지 업로드)
12. AWS EC2 + RDS 종료
```

---

## 6. 비용 비교

| | AWS (프리 티어 만료) | Oracle Cloud Always Free |
|---|---|---|
| 서버 | EC2 ~$8.5/월 | **$0** (영구 무료) |
| DB | RDS ~$12/월 | **$0** (영구 무료) |
| S3 + CloudFront | ~$1/월 | ~$1/월 (유지) |
| **합계** | **~$21.5/월** | **~$1/월** |

연간 절감: **~$246**

---

## 7. 리스크 & 대응

| 리스크 | 심각도 | 대응 |
|--------|--------|------|
| Idle 인스턴스 회수 | 중 | PAYG 전환으로 해결 |
| Out of Capacity | 중 | 생성 시 반복 시도. 한번 만들면 괜찮음 |
| Oracle 정책 변경 | 낮 | Always Free는 2019년부터 유지 중. 변경 시 AWS로 복귀 가능 |
| ARM 호환성 | 낮 | Node.js + MySQL 모두 ARM 공식 지원 |
| DB 퍼블릭 접근 불가 | 낮 | SSH 터널로 Adminer 접속 가능 |

---

## Sources

- [Oracle Cloud Free Tier](https://www.oracle.com/cloud/free/)
- [Always Free Resources 공식 문서](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm)
- [Creating an Always Free DB System](https://docs.oracle.com/en-us/iaas/mysql-database/doc/creating-always-free-db-system.html)
- [HeatWave MySQL Always Free 가이드](https://stroz.dev/posts/2024/september/heatwave-mysql-always-free/)
- [Oracle Cloud 포트 80/443 열기](https://dev.to/armiedema/opening-up-port-80-and-443-for-oracle-cloud-servers-j35)
- [Oracle Cloud certbot SSL](https://blogs.oracle.com/developers/free-ssl-certificates-in-the-oracle-cloud-using-certbot-and-lets-encrypt)
- [Node.js on Oracle Linux 공식 튜토리얼](https://docs.oracle.com/en-us/iaas/Content/developer/node-on-ol/01oci-ol-node-summary.htm)
- [Idle 인스턴스 회수 방지](https://techtutelage.net/?p=413)
