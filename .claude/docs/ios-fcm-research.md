# iOS Firebase Cloud Messaging (FCM) Setup & Implementation Research

**Date:** 2026-05-18
**Task:** iOS FCM SDK 설정 + 구현 패턴 리서치 (Task #3)
**Status:** Research Complete - Ready for Development Planning
**References:** Firebase iOS SDK docs, healthcare-ios project, lordhill backend structure

---

## 1. Firebase iOS SDK Installation (SPM)

### Official SPM Repository
- **Official URL:** `https://github.com/firebase/firebase-ios-sdk`
- **Swift Package Manager:** Fully supported as of Firebase iOS SDK v9.0+
- **Installation Method:** Xcode → File → Add Packages → enter GitHub URL

### Required Modules for FCM
Core modules needed:
- `FirebaseCore` — Base initialization required for all Firebase services
- `FirebaseMessaging` — FCM client SDK, token management, message handling

### Module Version Considerations
- **Current Stable:** Firebase iOS SDK v10.28+ (as of May 2026)
- **SPM Support:** Full source code availability; binary distributions also supported
- **Swift Version:** Requires Swift 5.3+
- **Xcode:** Minimum Xcode 14.1
- **iOS Minimum:** iOS 12.0+, but best on iOS 13.0+ for AppDelegate + SceneDelegate flexibility

### SPM Installation Pattern
```swift
// In Xcode:
// 1. File → Add Packages
// 2. GitHub URL: https://github.com/firebase/firebase-ios-sdk.git
// 3. Dependency Rules: "Up to Next Major Version" from v10.0.0
// 4. Select Target → Add to Project
// 5. Select "FirebaseCore" and "FirebaseMessaging" packages only (don't add unnecessary modules)
```

### Key Gotchas
- **visionOS Binary Requirement:** Firestore (not FCM) requires source distribution on visionOS; set `FIREBASE_SOURCE_FIRESTORE` environment variable
- **SPM Cache Issues:** If Xcode shows "unable to clone repository," clean build folder (Cmd+Shift+K) and try again
- **Version Locks:** Don't use `.upToNextMajorVersion` if you need exact version control; use specific semantic versions for production

---

## 2. Xcode Project Configuration for Push Notifications

### Push Notifications Capability
**Steps:**
1. Select Target in Xcode
2. Signing & Capabilities tab
3. "+ Capability" button → "Push Notifications"
4. Xcode auto-generates entitlements (`.entitlements` file)

**What it adds:**
- `aps-environment` entitlement (development or production)
- App ID must have Push Notifications service enabled in Apple Developer account

### Background Modes Configuration
**Required for background/remote notifications:**

1. Signing & Capabilities tab
2. "+ Capability" button → "Background Modes"
3. Check: **"Remote notifications"** checkbox
4. Other modes to consider:
   - "Background fetch" (for silent notifications)
   - "Processing tasks" (for scheduled background work)

### Info.plist Settings
**Optional but recommended configurations:**

```xml
<!-- Disable automatic method swizzling (if implementing manual token mapping) -->
<key>FirebaseAppDelegateProxyEnabled</key>
<false/>

<!-- Disable auto-initialization (must call FirebaseApp.configure() manually) -->
<key>FirebaseMessagingAutoInitEnabled</key>
<false/>
```

**Note:** Default behavior (no entries) uses method swizzling to automatically map APNs tokens → FCM tokens.

### APNs (Apple Push Notification service) Configuration vs FCM Relationship

**Key Distinction:**
- **APNs** is Apple's infrastructure for delivering push notifications to iOS devices
- **FCM** is Google's service that acts as an intermediary and uses APNs as the transport layer for iOS
- **Flow:** Server → FCM → APNs → Device

**APNs Certificate/Key Setup:**
1. **Apple Developer Console:** Create APNs Authentication Key (.p8 file) or APNs Certificate (.cer)
   - Key type: "Apple Push Notification Authentication Key (Sandbox & Production)"
   - Download .p8 file with Key ID

2. **Firebase Console:** Upload to Settings > Cloud Messaging > Apple Platform Configuration
   - Paste Team ID (10-char code from Apple Developer)
   - Upload .p8 file
   - At least one (dev or production) is required

3. **Bundling:** APNs key must match Target's Bundle ID exactly

**Method Swizzling & Token Mapping:**
- **Default (swizzling enabled):** FCM SDK automatically:
  - Requests APNs device token via `registerForRemoteNotifications()`
  - Maps `didRegisterForRemoteNotificationsWithDeviceToken` → calls `Messaging.messaging().apnsToken`
  - Generates FCM token internally

- **Manual (swizzling disabled):** App must:
  - Implement `application(_:didRegisterForRemoteNotificationsWithDeviceToken:)`
  - Manually call `Messaging.messaging().apnsToken = deviceToken`
  - Still need to request authorization and call `registerForRemoteNotifications()`

---

## 3. FCM Implementation Patterns in SwiftUI

### AppDelegate Setup with @UIApplicationDelegateAdaptor

SwiftUI apps using FCM require a traditional AppDelegate because Firebase needs lifecycle hooks. Pattern:

```swift
import SwiftUI
import FirebaseCore
import FirebaseMessaging

@main
struct LordhillApp: App {
    // Attach AppDelegate to SwiftUI lifecycle
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}

// Separate AppDelegate class (can be in same file or separate file)
class AppDelegate: NSObject, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        // Firebase initialization
        FirebaseApp.configure()

        // Configure push notifications
        configurePushNotifications(application: application)

        // Handle launch via push notification
        handleLaunchPushNotification(launchOptions: launchOptions)

        return true
    }
}
```

### UNUserNotificationCenter Delegate Setup

**Two critical delegates must be set in AppDelegate:**

1. **UNUserNotificationCenterDelegate** — For handling notification display/tap
2. **MessagingDelegate** — For handling FCM token registration/refresh

```swift
class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate, MessagingDelegate {

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        FirebaseApp.configure()

        // Set delegates
        UNUserNotificationCenter.current().delegate = self
        Messaging.messaging().delegate = self

        // ... rest of setup
        return true
    }

    // MARK: - UNUserNotificationCenterDelegate

    // Called when notification arrives while app is in foreground
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        let userInfo = notification.request.content.userInfo
        print("Foreground notification: \(userInfo)")

        // Show alert/banner even in foreground
        var options: UNNotificationPresentationOptions = [.sound, .badge]
        if #available(iOS 14.0, *) {
            options.insert(.banner)
            options.insert(.list)
        } else {
            options.insert(.alert)
        }
        completionHandler(options)
    }

    // Called when user taps notification (from background/killed state)
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        let userInfo = response.notification.request.content.userInfo
        print("User tapped notification: \(userInfo)")

        // Handle deep link, navigate to relevant screen, etc.
        // Post NotificationCenter event for SwiftUI to listen
        NotificationCenter.default.post(name: NSNotification.Name("PushNotificationTapped"), object: userInfo)

        completionHandler()
    }

    // MARK: - MessagingDelegate

    // Called when FCM token is registered or refreshed
    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        guard let token = fcmToken else {
            print("❌ Failed to get FCM token")
            return
        }

        print("✅ FCM token: \(token)")

        // Check if token changed
        let previousToken = UserDefaults.standard.string(forKey: "fcm-token")
        UserDefaults.standard.set(token, forKey: "fcm-token")

        if previousToken != token {
            print("🔄 Token changed - send to server")
            // Only send if user is logged in
            if let authToken = UserDefaults.standard.string(forKey: "auth-token") {
                sendFcmTokenToServer(token)
            }
        }
    }
}
```

### Request User Notification Permissions

**Modern pattern (iOS 10+):**

```swift
func requestNotificationPermissions(application: UIApplication) {
    let authOptions: UNAuthorizationOptions = [.alert, .badge, .sound]

    UNUserNotificationCenter.current().requestAuthorization(options: authOptions) { granted, error in
        if granted {
            print("✅ Notification permission granted")

            // Register for remote notifications on main thread
            DispatchQueue.main.async {
                application.registerForRemoteNotifications()
            }
        } else {
            print("❌ Notification permission denied")
            if let error = error {
                print("   Error: \(error.localizedDescription)")
            }
        }
    }
}
```

**Key points:**
- Call inside `didFinishLaunchingWithOptions` (or in response to user action)
- Async callback — don't assume immediate result
- `registerForRemoteNotifications()` must be called on main thread
- Only call once at app startup (iOS will use cached preference on subsequent launches)

### FCM Token Initialization and Retrieval

**Pattern 1: Async Callback (Recommended for token send)**

```swift
// Get current token (async) — use this when you need the token value
Messaging.messaging().token { token, error in
    if let error = error {
        print("❌ Error fetching FCM token: \(error)")
        return
    }

    guard let token = token else {
        print("❌ FCM token is nil")
        return
    }

    print("✅ Got FCM token: \(token)")
    // Send to server
}
```

**Pattern 2: Via MessagingDelegate (Recommended for monitoring)**

```swift
// Inside MessagingDelegate callback (triggered automatically)
func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
    guard let token = fcmToken else { return }

    // Token is fresh and ready to use
    print("✅ New FCM token: \(token)")

    // Send to server if logged in
}
```

### Token Refresh Listener Pattern

FCM tokens can refresh for several reasons:
- App reinstall
- FCM SDK refresh (typical: every 2 weeks internally)
- Security-related refresh

**Pattern: Monitor in AppDelegate**

```swift
// In didFinishLaunchingWithOptions or separate method
func startMonitoringTokenChanges() {
    // The MessagingDelegate.messaging(_:didReceiveRegistrationToken:) callback
    // is automatically called whenever token changes
    // No additional listener needed — just ensure delegate is set

    Messaging.messaging().delegate = self
}
```

**Important:** Token refresh happens automatically; don't poll for changes. The delegate callback is sufficient.

### Handling Foreground Notifications

When app is in foreground and receives notification, iOS suppresses the banner by default. Must explicitly display:

```swift
func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    willPresent notification: UNNotification,
    withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
) {
    let userInfo = notification.request.content.userInfo

    // Show banner/alert even in foreground
    var options: UNNotificationPresentationOptions = [.sound, .badge]

    if #available(iOS 14.0, *) {
        // iOS 14+: Use banner and list
        options.insert(.banner)
        options.insert(.list)
    } else {
        // iOS 13: Use alert
        options.insert(.alert)
    }

    completionHandler(options)
}
```

### Handling Background/Remote Notifications When App is Closed

Two scenarios:

**1. User taps notification banner (from background/killed state)**
```swift
// Handled by UNUserNotificationCenterDelegate.userNotificationCenter(_:didReceive:withCompletionHandler:)
// userInfo contains full payload
```

**2. Silent notification (no UI, for background data refresh)**
```swift
// Implement in AppDelegate:
func application(
    _ application: UIApplication,
    didReceiveRemoteNotification userInfo: [AnyHashable: Any],
    fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void
) {
    print("📬 Silent push received: \(userInfo)")

    // Do background work (fetch data, update UI cache, etc.)
    // Must call completionHandler to signal when done

    completionHandler(.newData)  // or .noData or .failed
}
```

**When called:**
- Silent notifications: Always in background (no user-visible banner)
- Alert notifications: Only if app is in background/killed AND user hasn't dismissed

---

## 4. Server Token Sync Flow

### When to Send FCM Token to Server

**Best practices from healthcare-ios reference project:**

1. **App Launch (first time):**
   - Call `Messaging.messaging().token { token, error in ... }` after Firebase.configure()
   - If user is logged in (auth token exists in UserDefaults), send token to server

2. **Token Refresh:**
   - Whenever `MessagingDelegate.messaging(_:didReceiveRegistrationToken:)` fires
   - Check if token changed (compare with stored value)
   - If changed AND user is logged in, send to server

3. **After Login:**
   - When user completes OAuth/login flow and auth token is saved
   - Check if FCM token exists (from app launch)
   - If FCM token exists but wasn't sent yet (no auth token before), send it now

4. **Logout:**
   - Call DELETE `/api/users/fcm-token` to remove token from server
   - Clear local FCM token from UserDefaults

### API Endpoint Design: POST /api/users/fcm-token

**Lordhill backend implementation (already exists):**

```
POST /api/users/fcm-token

Headers:
  Authorization: Bearer <JWT>

Body:
{
  "token": "string (FCM token from Messaging.messaging().token())",
  "platform": "ios" | "android"
}

Response (Success):
{
  "message": "ok"
}

Error Responses:
  400: Bad Request (missing token or platform, invalid platform value)
  401: Unauthorized (no auth token)
```

**Server-side implementation (packages/server/src/push/controllers/fcmToken.js):**
- Validates token and platform
- Removes token if it exists for another user (device handoff)
- Creates/updates FcmToken record for current user
- Timestamps are automatic via Sequelize

### Token Update Strategy When Token Changes

**Logic from healthcare-ios:**

```swift
func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
    guard let token = fcmToken else {
        print("❌ FCM token unavailable")
        return
    }

    // Check if token actually changed
    let previousToken = UserDefaults.standard.string(forKey: "fcm-token")
    UserDefaults.standard.set(token, forKey: "fcm-token")  // Store new token

    // Only send if token is new/different
    if previousToken != token {
        print("🔄 FCM token refreshed")

        // Only send to server if user is logged in
        if let authToken = UserDefaults.standard.string(forKey: "auth-token") {
            sendFcmTokenToServer(token)
            print("✅ Token sent to server")
        } else {
            print("ℹ️ User not logged in yet, will send after login")
        }
    }
}
```

**Storage:**
- `UserDefaults.standard.set(token, forKey: "fcm-token")` — persists across app launches
- Check for `previousToken` to detect changes

### Handling Logout (DELETE Token from Server)

```swift
func logout() {
    // Call server to delete token
    let token = UserDefaults.standard.string(forKey: "fcm-token") ?? ""

    if !token.isEmpty {
        deleteTokenFromServer(token) { error in
            if let error = error {
                print("⚠️ Failed to delete token from server: \(error)")
                // Still clear locally even if server fails
            }

            // Clear auth token
            UserDefaults.standard.removeObject(forKey: "auth-token")

            // Optional: clear FCM token locally too
            UserDefaults.standard.removeObject(forKey: "fcm-token")

            print("✅ Logged out")
        }
    } else {
        // No FCM token, just clear auth
        UserDefaults.standard.removeObject(forKey: "auth-token")
    }
}
```

**Server endpoint (already exists):**
```
DELETE /api/users/fcm-token

Headers:
  Authorization: Bearer <JWT>

Body:
{
  "token": "string"
}

Response:
{
  "message": "ok"
}
```

### Token Persistence on Client Side

**Storage mechanism:**
- **UserDefaults:** Recommended for token persistence (encrypted by iOS)
  - `UserDefaults.standard.set(token, forKey: "fcm-token")`
  - Persists across app launches
  - Cleared on app uninstall

- **Keychain:** More secure but overkill for FCM token (already encrypted by OS)

- **App Group UserDefaults:** Only needed if sharing tokens across app extensions (notification service extension) — not required for basic FCM

**Persistence pattern from healthcare-ios:**
```swift
// Store token (usually in MessagingDelegate callback)
UserDefaults.standard.set(token, forKey: "fcm-token")

// Retrieve token later
if let storedToken = UserDefaults.standard.string(forKey: "fcm-token") {
    // Token is available
}

// Clear on logout
UserDefaults.standard.removeObject(forKey: "fcm-token")
```

---

## 5. Key Considerations and Gotchas

### iOS Simulator Limitations with FCM/Push

**Critical Limitation:**
- **Simulators cannot receive push notifications.** APNs requires a real device.
- FCM token can be generated on simulator, but notification delivery will fail.

**Workarounds:**
1. **Test on real device:** Only way to test real notification flow
2. **Simulate token registration:** Mock Messaging.messaging().token() in preview/test code
3. **Use Firebase Console:** Send test messages to real device directly (Settings > Cloud Messaging > Send Test Message)
4. **Server-side testing:** Test push send logic via API calls with real device token

### APNs vs FCM Token Differences

**APNs Token:**
- Generated by iOS OS via `registerForRemoteNotifications()`
- Format: 32-64 character hex string
- Device-specific + app-specific
- Expires rarely (only on major OS updates or security events)
- Mapped to app via Bundle ID

**FCM Token:**
- Generated by FCM SDK after APNs token is registered
- Format: much longer alphanumeric string (~150+ chars)
- Tied to device + app + Firebase project (via GoogleService-Info.plist)
- Refreshes periodically (Firebase refreshes internally ~2 weeks)
- Expires after 30+ days of device inactivity

**For iOS: Use FCM token exclusively.** Send APNs token to Firebase via `Messaging.messaging().apnsToken` (automatic or manual), and send FCM token to your server.

### GoogleService-Info.plist Necessity and Alternatives

**Requirement:** FCM SDK (via FirebaseCore) **requires** GoogleService-Info.plist to initialize.

**What's in it:**
- Firebase Project ID
- Google App ID
- API key
- Messaging Sender ID (used for topic subscriptions)
- Bundle ID mapping

**How to obtain:**
1. Firebase Console → Project Settings
2. "Your Apps" → iOS app
3. Download GoogleService-Info.plist
4. Add to Xcode project (drag into project, "Copy items if needed")
5. Ensure plist is in Target's "Copy Bundle Resources" build phase

**Error if missing:**
```
[Firebase/Core][I-COR000003] The default Firebase app has not yet been configured...
or
[Firebase/Messaging][I-FCM000045] Unable to use cached default FirebaseApp configuration...
```

**Alternative (programmatic configuration):**
```swift
// NOT RECOMMENDED, but possible if plist unavailable:
let options = FirebaseOptions(googleAppID: "1:12345:ios:abcdef...",
                              gcmSenderID: "12345")
options.apiKey = "AAAA..."
options.projectID = "my-project"
FirebaseApp.configure(options: options)
```

In practice, always use the plist — it's simpler and prevents mistakes.

### Apple Developer Team Requirement

**Required for:**
- Creating App ID in Apple Developer account
- Enabling Push Notifications service on App ID
- Creating APNs certificates/keys (.cer, .p8)
- Code signing for device build

**Free tier:**
- Free Apple Developer account (no paid subscription) allows creation of development certificates
- APNs key can be created and used for both sandbox and production

**Bundle ID:**
- Must exactly match in:
  - Xcode project (Signing & Capabilities)
  - Apple Developer App ID registration
  - GoogleService-Info.plist (bundle ID field)
  - Firebase Console (iOS app registration)

**Mismatch = failure** (APNs certificate won't match Bundle ID, Firebase won't recognize app).

### Production vs Development APNs Certificates

**Sandbox (Development):**
- Used during development and TestFlight testing
- Certificate/key suffix: "Sandbox"
- Server endpoint: `https://api.sandbox.push.apple.com:443`
- Devices running app from Xcode or development build

**Production:**
- Used for App Store releases
- Certificate/key suffix: "Production"
- Server endpoint: `https://api.push.apple.com:443`
- Devices running app from App Store

**Firebase Configuration:**
- Upload both development and production keys/certificates to Firebase Console (under Apple Platform > Cloud Messaging)
- Firebase automatically routes based on app build type
- At minimum, development key required (production is optional for testing)

### Token Expiration and Refresh Behavior

**FCM Token Lifecycle:**

| Event | Behavior |
|-------|----------|
| App install | Token generated on first run |
| Every 2 weeks (internal) | Firebase SDK refreshes token silently; `MessagingDelegate` callback fires |
| Device inactivity > 30 days | Token may become stale (won't invalidate immediately, but server should track) |
| App reinstall | New token generated |
| OS major update | Possible token refresh |
| Security event (e.g., iCloud Keychain reset) | Possible token refresh |

**When token is considered invalid:**
- Firebase returns `messaging/registration-token-not-registered` or `messaging/invalid-registration-token` error on send attempt
- Server should immediately delete that token from database (healthcare-ios pattern)
- App should request fresh token (automatically done by MessagingDelegate)

**Stale Token Management (from Firebase docs):**
- Default FCM staleness threshold: 30 days of device inactivity
- Best practice: Server tracks token timestamp, deletes tokens older than 30 days
- Implement monthly token refresh check: prompt device to re-send token
- Use Firebase Analytics or FCM Data API to monitor inactive devices

**Lordhill Implementation Note:**
- FCM tokens table has `createdAt`/`updatedAt` timestamps (Sequelize auto-added)
- Push service already handles invalid token deletion (see pushService.js)
- Recommended: Add monthly cleanup job to delete tokens older than 30 days

---

## 6. Best Practices Summary

### On iOS App Side
1. ✅ Use SwiftUI with `@UIApplicationDelegateAdaptor` for AppDelegate integration
2. ✅ Set both `UNUserNotificationCenterDelegate` and `MessagingDelegate` in AppDelegate
3. ✅ Request notification permissions immediately in `didFinishLaunchingWithOptions`
4. ✅ Handle foreground notifications explicitly (show banner)
5. ✅ Monitor `MessagingDelegate.messaging(_:didReceiveRegistrationToken:)` for token changes
6. ✅ Store FCM token in UserDefaults with change detection
7. ✅ Send token to server only when it changes AND user is logged in
8. ✅ Delete token from server on logout
9. ✅ Use try-catch for token fetch; handle errors gracefully
10. ❌ Don't test push on simulator (use real device only)

### On Server Side (Already Implemented in Lordhill)
1. ✅ FCM tokens table with user_id, token, platform, timestamps
2. ✅ POST `/api/users/fcm-token` endpoint to register/update token
3. ✅ DELETE `/api/users/fcm-token` endpoint for logout
4. ✅ Token validation: reject duplicates, remove old user if token was reused
5. ✅ Auto-cleanup of invalid tokens on failed send attempts
6. ⚠️ Missing: Monthly cleanup job for stale tokens (30+ day old)
7. ⚠️ Missing: Endpoint to get user's tokens (useful for admin testing)

### Testing in Development
1. Use Firebase Console: Settings > Cloud Messaging > Send Test Message (real device)
2. OR use `curl` with server API to send test push (backend testing)
3. Check device receipt via Xcode debugger console logs
4. Enable Firebase Messaging debug logs: `Messaging.messaging().isLoggingEnabled = true`

---

## 7. Reference Projects

### Healthcare Project Structure
Located: `~/Documents/cheeze/healthcare/healthcare-ios/`

**Key files for reference:**
- `HealthCare/App/AppDelegate.swift` — Complete FCM setup, token handling, notification display, push payload processing, translation system for multi-language push
- `HealthCare/Util/ApiManager.swift` — Token send implementation (includes `sendFCMTokenToServer`)
- `HealthCareNotificationService/NotificationService.swift` — Notification Service Extension (for image/rich content handling)

**Patterns to copy:**
1. Token refresh detection and conditional send
2. Foreground notification handling with banner
3. Background notification handling with data persistence
4. Silent notification support

### Lordhill Backend Structure
Located: `packages/server/src/push/`

**Already implemented:**
- `models/FcmToken.js` — Database model
- `controllers/fcmToken.js` — Register and delete endpoints
- `routes/fcmToken.js` — Route mounting
- `pushService.js` — Token storage, send logic, invalid token cleanup

**Status:** Backend is ready; iOS app just needs to call the endpoints.

---

## 8. Endpoint Reference for iOS Implementation

### Register/Update FCM Token

```
POST /api/users/fcm-token
Authorization: Bearer {JWT_TOKEN}

Request Body:
{
  "token": "e1i8k...",  // From Messaging.messaging().token()
  "platform": "ios"
}

Success Response (200):
{
  "message": "ok"
}

Error Responses:
400 Bad Request — missing/invalid fields
401 Unauthorized — no auth token
```

**When to call:**
- App launch (after Firebase.configure() and permission request)
- After login (if token exists)
- When `MessagingDelegate` fires with new token (if logged in)

### Delete FCM Token (Logout)

```
DELETE /api/users/fcm-token
Authorization: Bearer {JWT_TOKEN}

Request Body:
{
  "token": "e1i8k..."
}

Success Response (200):
{
  "message": "ok"
}
```

**When to call:**
- During logout flow
- Before clearing auth token

---

## 9. Next Steps for iOS Implementation

1. **Phase 1: SDK Setup & Permissions**
   - Add Firebase SDK via SPM (FirebaseCore, FirebaseMessaging)
   - Configure Xcode: Push Notifications + Background Modes capabilities
   - Add GoogleService-Info.plist (download from Firebase Console)
   - Request notification permissions in AppDelegate

2. **Phase 2: Token Management**
   - Implement MessagingDelegate.messaging(_:didReceiveRegistrationToken:)
   - Store token in UserDefaults
   - Add token change detection logic

3. **Phase 3: Server Communication**
   - Implement `sendFcmTokenToServer()` function (network call to POST /api/users/fcm-token)
   - Call after login and on token refresh
   - Handle auth token from login flow

4. **Phase 4: Notification Display**
   - Implement UNUserNotificationCenterDelegate methods
   - Handle foreground notifications (show banner)
   - Handle background tap (deep linking)
   - Parse push payload and extract relevant data

5. **Phase 5: Testing**
   - Test on real iOS device
   - Send test message via Firebase Console
   - Verify token appears in database
   - Test logout (token deletion)
   - Test token refresh (reinstall app, check new token)

---

## References

- Firebase iOS SDK GitHub: https://github.com/firebase/firebase-ios-sdk
- Firebase Cloud Messaging docs: https://firebase.google.com/docs/cloud-messaging
- Firebase iOS setup: https://firebase.google.com/docs/ios/setup-xcode
- Firebase token management: https://firebase.google.com/docs/cloud-messaging/manage-tokens
- Apple UNUserNotificationCenter docs: https://developer.apple.com/documentation/usernotifications
- Healthcare iOS project: ~/Documents/cheeze/healthcare/healthcare-ios/
- Lordhill backend: ./packages/server/src/push/

