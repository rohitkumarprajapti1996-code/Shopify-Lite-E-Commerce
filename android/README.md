# Shopify-Lite Android app

This Android Studio wrapper loads the existing Shopify-Lite website and reuses its Supabase backend. It does not create another customer database or change the PW Returns CRM.

## Build an installable debug APK using GitHub Actions

1. Open the repository's Actions tab.
2. Select Build Shopify-Lite Android APK.
3. Click Run workflow on the default branch.
4. When the run completes, open it and download the Shopify-Lite-debug-apk artifact.
5. Extract the ZIP to get app-debug.apk, transfer it to your Android phone, and install it. Android may ask you to allow installation from that source.

A push changing files in android/ also triggers a build.

## Build using Android Studio

1. Install Android Studio and JDK 17.
2. Open the android/ folder as a project.
3. Allow Gradle sync and install Android SDK Platform 35 if prompted.
4. Run on a phone/emulator, or run gradle assembleDebug from android/.
5. APK output: app/build/outputs/apk/debug/app-debug.apk.

## Before wider use

- The app loads the live GitHub Pages site and needs internet access.
- Customer and admin access remain controlled by the existing Supabase authentication and role checks.
- Test on a real Android device for login persistence, customer profile separation, Razorpay checkout, UPI handoff and return from payment apps. WebView payment behaviour varies by device and payment method.
- The debug APK is for testing, not a production release. It uses application ID com.shopifylite.app.debug.
- For a release APK, configure private signing keys and passwords outside the repository. Never commit signing keys or Razorpay secrets.
- The Razorpay Key Secret belongs only in Supabase Edge Function secrets, never in Android source.
