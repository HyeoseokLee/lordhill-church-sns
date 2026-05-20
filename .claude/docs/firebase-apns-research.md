# Firebase + APNs iOS 푸시 설정 리서치

**작성일**: 2026-05-18
**주제**: Firebase Console + Apple Developer APNs 설정 구체적 절차

---

## 1. APNs 인증 키 (.p8) 발급 절차

### 1.1 Apple Developer 콘솔 단계

| 단계 | 조작 | 상세 |
|------|------|------|
| 1 | Apple Developer 로그인 | https://developer.apple.com/ |
| 2 | Certificates, IDs & Profiles 이동 | 상단 메뉴 또는 좌측 네비게이션 |
| 3 | **Keys** 클릭 | 좌측 메뉴 아래쪽 |
| 4 | **+ 버튼** 클릭 | 새 키 생성 시작 |
| 5 | Key Name 입력 | 예: `FCM_APNs_Key` 또는 `iOS_Push_Key` |
| 6 | ☑️ **"Apple Push Notifications service (APNs)"** 체크 | 중요: 이것이 필수 옵션 |
| 7 | Continue 클릭 | 검토 페이지로 이동 |
| 8 | Register 클릭 | 키 생성 확정 |
| 9 | Download 클릭 | `.p8` 파일 다운로드 (파일명 예: `AuthKey_XXXXXXXX.p8`) |

### 1.2 중요 정보 수집

다운로드 후 **반드시 다음 정보를 기록**:
- **Key ID**: 10자 알파벳 (다운로드 페이지에 표시, 파일명에도 포함)
- **Apple Team ID**: 10자 (Apple Developer 계정 우측 상단에서 확인 가능)
- `.p8` 파일: 안전하게 보관 (재다운로드 불가, 한 번만 가능)

### 1.3 특징

- APNs 인증키는 **Apple Developer 계정당 1개**
- 하나의 키로 **해당 계정의 모든 iOS 앱**에 사용 가능
- 키는 **수동으로 취소하지 않으면 무기한 유효**
- 2025년 기준 Apple의 최신 요구사항 검토 필요: [Apple Developer News - APNs Updates](https://developer.apple.com/news/upcoming-requirements/)

---

## 2. Firebase Console에서 APNs 키 등록

### 2.1 Firebase Console 단계

| 단계 | 조작 | 상세 |
|------|------|------|
| 1 | Firebase Console 로그인 | https://console.firebase.google.com/ |
| 2 | 프로젝트 선택 | 기존 lordhill-sns 프로젝트 |
| 3 | ⚙️ **Project Settings** 클릭 | 우측 상단 톱니바퀴 아이콘 |
| 4 | **Cloud Messaging** 탭 클릭 | 상단 탭 메뉴 |
| 5 | iOS 앱 찾기 | "Your iOS apps" 섹션 |
| 6 | **Upload** 버튼 클릭 | APNs Authentication Key 섹션 아래 |
| 7 | `.p8` 파일 선택 | 다운로드한 `AuthKey_XXXXXXXX.p8` |
| 8 | Key ID 입력 | 10자 알파벳 (Apple Developer에서 수집) |
| 9 | Apple Team ID 입력 | 10자 숫자 (Apple Developer 계정 정보) |
| 10 | Upload 완료 | 완료 메시지 확인 |

### 2.2 APNs Key vs. APNs Certificate

| 항목 | APNs Key (.p8) | APNs Certificate (.cer) |
|------|----------------|------------------------|
| 형식 | 새로운 표준 | 구식 (2025년 deprecated) |
| 발급처 | Apple Developer Keys 메뉴 | Certificates 메뉴 |
| 유효기간 | 무기한 | 1년 (매년 갱신 필요) |
| 앱 공유 | 동일 계정 모든 앱 사용 가능 | 특정 Bundle ID별 발급 필요 |
| 권장사항 | ✅ 최신 방식 | ❌ 피할 것 |

**결론**: APNs Key (.p8)을 사용할 것. Certificate 방식은 outdated.

---

## 3. GoogleService-Info.plist 필요성

### 3.1 표준 방식 (권장)

**필요**: `GoogleService-Info.plist` 파일
1. Firebase Console에서 **Download GoogleService-Info.plist** 클릭
2. Xcode 프로젝트 루트에 추가
3. All Targets에 추가 선택

### 3.2 대체 방식 (코드로 초기화)

**FirebaseOptions 객체 programmatically 생성**:
```swift
// GoogleService-Info.plist 대신 코드로 직접 설정
let options = FirebaseOptions(googleAppID: "...", gcmSenderID: "...")
options.apiKey = "..."
options.databaseURL = "..."
// ... 기타 설정

do {
  try FirebaseApp.configure(options: options)
} catch {
  print("Failed to configure Firebase: \(error)")
}
```

### 3.3 결론

| 방식 | 권장 여부 | 이유 |
|------|---------|------|
| plist 파일 | ✅ 권장 | 간단, 오류 적음, 표준 방식 |
| 코드 초기화 | △ 대체 방식 | 보안 설정 고려 필요, 유지보수 복잡 |

**이 프로젝트**: `GoogleService-Info.plist` 파일 방식 권장. WebView 하이브리드이므로 설정 간결화가 중요.

---

## 4. 주의사항 (Sandbox vs. Production, 시뮬레이터)

### 4.1 Sandbox vs. Production

| 환경 | Firebase 설정 | APNs 환경 |
|------|--------------|----------|
| Development (테스트) | Firebase Console 동일 | APNs Sandbox |
| Production (배포) | Firebase Console 동일 | APNs Production |

**핵심**: Firebase에 APNs Key 하나만 등록하면 **자동으로 Sandbox/Production 모두 지원**. 별도 설정 불필요.

### 4.2 시뮬레이터 푸시 테스트

| 항목 | 상세 |
|------|------|
| iOS 버전 | iOS 11.4+ 이론상 지원 |
| Xcode 버전 | Xcode 11.4+ |
| **실제 동작** | ❌ 푸시 알림 수신 불가 |
| **FCM Token** | ✅ 생성됨 (하지만 푸시 수신 안 됨) |
| **결론** | 실 기기로만 테스트 가능 |

### 4.3 테스트 워크플로우

```
1. 실 iOS 기기 (또는 iPhone 기기)
   ↓
2. 앱 실행 → FCM Token 출력/저장
   ↓
3. Firebase Console → Cloud Messaging → Send test message
   ↓
4. Token 입력 → Send
   ↓
5. 기기에서 푸시 수신 확인
```

### 4.4 주의: 시뮬레이터에서의 FCM Token

- 시뮬레이터에서 `Messaging.messaging().token` 호출 → 정상적으로 Token 반환
- 하지만 **해당 Token으로 푸시 전송 불가** (APNs 연결 부재)
- 개발 중 로컬 테스트만 필요하면 시뮬레이터 OK
- **푸시 알림 실제 동작 확인 필수** → 실 기기 필수

---

## 5. 통합 요약

### 5.1 전체 흐름

```
Step 1. Apple Developer (APNs Key 발급)
  ├─ Certificates, IDs & Profiles → Keys
  ├─ + 버튼 → APNs 체크 → Register → Download (.p8)
  └─ Key ID, Team ID 기록

Step 2. Firebase Console (APNs Key 등록)
  ├─ Project Settings → Cloud Messaging
  ├─ iOS 앱 선택 → Upload APNs Key
  ├─ .p8 파일, Key ID, Team ID 입력
  └─ Upload 완료

Step 3. Xcode (권한 + 설정)
  ├─ Push Notifications Capability 추가
  ├─ Background Modes (Remote notifications) 추가
  └─ GoogleService-Info.plist 추가 (또는 코드 초기화)

Step 4. 테스트
  ├─ 실 iOS 기기 필수
  └─ Firebase Console에서 테스트 메시지 전송
```

### 5.2 핵심 체크리스트

- [ ] Apple Developer 계정 확인 (유료 개발자 계정)
- [ ] APNs Authentication Key (.p8) 발급 및 다운로드
- [ ] Key ID, Apple Team ID 기록
- [ ] Firebase Console에 APNs Key 등록
- [ ] Xcode: Push Notifications Capability 추가
- [ ] Xcode: Background Modes - Remote notifications 활성화
- [ ] GoogleService-Info.plist Xcode에 추가 (또는 코드 초기화)
- [ ] 실 iOS 기기로 푸시 테스트

---

## 6. 참고 자료

- [Firebase iOS Setup Docs](https://firebase.google.com/docs/ios/setup)
- [Firebase Cloud Messaging for iOS](https://firebase.google.com/docs/cloud-messaging/ios/client)
- [Apple Developer - Certificates, IDs & Profiles](https://developer.apple.com/account/resources/)
- [Medium: Setting Up APNs Keys for Firebase](https://medium.com/@moinakash/the-simple-guide-to-setting-up-apns-authentication-keys-p8-for-firebase-push-notifications-3d38ef193bda)
- [GitHub Firebase iOS SDK Discussion: GoogleService-Info.plist](https://github.com/firebase/firebase-ios-sdk/discussions/8603)

---

## 7. 다음 단계

이 리서치를 바탕으로:
1. **Task #2**: 서버 FCM iOS 푸시 추가사항 점검 (firebase-admin SDK 설정, 토큰 저장소, 푸시 전송 로직)
2. **Task #3**: iOS FCM SDK 설정 + 구현 패턴 (SwiftUI + FCM, 토큰 요청, 푸시 핸들러)
